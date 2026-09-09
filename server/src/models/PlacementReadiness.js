const mongoose = require("mongoose");

const RoadmapSchema = new mongoose.Schema(
  {
    technologies: {
      type: [String],
      default: [],
    },

    projects: {
      type: [String],
      default: [],
    },

    certifications: {
      type: [String],
      default: [],
    },

    interviewTopics: {
      type: [String],
      default: [],
    },

    communicationImprovements: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const PlacementReadinessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  candidateType: {
    type: String,
    enum: ["fresher", "internship_seeker", "experienced"],
    required: true,
  },

  readinessScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },

  category: {
    type: String,
    enum: [
      "Placement Ready",
      "Needs Improvement",
      "High Potential Candidate",
    ],
    required: true,
  },

  resumeScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  interviewScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  skillScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  resumeSkills: {
    type: [String],
    default: [],
  },

  weakTechnicalAreas: {
    type: [String],
    default: [],
  },

  communicationGaps: {
    type: [String],
    default: [],
  },

  missingIndustrySkills: {
    type: [String],
    default: [],
  },

  roadmap: {
    type: RoadmapSchema,
    default: () => ({}),
  },

  interviewHistory: [
    {
      interviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview",
      },

      domain: String,

      score: {
        type: Number,
        min: 0,
        max: 100,
      },

      performance: {
        type: String,
        enum: ["weak", "average", "strong"],
      },

      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  previousReadinessScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },

  improvement: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "PlacementReadiness",
  PlacementReadinessSchema
);