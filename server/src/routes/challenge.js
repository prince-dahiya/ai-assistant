const express = require("express");

const {
  getDailyChallenge,
  getWeeklyChallenge,
  submitChallenge,
  getLeaderboard,
  getChallengeStats,
} = require("../controllers/challengecontroller.js");

const {
  protect,
  studentOnly,
} = require("../middleware/auth.js");

const router = express.Router();

// =====================================================
// ALL CHALLENGE ROUTES REQUIRE LOGIN
// =====================================================

router.use(protect);

// =====================================================
// DAILY CHALLENGE
// STUDENTS ONLY
// =====================================================

router.get(
  "/daily",
  studentOnly,
  getDailyChallenge
);

// =====================================================
// WEEKLY CHALLENGE
// STUDENTS ONLY
// =====================================================

router.get(
  "/weekly",
  studentOnly,
  getWeeklyChallenge
);

// =====================================================
// SUBMIT CHALLENGE
// STUDENTS ONLY
// =====================================================

router.post(
  "/submit",
  studentOnly,
  submitChallenge
);

// =====================================================
// LEADERBOARD
// ANY AUTHENTICATED USER
// =====================================================

router.get(
  "/leaderboard",
  getLeaderboard
);

// =====================================================
// CURRENT USER CHALLENGE STATS
// STUDENTS ONLY
// =====================================================

router.get(
  "/stats",
  studentOnly,
  getChallengeStats
);

module.exports = router;