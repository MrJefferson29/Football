const express = require('express');
const router = express.Router();
const {
  getLiveMatches,
  getCurrentMatch,
  getLiveMatch,
  createLiveMatch,
  addComment,
  replyToComment,
  likeComment
} = require('../controllers/liveMatchController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getLiveMatches);
router.get('/current', getCurrentMatch);
router.get('/:id', getLiveMatch);
router.post('/', protect, authorize('admin'), createLiveMatch);
router.post('/:id/comments', protect, addComment);
router.post('/:id/comments/:commentId/reply', protect, replyToComment);
router.post('/:id/comments/:commentId/like', protect, likeComment);

module.exports = router;

