const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    status: {
      type: String,
      enum: ["success", "failed", "blocked", "suspicious"],
      required: true,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    deviceInfo: {
      type: String,
      default: "Unknown device",
    },

    userAgent: {
      type: String,
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    reason: {
      type: String,
      default: null,
    },

    suspicious: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("LoginHistory", loginHistorySchema);