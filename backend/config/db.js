const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
      setTimeout(() => connectDB(), RETRY_DELAY);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

  } catch (error) {
    console.error(`❌ MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
    if (retryCount < MAX_RETRIES - 1) {
      console.log(`🔄 Retrying in ${RETRY_DELAY / 1000} seconds...`);
      setTimeout(() => connectDB(retryCount + 1), RETRY_DELAY);
    } else {
      console.error('💀 Max retries reached. Exiting process.');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
