const Groq = require("groq-sdk");
const Interview = require("../models/Interview.js");
const PlacementReadiness = require("../models/PlacementReadiness.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// --------------------------------------------------
// Calculate interview score
// --------------------------------------------------
const calculateInterviewScore = (interviews = []) => {
  if (!interviews.length) return 0;

  const total = interviews.reduce(
    (sum, interview) => sum + (interview.score || 0),
    0
  );

  return Math.round(total / interviews.length);
};

// --------------------------------------------------
// Detect performance from interview progression
// --------------------------------------------------
const getPerformance = (interview) => {
  const progression = interview.progression || [];

  if (!progression.length) {
    if (interview.score >= 71) return "strong";
    if (interview.score >= 41) return "average";
    return "weak";
  }

  const average =
    progression.reduce(
      (sum, item) => sum + (item.score || 0),
      0
    ) / progression.length;

  if (average >= 71) return "strong";
  if (average >= 41) return "average";

  return "weak";
};

// --------------------------------------------------
// Calculate readiness category
// --------------------------------------------------
const getCategory = (score, previousScore = null) => {
  if (score >= 80) {
    return "Placement Ready";
  }

  if (
    previousScore !== null &&
    score >= 65 &&
    score > previousScore + 10
  ) {
    return "High Potential Candidate";
  }

  return "Needs Improvement";
};

// --------------------------------------------------
// Generate AI roadmap
// --------------------------------------------------
const generateRoadmap = async ({
  candidateType,
  readinessScore,
  resumeSkills,
  interviewHistory,
  weakTechnicalAreas,
  communicationGaps,
  missingIndustrySkills,
}) => {
  const historyText = interviewHistory.length
    ? interviewHistory
        .map(
          (item) =>
            `Domain: ${item.domain}, Score: ${item.score}, Performance: ${item.performance}`
        )
        .join("\n")
    : "No interview history available.";

  const prompt = `
You are an expert placement coach.

Create a personalized placement improvement roadmap.

Candidate type:
${candidateType}

Current placement readiness score:
${readinessScore}/100

Resume skills:
${resumeSkills.length ? resumeSkills.join(", ") : "No resume skills available"}

Interview history:
${historyText}

Weak technical areas:
${weakTechnicalAreas.length ? weakTechnicalAreas.join(", ") : "None identified"}

Communication gaps:
${communicationGaps.length ? communicationGaps.join(", ") : "None identified"}

Missing industry skills:
${missingIndustrySkills.length ? missingIndustrySkills.join(", ") : "None identified"}

Return ONLY valid JSON.

Use exactly this structure:

{
  "technologies": ["technology 1", "technology 2"],
  "projects": ["project 1", "project 2"],
  "certifications": ["certification 1", "certification 2"],
  "interviewTopics": ["topic 1", "topic 2"],
  "communicationImprovements": ["improvement 1", "improvement 2"]
}

Rules:

1. Recommendations must match the candidate type.
2. Freshers should receive beginner-to-job-ready recommendations.
3. Internship seekers should receive internship-focused technologies and projects.
4. Experienced candidates should receive advanced technologies, system design and leadership-oriented recommendations.
5. Do not recommend skills the candidate already clearly demonstrates unless they need improvement.
6. Focus on the candidate's weak areas.
7. Keep recommendations realistic.
8. Do not return explanations outside JSON.
`.trim();

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.4,
    max_tokens: 700,
  });

  const raw = response.choices[0].message.content.trim();

  try {
    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("AI roadmap did not return JSON");
    }

    return JSON.parse(match[0]);
  } catch (error) {
    console.error("Roadmap parsing error:", error);

    return {
      technologies: [],
      projects: [],
      certifications: [],
      interviewTopics: [],
      communicationImprovements: [],
    };
  }
};

// --------------------------------------------------
// Generate Placement Readiness
// --------------------------------------------------
const generatePlacementReadiness = async (req, res) => {
  try {
    const {
      candidateType,
      resumeSkills = [],
      resumeScore = 0,
      communicationGaps = [],
      missingIndustrySkills = [],
    } = req.body;

    if (!candidateType) {
      return res.status(400).json({
        message:
          "Candidate type is required: fresher, internship_seeker, or experienced",
      });
    }

    const allowedCandidateTypes = [
      "fresher",
      "internship_seeker",
      "experienced",
    ];

    if (!allowedCandidateTypes.includes(candidateType)) {
      return res.status(400).json({
        message: "Invalid candidate type",
      });
    }

    // ----------------------------------------------
    // Get all completed interviews
    // ----------------------------------------------
    const interviews = await Interview.find({
      userId: req.userId,
      isComplete: true,
    }).sort({
      createdAt: 1,
    });

    // ----------------------------------------------
    // Calculate interview score
    // ----------------------------------------------
    const interviewScore = calculateInterviewScore(interviews);

    // ----------------------------------------------
    // Detect weak technical areas
    // ----------------------------------------------
    const weakTechnicalAreas = [];

    interviews.forEach((interview) => {
      const progression = interview.progression || [];

      progression.forEach((item) => {
        if (
          item.performance === "weak" ||
          (item.score !== undefined && item.score < 50)
        ) {
          if (
            item.question &&
            !weakTechnicalAreas.includes(interview.domain)
          ) {
            weakTechnicalAreas.push(interview.domain);
          }
        }
      });
    });

    // ----------------------------------------------
    // Skill score
    //
    // At this stage there is no separate skill
    // assessment system in your project.
    //
    // Therefore resume skills + interview performance
    // are used as the available skill evidence.
    // ----------------------------------------------
    let skillScore = 0;

    if (resumeSkills.length > 0) {
      skillScore = Math.min(
        100,
        40 + resumeSkills.length * 5
      );
    }

    if (interviewScore > skillScore) {
      skillScore = interviewScore;
    }

    // ----------------------------------------------
    // Overall readiness score
    //
    // Resume: 30%
    // Interview: 50%
    // Skills: 20%
    // ----------------------------------------------
    const readinessScore = Math.round(
      resumeScore * 0.3 +
        interviewScore * 0.5 +
        skillScore * 0.2
    );

    // ----------------------------------------------
    // Get previous assessment
    // ----------------------------------------------
    const previousAssessment =
      await PlacementReadiness.findOne({
        userId: req.userId,
      }).sort({
        createdAt: -1,
      });

    const previousScore =
      previousAssessment?.readinessScore ?? null;

    const improvement =
      previousScore === null
        ? 0
        : readinessScore - previousScore;

    // ----------------------------------------------
    // Candidate classification
    // ----------------------------------------------
    const category = getCategory(
      readinessScore,
      previousScore
    );

    // ----------------------------------------------
    // Prepare interview history
    // ----------------------------------------------
    const interviewHistory = interviews.map(
      (interview) => ({
        interviewId: interview._id,
        domain: interview.domain,
        score: interview.score,
        performance: getPerformance(interview),
        date: interview.createdAt,
      })
    );

    // ----------------------------------------------
    // Generate personalized roadmap
    // ----------------------------------------------
    const roadmap = await generateRoadmap({
      candidateType,
      readinessScore,
      resumeSkills,
      interviewHistory,
      weakTechnicalAreas,
      communicationGaps,
      missingIndustrySkills,
    });

    // ----------------------------------------------
    // Save assessment
    // ----------------------------------------------
    const assessment =
      await PlacementReadiness.create({
        userId: req.userId,

        candidateType,

        readinessScore,

        category,

        resumeScore,

        interviewScore,

        skillScore,

        resumeSkills,

        weakTechnicalAreas,

        communicationGaps,

        missingIndustrySkills,

        roadmap,

        interviewHistory,

        previousReadinessScore: previousScore,

        improvement,
      });

    // ----------------------------------------------
    // Response
    // ----------------------------------------------
    return res.status(201).json({
      message: "Placement readiness generated successfully",

      assessment: {
        id: assessment._id,

        readinessScore,

        category,

        candidateType,

        resumeScore,

        interviewScore,

        skillScore,

        weakTechnicalAreas,

        communicationGaps,

        missingIndustrySkills,

        improvement,

        roadmap,

        interviewHistory,

        createdAt: assessment.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "generatePlacementReadiness error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to generate placement readiness",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Get latest placement readiness
// --------------------------------------------------
const getLatestPlacementReadiness = async (
  req,
  res
) => {
  try {
    const assessment =
      await PlacementReadiness.findOne({
        userId: req.userId,
      }).sort({
        createdAt: -1,
      });

    if (!assessment) {
      return res.status(404).json({
        message:
          "No placement readiness assessment found",
      });
    }

    res.json({
      assessment,
    });
  } catch (error) {
    console.error(
      "getLatestPlacementReadiness error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch placement readiness",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Get readiness history
// --------------------------------------------------
const getPlacementReadinessHistory = async (
  req,
  res
) => {
  try {
    const assessments =
      await PlacementReadiness.find({
        userId: req.userId,
      })
        .sort({
          createdAt: 1,
        })
        .select(
          "readinessScore category candidateType improvement createdAt"
        );

    res.json({
      assessments,
    });
  } catch (error) {
    console.error(
      "getPlacementReadinessHistory error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch readiness history",
      error: error.message,
    });
  }
};

module.exports = {
  generatePlacementReadiness,
  getLatestPlacementReadiness,
  getPlacementReadinessHistory,
};