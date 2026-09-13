const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { MESSAGE_KINDS } = require('../config/constants');

/**
 * @desc    Get messages in a conversation (paginated)
 * @route   GET /api/conversations/:conversationId/messages
 * @access  Private
 */
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Verify user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.user.toString() === req.user.id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Access denied to this conversation' });
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false,
    })
      .populate('sender', 'name handle initials avatar')
      .populate('reactions.users', 'name initials')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const formatted = messages.map((m) => {
      const isSelf = m.sender && m.sender._id.toString() === req.user.id.toString();
      return {
        id: m._id,
        author: m.sender ? m.sender.name : 'Unknown',
        initials: m.sender ? m.sender.initials : 'VC',
        self: isSelf,
        time: m.createdAt,
        body: m.body,
        kind: m.kind,
        file: m.file && m.file.url ? m.file : undefined,
        replyTo: m.replyTo && m.replyTo.body ? m.replyTo : undefined,
        reactions: (m.reactions || []).map((r) => ({
          emoji: r.emoji,
          count: r.users.length,
          userReacted: r.users.some((u) => u._id.toString() === req.user.id.toString()),
        })),
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Send a new message
 * @route   POST /api/conversations/:conversationId/messages
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { body, kind, file, replyTo } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.user.toString() === req.user.id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Access denied to this conversation' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      body: body || '',
      kind: kind || MESSAGE_KINDS.TEXT,
      file: file || {},
      replyTo: replyTo || {},
    });

    // Update conversation lastMessage & increment unread for all other participants
    conversation.lastMessage = {
      body: kind === 'file' ? `[File] ${file?.name || 'Attachment'}` : body || '',
      sender: req.user.id,
      senderName: req.user.name,
      sentAt: new Date(),
      kind: kind || 'text',
    };

    conversation.participants.forEach((p) => {
      if (p.user.toString() !== req.user.id.toString()) {
        p.unreadCount = (p.unreadCount || 0) + 1;
      }
    });

    await conversation.save();

    const populated = await Message.findById(message._id).populate(
      'sender',
      'name handle initials avatar'
    );

    const formatted = {
      id: populated._id,
      author: populated.sender.name,
      initials: populated.sender.initials,
      self: true,
      time: populated.createdAt,
      body: populated.body,
      kind: populated.kind,
      file: populated.file && populated.file.url ? populated.file : undefined,
      replyTo: populated.replyTo && populated.replyTo.body ? populated.replyTo : undefined,
      reactions: [],
    };

    res.status(201).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add reaction emoji to a message
 * @route   POST /api/messages/:id/reactions
 * @access  Private
 */
const addReaction = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) {
      return res.status(400).json({ success: false, error: 'Please provide an emoji' });
    }

    const message = await Message.findById(req.params.id);
    if (!message || message.isDeleted) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    let reactionGroup = message.reactions.find((r) => r.emoji === emoji);
    if (!reactionGroup) {
      message.reactions.push({ emoji, users: [req.user.id] });
    } else {
      const alreadyReacted = reactionGroup.users.some(
        (u) => u.toString() === req.user.id.toString()
      );
      if (!alreadyReacted) {
        reactionGroup.users.push(req.user.id);
      }
    }

    await message.save();

    res.status(200).json({
      success: true,
      data: message.reactions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove reaction emoji from a message
 * @route   DELETE /api/messages/:id/reactions/:emoji
 * @access  Private
 */
const removeReaction = async (req, res, next) => {
  try {
    const { emoji } = req.params;
    const message = await Message.findById(req.params.id);
    if (!message || message.isDeleted) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const reactionGroup = message.reactions.find((r) => r.emoji === emoji);
    if (reactionGroup) {
      reactionGroup.users = reactionGroup.users.filter(
        (u) => u.toString() !== req.user.id.toString()
      );
      if (reactionGroup.users.length === 0) {
        message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
      }
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: message.reactions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Soft-delete message
 * @route   DELETE /api/messages/:id
 * @access  Private (Sender or Admin)
 */
const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    const isSender = message.sender.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'owner' || req.user.role === 'admin';

    if (!isSender && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this message.',
      });
    }

    message.isDeleted = true;
    await message.save();

    res.status(200).json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  addReaction,
  removeReaction,
  deleteMessage,
};
