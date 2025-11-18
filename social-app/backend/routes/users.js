const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users/search?q=username - Search users by username
router.get('/search', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const query = req.query.q || '';
    if (!query) {
      return res.json({ users: [] });
    }

    const currentUser = await User.findById(req.session.userId);
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.session.userId } // Exclude current user
    })
    .select('username firstName lastName friends friendRequests')
    .limit(10)
    .lean();

    // Add friend status to each user
    const usersWithStatus = users.map(user => {
      const isFriend = currentUser.friends.some(
        friendId => friendId.toString() === user._id.toString()
      );
      // Check if current user sent a request to this user
      const hasPendingRequest = user.friendRequests?.some(
        req => req.from.toString() === currentUser._id.toString() && req.status === 'pending'
      );
      // Check if this user sent a request to current user
      const hasReceivedRequest = currentUser.friendRequests?.some(
        req => req.from.toString() === user._id.toString() && req.status === 'pending'
      );

      return {
        ...user,
        isFriend,
        hasPendingRequest,
        hasReceivedRequest
      };
    });

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Error searching users' });
  }
});

// POST /api/users/friend-request - Send friend request
router.post('/friend-request', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { userId, username } = req.body;
    if (!userId && !username) {
      return res.status(400).json({ error: 'User ID or username required' });
    }

    const currentUser = await User.findById(req.session.userId);
    let targetUser;
    
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (username) {
      targetUser = await User.findOne({ username: username.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUserId = targetUser._id.toString();

    // Check if already friends
    if (currentUser.friends.some(friendId => friendId.toString() === targetUserId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already exists (check target user's friendRequests)
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === currentUser._id.toString() && req.status === 'pending'
    );
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Add friend request to target user
    targetUser.friendRequests.push({
      from: currentUser._id,
      status: 'pending'
    });

    // Add notification to target user
    targetUser.notifications.push({
      type: 'friend_request',
      from: currentUser._id,
      message: `${currentUser.username} sent you a friend request`,
      read: false
    });

    await targetUser.save();

    res.json({ success: true, message: 'Friend request sent' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Error sending friend request' });
  }
});

// POST /api/users/friend-request/respond - Accept or reject friend request
router.post('/friend-request/respond', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { requestId, action } = req.body; // action: 'accept' or 'reject'
    if (!requestId || !action) {
      return res.status(400).json({ error: 'Request ID and action required' });
    }

    const currentUser = await User.findById(req.session.userId);
    const request = currentUser.friendRequests.id(requestId);

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const requester = await User.findById(request.from);

    if (action === 'accept') {
      // Add to friends list for both users
      if (!currentUser.friends.some(friendId => friendId.toString() === request.from.toString())) {
        currentUser.friends.push(request.from);
      }
      if (!requester.friends.some(friendId => friendId.toString() === currentUser._id.toString())) {
        requester.friends.push(currentUser._id);
      }

      // Add notification to requester
      requester.notifications.push({
        type: 'friend_accepted',
        from: currentUser._id,
        message: `${currentUser.username} accepted your friend request`,
        read: false
      });

      request.status = 'accepted';
    } else {
      request.status = 'rejected';
    }

    await currentUser.save();
    await requester.save();

    res.json({ success: true, message: `Friend request ${action}ed` });
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ error: 'Error processing friend request' });
  }
});

// GET /api/users/notifications - Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId)
      .populate('notifications.from', 'username firstName lastName')
      .populate('friendRequests.from', 'username firstName lastName');

    // Get pending friend requests (requests sent TO current user)
    const pendingRequests = (user.friendRequests || [])
      .filter(req => req.status === 'pending')
      .map(req => ({
        _id: req._id,
        from: req.from,
        status: req.status,
        createdAt: req.createdAt
      }));

    res.json({
      notifications: user.notifications || [],
      pendingFriendRequests: pendingRequests
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// POST /api/users/notifications/mark-read - Mark notifications as read
router.post('/notifications/mark-read', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    
    // Mark all notifications as read
    if (user.notifications && user.notifications.length > 0) {
      user.notifications.forEach(notif => {
        notif.read = true;
      });
      await user.save();
    }

    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({ error: 'Error marking notifications as read' });
  }
});

module.exports = router;

