const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, password, firstName, lastName, day, month, year } = req.body;

    // Validation
    if (!username || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Please fill in all required fields' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Username already taken' 
      });
    }

    // Create date of birth
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'Aug': 7, 'Sept': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const dateOfBirth = day && month && year 
      ? new Date(year, monthMap[month] || 0, day)
      : null;

    // Create user
    const user = new User({
      username: username.toLowerCase(),
      password,
      firstName,
      lastName,
      dateOfBirth
    });

    await user.save();

    // Set session
    req.session.userId = user._id;
    req.session.username = user.username;

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: error.message.includes('duplicate') 
        ? 'Username already taken' 
        : 'An error occurred. Please try again.' 
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Please provide both username and password' 
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Invalid username or password' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set session
    req.session.userId = user._id;
    req.session.username = user.username;

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'An error occurred. Please try again.' 
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/me - Get current user
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  User.findById(req.session.userId)
    .select('-password')
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    })
    .catch(error => {
      res.status(500).json({ error: 'Error fetching user' });
    });
});

module.exports = router;
