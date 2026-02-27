const express = require('express');
const router = express.Router();
const {
  getHighlights,
  getHighlight,
  createHighlight,
  updateHighlight,
  deleteHighlight,
  addComment,
  replyToComment,
  likeComment
} = require('../controllers/highlightController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getHighlights);
router.post('/', protect, authorize('admin'), createHighlight);
// Comment routes must come before /:id to avoid route conflicts
router.post('/:id/comments', protect, addComment);
router.post('/:id/comments/:commentId/reply', protect, replyToComment);
router.post('/:id/comments/:commentId/like', protect, likeComment);
router.get('/:id', getHighlight);
router.put('/:id', protect, authorize('admin'), updateHighlight);
router.delete('/:id', protect, authorize('admin'), deleteHighlight);

module.exports = router;

