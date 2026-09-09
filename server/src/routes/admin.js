// routes/admin.js

const express = require("express");

const {
  getUsers,
  changeUserRole,
} = require("../controllers/adminController.js");

const {
  protect,
  adminOnly,
} = require("../middleware/auth.js");

const router = express.Router();

// =====================================================
// TASK 6 - ADMINISTRATOR ACCESS
// =====================================================

// Every admin route requires:
// 1. Valid login
// 2. Administrator role
router.use(protect);
router.use(adminOnly);

// =====================================================
// GET ALL USERS
// =====================================================

router.get("/users", getUsers);

// =====================================================
// CHANGE USER ROLE
// =====================================================

router.patch(
  "/users/:userId/role",
  changeUserRole
);

module.exports = router;