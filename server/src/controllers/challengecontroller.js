const Groq = require("groq-sdk");

const Challenge = require("../models/Challenge.js");
const ChallengeAttempt = require("../models/ChallengeAttempt.js");
const User = require("../models/User.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =====================================================
// CONSTANTS
// =====================================================

const CATEGORIES = [
  "HR",
  "Technical",
  "Aptitude",
  "Domain-Specific",
];

const DOMAINS = [
  "JavaScript/Node.js",
  "React",
  "Python",
  "Data Science",
  "DevOps",
  "System Design",
  "Database Design",
  "General",
];

// =====================================================
// ADMIN HELPER
// =====================================================

const getAdmin = async () => {
  const admin = await User.findOne({
    role: "Administrator",
  }).select("_id name email role");

  if (!admin) {
    throw new Error(
      "Administrator account not found. Please restart the backend so the default administrator account can be created."
    );
  }

  return admin;
};

// =====================================================
// DATE HELPERS
// =====================================================

const getDateKey = (date = new Date()) => {
  return date.toISOString().split("T")[0];
};

const getWeekKey = (date = new Date()) => {
  const d = new Date(date);

  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setUTCDate(d.getUTCDate() + diff);

  return d.toISOString().split("T")[0];
};

// =====================================================
// RANK SYSTEM
// =====================================================

const getRank = (xp) => {
  if (xp >= 5000) return "Legend";
  if (xp >= 3000) return "Elite";
  if (xp >= 1500) return "Expert";
  if (xp >= 750) return "Pro";
  if (xp >= 300) return "Challenger";

  return "Rookie";
};

// =====================================================
// XP
// =====================================================

const calculateXP = (score, difficulty) => {
  let baseXP = 50;

  if (difficulty === "Medium") {
    baseXP = 75;
  }

  if (difficulty === "Hard") {
    baseXP = 100;
  }

  if (score >= 90) {
    baseXP += 50;
  } else if (score >= 80) {
    baseXP += 30;
  } else if (score >= 70) {
    baseXP += 15;
  }

  return baseXP;
};

// =====================================================
// BADGES
// =====================================================

const updateBadges = (user) => {
  const badges = [...(user.badges || [])];

  if (
    user.completedChallenges >= 1 &&
    !badges.includes("First Challenge")
  ) {
    badges.push("First Challenge");
  }

  if (
    user.completedChallenges >= 5 &&
    !badges.includes("Challenge Starter")
  ) {
    badges.push("Challenge Starter");
  }

  if (
    user.completedChallenges >= 10 &&
    !badges.includes("Arena Regular")
  ) {
    badges.push("Arena Regular");
  }

  if (
    user.currentStreak >= 3 &&
    !badges.includes("3 Day Streak")
  ) {
    badges.push("3 Day Streak");
  }

  if (
    user.currentStreak >= 7 &&
    !badges.includes("7 Day Streak")
  ) {
    badges.push("7 Day Streak");
  }

  if (
    user.currentStreak >= 30 &&
    !badges.includes("30 Day Streak")
  ) {
    badges.push("30 Day Streak");
  }

  if (
    user.xp >= 1000 &&
    !badges.includes("1000 XP")
  ) {
    badges.push("1000 XP");
  }

  user.badges = badges;
};

// =====================================================
// STREAK
// =====================================================

const updateStreak = (user) => {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  if (!user.lastChallengeDate) {
    user.currentStreak = 1;
  } else {
    const previous = new Date(
      user.lastChallengeDate
    );

    previous.setHours(0, 0, 0, 0);

    const difference = Math.floor(
      (today.getTime() - previous.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (difference === 0) {
      // Already completed today.
    } else if (difference === 1) {
      user.currentStreak += 1;
    } else {
      user.currentStreak = 1;
    }
  }

  if (
    user.currentStreak >
    user.longestStreak
  ) {
    user.longestStreak =
      user.currentStreak;
  }

  user.lastChallengeDate = new Date();
};

// =====================================================
// AI CHALLENGE GENERATOR
// =====================================================

const generateChallengeWithAI = async ({
  category,
  domain,
  frequency,
}) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not configured."
    );
  }

  const response =
    await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",
          content: `
You are an expert interview challenge designer.

Create ONE competitive interview preparation challenge.

Category:
${category}

Domain:
${domain}

Frequency:
${frequency}

Return ONLY valid JSON.

Format:

{
  "title": "short challenge title",
  "description": "short description",
  "question": "one clear challenge question",
  "difficulty": "Easy | Medium | Hard",
  "timeLimit": number
}

Rules:

1. The challenge must be suitable for interview preparation.
2. It must be possible to answer within the time limit.
3. Make it competitive but fair.
4. HR challenges should focus on behavioural/interview situations.
5. Technical challenges should test technical knowledge.
6. Aptitude challenges should test logical/numerical reasoning.
7. Domain-Specific challenges should focus on the selected domain.
8. Do not include the answer.
9. Return ONLY JSON.
          `.trim(),
        },
      ],

      temperature: 0.8,
      max_tokens: 500,
    });

  const text =
    response?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error(
      "AI returned an empty challenge."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(
      /\{[\s\S]*\}/
    );

    if (!match) {
      throw new Error(
        "AI failed to generate valid challenge JSON."
      );
    }

    return JSON.parse(match[0]);
  }
};

// =====================================================
// FALLBACK CHALLENGE
// =====================================================

const createFallbackChallenge = ({
  category,
  domain,
  frequency,
  admin,
  dateKey,
}) => {
  const isWeekly =
    frequency === "weekly";

  return {
    title: isWeekly
      ? "Weekly Technical Challenge"
      : "Daily Interview Challenge",

    description:
      "Test your interview readiness with a practical challenge.",

    category,

    domain,

    difficulty: isWeekly
      ? "Hard"
      : "Medium",

    frequency,

    dateKey,

    question: isWeekly
      ? `Explain a challenging ${domain} problem you could face in a real software engineering interview and describe how you would solve it.`
      : `What is one important ${domain} concept that every software developer should understand? Explain it with a practical example.`,

    timeLimit: isWeekly ? 15 : 10,

    createdBy: admin._id,
  };
};

// =====================================================
// CREATE CHALLENGE
// =====================================================

const createChallenge = async ({
  category,
  domain,
  frequency,
  dateKey,
}) => {
  // IMPORTANT:
  // Challenge is created by Administrator.
  const admin = await getAdmin();

  let generated;

  try {
    generated =
      await generateChallengeWithAI({
        category,
        domain,
        frequency,
      });
  } catch (aiError) {
    console.error(
      "Challenge AI generation failed:",
      aiError.message
    );

    generated =
      createFallbackChallenge({
        category,
        domain,
        frequency,
        admin,
        dateKey,
      });
  }

  const challengeData = {
    title:
      generated.title ||
      `${frequency} Interview Challenge`,

    description:
      generated.description ||
      "Complete this interview preparation challenge.",

    category,

    domain,

    difficulty:
      ["Easy", "Medium", "Hard"].includes(
        generated.difficulty
      )
        ? generated.difficulty
        : frequency === "weekly"
        ? "Hard"
        : "Medium",

    frequency,

    dateKey,

    question:
      generated.question ||
      "Explain how you would approach a difficult problem during a software engineering interview.",

    timeLimit:
      Number(generated.timeLimit) ||
      (frequency === "weekly" ? 15 : 10),

    // IMPORTANT:
    // Attach the challenge to the Administrator.
    createdBy: admin._id,
  };

  return await Challenge.create(
    challengeData
  );
};

// =====================================================
// GET DAILY CHALLENGE
// =====================================================

const getDailyChallenge = async (
  req,
  res
) => {
  try {
    // Make sure the logged-in user exists.
    const user = await User.findById(
      req.userId
    ).select("_id name email role");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const dateKey = getDateKey();

    let challenge =
      await Challenge.findOne({
        frequency: "daily",
        dateKey,
      });

    if (!challenge) {
      const category =
        CATEGORIES[
          Math.floor(
            Math.random() *
              CATEGORIES.length
          )
        ];

      const domain =
        DOMAINS[
          Math.floor(
            Math.random() *
              DOMAINS.length
          )
        ];

      challenge =
        await createChallenge({
          category,
          domain,
          frequency: "daily",
          dateKey,
        });
    }

    const existingAttempt =
      await ChallengeAttempt.findOne({
        userId: user._id,
        challengeId: challenge._id,
      });

    return res.json({
      challenge,

      completed:
        !!existingAttempt?.completed,

      attempt:
        existingAttempt || null,
    });
  } catch (err) {
    console.error(
      "getDailyChallenge error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to load daily challenge",
      error: err.message,
    });
  }
};

// =====================================================
// GET WEEKLY CHALLENGE
// =====================================================

const getWeeklyChallenge = async (
  req,
  res
) => {
  try {
    // Get current logged-in student.
    const user = await User.findById(
      req.userId
    ).select("_id name email role");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const dateKey = getWeekKey();

    let challenge =
      await Challenge.findOne({
        frequency: "weekly",
        dateKey,
      });

    if (!challenge) {
      const category = "Technical";

      const domain =
        DOMAINS[
          Math.floor(
            Math.random() *
              DOMAINS.length
          )
        ];

      challenge =
        await createChallenge({
          category,
          domain,
          frequency: "weekly",
          dateKey,
        });
    }

    const existingAttempt =
      await ChallengeAttempt.findOne({
        userId: user._id,
        challengeId: challenge._id,
      });

    return res.json({
      challenge,

      completed:
        !!existingAttempt?.completed,

      attempt:
        existingAttempt || null,
    });
  } catch (err) {
    console.error(
      "getWeeklyChallenge error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to load weekly challenge",
      error: err.message,
    });
  }
};

// =====================================================
// SUBMIT CHALLENGE
// =====================================================

const submitChallenge = async (
  req,
  res
) => {
  try {
    const {
      challengeId,
      answer = "",
      timeTaken = 0,
    } = req.body;

    if (!challengeId) {
      return res.status(400).json({
        message:
          "Challenge ID is required",
      });
    }

    if (
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      return res.status(400).json({
        message:
          "Answer cannot be empty",
      });
    }

    const challenge =
      await Challenge.findById(
        challengeId
      );

    if (!challenge) {
      return res.status(404).json({
        message:
          "Challenge not found",
      });
    }

    const existingAttempt =
      await ChallengeAttempt.findOne({
        userId: req.userId,
        challengeId,
      });

    if (existingAttempt) {
      return res.status(400).json({
        message:
          "You have already attempted this challenge",
        attempt: existingAttempt,
      });
    }

    // =================================================
    // AI EVALUATION
    // =================================================

    let evaluation = {
      score: 50,
      performance: "average",
      feedback:
        "Your answer was reviewed. Focus on correctness, reasoning, relevance, and clear communication.",
    };

    try {
      const evaluationResponse =
        await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",

          messages: [
            {
              role: "system",
              content: `
You are an expert interview evaluator.

Evaluate the candidate's answer.

Return ONLY valid JSON:

{
  "score": number,
  "performance": "weak | average | strong",
  "feedback": "2-4 sentence feedback"
}

Scoring:

90-100 = exceptional
80-89 = excellent
70-79 = good
50-69 = average
0-49 = weak

Evaluate:

- Correctness
- Understanding
- Relevance
- Reasoning
- Communication
- Interview readiness

Do not reward unnecessary length.
              `.trim(),
            },

            {
              role: "user",
              content: `
Category:
${challenge.category}

Domain:
${challenge.domain}

Difficulty:
${challenge.difficulty}

Question:
${challenge.question}

Candidate answer:
${answer}
              `.trim(),
            },
          ],

          temperature: 0.2,
          max_tokens: 350,
        });

      const text =
        evaluationResponse
          ?.choices?.[0]
          ?.message
          ?.content
          ?.trim();

      if (text) {
        try {
          evaluation =
            JSON.parse(text);
        } catch {
          const match = text.match(
            /\{[\s\S]*\}/
          );

          if (match) {
            evaluation =
              JSON.parse(match[0]);
          }
        }
      }
    } catch (aiError) {
      console.error(
        "Challenge evaluation AI failed:",
        aiError.message
      );

      // Keep default evaluation so submission
      // does not completely break when AI fails.
    }

    // =================================================
    // NORMALIZE SCORE
    // =================================================

    let score = Number(
      evaluation.score
    );

    if (!Number.isFinite(score)) {
      score = 50;
    }

    score = Math.max(
      0,
      Math.min(100, score)
    );

    let performance =
      evaluation.performance;

    if (
      ![
        "weak",
        "average",
        "strong",
      ].includes(performance)
    ) {
      performance = "average";
    }

    const feedback =
      typeof evaluation.feedback ===
      "string"
        ? evaluation.feedback
        : "Your answer was reviewed. Keep improving your correctness and explanation.";

    // =================================================
    // GET STUDENT
    // =================================================

    const user =
      await User.findById(
        req.userId
      );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // =================================================
    // GAMIFICATION
    // =================================================

    const xpEarned =
      calculateXP(
        score,
        challenge.difficulty
      );

    user.xp =
      (user.xp || 0) + xpEarned;

    user.totalChallenges =
      (user.totalChallenges || 0) + 1;

    user.completedChallenges =
      (user.completedChallenges || 0) + 1;

    updateStreak(user);

    user.rank =
      getRank(user.xp);

    updateBadges(user);

    // =================================================
    // CREATE ATTEMPT
    // =================================================

    const attempt =
      await ChallengeAttempt.create({
        userId: user._id,

        challengeId:

          challenge._id,

        answer: answer.trim(),

        score,

        performance,

        feedback,

        completed: true,

        timeTaken:
          Number(timeTaken) || 0,

        xpEarned,
      });

    // =================================================
    // UPDATE CHALLENGE
    // =================================================

    challenge.participants =
      (challenge.participants || 0) + 1;

    challenge.completedBy =
      (challenge.completedBy || 0) + 1;

    await challenge.save();

    await user.save();

    // =================================================
    // LEADERBOARD POSITION
    // =================================================

    const betterUsers =
      await User.countDocuments({
        xp: {
          $gt: user.xp,
        },
      });

    const currentRank =
      betterUsers + 1;

    attempt.rankAtCompletion =
      currentRank;

    await attempt.save();

    return res.status(201).json({
      message:
        "Challenge completed successfully",

      attempt,

      score,

      performance,

      feedback,

      xpEarned,

      totalXP:
        user.xp,

      rank:
        user.rank,

      leaderboardPosition:
        currentRank,

      currentStreak:
        user.currentStreak,

      longestStreak:
        user.longestStreak,

      badges:
        user.badges,
    });
  } catch (err) {
    console.error(
      "submitChallenge error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to submit challenge",
      error: err.message,
    });
  }
};

// =====================================================
// LEADERBOARD
// =====================================================

const getLeaderboard = async (
  req,
  res
) => {
  try {
    const users =
      await User.find({
        role: {
          $ne: "Administrator",
        },
      })
        .select(
          "name xp completedChallenges currentStreak longestStreak badges rank"
        )
        .sort({
          xp: -1,
        })
        .limit(100)
        .lean();

    const leaderboard =
      users.map(
        (user, index) => ({
          position:
            index + 1,

          id:
            user._id,

          name:
            user.name,

          xp:
            user.xp || 0,

          completedChallenges:
            user.completedChallenges ||
            0,

          currentStreak:
            user.currentStreak || 0,

          longestStreak:
            user.longestStreak || 0,

          badges:
            user.badges || [],

          rank:
            user.rank || "Rookie",
        })
      );

    // Get the CURRENT logged-in user
    // from database.
    const currentUser =
      await User.findById(
        req.userId
      ).select(
        "name xp completedChallenges currentStreak longestStreak badges rank role"
      );

    let userPosition =
      await User.countDocuments({
        role: {
          $ne: "Administrator",
        },

        xp: {
          $gt:
            currentUser?.xp || 0,
        },
      });

    userPosition += 1;

    return res.json({
      leaderboard,

      currentUser:
        currentUser
          ? {
              position:
                userPosition,

              id:
                currentUser._id,

              name:
                currentUser.name,

              xp:
                currentUser.xp || 0,

              completedChallenges:
                currentUser.completedChallenges ||
                0,

              currentStreak:
                currentUser.currentStreak ||
                0,

              longestStreak:
                currentUser.longestStreak ||
                0,

              badges:
                currentUser.badges || [],

              rank:
                currentUser.rank ||
                "Rookie",
            }
          : null,
    });
  } catch (err) {
    console.error(
      "getLeaderboard error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to load leaderboard",
      error: err.message,
    });
  }
};

// =====================================================
// MY CHALLENGE STATISTICS
// =====================================================

const getChallengeStats = async (
  req,
  res
) => {
  try {
    const attempts =
      await ChallengeAttempt.find({
        userId: req.userId,
        completed: true,
      })
        .populate(
          "challengeId",
          "title category domain difficulty frequency"
        )
        .sort({
          completedAt: -1,
        });

    const user =
      await User.findById(
        req.userId
      ).select(
        "xp completedChallenges currentStreak longestStreak badges rank"
      );

    const totalScore =
      attempts.reduce(
        (sum, attempt) =>
          sum +
          (Number(attempt.score) || 0),
        0
      );

    const averageScore =
      attempts.length
        ? Math.round(
            totalScore /
              attempts.length
          )
        : 0;

    const categoryStats = {};

    attempts.forEach(
      (attempt) => {
        const category =
          attempt.challengeId
            ?.category ||
          "General";

        if (
          !categoryStats[category]
        ) {
          categoryStats[category] = {
            completed: 0,
            totalScore: 0,
          };
        }

        categoryStats[
          category
        ].completed += 1;

        categoryStats[
          category
        ].totalScore +=
          Number(attempt.score) || 0;
      }
    );

    Object.keys(
      categoryStats
    ).forEach(
      (category) => {
        const item =
          categoryStats[category];

        item.averageScore =
          Math.round(
            item.totalScore /
              item.completed
          );
      }
    );

    return res.json({
      stats: {
        total:
          attempts.length,

        averageScore,

        xp:
          user?.xp || 0,

        currentStreak:
          user?.currentStreak || 0,

        longestStreak:
          user?.longestStreak || 0,

        rank:
          user?.rank || "Rookie",

        badges:
          user?.badges || [],

        categoryStats,
      },

      attempts,
    });
  } catch (err) {
    console.error(
      "getChallengeStats error:",
      err
    );

    return res.status(500).json({
      message:
        "Failed to load challenge statistics",
      error: err.message,
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getDailyChallenge,
  getWeeklyChallenge,
  submitChallenge,
  getLeaderboard,
  getChallengeStats,
};