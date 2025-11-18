const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');

// GET /api/home - Get home page data with posts feed
router.get('/home', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all posts with user info
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('authorID', 'username firstName lastName')
      .lean();

    // Format posts similar to spruce
    const formattedPosts = await Promise.all(posts.map(async (post) => {
      const postUser = await User.findById(post.authorID).select('username firstName lastName');
      return {
        user: {
          username: postUser.username,
          firstName: postUser.firstName,
          lastName: postUser.lastName
        },
        post: {
          _id: post._id,
          author: post.author,
          authorID: post.authorID._id || post.authorID,
          caption: post.caption,
          category: post.category,
          static_url: post.static_url,
          type: post.type,
          likes: post.likes || [],
          comments: post.comments || [],
          createdAt: post.createdAt,
          timeago: getTimeAgo(post.createdAt)
        }
      };
    }));

    res.json({ 
      success: true,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      posts: formattedPosts
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return seconds + ' seconds ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + ' minutes ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' hours ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + ' days ago';
  const months = Math.floor(days / 30);
  if (months < 12) return months + ' months ago';
  const years = Math.floor(months / 12);
  return years + ' years ago';
}

module.exports = router;
