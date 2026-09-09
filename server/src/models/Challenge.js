const mongoose = require("mongoose");

const ChallengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ["HR", "Technical", "Aptitude", "Domain-Specific"],
      required: true,
    },

    domain: {
      type: String,
      default: "General",
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },

    frequency: {
      type: String,
      enum: ["daily", "weekly"],
      required: true,
    },

    dateKey: {
      type: String,
      required: true,
      index: true,
    },

    question: {
      type: String,
      required: true,
    },

    timeLimit: {
      type: Number,
      default: 10,
    },

    maxScore: {
      type: Number,
      default: 100,
    },

    participants: {
      type: Number,
      default: 0,
    },

    completedBy: {
      type: Number,
      default: 0,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

ChallengeSchema.index(
  {
    frequency: 1,
    dateKey: 1,
    category: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("Challenge", ChallengeSchema);
