const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },
  authorID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['thoughts', 'moments', 'events'],
    default: 'thoughts'
  },
  static_url: {
    type: String
  },
  type: {
    type: String
  },
  likes: [{
    type: String
  }],
  comments: [{
    by: String,
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastEditedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Post', postSchema);


