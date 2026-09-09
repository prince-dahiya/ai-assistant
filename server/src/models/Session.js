const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    deviceInfo: {
      type: String,
      default: "Unknown device",
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically remove expired sessions from MongoDB
sessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("Session", sessionSchema);