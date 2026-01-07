const express = require('express');
const router = express.Router();
const {
  getHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight
} = require('../controllers/highlightController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getHighlights);
router.post('/', protect, authorize('admin'), createHighlight);
router.put('/:id', protect, authorize('admin'), updateHighlight);
router.delete('/:id', protect, authorize('admin'), deleteHighlight);

module.exports = router;

