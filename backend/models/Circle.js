const mongoose = require('mongoose');
const { ROLES, PRIVACY_LEVELS } = require('../config/constants');

const circleMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const circleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Circle name is required'],
      trim: true,
      maxlength: [80, 'Circle name cannot exceed 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    privacy: {
      type: String,
      enum: Object.values(PRIVACY_LEVELS),
      default: PRIVACY_LEVELS.PRIVATE,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [circleMemberSchema],
    settings: {
      hideMemberCount: {
        type: Boolean,
        default: true,
      },
      hideMemberDirectory: {
        type: Boolean,
        default: true,
      },
      hideOnlineStatus: {
        type: Boolean,
        default: true,
      },
      disableJoinLeaveNotifications: {
        type: Boolean,
        default: true,
      },
      restrictInvitations: {
        type: Boolean,
        default: true,
      },
    },
    pinnedMessage: {
      body: { type: String, default: null },
      author: { type: String, default: null },
      pinnedAt: { type: Date, default: null },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for member count (only used internally / by admin)
circleSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length : 0;
});

module.exports = mongoose.model('Circle', circleSchema);
