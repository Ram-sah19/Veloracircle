const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  googleSignIn,
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile,
  updatePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const User = require('../models/User');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    validate,
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  login
);

router.post(
  '/send-otp',
  [
    body('email').isEmail().withMessage('Please provide a valid email address'),
    validate,
  ],
  sendOtp
);

router.get('/test-smtp', async (req, res) => {
  try {
    const { sendOtpEmail } = require('../config/emailService');
    const result = await sendOtpEmail({
      email: process.env.SMTP_USER || 'veloraglobal.hr@gmail.com',
      otp: '123456',
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      smtpUser: process.env.SMTP_USER,
      passLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
    });
  }
});

router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Please provide a valid email address'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be a 6-digit code'),
    body('password')
      .optional({ checkFalsy: true })
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters if provided'),
    body('designation')
      .optional({ checkFalsy: true })
      .isIn(['mentor', 'intern', 'trainee', 'other'])
      .withMessage('Invalid designation'),
    validate,
  ],
  verifyOtp
);

router.post(
  '/google',
  [
    body('email').isEmail().withMessage('Please provide a valid Google account email'),
    validate,
  ],
  googleSignIn
);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

/**
 * @desc    Lookup user by email, handle, or name to get public profile
 * @route   GET /api/auth/lookup
 * @access  Public / Authenticated
 */
router.get('/lookup', async (req, res) => {
  try {
    const { email, handle, query } = req.query;
    if (!email && !handle && !query) {
      return res.status(400).json({ success: false, error: 'Provide search term' });
    }

    const filters = [];
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      filters.push({ email: cleanEmail });
      filters.push({ email: { $regex: `^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    }
    if (handle) {
      const cleanHandle = handle.replace(/^@/, '').trim().toLowerCase();
      filters.push({ handle: `@${cleanHandle}` });
      filters.push({ handle: cleanHandle });
    }
    if (query) {
      const clean = query.trim().toLowerCase();
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filters.push({ email: clean });
      filters.push({ email: { $regex: `^${escaped}(@|$)`, $options: 'i' } });
      filters.push({ email: { $regex: escaped, $options: 'i' } });
      filters.push({ handle: `@${clean.replace(/^@/, '')}` });
      filters.push({ handle: clean.replace(/^@/, '') });
      filters.push({ name: { $regex: escaped, $options: 'i' } });
    }

    const user = await User.findOne({ $or: filters }).select(
      'name email handle initials designation avatar status'
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        handle: user.handle || `@${user.email.split('@')[0]}`,
        initials:
          user.initials ||
          (user.name
            ? user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()
            : 'VC'),
        designation: user.designation,
        avatar: user.avatar,
        status: user.status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
    validate,
  ],
  updatePassword
);

module.exports = router;
