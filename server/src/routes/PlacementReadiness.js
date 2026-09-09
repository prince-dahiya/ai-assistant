const express = require("express");

const {
  generatePlacementReadiness,
  getLatestPlacementReadiness,
  getPlacementReadinessHistory,
} = require("../controllers/placementReadinessController.js");

const {
  protect,
  studentOnly,
  mentorOnly,
  adminOnly,
} = require("../middleware/auth.js");

const router = express.Router();

// Generate placement readiness → Student
router.post(
  "/generate",
  protect,
  studentOnly,
  generatePlacementReadiness
);

// View latest placement readiness → Student, Mentor, Administrator
router.get(
  "/latest",
  protect,
  getLatestPlacementReadiness
);

// View history → Student, Mentor, Administrator
router.get(
  "/history",
  protect,
  getPlacementReadinessHistory
);

module.exports = router;