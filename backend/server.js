require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const initializeSockets = require('./sockets/socketHandler');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const circleRoutes = require('./routes/circleRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const fileRoutes = require('./routes/fileRoutes');
const savedRoutes = require('./routes/savedRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS origin parsing
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

// Security: Helmet headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Security: CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// Security: Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', generalLimiter);

// Stricter rate limit for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, error: 'Too many login attempts. Please try again after 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder
const uploadPath = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadPath));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/circles', circleRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/conversations/:conversationId/messages', messageRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'ok',
    name: 'Velora Circle API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
    features: {
      realTimeMessaging: 'Socket.io',
      realTimeMeetings: 'WebRTC Signaling',
      fileSharing: 'Encrypted at rest',
      privacyArchitecture: 'Strict Role-Based Field Filtering',
    },
  });
});

// Root API Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Velora Circle API',
    version: '1.0.0',
    status: 'online',
    healthCheck: '/api/health',
    docs: '/api/health',
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Initialize Socket.io atop HTTP Server
const io = initializeSockets(httpServer, allowedOrigins);

// Start HTTP + Socket Server
httpServer.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Velora Circle Backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📡 WebSockets & WebRTC signaling ready`);
  console.log(`🔒 Privacy & MVC Architecture loaded`);
  console.log(`======================================================\n`);
});

// Graceful Shutdown Handler
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down gracefully...');
  await mongoose.connection.close();
  httpServer.close(() => {
    console.log('[Server] HTTP and Socket server closed.');
    process.exit(0);
  });
});

module.exports = { app, httpServer, io };
