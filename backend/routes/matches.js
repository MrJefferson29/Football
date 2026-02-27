const express = require('express');
const router = express.Router();
const {
  getMatches,
  getTodayMatches,
  getMatchesByLeague,
  getMatch,
  createMatch,
  voteMatch,
<<<<<<< HEAD
  updateMatchScore
=======
  updateMatchScore,
  getMatchPools,
  joinMatchPool
>>>>>>> 783ee88 (Your descriptive commit message here)
} = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/auth');

router.get('/today', getTodayMatches);
router.get('/league/:league', getMatchesByLeague);
router.get('/:id', getMatch);
router.get('/', getMatches);
router.post('/', protect, authorize('admin'), createMatch);
router.post('/:id/vote', protect, voteMatch);
router.put('/:id/score', protect, authorize('admin'), updateMatchScore);
<<<<<<< HEAD
=======
router.get('/:id/pools', protect, getMatchPools);
router.post('/:id/pools/join', protect, joinMatchPool);
>>>>>>> 783ee88 (Your descriptive commit message here)

module.exports = router;

