const mongoose = require('mongoose');

const mentorshipInvitationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: { type: String, required: true },
    senderEmail: { type: String, required: true, lowercase: true, trim: true },
    senderHandle: { type: String, default: '' },
    senderInitials: { type: String, default: 'VC' },
    senderDesignation: { type: String, default: 'mentor' },
    senderAvatar: { type: String, default: null },

    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true },
    recipientName: { type: String, required: true },
    recipientHandle: { type: String, default: '' },
    recipientInitials: { type: String, default: 'VC' },
    recipientDesignation: { type: String, default: 'trainee' },
    recipientAvatar: { type: String, default: null },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    note: { type: String, trim: true, default: '' },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

mentorshipInvitationSchema.index({ sender: 1, createdAt: -1 });
mentorshipInvitationSchema.index({ recipientEmail: 1, status: 1 });
mentorshipInvitationSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.model('MentorshipInvitation', mentorshipInvitationSchema);
