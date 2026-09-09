const express = require("express");

const {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/authcontroller.js");

const { protect } = require("../middleware/auth.js");

const router = express.Router();

// =====================================================
// AUTH ROUTES
// =====================================================

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Email verification
router.get("/verify-email/:token", verifyEmail);

// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password
router.post("/reset-password/:token", resetPassword);

// Get current logged-in user
router.get("/me", protect, getMe);

module.exports = router;