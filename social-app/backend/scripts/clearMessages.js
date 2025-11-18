const mongoose = require('mongoose');
const Message = require('../models/Message');

const connectDB = require('../config/database');

async function clearMessages() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Delete all messages
    const result = await Message.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} messages from the database.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing messages:', error);
    process.exit(1);
  }
}

clearMessages();

