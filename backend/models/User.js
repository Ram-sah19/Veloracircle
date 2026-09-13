const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId && this.authProvider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password hash by default
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'email_otp'],
      default: 'local',
    },
    handle: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    initials: {
      type: String,
      default: function () {
        if (!this.name) return 'VC';
        return this.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
      },
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    designation: {
      type: String,
      enum: ['mentor', 'intern', 'trainee', 'other'],
      default: 'trainee',
    },
    status: {
      type: String,
      default: 'Available',
      maxlength: [150, 'Status message cannot exceed 150 characters'],
    },
    avatar: {
      type: String,
      default: null,
    },
    privacySettings: {
      onlineVisibility: {
        type: String,
        enum: ['everyone', 'circles_only', 'nobody'],
        default: 'circles_only',
      },
      allowInvites: {
        type: String,
        enum: ['everyone', 'verified_only', 'nobody'],
        default: 'everyone',
      },
      showReadReceipts: {
        type: Boolean,
        default: true,
      },
      allowMessageForwarding: {
        type: Boolean,
        default: false,
      },
      allowFileDownloads: {
        type: Boolean,
        default: true,
      },
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: generate handle if missing & hash password
userSchema.pre('save', async function (next) {
  if (this.isModified('name') && !this.handle) {
    const base = this.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    this.handle = `@${base}`;
  }

  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate signed JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, email: this.email },
    process.env.JWT_SECRET || 'velora_secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

module.exports = mongoose.model('User', userSchema);
