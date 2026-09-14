const mongoose = require('mongoose');
const { MESSAGE_KINDS } = require('../config/constants');

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const readBySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, trim: true, default: '' },
    kind: {
      type: String,
      enum: Object.values(MESSAGE_KINDS),
      default: MESSAGE_KINDS.TEXT,
    },
    file: {
      name: { type: String, default: null },
      size: { type: String, default: null },
      url: { type: String, default: null },
      mimeType: { type: String, default: null },
      duration: { type: String, default: null },
    },
    replyTo: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
      author: { type: String, default: null },
      body: { type: String, default: null },
    },
    reactions: [reactionSchema],
    readBy: [readBySchema],
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pinnedAt: { type: Date, default: null },
    poll: {
      question: { type: String, default: null },
      options: [
        {
          text: { type: String },
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        },
      ],
      closedAt: { type: Date, default: null },
    },
    codeLang: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, body: 'text' });

module.exports = mongoose.model('Message', messageSchema);
