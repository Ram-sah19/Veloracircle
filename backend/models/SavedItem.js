const mongoose = require('mongoose');

const savedItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ['message', 'file', 'link'],
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
    },
    fromAuthor: {
      type: String,
      default: '',
    },
    circleName: {
      type: String,
      default: '',
    },
    messageRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    fileRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent saving the exact same message/file twice for the same user
savedItemSchema.index({ user: 1, messageRef: 1 }, { sparse: true });
savedItemSchema.index({ user: 1, fileRef: 1 }, { sparse: true });

module.exports = mongoose.model('SavedItem', savedItemSchema);
