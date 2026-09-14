const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const initChatSocket = require('./chatSocket');
const initMeetingSocket = require('./meetingSocket');

function initializeSockets(server, allowedOrigins) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware (optional for guests, required for identified users)
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        socket.handshake.query?.token;

      if (token) {
        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET || 'velora_secret');
        } catch (verr) {
          decoded = jwt.verify(token, 'velora_super_secret_jwt_key_2026_change_in_production');
        }
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          socket.user = user;
        }
      }
      next();
    } catch (err) {
      // Allow guest socket connection for public / link meetings, but without user attachment
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket Connected]: ${socket.id} (${socket.user ? socket.user.name : 'Guest'})`);

    // Auto-join personal rooms for notifications, invites, and message alerts
    if (socket.user) {
      const userIdStr = socket.user._id.toString();
      socket.join(`user:${userIdStr}`);
      if (socket.user.email) {
        socket.join(`user:${socket.user.email.toLowerCase()}`);
      }

      // Automatically join all conversations the user is a participant in
      const Conversation = require('../models/Conversation');
      Conversation.find({ 'participants.user': socket.user._id })
        .select('_id')
        .then((convos) => {
          convos.forEach((c) => {
            socket.join(`conversation:${c._id.toString()}`);
          });
        })
        .catch(() => {});
    }

    // Register Chat and Meeting handlers
    initChatSocket(io, socket);
    initMeetingSocket(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket Disconnected]: ${socket.id} (User: ${socket.user ? socket.user.name : 'Guest'}, Reason: ${reason})`);
    });
  });

  return io;
}

module.exports = initializeSockets;
