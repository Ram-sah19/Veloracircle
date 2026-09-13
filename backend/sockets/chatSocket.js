const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

function initChatSocket(io, socket) {
  // Join a conversation room
  socket.on('conversation:join', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  // Leave a conversation room
  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // Typing indicators
  socket.on('conversation:typing_start', ({ conversationId, userName }) => {
    socket.to(`conversation:${conversationId}`).emit('conversation:user_typing', {
      conversationId,
      userId: socket.user ? socket.user._id : socket.id,
      userName: userName || (socket.user ? socket.user.name : 'Someone'),
    });
  });

  socket.on('conversation:typing_stop', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('conversation:user_stopped_typing', {
      conversationId,
      userId: socket.user ? socket.user._id : socket.id,
    });
  });

  // Real-time message broadcast
  socket.on('conversation:send_message', async (data) => {
    const { conversationId, body, kind, file, replyTo } = data;
    try {
      if (!conversationId) return;

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.user ? socket.user._id : data.senderId,
        body: body || '',
        kind: kind || 'text',
        file: file || {},
        replyTo: replyTo || {},
      });

      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          body: kind === 'file' ? `[File] ${file?.name || 'Attachment'}` : body || '',
          sender: socket.user ? socket.user._id : data.senderId,
          senderName: socket.user ? socket.user.name : data.senderName,
          sentAt: new Date(),
          kind: kind || 'text',
        },
      });

      const payload = {
        id: message._id,
        conversationId,
        author: socket.user ? socket.user.name : data.senderName,
        initials: socket.user ? socket.user.initials : 'VC',
        time: message.createdAt,
        body: message.body,
        kind: message.kind,
        file: message.file && message.file.url ? message.file : undefined,
        replyTo: message.replyTo && message.replyTo.body ? message.replyTo : undefined,
        reactions: [],
      };

      // Broadcast to all participants in conversation room
      io.to(`conversation:${conversationId}`).emit('conversation:new_message', payload);
    } catch (err) {
      console.error('[Chat Socket Error]:', err.message);
      socket.emit('error', { message: 'Failed to send message via socket' });
    }
  });

  // Real-time reaction update
  socket.on('conversation:reaction', ({ conversationId, messageId, emoji, action }) => {
    io.to(`conversation:${conversationId}`).emit('conversation:reaction_updated', {
      messageId,
      emoji,
      userId: socket.user ? socket.user._id : socket.id,
      action,
    });
  });
}

module.exports = initChatSocket;
