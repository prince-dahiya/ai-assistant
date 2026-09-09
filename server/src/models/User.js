const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    minlength: 8,
  },

  // =====================================================
  // TASK 6 - ROLE BASED ACCESS CONTROL
  // =====================================================

  role: {
    type: String,
    enum: [
      "Student",
      "Mentor",
      "Administrator",
    ],
    default: "Student",
    required: true,
  },

  // =====================================================
  // TASK 5 - ENTERPRISE AUTHENTICATION & SECURITY
  // =====================================================

  isEmailVerified: {
    type: Boolean,
    default: false,
  },

  emailVerificationToken: {
    type: String,
    default: null,
  },

  emailVerificationExpires: {
    type: Date,
    default: null,
  },

  // Password reset
  passwordResetToken: {
    type: String,
    default: null,
  },

  passwordResetExpires: {
    type: Date,
    default: null,
  },

  // Account lockout
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },

  accountLockedUntil: {
    type: Date,
    default: null,
  },

  // Password policy
  passwordChangedAt: {
    type: Date,
    default: null,
  },

  passwordExpiresAt: {
    type: Date,
    default: null,
  },

  // Login activity
  lastLoginAt: {
    type: Date,
    default: null,
  },

  lastLoginIP: {
    type: String,
    default: null,
  },

  lastLoginDevice: {
    type: String,
    default: null,
  },

  // Security alerts
  securityAlert: {
    type: Boolean,
    default: false,
  },

  // =====================================================
  // TASK 4 - GAMIFICATION
  // =====================================================

  xp: {
    type: Number,
    default: 0,
  },

  totalChallenges: {
    type: Number,
    default: 0,
  },

  completedChallenges: {
    type: Number,
    default: 0,
  },

  currentStreak: {
    type: Number,
    default: 0,
  },

  longestStreak: {
    type: Number,
    default: 0,
  },

  lastChallengeDate: {
    type: Date,
    default: null,
  },

  badges: {
    type: [String],
    default: [],
  },

  rank: {
    type: String,
    default: "Rookie",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// =====================================================
// PASSWORD HASHING
// =====================================================

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(
    this.password,
    10
  );

  next();
});

// =====================================================
// COMPARE PASSWORD
// =====================================================

userSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return await bcrypt.compare(
    candidatePassword,
    this.password
  );
};

// =====================================================
// CHECK ACCOUNT LOCK
// =====================================================

userSchema.methods.isAccountLocked = function () {
  if (!this.accountLockedUntil) {
    return false;
  }

  return this.accountLockedUntil > new Date();
};

module.exports = mongoose.model(
  "User",
  userSchema
);