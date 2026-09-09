// controllers/adminController.js

const User = require("../models/User.js");

// =====================================================
// GET ALL USERS
// =====================================================

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select(
        "-password -emailVerificationToken -passwordResetToken"
      )
      .sort({ createdAt: -1 });

    return res.json({
      users,
    });
  } catch (err) {
    console.error("Get users error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// =====================================================
// CHANGE USER ROLE
// =====================================================

const changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const allowedRoles = [
      "Student",
      "Mentor",
      "Administrator",
    ];

    // Validate role
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Prevent administrator from changing own role
    if (user._id.toString() === req.userId.toString()) {
      return res.status(400).json({
        message: "You cannot change your own role",
      });
    }

    // Update role
    user.role = role;

    await user.save();

    return res.json({
      message: "User role updated successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error("Change user role error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  getUsers,
  changeUserRole,
};