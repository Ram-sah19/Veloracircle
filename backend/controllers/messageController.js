const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { MESSAGE_KINDS } = require('../config/constants');
const cache = require('../config/cache');

// Helper: Safely resolve conversation document by ID, dm_ prefix, or invitation
async function resolveConversation(conversationId, requestingUserId) {
  if (!conversationId) return null;

  // 1. Direct valid ObjectId lookup
  if (mongoose.Types.ObjectId.isValid(conversationId)) {
    const convo = await Conversation.findById(conversationId);
    if (convo) return convo;
  }

  // 2. If it's a prefixed ID like dm_<id> or dm_inv_<id>
  const cleanId = conversationId.replace(/^dm_(inv_)?/, '');
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    let convo = await Conversation.findById(cleanId);
    if (convo) return convo;

    try {
      const MentorshipInvitation = require('../models/MentorshipInvitation');
      const inv = await MentorshipInvitation.findById(cleanId);
      if (inv) {
        if (inv.conversation && mongoose.Types.ObjectId.isValid(inv.conversation.toString())) {
          convo = await Conversation.findById(inv.conversation);
          if (convo) return convo;
        }
        // If invitation exists between participants, find or create direct conversation
        const partnerId = inv.sender.toString() === requestingUserId.toString() ? inv.recipient : inv.sender;
        if (partnerId) {
          convo = await Conversation.findOne({
            kind: 'direct',
            $and: [
              { 'participants.user': requestingUserId },
              { 'participants.user': partnerId },
            ],
          });
          if (!convo) {
            convo = await Conversation.create({
              kind: 'direct',
              privacy: 'Direct Mentorship',
              participants: [
                { user: requestingUserId, pinned: false, unreadCount: 0, lastReadAt: new Date() },
                { user: partnerId, pinned: false, unreadCount: 0, lastReadAt: new Date() },
              ],
            });
          }
          inv.conversation = convo._id;
          await inv.save().catch(() => {});
          return convo;
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. If cleanId is a User ID (e.g. dm_<userId>)
  if (mongoose.Types.ObjectId.isValid(cleanId) && cleanId !== requestingUserId.toString()) {
    try {
      const User = require('../models/User');
      const targetUser = await User.findById(cleanId);
      if (targetUser) {
        let convo = await Conversation.findOne({
          kind: 'direct',
          $and: [
            { 'participants.user': requestingUserId },
            { 'participants.user': cleanId },
          ],
        });
        if (!convo) {
          convo = await Conversation.create({
            kind: 'direct',
            privacy: 'Direct Mentorship',
            participants: [
              { user: requestingUserId, pinned: false, unreadCount: 0, lastReadAt: new Date() },
              { user: cleanId, pinned: false, unreadCount: 0, lastReadAt: new Date() },
            ],
          });
        }
        return convo;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// Helper: format a message document for API response
function formatMessage(m, requestingUserId) {
  const isSelf = m.sender && m.sender._id
    ? m.sender._id.toString() === requestingUserId.toString()
    : false;
  return {
    id: m._id.toString(),
    conversationId: m.conversation ? m.conversation.toString() : undefined,
    author: m.sender ? m.sender.name : 'Unknown',
    senderEmail: m.sender ? m.sender.email : undefined,
    senderId: m.sender ? m.sender._id.toString() : undefined,
    initials: m.sender ? m.sender.initials : 'VC',
    self: isSelf,
    time: m.createdAt,
    body: m.body,
    kind: m.kind,
    codeLang: m.codeLang || undefined,
    file: m.file && m.file.url ? m.file : undefined,
    replyTo: m.replyTo && m.replyTo.body ? m.replyTo : undefined,
    reactions: (m.reactions || []).map((r) => ({
      emoji: r.emoji,
      count: r.users.length,
      userReacted: r.users.some((u) => u._id
        ? u._id.toString() === requestingUserId.toString()
        : u.toString() === requestingUserId.toString()),
    })),
    readBy: (m.readBy || []).map((rb) => rb.user ? rb.user.toString() : rb.user),
    poll: m.poll && m.poll.question ? {
      question: m.poll.question,
      options: (m.poll.options || []).map((opt) => ({
        text: opt.text,
        votes: opt.votes.length,
        votedByMe: opt.votes.some((u) => u.toString() === requestingUserId.toString()),
      })),
      closed: Boolean(m.poll.closedAt),
    } : undefined,
    isPinned: Boolean(m.pinnedAt),
  };
}

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

    const conversation = await resolveConversation(conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    const actualConvoId = conversation._id.toString();

    const cacheKey = `convo:${actualConvoId}:page:${page}:limit:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ success: true, ...cached });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.user.toString() === req.user.id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Access denied to this conversation' });
    }

    // Clean up any legacy voice messages so they are purged
    await Message.updateMany(
      { conversation: actualConvoId, $or: [{ kind: 'voice' }, { body: '🎤 Voice message' }] },
      { isDeleted: true }
    ).catch(() => {});

    const messages = await Message.find({
      conversation: actualConvoId,
      isDeleted: false,
      kind: { $ne: 'voice' },
      body: { $ne: '🎤 Voice message' },
    })
      .populate('sender', 'name handle initials avatar email')
      .populate('reactions.users', 'name initials')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const formatted = messages.map((m) => formatMessage(m, req.user.id));
    const responsePayload = { count: formatted.length, data: formatted, conversationId: actualConvoId };

    cache.set(cacheKey, responsePayload, 180).catch(() => {});
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json({ success: true, ...responsePayload });
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
    const { body, kind, file, replyTo, codeLang, poll } = req.body;

    const conversation = await resolveConversation(conversationId, req.user.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    const actualConvoId = conversation._id.toString();

    const isParticipant = conversation.participants.some(
      (p) => p.user.toString() === req.user.id.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, error: 'Access denied to this conversation' });
    }

    if (kind === 'voice' || kind === MESSAGE_KINDS.VOICE) {
      return res.status(400).json({ success: false, error: 'Voice messages are not supported' });
    }

    const msgData = {
      conversation: actualConvoId,
      sender: req.user.id,
      body: body || '',
      kind: kind || MESSAGE_KINDS.TEXT,
      file: file || {},
      replyTo: replyTo || {},
      codeLang: codeLang || null,
    };
    if (kind === MESSAGE_KINDS.POLL && poll) {
      msgData.poll = {
        question: poll.question,
        options: (poll.options || []).map((t) => ({ text: t, votes: [] })),
      };
    }

    const message = await Message.create(msgData);

    cache.delPattern(`convo:${actualConvoId}:*`).catch(() => {});
    cache.delPattern(`convo:${conversationId}:*`).catch(() => {});
    cache.delPattern(`user_convos:*`).catch(() => {});

    conversation.lastMessage = {
      body: kind === 'file' ? `[File] ${file?.name || 'Attachment'}` :
            kind === 'poll' ? `📊 Poll: ${poll?.question || ''}` :
            kind === 'code' ? '💻 Code snippet' :
            body || '',
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

    const populated = await Message.findById(message._id).populate('sender', 'name handle initials avatar email');
    const formatted = { ...formatMessage(populated, req.user.id), conversationId: actualConvoId };

    // Broadcast payload without self: true so receivers don't mistakenly treat it as self
    const broadcastPayload = {
      ...formatted,
      self: false,
    };

    const io = req.app.get('io');
    if (io) {
      // 1. Broadcast to the conversation room
      io.to(`conversation:${actualConvoId}`).emit('conversation:new_message', broadcastPayload);
      io.to(`conversation:${actualConvoId}`).emit('conversation:message', broadcastPayload);
      if (conversationId !== actualConvoId) {
        io.to(`conversation:${conversationId}`).emit('conversation:new_message', broadcastPayload);
        io.to(`conversation:${conversationId}`).emit('conversation:message', broadcastPayload);
      }

      // 2. Broadcast to each participant's personal room (guarantees delivery even if user hasn't explicitly joined conversation room)
      conversation.participants.forEach((p) => {
        const pId = p.user.toString();
        // Do not double-emit to sender over personal room
        if (pId !== req.user.id.toString()) {
          io.to(`user:${pId}`).emit('conversation:new_message', broadcastPayload);
          io.to(`user:${pId}`).emit('conversation:message', broadcastPayload);
        }
        io.to(`user:${pId}`).emit('conversation:updated', {
          conversationId: actualConvoId,
          lastMessage: conversation.lastMessage,
        });
      });
    }

    // Web push for offline participants
    try {
      const { sendPushToUser } = require('./pushController');
      const senderName = req.user.name;
      const preview = formatted.body ? formatted.body.slice(0, 80) : 'Sent you a message';
      conversation.participants.forEach((p) => {
        if (p.user.toString() !== req.user.id.toString()) {
          sendPushToUser(p.user.toString(), {
            title: `New message from ${senderName}`,
            body: preview,
            url: '/messages',
          }).catch(() => {});
        }
      });
    } catch {
      // push optional
    }

    res.status(201).json({ success: true, data: { ...formatted, self: true } });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Search messages in a conversation
 * @route   GET /api/conversations/:conversationId/messages/search
 * @access  Private
 */
const searchMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const q = (req.query.q || '').trim();
    if (!q) return res.status(200).json({ success: true, count: 0, data: [] });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });

    const isParticipant = conversation.participants.some(
      (p) => p.user.toString() === req.user.id.toString()
    );
    if (!isParticipant) return res.status(403).json({ success: false, error: 'Access denied' });

    let messages = [];
    try {
      messages = await Message.find({
        conversation: conversationId,
        isDeleted: false,
        $text: { $search: q },
      }, { score: { $meta: 'textScore' } })
        .populate('sender', 'name handle initials avatar email')
        .sort({ score: { $meta: 'textScore' } })
        .limit(30);
    } catch (e) {
      messages = [];
    }

    if (!messages || messages.length === 0) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      messages = await Message.find({
        conversation: conversationId,
        isDeleted: false,
        body: { $regex: escaped, $options: 'i' },
      })
        .populate('sender', 'name handle initials avatar email')
        .sort({ createdAt: -1 })
        .limit(30);
    }

    const formatted = messages.map((m) => formatMessage(m, req.user.id));
    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Mark messages as read
 * @route   POST /api/conversations/:conversationId/messages/read
 * @access  Private
 */
const markMessagesRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body; // array of message IDs

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'messageIds array required' });
    }

    const conversation = await resolveConversation(conversationId, req.user.id);
    const actualConvoId = conversation ? conversation._id.toString() : conversationId;

    const now = new Date();
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        'readBy.user': { $ne: req.user.id },
        isDeleted: false,
      },
      { $push: { readBy: { user: req.user.id, readAt: now } } }
    );

    const readPayload = {
      conversationId: actualConvoId,
      originalConversationId: conversationId,
      messageIds,
      readByUserId: req.user.id.toString(),
      readAt: now,
    };

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${actualConvoId}`).emit('conversation:messages_read', readPayload);
      if (conversationId !== actualConvoId) {
        io.to(`conversation:${conversationId}`).emit('conversation:messages_read', readPayload);
      }
      if (conversation && Array.isArray(conversation.participants)) {
        conversation.participants.forEach((p) => {
          io.to(`user:${p.user.toString()}`).emit('conversation:messages_read', readPayload);
        });
      }
    }

    // Reset unread count for this user in this conversation
    if (conversation) {
      await Conversation.updateOne(
        { _id: conversation._id, 'participants.user': req.user.id },
        { $set: { 'participants.$.unreadCount': 0, 'participants.$.lastReadAt': now } }
      );
    }
    cache.delPattern(`user_convos:${req.user.id}:*`).catch(() => {});

    res.status(200).json({ success: true, conversationId: actualConvoId });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Vote on a poll message
 * @route   POST /api/messages/:id/poll/vote
 * @access  Private
 */
const voteOnPoll = async (req, res, next) => {
  try {
    const { optionIndex } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message || message.isDeleted || message.kind !== 'poll') {
      return res.status(404).json({ success: false, error: 'Poll message not found' });
    }
    if (message.poll.closedAt) {
      return res.status(400).json({ success: false, error: 'This poll is closed' });
    }
    if (optionIndex === undefined || !message.poll.options[optionIndex]) {
      return res.status(400).json({ success: false, error: 'Invalid option index' });
    }

    // Remove user's existing vote from all options
    message.poll.options.forEach((opt) => {
      opt.votes = opt.votes.filter((u) => u.toString() !== req.user.id.toString());
    });
    // Add new vote
    message.poll.options[optionIndex].votes.push(req.user.id);
    await message.save();

    // Build poll result
    const pollResult = {
      messageId: message._id.toString(),
      conversationId: message.conversation.toString(),
      poll: {
        question: message.poll.question,
        options: message.poll.options.map((opt) => ({
          text: opt.text,
          votes: opt.votes.length,
          votedByMe: opt.votes.some((u) => u.toString() === req.user.id.toString()),
        })),
        closed: Boolean(message.poll.closedAt),
      },
    };

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversation.toString()}`).emit('conversation:poll_updated', pollResult);
    }

    cache.delPattern(`convo:${message.conversation.toString()}:*`).catch(() => {});
    res.status(200).json({ success: true, data: pollResult });
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
    if (!emoji) return res.status(400).json({ success: false, error: 'Please provide an emoji' });

    const message = await Message.findById(req.params.id);
    if (!message || message.isDeleted) return res.status(404).json({ success: false, error: 'Message not found' });

    let reactionGroup = message.reactions.find((r) => r.emoji === emoji);
    if (!reactionGroup) {
      message.reactions.push({ emoji, users: [req.user.id] });
    } else {
      const alreadyReacted = reactionGroup.users.some((u) => u.toString() === req.user.id.toString());
      if (!alreadyReacted) reactionGroup.users.push(req.user.id);
    }
    await message.save();

    const io = req.app.get('io');
    if (io) {
      const reactionPayload = {
        messageId: req.params.id,
        conversationId: message.conversation.toString(),
        emoji,
        userId: req.user.id.toString(),
        action: 'add',
        reactions: message.reactions.map((r) => ({
          emoji: r.emoji,
          count: r.users.length,
          userReacted: r.users.some((u) => u.toString() === req.user.id.toString()),
        })),
      };
      io.to(`conversation:${message.conversation.toString()}`).emit('conversation:reaction_updated', reactionPayload);
    }

    res.status(200).json({ success: true, data: message.reactions });
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
    if (!message || message.isDeleted) return res.status(404).json({ success: false, error: 'Message not found' });

    const reactionGroup = message.reactions.find((r) => r.emoji === emoji);
    if (reactionGroup) {
      reactionGroup.users = reactionGroup.users.filter((u) => u.toString() !== req.user.id.toString());
      if (reactionGroup.users.length === 0) {
        message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
      }
      await message.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversation.toString()}`).emit('conversation:reaction_updated', {
        messageId: req.params.id,
        conversationId: message.conversation.toString(),
        emoji,
        userId: req.user.id.toString(),
        action: 'remove',
        reactions: message.reactions.map((r) => ({ emoji: r.emoji, count: r.users.length, userReacted: false })),
      });
    }

    res.status(200).json({ success: true, data: message.reactions });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Soft-delete message
 * @route   DELETE /api/messages/:id
 * @access  Private
 */
const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' });

    const isSender = message.sender.toString() === req.user.id.toString();
    const isAdmin = req.user.role === 'owner' || req.user.role === 'admin';
    if (!isSender && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this message.' });
    }

    message.isDeleted = true;
    await message.save();
    cache.delPattern(`convo:${message.conversation.toString()}:*`).catch(() => {});
    res.status(200).json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Clear all messages in a conversation
 * @route   DELETE /api/conversations/:conversationId/messages/clear
 * @access  Private
 */
const clearConversationMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await Message.deleteMany({ conversation: conversationId });
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: null,
      $set: { 'participants.$[].unreadCount': 0 },
    });

    cache.delPattern(`convo:${conversationId}:*`).catch(() => {});
    cache.delPattern(`user_convos:*`).catch(() => {});

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('conversation:cleared', { conversationId });
    }

    res.status(200).json({ success: true, message: 'Conversation messages cleared.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  resolveConversation,
  getMessages,
  sendMessage,
  searchMessages,
  markMessagesRead,
  voteOnPoll,
  addReaction,
  removeReaction,
  deleteMessage,
  clearConversationMessages,
};

