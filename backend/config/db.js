const dns = require('dns');
const mongoose = require('mongoose');

// Fix for Windows / ISP DNS resolvers failing on MongoDB Atlas SRV lookups (querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // fallback if environment restricts setting custom dns servers
}

let lastError = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[Database] ERROR: MONGODB_URI is not defined in environment variables.');
    lastError = 'MONGODB_URI is not defined';
    return;
  }

  if (uri.includes('<db_username>')) {
    lastError = 'MONGODB_URI still contains placeholder <db_username>';
    console.warn(
      '\n⚠️ [Database Warning]: The MONGODB_URI still contains the placeholder "<db_username>".\n' +
      'Please replace "<db_username>" in backend/.env with your actual MongoDB Atlas database username.\n'
    );
  }

  try {
    const conn = await mongoose.connect(uri);
    lastError = null;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    lastError = error.message;
    console.error(`[Database] Connection Error: ${error.message}`);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('[Database] MongoDB connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  lastError = err.message;
  console.error(`[Database] MongoDB connection error: ${err}`);
});

module.exports = connectDB;
module.exports.getLastError = () => lastError;

