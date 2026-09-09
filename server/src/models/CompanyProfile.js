const mongoose = require("mongoose");

const CompanyProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    interviewStyle: {
      type: String,
      required: true,
    },

    questionPattern: {
      type: String,
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    focusAreas: {
      type: [String],
      default: [],
    },

    evaluationCriteria: {
      type: [String],
      default: [],
    },

    passingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "CompanyProfile",
  CompanyProfileSchema
);