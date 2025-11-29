const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PIIChecker = require('../middleware/PIIChecker');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedExtensions = /\.(jpeg|jpg|png|gif|mp4|mov|avi)$/i;
    const allowedMimeTypes = /^(image|video)\//;
    const extname = allowedExtensions.test(path.extname(file.originalname));
    const mimetype = allowedMimeTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'));
    }
  }
});

// POST /api/posts - Create a new post
router.post('/', upload.single('media'), PIIChecker, async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { title, caption, category } = req.body;
    
    // Determine file type
    let fileType = null;
    let staticUrl = null;
    
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
        fileType = ext.replace('.', '');
      } else if (['.mp4', '.mov', '.avi'].includes(ext)) {
        fileType = 'video';
      }
      staticUrl = `/uploads/${req.file.filename}`;
    }

    // Create post
    const post = new Post({
      author: `${user.firstName} ${user.lastName}`,
      authorID: user._id,
      title: title || '',
      caption: caption || '',
      category: category || 'thoughts',
      static_url: staticUrl,
      type: fileType,
      likes: [],
      comments: []
    });

    await post.save();

    res.json({
      success: true,
      post: {
        _id: post._id,
        author: post.author,
        title: post.title,
        caption: post.caption,
        category: post.category,
        static_url: post.static_url,
        type: post.type,
        createdAt: post.createdAt
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Error creating post' });
  }
});

// POST /api/posts/:postId/like - Toggle like on a post
router.post('/:postId/like', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const username = user.username;
    const likes = post.likes || [];
    const index = likes.indexOf(username);

    if (index > -1) {
      // Unlike
      likes.splice(index, 1);
    } else {
      // Like
      likes.push(username);
    }

    post.likes = likes;
    await post.save();

    res.json({
      success: true,
      likes: post.likes,
      liked: !(index > -1)
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Error liking post' });
  }
});

// POST /api/posts/:postId/comment - Add a comment to a post
router.post('/:postId/comment', PIIChecker, async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = {
      by: user.username,
      text: text.trim(),
      createdAt: new Date()
    };

    post.comments = post.comments || [];
    post.comments.push(comment);
    await post.save();

    res.json({
      success: true,
      comment: comment,
      comments: post.comments
    });
  } catch (error) {
    console.error('Comment post error:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

// DELETE /api/posts/:postId - Delete a post
router.delete('/:postId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if user is the author
    if (post.authorID.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete the post
    await Post.findByIdAndDelete(req.params.postId);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Error deleting post' });
  }
});

// DELETE /api/posts/:postId/comments/:commentIndex - Delete a comment
router.delete('/:postId/comments/:commentIndex', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const commentIndex = parseInt(req.params.commentIndex);
    if (isNaN(commentIndex) || commentIndex < 0 || commentIndex >= post.comments.length) {
      return res.status(400).json({ error: 'Invalid comment index' });
    }

    const comment = post.comments[commentIndex];
    
    // Check if user is the comment author
    if (comment.by !== user.username) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Remove the comment
    post.comments.splice(commentIndex, 1);
    await post.save();

    res.json({
      success: true,
      comments: post.comments,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Error deleting comment' });
  }
});

module.exports = router;

