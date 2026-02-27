const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  likeMessage
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/', getMessages);
router.post('/', protect, sendMessage);
router.post('/:id/like', protect, likeMessage);

module.exports = router;

