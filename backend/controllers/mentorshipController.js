const MentorshipInvitation = require('../models/MentorshipInvitation');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { CONVERSATION_KINDS } = require('../config/constants');

/**
 * @desc    Send a mentorship invitation
 * @route   POST /api/mentorship/invite
 * @access  Private
 */
const sendInvitation = async (req, res, next) => {
  try {
    const { recipientEmail, recipientName, note } = req.body;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Please provide a valid recipient email.' });
    }

    const email = recipientEmail.trim().toLowerCase();
    if (email === req.user.email.toLowerCase()) {
      return res.status(400).json({ success: false, error: 'You cannot invite yourself.' });
    }

    // Lookup recipient in User collection
    const recipientUser = await User.findOne({ email });

    const finalRecipientName =
      (recipientName && recipientName.trim()) ||
      (recipientUser && recipientUser.name) ||
      email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);

    const finalRecipientHandle =
      (recipientUser && recipientUser.handle) || `@${email.split('@')[0]}`;

    const finalRecipientInitials =
      (recipientUser && recipientUser.initials) ||
      finalRecipientName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const senderRole = req.user.designation === 'mentor' ? 'mentor' : req.user.designation || 'mentor';
    const recipientDesignation = senderRole === 'mentor' ? 'trainee' : 'mentor';

    // Check if invitation already exists
    let invitation = await MentorshipInvitation.findOne({
      sender: req.user.id,
      recipientEmail: email,
    });

    if (invitation) {
      invitation.status = 'pending';
      invitation.note = note ? note.trim() : invitation.note;
      invitation.recipientName = finalRecipientName;
      if (recipientUser) invitation.recipient = recipientUser._id;
      await invitation.save();
    } else {
      invitation = await MentorshipInvitation.create({
        sender: req.user.id,
        senderName: req.user.name,
        senderEmail: req.user.email.toLowerCase(),
        senderHandle: req.user.handle || `@${req.user.name.toLowerCase().replace(/\s+/g, '')}`,
        senderInitials: req.user.initials || 'VC',
        senderDesignation: senderRole,
        senderAvatar: req.user.avatar || null,

        recipient: recipientUser ? recipientUser._id : null,
        recipientEmail: email,
        recipientName: finalRecipientName,
        recipientHandle: finalRecipientHandle,
        recipientInitials: finalRecipientInitials,
        recipientDesignation: recipientDesignation,
        recipientAvatar: recipientUser ? recipientUser.avatar : null,

        status: 'pending',
        note: note ? note.trim() : '',
      });
    }

    // Format response matching frontend expectations
    const formatted = {
      id: invitation._id.toString(),
      sender: {
        id: invitation.sender.toString(),
        name: invitation.senderName,
        email: invitation.senderEmail,
        handle: invitation.senderHandle,
        initials: invitation.senderInitials,
        avatar: invitation.senderAvatar,
        designation: invitation.senderDesignation,
      },
      recipient: {
        id: invitation.recipient ? invitation.recipient.toString() : `rec_${Date.now()}`,
        name: invitation.recipientName,
        email: invitation.recipientEmail,
        handle: invitation.recipientHandle,
        initials: invitation.recipientInitials,
        avatar: invitation.recipientAvatar,
        designation: invitation.recipientDesignation,
      },
      status: invitation.status,
      note: invitation.note,
      conversationId: invitation.conversation ? invitation.conversation.toString() : undefined,
      createdAt: invitation.createdAt,
    };

    // Real-time broadcast via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('mentorship:invitation_received', formatted);
      io.to(`user:${email}`).emit('mentorship:invitation_received', formatted);
      if (recipientUser) {
        io.to(`user:${recipientUser._id.toString()}`).emit('mentorship:invitation_received', formatted);
      }
    }

    res.status(201).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all invitations for logged-in user (as sender or recipient)
 * @route   GET /api/mentorship/invitations
 * @access  Private
 */
const getInvitations = async (req, res, next) => {
  try {
    const userEmail = req.user.email.toLowerCase();

    const invitations = await MentorshipInvitation.find({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id },
        { recipientEmail: userEmail },
      ],
    }).sort({ createdAt: -1 });

    const formatted = invitations.map((inv) => ({
      id: inv._id.toString(),
      sender: {
        id: inv.sender.toString(),
        name: inv.senderName,
        email: inv.senderEmail,
        handle: inv.senderHandle,
        initials: inv.senderInitials,
        avatar: inv.senderAvatar,
        designation: inv.senderDesignation,
      },
      recipient: {
        id: inv.recipient ? inv.recipient.toString() : `rec_${inv._id}`,
        name: inv.recipientName,
        email: inv.recipientEmail,
        handle: inv.recipientHandle,
        initials: inv.recipientInitials,
        avatar: inv.recipientAvatar,
        designation: inv.recipientDesignation,
      },
      status: inv.status,
      note: inv.note,
      conversationId: inv.conversation ? inv.conversation.toString() : undefined,
      createdAt: inv.createdAt,
    }));

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
 * @desc    Accept a mentorship invitation and create direct conversation
 * @route   PUT /api/mentorship/invitations/:id/accept
 * @access  Private
 */
const acceptInvitation = async (req, res, next) => {
  try {
    const invitation = await MentorshipInvitation.findById(req.params.id);
    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invitation not found.' });
    }

    const userEmail = req.user.email.toLowerCase();
    const isRecipient =
      (invitation.recipient && invitation.recipient.toString() === req.user.id.toString()) ||
      invitation.recipientEmail === userEmail;

    if (!isRecipient && invitation.sender.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, error: 'You are not authorized to accept this invitation.' });
    }

    // Ensure recipient user is linked
    invitation.recipient = req.user.id;
    invitation.recipientName = req.user.name;
    invitation.recipientInitials = req.user.initials;
    invitation.recipientHandle = req.user.handle;

    // Find or create direct Conversation in MongoDB between sender and recipient
    const partnerId = invitation.sender;
    let conversation = await Conversation.findOne({
      kind: CONVERSATION_KINDS.DIRECT,
      $and: [
        { 'participants.user': req.user.id },
        { 'participants.user': partnerId },
      ],
    });

    if (!conversation) {
      const senderUser = await User.findById(partnerId);
      const isMentor = (senderUser && senderUser.designation === 'mentor') || invitation.senderDesignation === 'mentor';

      conversation = await Conversation.create({
        kind: CONVERSATION_KINDS.DIRECT,
        privacy: `Direct Mentorship · ${isMentor ? 'Trainee' : 'Mentor'}`,
        participants: [
          { user: req.user.id, pinned: false, unreadCount: 0, lastReadAt: new Date() },
          { user: partnerId, pinned: false, unreadCount: 0, lastReadAt: new Date() },
        ],
        lastMessage: {
          body: invitation.note ? `Note: "${invitation.note}"` : 'Mentorship connected. Say hello!',
          sender: req.user.id,
          senderName: req.user.name,
          sentAt: new Date(),
          kind: 'text',
        },
      });
    }

    invitation.status = 'accepted';
    invitation.conversation = conversation._id;
    await invitation.save();

    const formatted = {
      id: invitation._id.toString(),
      sender: {
        id: invitation.sender.toString(),
        name: invitation.senderName,
        email: invitation.senderEmail,
        handle: invitation.senderHandle,
        initials: invitation.senderInitials,
        avatar: invitation.senderAvatar,
        designation: invitation.senderDesignation,
      },
      recipient: {
        id: req.user.id.toString(),
        name: req.user.name,
        email: req.user.email,
        handle: req.user.handle,
        initials: req.user.initials,
        avatar: req.user.avatar,
        designation: req.user.designation || 'trainee',
      },
      status: 'accepted',
      note: invitation.note,
      conversationId: conversation._id.toString(),
      createdAt: invitation.createdAt,
    };

    // Emit socket event to all clients so both screens update live
    const io = req.app.get('io');
    if (io) {
      io.emit('mentorship:invitation_accepted', formatted);
      io.to(`user:${invitation.senderEmail}`).emit('mentorship:invitation_accepted', formatted);
      io.to(`user:${invitation.sender.toString()}`).emit('mentorship:invitation_accepted', formatted);
      io.to(`user:${userEmail}`).emit('mentorship:invitation_accepted', formatted);
      io.to(`user:${req.user.id.toString()}`).emit('mentorship:invitation_accepted', formatted);
    }

    res.status(200).json({
      success: true,
      data: formatted,
      conversationId: conversation._id.toString(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Decline a mentorship invitation
 * @route   PUT /api/mentorship/invitations/:id/decline
 * @access  Private
 */
const declineInvitation = async (req, res, next) => {
  try {
    const invitation = await MentorshipInvitation.findById(req.params.id);
    if (!invitation) {
      return res.status(404).json({ success: false, error: 'Invitation not found.' });
    }

    invitation.status = 'declined';
    await invitation.save();

    res.status(200).json({
      success: true,
      data: invitation,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reset all mentorship invitations for the user
 * @route   DELETE /api/mentorship/reset
 * @access  Private
 */
const resetMentorship = async (req, res, next) => {
  try {
    const userEmail = req.user.email.toLowerCase();
    await MentorshipInvitation.deleteMany({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id },
        { recipientEmail: userEmail },
      ],
    });

    // Also remove direct mentorship conversations and messages
    const directConvos = await Conversation.find({
      kind: CONVERSATION_KINDS.DIRECT,
      'participants.user': req.user.id,
    });
    const convoIds = directConvos.map((c) => c._id);
    if (convoIds.length > 0) {
      await Message.deleteMany({ conversation: { $in: convoIds } });
      await Conversation.deleteMany({ _id: { $in: convoIds } });
    }

    res.status(200).json({
      success: true,
      message: 'All mentorship invitations, direct conversations, and messages cleared.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendInvitation,
  getInvitations,
  acceptInvitation,
  declineInvitation,
  resetMentorship,
};
