const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["ai", "user"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ProgressionSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    required: true,
  },

  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    required: true,
  },

  performance: {
    type: String,
    enum: ["weak", "average", "strong"],
    required: true,
  },

  score: {
    type: Number,
    min: 0,
    max: 100,
  },

  skipped: {
    type: Boolean,
    default: false,
  },

  question: {
    type: String,
  },
});

const InterviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  domain: {
    type: String,
    
    required: true,
  },
  
  company: {
  type: String,
  default: "General",
},

  score: {
    type: Number,
    default: 0,
  },

  duration: {
    type: Number,
    default: 0,
  },

  questionsAnswered: {
    type: Number,
    default: 0,
  },

  messages: [MessageSchema],

  feedback: {
    type: String,
    default: "",
  },

  // Current difficulty of the interview
  currentDifficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },

  // Candidate's performance progression
  progression: {
    type: [ProgressionSchema],
    default: [],
  },

  // Questions already asked by AI
  askedQuestions: {
    type: [String],
    default: [],
  },

  // Number of skipped questions
  skippedQuestions: {
    type: Number,
    default: 0,
  },

  // Final AI-generated interview report
  finalReport: {
    type: String,
    default: "",
  },

  isComplete: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Interview", InterviewSchema);