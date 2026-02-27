const express = require('express');
const router = express.Router();
const {
  getPolls,
  getPollByType,
  createPoll,
  votePoll,
  getPollResults
} = require('../controllers/pollController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getPolls);
router.get('/:type', getPollByType);
router.get('/:id/results', getPollResults);
router.post('/', protect, authorize('admin'), createPoll);
router.post('/:id/vote', protect, votePoll);

module.exports = router;

