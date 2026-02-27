const express = require('express');
const router = express.Router();
const {
  getForumMessages,
  sendForumMessage
} = require('../controllers/forumMessageController');
const { protect } = require('../middleware/auth');

// Public route - anyone can view forum messages
router.get('/:forumId', getForumMessages);

// Forum head only route - only head can send messages
router.post('/', protect, sendForumMessage);

module.exports = router;
