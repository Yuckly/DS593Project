const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');

// GET /api/friends - Get friends list
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId)
      .populate('friends', 'username firstName lastName');

    res.json({
      success: true,
      friends: user.friends || []
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Error fetching friends' });
  }
});

// GET /api/friends/messages/:friendId - Get messages with a friend
router.get('/messages/:friendId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { friendId } = req.params;
    const roomId = Message.createRoomId(req.session.userId, friendId);

    const messages = await Message.find({ roomId })
      .populate('from', 'username firstName lastName')
      .populate('to', 'username firstName lastName')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// POST /api/friends/messages - Send a message
router.post('/messages', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { to, text } = req.body;

    if (!to || !text) {
      return res.status(400).json({ error: 'Recipient and message text required' });
    }

    // Verify they are friends
    const currentUser = await User.findById(req.session.userId);
    const isFriend = currentUser.friends.some(
      friendId => friendId.toString() === to
    );

    if (!isFriend) {
      return res.status(403).json({ error: 'You can only message friends' });
    }

    const roomId = Message.createRoomId(req.session.userId, to);

    const message = new Message({
      roomId,
      from: req.session.userId,
      to,
      text
    });

    await message.save();

    // Populate user info
    await message.populate('from', 'username firstName lastName');
    await message.populate('to', 'username firstName lastName');

    res.json({
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

module.exports = router;


