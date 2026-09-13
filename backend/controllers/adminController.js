const User = require('../models/User');
const Circle = require('../models/Circle');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');
const { ROLES, NOTIFICATION_KINDS } = require('../config/constants');

/**
 * @desc    Get aggregate management stats (Owner/Admin ONLY)
 * @route   GET /api/admin/overview
 * @access  Private (Owner / Admin)
 */
const getOverview = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCircles = await Circle.countDocuments({ isArchived: false });
    const activeConversations = await Conversation.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        activeConversations,
        membersCount: totalUsers,
        totalCircles,
        pendingInvites: 9, // Can be dynamic or based on pending users
        reportsCount: 2,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get members directory (Owner/Admin ONLY)
 * @route   GET /api/admin/members
 * @access  Private (Owner / Admin)
 */
const getMembers = async (req, res, next) => {
  try {
    const { query, role } = req.query;

    let filter = {};
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { handle: { $regex: query, $options: 'i' } },
      ];
    }
    if (role && Object.values(ROLES).includes(role)) {
      filter.role = role;
    }

    const members = await User.find(filter)
      .select('name email handle initials role status createdAt')
      .sort({ createdAt: -1 });

    const formatted = members.map((m) => ({
      id: m._id,
      name: m.name,
      email: m.email,
      handle: m.handle,
      initials: m.initials,
      role: m.role.charAt(0).toUpperCase() + m.role.slice(1),
      status: m.status || 'Active',
      joined: new Date(m.createdAt).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
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
 * @desc    Update a member's role (Owner / Admin only)
 * @route   PUT /api/admin/members/:userId/role
 * @access  Private (Owner / Admin)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !Object.values(ROLES).includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Allowed roles: ${Object.values(ROLES).join(', ')}`,
      });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Only owner can assign or demote an owner
    if (targetUser.role === ROLES.OWNER && req.user.role !== ROLES.OWNER) {
      return res.status(403).json({
        success: false,
        error: 'Only the Owner can modify Owner permissions.',
      });
    }

    targetUser.role = role.toLowerCase();
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `Role for ${targetUser.name} updated to ${targetUser.role}.`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        role: targetUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Send member invite
 * @route   POST /api/admin/invite
 * @access  Private (Owner / Admin)
 */
const inviteMember = async (req, res, next) => {
  try {
    const { email, role, circleId } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // In a real system, send email via nodemailer/SendGrid/SES.
    // For now, record notification if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      await Notification.create({
        recipient: existing._id,
        sender: req.user.id,
        kind: NOTIFICATION_KINDS.INVITE,
        title: 'Circle Invitation',
        body: `You were invited by ${req.user.name} to join as a ${role || 'member'}.`,
        entityId: circleId || null,
      });
    }

    res.status(200).json({
      success: true,
      message: `Invitation successfully sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  getMembers,
  updateUserRole,
  inviteMember,
};
