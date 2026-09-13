const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[Database] ERROR: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  if (uri.includes('<db_username>')) {
    console.warn(
      '\n⚠️ [Database Warning]: The MONGODB_URI still contains the placeholder "<db_username>".\n' +
      'Please replace "<db_username>" in backend/.env with your actual MongoDB Atlas database username.\n'
    );
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database] Connection Error: ${error.message}`);
    // If running in development, we don't necessarily want to crash the whole server
    // so API routes can still report DB status, but we log the full failure.
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('[Database] MongoDB connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database] MongoDB connection error: ${err}`);
});

module.exports = connectDB;
