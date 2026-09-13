const mongoose = require('mongoose');
const { CONVERSATION_KINDS } = require('../config/constants');

const participantStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: Object.values(CONVERSATION_KINDS),
      required: true,
      default: CONVERSATION_KINDS.DIRECT,
    },
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      default: null,
    },
    participants: [participantStateSchema],
    lastMessage: {
      body: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      senderName: { type: String, default: '' },
      sentAt: { type: Date, default: Date.now },
      kind: { type: String, default: 'text' },
    },
    privacy: {
      type: String,
      default: 'Private conversation',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by participant user ID
conversationSchema.index({ 'participants.user': 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
