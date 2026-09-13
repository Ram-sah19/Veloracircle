const User = require('../models/User');
const { sendOtpEmail } = require('../config/emailService');

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, designation } = req.body;

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
      designation: ['mentor', 'intern', 'trainee'].includes(designation) ? designation : 'trainee',
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
        designation: user.designation,
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

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[Auth:Login] Attempting login for: ${normalizedEmail}`);
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.warn(`[Auth:Login] User NOT FOUND in database: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        error: 'No account found with this email. Please sign up or verify via email OTP first.',
      });
    }

    console.log(`[Auth:Login] User found (${user._id}, hasPassword: ${Boolean(user.password)}). Comparing password...`);
    if (!user.password) {
      console.warn(`[Auth:Login] User ${normalizedEmail} does not have a password set.`);
      return res.status(401).json({
        success: false,
        error: 'This account has no password set. Please log in with Email OTP.',
      });
    }

    const isMatch = await user.matchPassword(password);
    console.log(`[Auth:Login] Password match result for ${normalizedEmail}: ${isMatch}`);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect password. Please try again.',
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
        designation: user.designation,
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
        designation: user.designation,
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
    const { name, status, avatar, privacySettings, designation } = req.body;
    const user = await User.findById(req.user.id);

    if (name && name.trim()) {
      user.name = name.trim();
      user.initials = name
        .trim()
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    if (designation && ['mentor', 'intern', 'trainee', 'other'].includes(designation)) {
      user.designation = designation;
    }
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
        designation: user.designation,
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

/**
 * @desc    Google Sign-In / OAuth
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleSignIn = async (req, res, next) => {
  try {
    const { email, name, googleId, avatar } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required for Google Sign-In.',
      });
    }

    // 1. Find existing user by googleId OR email
    let user = await User.findOne({
      $or: [
        ...(googleId ? [{ googleId }] : []),
        { email: email.toLowerCase() },
      ],
    });

    if (user) {
      // If user exists, link Google ID and update avatar/lastActive
      if (googleId && !user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
      }
      if (avatar && !user.avatar) {
        user.avatar = avatar;
      }
      user.lastActive = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      // 2. Create new user for first-time Google sign-in
      const count = await User.countDocuments();
      const assignedRole = count === 0 ? 'owner' : 'member';

      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId: googleId || `google_${Date.now()}`,
        avatar: avatar || null,
        authProvider: 'google',
        role: assignedRole,
        lastActive: new Date(),
      });
    }

    // 3. Issue signed JWT session token (valid for 7d / configurable in .env)
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
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    next(err);
  }
};

// In-memory OTP storage: email -> { otp: string, expiresAt: number, attempts: number }
const otpStore = new Map();

/**
 * @desc    Send OTP to email for passwordless sign-in
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Generate random 6-digit verification code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Save in store
    otpStore.set(normalizedEmail, { otp, expiresAt, attempts: 0 });

    console.log(`\n======================================================`);
    console.log(`🔐 [Velora Auth OTP] Code for ${normalizedEmail}: ${otp}`);
    console.log(`⏱️ Expires in 10 minutes (valid until ${new Date(expiresAt).toLocaleTimeString()})`);
    console.log(`======================================================\n`);

    // Dispatch real email via SMTP
    let emailDelivery = { sent: false };
    try {
      emailDelivery = await sendOtpEmail({ email: normalizedEmail, otp });
      if (emailDelivery.sent) {
        console.log(`✉️ [Velora Email] Verification code successfully emailed to ${normalizedEmail}`);
      } else if (emailDelivery.reason) {
        console.log(`ℹ️ [Velora Email] Email not dispatched via SMTP: ${emailDelivery.reason}`);
      }
    } catch (mailErr) {
      console.error(`⚠️ [Velora Email Error] Could not deliver email to ${normalizedEmail}:`, mailErr.message);
    }

    res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      emailDispatched: emailDelivery.sent,
      // Only include devCode fallback if real email failed or SMTP is not set up
      devCode: (!emailDelivery.sent && process.env.NODE_ENV !== 'production') ? otp : undefined,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Verify OTP and sign in / register user
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, name, password, designation } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and the 6-digit verification code.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const stored = otpStore.get(normalizedEmail);

    if (!stored) {
      return res.status(400).json({
        success: false,
        error: 'No verification code was requested for this email, or it has expired.',
      });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      });
    }

    if (stored.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return res.status(429).json({
        success: false,
        error: 'Too many incorrect attempts. Please request a new verification code.',
      });
    }

    if (stored.otp !== otp.toString().trim()) {
      stored.attempts += 1;
      return res.status(400).json({
        success: false,
        error: 'Incorrect verification code. Please check and try again.',
      });
    }

    // OTP is valid! Clear it
    otpStore.delete(normalizedEmail);

    // Find or create user
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      console.log(`[Auth:VerifyOtp] Existing user found: ${user._id} (${normalizedEmail})`);
      user.lastActive = new Date();
      if (name && name.trim() && user.name !== name.trim()) {
        user.name = name.trim();
        user.initials = name
          .trim()
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
      }
      if (password && password.trim().length >= 6) {
        console.log(`[Auth:VerifyOtp] Updating password for existing user`);
        user.password = password.trim();
      }
      if (designation && ['mentor', 'intern', 'trainee', 'other'].includes(designation)) {
        user.designation = designation;
      }
      await user.save();
      console.log(`[Auth:VerifyOtp] User saved successfully`);
    } else {
      console.log(`[Auth:VerifyOtp] Creating new user for: ${normalizedEmail}`);
      const count = await User.countDocuments();
      const assignedRole = count === 0 ? 'owner' : 'member';
      const displayName = name?.trim() || normalizedEmail.split('@')[0];
      const validDesignation = ['mentor', 'intern', 'trainee'].includes(designation)
        ? designation
        : 'trainee';

      const createData = {
        name: displayName,
        email: normalizedEmail,
        authProvider: password ? 'local' : 'email_otp',
        role: assignedRole,
        designation: validDesignation,
        lastActive: new Date(),
      };

      if (password && password.trim().length >= 6) {
        console.log(`[Auth:VerifyOtp] Setting password for new user`);
        createData.password = password.trim();
      }

      user = await User.create(createData);
      console.log(`[Auth:VerifyOtp] New user created with ID: ${user._id}`);
    }

    // Issue JWT session token
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
        designation: user.designation,
        status: user.status,
        avatar: user.avatar,
        privacySettings: user.privacySettings,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  googleSignIn,
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile,
  updatePassword,
};
