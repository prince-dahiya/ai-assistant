const Groq = require("groq-sdk");
const Interview = require("../models/Interview.js");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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

/* =========================================================
   TASK 3 - COMPANY PROFILES
   ========================================================= */

const COMPANY_PROFILES = {
  Google: {
    style: "Highly analytical, problem-solving and technically deep",
    questionPattern:
      "Algorithmic problems, optimization, conceptual depth and follow-up questions",
    focusAreas: [
      "Data Structures",
      "Algorithms",
      "Problem Solving",
      "System Design",
      "Optimization",
    ],
    evaluationCriteria: [
      "Problem solving",
      "Algorithmic thinking",
      "Technical depth",
      "Optimization",
      "Communication",
    ],
    passingScore: 75,
  },

  Amazon: {
    style:
      "Practical, customer-focused, problem-solving oriented and structured",
    questionPattern:
      "Technical questions combined with practical scenarios and follow-up questions",
    focusAreas: [
      "Data Structures",
      "Algorithms",
      "System Design",
      "Problem Solving",
      "Scalability",
    ],
    evaluationCriteria: [
      "Technical correctness",
      "Problem solving",
      "Practical thinking",
      "Scalability",
      "Communication",
    ],
    passingScore: 70,
  },

  Microsoft: {
    style:
      "Technical-depth focused with strong emphasis on problem solving and engineering",
    questionPattern:
      "Programming, algorithms, technical concepts, system design and follow-ups",
    focusAreas: [
      "Algorithms",
      "Data Structures",
      "System Design",
      "Programming",
      "Software Engineering",
    ],
    evaluationCriteria: [
      "Technical depth",
      "Problem solving",
      "Code quality",
      "System thinking",
      "Communication",
    ],
    passingScore: 70,
  },

  TCS: {
    style:
      "Fundamentals-focused with practical programming and software development questions",
    questionPattern:
      "Programming fundamentals, OOP, databases, coding and project-related questions",
    focusAreas: [
      "Programming Fundamentals",
      "OOP",
      "Database",
      "Coding",
      "Projects",
    ],
    evaluationCriteria: [
      "Technical fundamentals",
      "Programming",
      "Database knowledge",
      "Project understanding",
      "Communication",
    ],
    passingScore: 60,
  },

  Infosys: {
    style:
      "Fundamentals, programming knowledge and practical application focused",
    questionPattern:
      "Programming fundamentals, problem solving, projects and practical scenarios",
    focusAreas: [
      "Programming",
      "OOP",
      "Database",
      "Problem Solving",
      "Projects",
    ],
    evaluationCriteria: [
      "Programming knowledge",
      "Problem solving",
      "Technical fundamentals",
      "Project understanding",
      "Communication",
    ],
    passingScore: 60,
  },

  Startup: {
    style:
      "Practical, fast-paced, project-focused and real-world problem solving oriented",
    questionPattern:
      "Real-world scenarios, debugging, projects, implementation and practical trade-offs",
    focusAreas: [
      "Projects",
      "Problem Solving",
      "Debugging",
      "Practical Development",
      "Adaptability",
    ],
    evaluationCriteria: [
      "Practical thinking",
      "Problem solving",
      "Technical ability",
      "Adaptability",
      "Communication",
    ],
    passingScore: 60,
  },

  General: {
    style: "Balanced technical interview",
    questionPattern:
      "Fundamentals, practical questions and problem solving",
    focusAreas: [
      "Programming",
      "Problem Solving",
      "Technical Fundamentals",
    ],
    evaluationCriteria: [
      "Technical correctness",
      "Problem solving",
      "Understanding",
      "Communication",
    ],
    passingScore: 60,
  },
};


/* =========================================================
   TASK 1 - NORMALIZE TEXT
   ========================================================= */

const normalizeText = (text = "") => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};


/* =========================================================
   TASK 1 - ADAPTIVE DIFFICULTY
   ========================================================= */

const getNextDifficulty = (currentDifficulty, performance) => {
  const levels = ["easy", "medium", "hard"];

  const currentIndex = levels.indexOf(currentDifficulty);

  if (performance === "strong") {
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  if (performance === "weak") {
    return levels[Math.max(currentIndex - 1, 0)];
  }

  return currentDifficulty;
};


/* =========================================================
   TASK 1 - SAFE JSON EXTRACTION
   ========================================================= */

const extractJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("AI did not return valid JSON");
    }

    return JSON.parse(match[0]);
  }
};


/* =========================================================
   TASK 3 - GET COMPANY PROFILE
   ========================================================= */

const getCompanyProfile = (company = "General") => {
  return COMPANY_PROFILES[company] || COMPANY_PROFILES.General;
};


/* =========================================================
   TASK 1 + TASK 3
   GENERATE ADAPTIVE COMPANY-SPECIFIC QUESTION
   ========================================================= */

const generateAdaptiveQuestion = async (interview) => {
  const previousQuestions = interview.askedQuestions || [];

  const progression = interview.progression || [];

  const company = interview.company || "General";

  const companyProfile = getCompanyProfile(company);

  const recentProgression = progression
    .slice(-3)
    .map(
      (item) =>
        `Question ${item.questionNumber}: difficulty=${item.difficulty}, performance=${item.performance}, score=${item.score}`
    )
    .join("\n");

  const previousQuestionsText =
    previousQuestions.length > 0
      ? previousQuestions
          .map((question, index) => `${index + 1}. ${question}`)
          .join("\n")
      : "None";

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",

    messages: [
      {
        role: "system",
        content: `
You are a senior technical interviewer.

You are conducting a ${company}-style interview.

COMPANY:
${company}

COMPANY INTERVIEW STYLE:
${companyProfile.style}

COMPANY QUESTION PATTERN:
${companyProfile.questionPattern}

COMPANY FOCUS AREAS:
${companyProfile.focusAreas.join(", ")}

CANDIDATE DOMAIN:
${interview.domain}

CURRENT DIFFICULTY:
${interview.currentDifficulty}

CANDIDATE PROGRESSION:
${recentProgression || "No previous progression"}

PREVIOUSLY ASKED QUESTIONS:
${previousQuestionsText}

RULES:

1. Ask exactly ONE technical interview question.
2. Match the current difficulty.
3. NEVER repeat a previous question.
4. Adapt the question according to the candidate's previous performance.
5. If the candidate performed strongly, increase technical depth.
6. If the candidate performed weakly, test foundational understanding.
7. If the candidate performed average, maintain the difficulty.
8. Follow the interview style of ${company}.
9. Focus on the company's important areas.
10. Prefer realistic interview questions.
11. Ask a follow-up when it naturally fits the candidate's previous performance.
12. Return ONLY the question.

DIFFICULTY GUIDE:

EASY:
Basic concepts and fundamentals.

MEDIUM:
Application, implementation, debugging and practical concepts.

HARD:
Advanced concepts, optimization, architecture, trade-offs and real-world scenarios.
        `.trim(),
      },
    ],

    temperature: 0.7,
    max_tokens: 250,
  });

  let question =
    response.choices[0].message.content.trim();

  const normalizedQuestion = normalizeText(question);

  const duplicate = previousQuestions.some(
    (oldQuestion) =>
      normalizeText(oldQuestion) === normalizedQuestion
  );

  if (duplicate) {
    const retryResponse = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",
          content: `
You are conducting a ${company}-style ${interview.domain} interview.

Company interview style:
${companyProfile.style}

Generate ONE completely different question.

Difficulty:
${interview.currentDifficulty}

DO NOT repeat any of these questions:

${previousQuestions.join("\n")}

Return ONLY the new question.
          `.trim(),
        },
      ],

      temperature: 0.9,
      max_tokens: 250,
    });

    question =
      retryResponse.choices[0].message.content.trim();
  }

  return question;
};


/* =========================================================
   TASK 1 + TASK 3
   FINAL COMPANY-SPECIFIC REPORT
   ========================================================= */

const generateFinalReport = async (interview) => {
  const company = interview.company || "General";

  const companyProfile = getCompanyProfile(company);

  const progression = interview.progression
    .map(
      (item) =>
        `Question ${item.questionNumber}: Difficulty=${item.difficulty}, Performance=${item.performance}, Score=${item.score}, Skipped=${item.skipped}`
    )
    .join("\n");

  const passed =
    interview.score >= companyProfile.passingScore;

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",

    messages: [
      {
        role: "system",
        content: `
You are an expert technical recruiter.

Create a concise company-specific interview report.

Company:
${company}

Company interview style:
${companyProfile.style}

Company evaluation criteria:
${companyProfile.evaluationCriteria.join(", ")}

Expected passing score:
${companyProfile.passingScore}

Include:

1. Overall performance
2. Difficulty progression
3. Strong areas
4. Weak areas
5. Whether the candidate improved or declined
6. Whether the candidate meets the expected ${company} standard
7. Recommendations for improvement

Use the actual interview progression.

Be honest. Do not claim the candidate passed if the score is below the expected passing score.

Return a professional plain-text report.
        `.trim(),
      },

      {
        role: "user",
        content: `
Company:
${company}

Domain:
${interview.domain}

Interview progression:

${progression}

Overall score:
${interview.score}

Company passing score:
${companyProfile.passingScore}

Company standard result:
${passed ? "MEETS EXPECTED STANDARD" : "BELOW EXPECTED STANDARD"}

Questions answered:
${interview.questionsAnswered}

Skipped questions:
${interview.skippedQuestions}
        `.trim(),
      },
    ],

    temperature: 0.4,
    max_tokens: 600,
  });

  return response.choices[0].message.content.trim();
};


/* =========================================================
   START INTERVIEW
   TASK 3 COMPANY SUPPORT
   ========================================================= */

const startInterview = async (req, res) => {
  try {
    const {
      domain,
      company = "General",
    } = req.body;

    if (!domain) {
      return res.status(400).json({
        message: "Domain is required",
      });
    }

    const companyProfile =
      getCompanyProfile(company);

    const selectedCompany =
      COMPANY_PROFILES[company]
        ? company
        : "General";

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",

        messages: [
          {
            role: "system",
            content: `
You are a senior technical interviewer.

Conduct a ${selectedCompany}-style interview.

Company:
${selectedCompany}

Interview style:
${companyProfile.style}

Question pattern:
${companyProfile.questionPattern}

Focus areas:
${companyProfile.focusAreas.join(", ")}

Candidate domain:
${domain}

Ask ONE clear technical interview question.

The question should realistically match ${selectedCompany}'s interview style.

Return ONLY the question.
            `.trim(),
          },

          {
            role: "user",
            content: `
Start the interview.

Ask the first ${domain} technical question.

Only ask the question.
No preamble.
            `.trim(),
          },
        ],

        temperature: 0.7,
        max_tokens: 250,
      });

    const firstQuestion =
      completion.choices[0].message.content ||
      "Tell me about yourself and your experience.";

    const interview = await Interview.create({
      userId: req.userId,

      domain,

      company: selectedCompany,

      currentDifficulty: "medium",

      messages: [
        {
          role: "ai",
          content: firstQuestion,
        },
      ],

      askedQuestions: [firstQuestion],
    });

    res.status(201).json({
      sessionId: interview._id,

      question: firstQuestion,

      difficulty: "medium",

      company: selectedCompany,

      companyPassingScore:
        companyProfile.passingScore,
    });

  } catch (err) {
    console.error("startInterview error:", err);

    res.status(500).json({
      message: "Failed to start interview",
      error: err.message,
    });
  }
};


/* =========================================================
   SUBMIT ANSWER
   TASK 1 ADAPTIVE ENGINE + TASK 3 COMPANY EVALUATION
   ========================================================= */

const submitAnswer = async (req, res) => {
  try {
    const {
      sessionId,
      answer = "",
      domain = "General",
      skipped = false,
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        message: "Session ID is required",
      });
    }

    const interview = await Interview.findOne({
      _id: sessionId,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Session not found",
      });
    }

    if (interview.isComplete) {
      return res.status(400).json({
        message: "Interview is already completed",
      });
    }

    const company =
      interview.company || "General";

    const companyProfile =
      getCompanyProfile(company);

    const currentQuestion =
      interview.askedQuestions[
        interview.askedQuestions.length - 1
      ] || "";


    /* =====================================================
       HANDLE SKIPPED QUESTION
       ===================================================== */

    if (skipped) {
      interview.messages.push({
        role: "user",
        content: "[Question skipped]",
      });

      interview.progression.push({
        questionNumber:
          interview.questionsAnswered + 1,

        difficulty:
          interview.currentDifficulty,

        performance: "weak",

        score: 0,

        skipped: true,

        question: currentQuestion,
      });

      interview.questionsAnswered += 1;

      interview.skippedQuestions += 1;

      interview.currentDifficulty =
        getNextDifficulty(
          interview.currentDifficulty,
          "weak"
        );

      if (interview.questionsAnswered >= 3) {
        interview.score =
          calculateAverageScore(
            interview.progression
          );

        interview.isComplete = true;

        interview.duration = Math.max(
          1,
          Math.round(
            (Date.now() -
              interview.createdAt.getTime()) /
              60000
          )
        );

        interview.finalReport =
          await generateFinalReport(
            interview
          );

        await interview.save();

        return res.json({
          feedback:
            `Question skipped. For ${company}, this area should be improved.`,

          score: interview.score,

          difficulty:
            interview.currentDifficulty,

          company,

          isComplete: true,

          finalReport:
            interview.finalReport,
        });
      }

      const nextQuestion =
        await generateAdaptiveQuestion(
          interview
        );

      interview.askedQuestions.push(
        nextQuestion
      );

      interview.messages.push({
        role: "ai",
        content: nextQuestion,
      });

      await interview.save();

      return res.json({
        feedback:
          `Question skipped. The difficulty has been adjusted for the ${company}-style interview.`,

        nextQuestion,

        difficulty:
          interview.currentDifficulty,

        company,

        isComplete: false,
      });
    }


    /* =====================================================
       VALIDATE ANSWER
       ===================================================== */

    if (!answer.trim()) {
      return res.status(400).json({
        message: "Answer cannot be empty",
      });
    }


    /* =====================================================
       DETECT REPEATED ANSWER
       ===================================================== */

    const normalizedAnswer =
      normalizeText(answer);

    const previousAnswers =
      interview.messages
        .filter(
          (message) =>
            message.role === "user" &&
            message.content !==
              "[Question skipped]"
        )
        .map((message) =>
          normalizeText(message.content)
        );

    const repeatedAnswer =
      previousAnswers.some(
        (previousAnswer) =>
          previousAnswer === normalizedAnswer ||
          (
            normalizedAnswer.length > 30 &&
            previousAnswer.length > 30 &&
            (
              normalizedAnswer.includes(
                previousAnswer
              ) ||
              previousAnswer.includes(
                normalizedAnswer
              )
            )
          )
      );


    /* =====================================================
       AI EVALUATION
       TASK 3 COMPANY-SPECIFIC CRITERIA
       ===================================================== */

    const evaluationResponse =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",

        messages: [
          {
            role: "system",
            content: `
You are an expert technical recruiter evaluating a candidate in a ${company} interview.

Company:
${company}

Company interview style:
${companyProfile.style}

Company evaluation criteria:
${companyProfile.evaluationCriteria.join(", ")}

Company focus areas:
${companyProfile.focusAreas.join(", ")}

Expected passing score:
${companyProfile.passingScore}

Return ONLY valid JSON:

{
  "performance": "weak | average | strong",
  "score": number,
  "feedback": "2-3 sentence constructive company-specific feedback"
}

Scoring:

0-40 = weak
41-70 = average
71-100 = strong

Evaluate the answer according to ${company}'s expected interview standards.

Consider:

- Technical correctness
- Depth of understanding
- Relevance
- Clarity
- Problem solving
- Company-specific evaluation criteria

Do not reward an answer simply because it is long.
            `.trim(),
          },

          {
            role: "user",
            content: `
Company:
${company}

Domain:
${domain}

Difficulty:
${interview.currentDifficulty}

Question:
${currentQuestion}

Candidate answer:
${answer}
            `.trim(),
          },
        ],

        temperature: 0.3,

        max_tokens: 350,
      });


    /* =====================================================
       PARSE EVALUATION
       ===================================================== */

    let evaluation;

    try {
      evaluation = extractJson(
        evaluationResponse
          .choices[0]
          .message
          .content
          .trim()
      );
    } catch (error) {
      evaluation = {
        performance: "average",

        score: 50,

        feedback:
          "Your answer was reviewed, but the evaluation could not be fully processed.",
      };
    }

    let performance = [
      "weak",
      "average",
      "strong",
    ].includes(evaluation.performance)
      ? evaluation.performance
      : "average";

    let score = Number(evaluation.score);

    if (!Number.isFinite(score)) {
      score = 50;
    }

    score = Math.max(
      0,
      Math.min(100, score)
    );


    /* =====================================================
       REPEATED ANSWER PROTECTION
       TASK 1
       ===================================================== */

    if (repeatedAnswer) {
      performance = "weak";

      score = Math.min(score, 40);

      evaluation.feedback +=
        " The answer appears to repeat information from a previous response. Try to provide a more specific and original explanation.";
    }


    /* =====================================================
       DETERMINE NEXT DIFFICULTY
       TASK 1
       ===================================================== */

    const previousDifficulty =
      interview.currentDifficulty;

    const nextDifficulty =
      getNextDifficulty(
        previousDifficulty,
        performance
      );


    /* =====================================================
       SAVE PROGRESSION
       TASK 1
       ===================================================== */

    interview.progression.push({
      questionNumber:
        interview.questionsAnswered + 1,

      difficulty:
        previousDifficulty,

      performance,

      score,

      skipped: false,

      question: currentQuestion,
    });

    interview.currentDifficulty =
      nextDifficulty;


    interview.messages.push({
      role: "user",
      content: answer,
    });

    interview.messages.push({
      role: "ai",
      content: evaluation.feedback,
    });

    interview.questionsAnswered += 1;

    interview.feedback =
      evaluation.feedback;


    /* =====================================================
       COMPLETE INTERVIEW
       ===================================================== */

    if (
      interview.questionsAnswered >= 3
    ) {
      interview.score =
        calculateAverageScore(
          interview.progression
        );

      interview.isComplete = true;

      interview.duration = Math.max(
        1,
        Math.round(
          (Date.now() -
            interview.createdAt.getTime()) /
            60000
        )
      );

      interview.finalReport =
        await generateFinalReport(
          interview
        );

      await interview.save();

      const meetsCompanyStandard =
        interview.score >=
        companyProfile.passingScore;

      return res.json({
        feedback:
          evaluation.feedback,

        score:
          interview.score,

        difficulty:
          nextDifficulty,

        performance,

        repeatedAnswer,

        company,

        companyPassingScore:
          companyProfile.passingScore,

        meetsCompanyStandard,

        isComplete: true,

        finalReport:
          interview.finalReport,
      });
    }


    /* =====================================================
       GENERATE NEXT ADAPTIVE QUESTION
       TASK 1 + TASK 3
       ===================================================== */

    const nextQuestion =
      await generateAdaptiveQuestion(
        interview
      );

    interview.askedQuestions.push(
      nextQuestion
    );

    interview.messages.push({
      role: "ai",
      content: nextQuestion,
    });

    await interview.save();

    return res.json({
      feedback:
        evaluation.feedback,

      nextQuestion,

      difficulty:
        nextDifficulty,

      performance,

      repeatedAnswer,

      company,

      companyPassingScore:
        companyProfile.passingScore,

      isComplete: false,
    });

  } catch (err) {
    console.error(
      "submitAnswer error:",
      err
    );

    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};


/* =========================================================
   CALCULATE AVERAGE SCORE
   TASK 1
   ========================================================= */

const calculateAverageScore = (
  progression = []
) => {
  if (!progression.length) return 0;

  const total =
    progression.reduce(
      (sum, item) =>
        sum + (item.score || 0),
      0
    );

  return Math.round(
    total / progression.length
  );
};


/* =========================================================
   GET ALL COMPLETED INTERVIEWS
   ========================================================= */

const getInterviews = async (req, res) => {
  try {
    const interviews =
      await Interview.find({
        userId: req.userId,
        isComplete: true,
      })
        .select(
          "domain company score duration questionsAnswered createdAt"
        )
        .sort({
          createdAt: -1,
        });

    const mapped =
      interviews.map((i) => ({
        id: i._id,

        topic: i.domain,

        company:
          i.company || "General",

        score: i.score,

        duration: i.duration,

        date: i.createdAt,
      }));

    res.json({
      interviews: mapped,
    });

  } catch (err) {
    res.status(500).json({
      message:
        "Failed to fetch interviews",

      error: err.message,
    });
  }
};


/* =========================================================
   GET SINGLE INTERVIEW
   ========================================================= */

const getInterview = async (req, res) => {
  try {
    const interview =
      await Interview.findOne({
        _id: req.params.id,
        userId: req.userId,
      });

    if (!interview) {
      return res.status(404).json({
        message:
          "Interview not found",
      });
    }

    res.json({
      interview,
    });

  } catch (err) {
    res.status(500).json({
      message: "Server error",

      error: err.message,
    });
  }
};


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  startInterview,
  submitAnswer,
  getInterviews,
  getInterview,
};
