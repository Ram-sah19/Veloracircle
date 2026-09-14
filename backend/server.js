require('dotenv').config();
const http = require('http');
const path = require('path');
const cluster = require('cluster');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const initializeSockets = require('./sockets/socketHandler');
const errorHandler = require('./middleware/errorHandler');
const cache = require('./config/cache');
const queue = require('./config/queue');

// Route imports
const authRoutes = require('./routes/authRoutes');
const circleRoutes = require('./routes/circleRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const fileRoutes = require('./routes/fileRoutes');
const savedRoutes = require('./routes/savedRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mentorshipRoutes = require('./routes/mentorshipRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pushRoutes = require('./routes/pushRoutes');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// HTTP Response Compression (optional if installed)
try {
  const compression = require('compression');
  app.use(compression());
} catch {
  // compression optional
}

// Connect to MongoDB
connectDB();

// CORS origin parsing
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

// Initialize Socket.io atop HTTP Server early so controllers can access it
const io = initializeSockets(httpServer, allowedOrigins);

// Support Socket.IO cross-worker cluster adapter if running in cluster mode
if (cluster.isWorker) {
  try {
    const { createAdapter } = require('@socket.io/cluster-adapter');
    io.adapter(createAdapter());
  } catch {
    // cluster adapter fallback
  }
}

app.set('io', io);

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
app.use('/api/mentorship', mentorshipRoutes);
app.use('/api/push', pushRoutes);

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
    process: {
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
    },
    cluster: {
      isClusterWorker: Boolean(cluster.isWorker),
      workerId: cluster.worker ? cluster.worker.id : null,
    },
    cache: cache.getStatus(),
    queue: queue.getStatus(),
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
      lastError: connectDB.getLastError ? connectDB.getLastError() : null,
    },
    features: {
      realTimeMessaging: 'Socket.io',
      realTimeMeetings: 'WebRTC Signaling',
      fileSharing: 'Encrypted at rest',
      privacyArchitecture: 'Strict Role-Based Field Filtering',
      inMemoryCache: 'Enabled',
      asyncQueue: 'Enabled',
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

// Manual DB Reconnect Trigger
app.post('/api/health/reconnect', async (req, res) => {
  try {
    await connectDB();
    const ready = mongoose.connection.readyState;
    res.json({
      success: ready === 1,
      readyState: ready,
      status: ready === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host || null,
      error: connectDB.getLastError ? connectDB.getLastError() : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SMTP Test Trigger
app.get('/api/health/test-smtp', async (req, res) => {
  try {
    const { sendOtpEmail } = require('./config/emailService');
    const result = await sendOtpEmail({
      email: process.env.SMTP_USER || 'veloraglobal.hr@gmail.com',
      otp: '123456',
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      smtpUser: process.env.SMTP_USER,
      passLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0,
    });
  }
});

// Centralized Error Handling Middleware
app.use(errorHandler);

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
