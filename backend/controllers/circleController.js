const Circle = require('../models/Circle');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { ROLES, CONVERSATION_KINDS } = require('../config/constants');
const { sanitizeCircleForUser } = require('../middleware/privacy');

/**
 * @desc    Get all circles user is part of
 * @route   GET /api/circles
 * @access  Private
 */
const getCircles = async (req, res, next) => {
  try {
    const isGlobalAdmin = req.user.role === ROLES.OWNER || req.user.role === ROLES.ADMIN;

    let query = { isArchived: false };
    if (!isGlobalAdmin) {
      query['members.user'] = req.user.id;
    }

    const circles = await Circle.find(query)
      .populate('createdBy', 'name email handle initials')
      .sort({ updatedAt: -1 });

    const sanitized = circles.map((circle) =>
      sanitizeCircleForUser(circle, req.user.role)
    );

    res.status(200).json({
      success: true,
      count: sanitized.length,
      data: sanitized,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new Circle
 * @route   POST /api/circles
 * @access  Private
 */
const createCircle = async (req, res, next) => {
  try {
    const { name, description, privacy, settings } = req.body;

    const circle = await Circle.create({
      name,
      description,
      privacy: privacy || 'private',
      createdBy: req.user.id,
      members: [
        {
          user: req.user.id,
          role: ROLES.OWNER,
          joinedAt: new Date(),
        },
      ],
      settings: settings || {},
    });

    // Create a companion Circle Conversation thread
    await Conversation.create({
      kind: CONVERSATION_KINDS.CIRCLE,
      circle: circle._id,
      participants: [
        {
          user: req.user.id,
          pinned: false,
          unreadCount: 0,
          lastReadAt: new Date(),
        },
      ],
      privacy: 'Private Circle',
      lastMessage: {
        body: `Welcome to ${name}. Member directory is hidden.`,
        sender: req.user.id,
        senderName: 'System',
        sentAt: new Date(),
        kind: 'text',
      },
    });

    res.status(201).json({
      success: true,
      data: sanitizeCircleForUser(circle, req.user.role),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single circle by ID
 * @route   GET /api/circles/:id
 * @access  Private
 */
const getCircleById = async (req, res, next) => {
  try {
    const circle = await Circle.findById(req.params.id)
      .populate('createdBy', 'name email handle')
      .populate('members.user', 'name email handle initials role status avatar');

    if (!circle || circle.isArchived) {
      return res.status(404).json({
        success: false,
        error: 'Circle not found or has been archived.',
      });
    }

    // Verify user is a member or global admin
    const isMember = circle.members.some(
      (m) => m.user && m.user._id.toString() === req.user.id.toString()
    );
    const isGlobalAdmin = req.user.role === ROLES.OWNER || req.user.role === ROLES.ADMIN;

    if (!isMember && !isGlobalAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this private Circle.',
      });
    }

    res.status(200).json({
      success: true,
      data: sanitizeCircleForUser(circle, req.user.role),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update circle details or privacy settings
 * @route   PUT /api/circles/:id
 * @access  Private (Owner / Admin / Circle Owner)
 */
const updateCircle = async (req, res, next) => {
  try {
    const circle = await Circle.findById(req.params.id);

    if (!circle) {
      return res.status(404).json({ success: false, error: 'Circle not found' });
    }

    const userMembership = circle.members.find(
      (m) => m.user.toString() === req.user.id.toString()
    );
    const isCircleAdmin =
      userMembership && (userMembership.role === ROLES.OWNER || userMembership.role === ROLES.ADMIN);
    const isGlobalAdmin = req.user.role === ROLES.OWNER || req.user.role === ROLES.ADMIN;

    if (!isCircleAdmin && !isGlobalAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only Circle owners and administrators can update settings.',
      });
    }

    const { name, description, privacy, settings } = req.body;
    if (name) circle.name = name;
    if (description !== undefined) circle.description = description;
    if (privacy) circle.privacy = privacy;
    if (settings) {
      circle.settings = { ...circle.settings.toObject(), ...settings };
    }

    await circle.save();

    res.status(200).json({
      success: true,
      data: sanitizeCircleForUser(circle, req.user.role),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add or invite a member to a Circle
 * @route   POST /api/circles/:id/members
 * @access  Private (Admin / Owner)
 */
const addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const circle = await Circle.findById(req.params.id);

    if (!circle) {
      return res.status(404).json({ success: false, error: 'Circle not found' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User to add not found' });
    }

    const alreadyMember = circle.members.some(
      (m) => m.user.toString() === userId.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member of this Circle.',
      });
    }

    circle.members.push({
      user: userId,
      role: role || ROLES.MEMBER,
      joinedAt: new Date(),
    });

    await circle.save();

    // Also add to circle conversation
    const conversation = await Conversation.findOne({
      kind: CONVERSATION_KINDS.CIRCLE,
      circle: circle._id,
    });

    if (conversation) {
      const alreadyInConvo = conversation.participants.some(
        (p) => p.user.toString() === userId.toString()
      );
      if (!alreadyInConvo) {
        conversation.participants.push({
          user: userId,
          pinned: false,
          unreadCount: 0,
          lastReadAt: new Date(),
        });
        await conversation.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Member added to Circle successfully.',
      data: sanitizeCircleForUser(circle, req.user.role),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove member from Circle
 * @route   DELETE /api/circles/:id/members/:userId
 * @access  Private (Admin / Owner)
 */
const removeMember = async (req, res, next) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ success: false, error: 'Circle not found' });
    }

    circle.members = circle.members.filter(
      (m) => m.user.toString() !== req.params.userId.toString()
    );

    await circle.save();

    res.status(200).json({
      success: true,
      message: 'Member removed from Circle.',
      data: sanitizeCircleForUser(circle, req.user.role),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Pin a message to the Circle
 * @route   PUT /api/circles/:id/pin
 * @access  Private (Admin / Owner)
 */
const pinMessage = async (req, res, next) => {
  try {
    const { body, author } = req.body;
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ success: false, error: 'Circle not found' });
    }

    circle.pinnedMessage = {
      body,
      author: author || req.user.name,
      pinnedAt: new Date(),
    };

    await circle.save();

    res.status(200).json({
      success: true,
      data: circle.pinnedMessage,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCircles,
  createCircle,
  getCircleById,
  updateCircle,
  addMember,
  removeMember,
  pinMessage,
};
