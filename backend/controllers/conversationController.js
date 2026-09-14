const Conversation = require('../models/Conversation');
const Circle = require('../models/Circle');
const User = require('../models/User');
const { CONVERSATION_KINDS, ROLES } = require('../config/constants');
const cache = require('../config/cache');

/**
 * @desc    Get all conversations for user
 * @route   GET /api/conversations
 * @access  Private
 */
const getConversations = async (req, res, next) => {
  try {
    const { tab } = req.query; // 'all', 'unread', 'pinned'
    const cacheKey = `user_convos:${req.user.id}:${tab || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Provider', cache.getStatus().provider);
      return res.status(200).json({
        success: true,
        ...cached,
      });
    }

    const conversations = await Conversation.find({
      'participants.user': req.user.id,
    })
      .populate('circle', 'name privacy description')
      .populate('participants.user', 'name handle initials avatar status email designation')
      .populate('lastMessage.sender', 'name handle initials')
      .sort({ updatedAt: -1 });

    const formatted = conversations.map((convo) => {
      const pState = convo.participants.find(
        (p) => p.user && p.user._id.toString() === req.user.id.toString()
      );

      // Determine display title & initials
      let name = '';
      let initials = '';
      let partnerEmail = '';
      let partnerRole = '';
      let privacy = convo.privacy || 'Private conversation';

      if (convo.kind === CONVERSATION_KINDS.CIRCLE && convo.circle) {
        name = convo.circle.name;
        initials = name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
      } else {
        // Direct conversation - find other participant
        const other = convo.participants.find(
          (p) => p.user && p.user._id.toString() !== req.user.id.toString()
        );
        name = other && other.user ? other.user.name : 'Direct Chat';
        initials = other && other.user ? other.user.initials : 'DC';
        partnerEmail = other && other.user ? other.user.email : '';
        const isSelfMentor = req.user.designation === 'mentor';
        partnerRole = isSelfMentor ? 'Trainee' : 'Mentor';
        privacy = `Direct Mentorship · ${partnerRole}`;
      }

      return {
        id: convo._id.toString(),
        name,
        initials,
        kind: convo.kind,
        circleId: convo.circle ? convo.circle._id : null,
        privacy,
        partnerEmail,
        partnerRole,
        preview: convo.lastMessage ? convo.lastMessage.body : '',
        time: convo.lastMessage ? convo.lastMessage.sentAt : convo.updatedAt,
        unread: pState ? pState.unreadCount : 0,
        pinned: pState ? pState.pinned : false,
      };
    });

    // Filter by tab if requested
    let result = formatted;
    if (tab === 'unread') {
      result = formatted.filter((c) => c.unread > 0);
    } else if (tab === 'pinned') {
      result = formatted.filter((c) => c.pinned);
    }

    const payload = {
      count: result.length,
      data: result,
    };

    // Cache conversations for 2 minutes
    cache.set(cacheKey, payload, 120).catch(() => {});

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Cache-Provider', cache.getStatus().provider);
    res.status(200).json({
      success: true,
      ...payload,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get or create 1-to-1 conversation with another user
 * @route   POST /api/conversations/direct
 * @access  Private
 */
const getOrCreateDirect = async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide recipientId.',
      });
    }

    if (recipientId.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot start conversation with yourself.',
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient user not found.' });
    }

    // Check if 1-to-1 conversation already exists
    let conversation = await Conversation.findOne({
      kind: CONVERSATION_KINDS.DIRECT,
      $and: [
        { 'participants.user': req.user.id },
        { 'participants.user': recipientId },
      ],
    })
      .populate('participants.user', 'name handle initials avatar status')
      .populate('lastMessage.sender', 'name handle initials');

    if (!conversation) {
      conversation = await Conversation.create({
        kind: CONVERSATION_KINDS.DIRECT,
        privacy: 'Private conversation',
        participants: [
          { user: req.user.id, pinned: false, unreadCount: 0, lastReadAt: new Date() },
          { user: recipientId, pinned: false, unreadCount: 0, lastReadAt: new Date() },
        ],
        lastMessage: {
          body: 'Conversation started.',
          sender: req.user.id,
          senderName: req.user.name,
          sentAt: new Date(),
          kind: 'text',
        },
      });

      conversation = await Conversation.findById(conversation._id).populate(
        'participants.user',
        'name handle initials avatar status'
      );
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Toggle pin conversation for current user
 * @route   PUT /api/conversations/:id/pin
 * @access  Private
 */
const togglePin = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const pState = conversation.participants.find(
      (p) => p.user.toString() === req.user.id.toString()
    );

    if (!pState) {
      return res.status(403).json({ success: false, error: 'Not part of this conversation.' });
    }

    pState.pinned = !pState.pinned;
    await conversation.save();

    cache.delPattern(`user_convos:${req.user.id}:*`).catch(() => {});

    res.status(200).json({
      success: true,
      pinned: pState.pinned,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark conversation as read
 * @route   PUT /api/conversations/:id/read
 * @access  Private
 */
const markRead = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found.' });
    }

    const pState = conversation.participants.find(
      (p) => p.user.toString() === req.user.id.toString()
    );

    if (pState) {
      pState.unreadCount = 0;
      pState.lastReadAt = new Date();
      await conversation.save();
    }

    cache.delPattern(`user_convos:${req.user.id}:*`).catch(() => {});

    res.status(200).json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Pin a message in a conversation
 * @route   POST /api/conversations/:id/pin
 * @access  Private
 */
const pinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ success: false, error: 'messageId required' });

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });

    const isParticipant = conversation.participants.some(
      (p) => p.user.toString() === req.user.id.toString()
    );
    if (!isParticipant) return res.status(403).json({ success: false, error: 'Access denied' });

    // Avoid duplicate pins
    const alreadyPinned = conversation.pinnedMessages.some(
      (p) => p.messageId && p.messageId.toString() === messageId
    );
    if (!alreadyPinned) {
      conversation.pinnedMessages.push({ messageId, pinnedBy: req.user.id, pinnedAt: new Date() });
      await conversation.save();
    }

    // Mark on message document
    const Msg = require('../models/Message');
    await Msg.findByIdAndUpdate(messageId, { pinnedAt: new Date(), pinnedBy: req.user.id });

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${req.params.id}`).emit('conversation:message_pinned', { conversationId: req.params.id, messageId });
    }
    cache.delPattern(`convo:${req.params.id}:*`).catch(() => {});
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Unpin a message in a conversation
 * @route   DELETE /api/conversations/:id/pin/:messageId
 * @access  Private
 */
const unpinMessage = async (req, res, next) => {
  try {
    const { id: conversationId, messageId } = req.params;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });

    conversation.pinnedMessages = conversation.pinnedMessages.filter(
      (p) => p.messageId && p.messageId.toString() !== messageId
    );
    await conversation.save();

    const Msg = require('../models/Message');
    await Msg.findByIdAndUpdate(messageId, { pinnedAt: null, pinnedBy: null });

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('conversation:message_unpinned', { conversationId, messageId });
    }
    cache.delPattern(`convo:${conversationId}:*`).catch(() => {});
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get pinned messages in a conversation
 * @route   GET /api/conversations/:id/pins
 * @access  Private
 */
const getPinnedMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id).populate({
      path: 'pinnedMessages.messageId',
      populate: { path: 'sender', select: 'name initials email' },
    });
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });

    const isParticipant = conversation.participants.some(
      (p) => p.user.toString() === req.user.id.toString()
    );
    if (!isParticipant) return res.status(403).json({ success: false, error: 'Access denied' });

    const pins = conversation.pinnedMessages
      .filter((p) => p.messageId)
      .map((p) => ({
        messageId: p.messageId._id ? p.messageId._id.toString() : p.messageId.toString(),
        body: p.messageId.body || '',
        author: p.messageId.sender ? p.messageId.sender.name : 'Unknown',
        pinnedAt: p.pinnedAt,
      }));

    res.status(200).json({ success: true, data: pins });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, getOrCreateDirect, togglePin, markRead, pinMessage, unpinMessage, getPinnedMessages };
