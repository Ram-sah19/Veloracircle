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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'velora_secret');
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

    // Register Chat and Meeting handlers
    initChatSocket(io, socket);
    initMeetingSocket(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected]: ${socket.id}`);
    });
  });

  return io;
}

module.exports = initializeSockets;
