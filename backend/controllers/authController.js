const User = require('../models/User');

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists.',
      });
    }

    // First registered user can become 'owner' if no other users exist
    const count = await User.countDocuments();
    const assignedRole = count === 0 ? 'owner' : role || 'member';

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        handle: user.handle,
        initials: user.initials,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        privacySettings: user.privacySettings,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both an email and password.',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        handle: user.handle,
        initials: user.initials,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        privacySettings: user.privacySettings,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get current authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        handle: user.handle,
        initials: user.initials,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        privacySettings: user.privacySettings,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user profile & privacy settings
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, status, avatar, privacySettings } = req.body;
    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (status !== undefined) user.status = status;
    if (avatar !== undefined) user.avatar = avatar;
    if (privacySettings) {
      user.privacySettings = {
        ...user.privacySettings.toObject(),
        ...privacySettings,
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        handle: user.handle,
        initials: user.initials,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        privacySettings: user.privacySettings,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update user password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password does not match.',
      });
    }

    user.password = newPassword;
    await user.save();

    const token = user.getSignedJwtToken();
    res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
      token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
};
