const mongoose = require("mongoose");

const ChallengeAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },

    answer: {
      type: String,
      default: "",
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    performance: {
      type: String,
      enum: ["weak", "average", "strong"],
      default: "average",
    },

    feedback: {
      type: String,
      default: "",
    },

    completed: {
      type: Boolean,
      default: false,
    },

    timeTaken: {
      type: Number,
      default: 0,
    },

    rankAtCompletion: {
      type: Number,
      default: 0,
    },

    xpEarned: {
      type: Number,
      default: 0,
    },

    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

ChallengeAttemptSchema.index(
  {
    userId: 1,
    challengeId: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model(
  "ChallengeAttempt",
  ChallengeAttemptSchema,
);