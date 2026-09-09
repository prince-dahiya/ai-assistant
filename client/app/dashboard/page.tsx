"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/* =========================================================
   TYPES
   ========================================================= */

interface Interview {
  id: string;
  date: string;
  score: number;
  duration: number;
  topic: string;
  company?: string | null;
}

interface ResumeAnalysis {
  summary: string;
  strengths: string[];
  recommendedDomains: {
    label: string;
    reason: string;
    confidence: number;
  }[];
  experienceLevel: "Junior" | "Mid" | "Senior";
  skillsDetected: string[];
}

interface Challenge {
  _id: string;
  title: string;
  description: string;
  category: string;
  domain: string;
  difficulty: "Easy" | "Medium" | "Hard";
  frequency: "daily" | "weekly";
  dateKey: string;
  question: string;
  timeLimit: number;
  maxScore: number;
  participants: number;
  completedBy: number;
}

interface ChallengeAttempt {
  _id: string;
  score: number;
  performance: "weak" | "average" | "strong";
  feedback: string;
  xpEarned: number;
  leaderboardPosition?: number;
}

interface LeaderboardUser {
  position: number;
  id: string;
  name: string;
  xp: number;
  completedChallenges: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  rank: string;
}

interface ChallengeStats {
  xp: number;
  total: number;
  currentStreak: number;
  longestStreak: number;
  badges: string[];
  rank: string;
}

/* =========================================================
   INTERVIEW DOMAINS
   ========================================================= */

const INTERVIEW_DOMAINS = [
  {
    label: "JavaScript/Node.js",
    icon: "🟨",
    desc: "ES6+, async, Node runtime",
  },
  {
    label: "React",
    icon: "⚛️",
    desc: "Hooks, state, lifecycle",
  },
  {
    label: "Python",
    icon: "🐍",
    desc: "OOP, data structures, stdlib",
  },
  {
    label: "Data Science",
    icon: "📊",
    desc: "ML, pandas, statistics",
  },
  {
    label: "DevOps",
    icon: "⚙️",
    desc: "CI/CD, Docker, Kubernetes",
  },
  {
    label: "System Design",
    icon: "🏗️",
    desc: "Scalability, architecture",
  },
  {
    label: "Database Design",
    icon: "🗄️",
    desc: "SQL, NoSQL, indexing",
  },
  {
    label: "General",
    icon: "🎯",
    desc: "Behavioural & fundamentals",
  },
];

/* =========================================================
   COMPANIES
   ========================================================= */

const COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Apple",
  "Netflix",
  "Adobe",
  "Infosys",
  "TCS",
  "Wipro",
  "Accenture",
  "Deloitte",
];

/* =========================================================
   XP TIERS
   ========================================================= */

const XP_TIERS = [
  {
    name: "Rookie",
    icon: "🌱",
    min: 0,
  },
  {
    name: "Contender",
    icon: "⚔️",
    min: 500,
  },
  {
    name: "Challenger",
    icon: "🔥",
    min: 1500,
  },
  {
    name: "Master",
    icon: "👑",
    min: 3000,
  },
  {
    name: "Grandmaster",
    icon: "💎",
    min: 6000,
  },
];

function getXpTier(xp: number) {
  let current = XP_TIERS[0];
  let next: (typeof XP_TIERS)[number] | null = null;

  for (let i = 0; i < XP_TIERS.length; i++) {
    if (xp >= XP_TIERS[i].min) {
      current = XP_TIERS[i];
      next = XP_TIERS[i + 1] ?? null;
    }
  }

  const progress = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((xp - current.min) /
              (next.min - current.min)) *
              100,
          ),
        ),
      )
    : 100;

  return {
    current,
    next,
    progress,
  };
}

/* =========================================================
   HELPERS
   ========================================================= */

function getDifficultyStyles(difficulty: string) {
  switch (difficulty) {
    case "Easy":
      return "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400";

    case "Hard":
      return "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400";

    default:
      return "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400";
  }
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* =========================================================
   SCORE BADGE
   ========================================================= */

function ScoreBadge({
  score,
}: {
  score: number;
}) {
  const color =
    score >= 80
      ? "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400"
      : score >= 60
        ? "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"
        : "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-bold ${color}`}
    >
      {score >= 80
        ? "🟢"
        : score >= 60
          ? "🔵"
          : "🟠"}{" "}
      {score}%
    </span>
  );
}

/* =========================================================
   MINI SPARKLINE
   ========================================================= */

function MiniSparkline({
  scores,
}: {
  scores: number[];
}) {
  if (scores.length < 2) {
    return null;
  }

  const max = Math.max(...scores, 100);
  const min = Math.min(...scores, 0);

  const range = max - min || 1;

  const width = 80;
  const height = 28;

  const points = scores
    .map((score, index) => {
      const x =
        (index / (scores.length - 1)) *
        width;

      const y =
        height -
        ((score - min) / range) *
          height;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {scores.map((score, index) => {
        const x =
          (index / (scores.length - 1)) *
          width;

        const y =
          height -
          ((score - min) / range) *
            height;

        return (
          <circle
            key={`${score}-${index}`}
            cx={x}
            cy={y}
            r="2.5"
            className="fill-primary"
          />
        );
      })}
    </svg>
  );
}

/* =========================================================
   RESUME PANEL
   ========================================================= */

function ResumePanel({
  onDomainSelect,
}: {
  onDomainSelect: (domain: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] =
    useState<File | null>(null);

  const [dragging, setDragging] =
    useState(false);

  const [analysis, setAnalysis] =
    useState<ResumeAnalysis | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [step, setStep] = useState<
    "upload" | "analyzing" | "results"
  >("upload");

  const [analyzingStep, setAnalyzingStep] =
    useState(0);

  const analyzingSteps = [
    "Reading your resume…",
    "Detecting skills & technologies…",
    "Mapping to interview domains…",
    "Generating recommendations…",
  ];

  const handleFile = (selectedFile: File) => {
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const extension = selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase();

    const allowedExtensions = [
      "pdf",
      "txt",
      "doc",
      "docx",
    ];

    if (
      !allowedTypes.includes(
        selectedFile.type,
      ) &&
      !(
        extension &&
        allowedExtensions.includes(extension)
      )
    ) {
      setError(
        "Please upload a PDF, DOC, DOCX, or TXT file.",
      );
      return;
    }

    if (
      selectedFile.size >
      5 * 1024 * 1024
    ) {
      setError(
        "File must be under 5MB.",
      );
      return;
    }

    setFile(selectedFile);
    setError(null);
    setAnalysis(null);
    setStep("upload");
  };

  const handleAnalyze = async () => {
    if (!file) {
      return;
    }

    setStep("analyzing");
    setError(null);
    setAnalyzingStep(0);

    let index = 0;

    const interval = setInterval(() => {
      index =
        (index + 1) %
        analyzingSteps.length;

      setAnalyzingStep(index);
    }, 1100);

    try {
      const formData = new FormData();

      formData.append(
        "resume",
        file,
      );

      const response =
        await axiosInstance.post(
          "/api/resume/analyze",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          },
        );

      const analysisData =
        response?.data?.analysis;

      if (!analysisData) {
        throw new Error(
          "Resume analysis data was not returned.",
        );
      }

      setAnalysis(
        analysisData,
      );

      setStep("results");
    } catch (err: any) {
      console.error(
        "Resume analysis failed:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to analyse resume. Please try again.",
      );

      setStep("upload");
    } finally {
      clearInterval(interval);
    }
  };

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
    setStep("upload");

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  return (
    <Card className="border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center text-lg">
            📄
          </div>

          <div>
            <p className="text-sm font-bold text-foreground">
              AI Resume Analysis
            </p>

            <p className="text-xs text-muted-foreground">
              Upload your resume · Get domain recommendations
            </p>
          </div>
        </div>

        {step === "results" && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/60 px-3 py-1 rounded-full transition-colors"
          >
            Upload new ↑
          </button>
        )}
      </div>

      <div className="p-5">
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() =>
                setDragging(false)
              }
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);

                const droppedFile =
                  event.dataTransfer.files[0];

                if (droppedFile) {
                  handleFile(
                    droppedFile,
                  );
                }
              }}
              onClick={() =>
                fileRef.current?.click()
              }
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : file
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(event) => {
                  const selectedFile =
                    event.target.files?.[0];

                  if (selectedFile) {
                    handleFile(
                      selectedFile,
                    );
                  }
                }}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl">
                    📋
                  </div>

                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[220px]">
                      {file.name}
                    </p>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(
                        file.size /
                        1024
                      ).toFixed(0)}{" "}
                      KB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      reset();
                    }}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-muted/60 flex items-center justify-center text-xs text-muted-foreground flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl mb-3">
                    ☁️
                  </div>

                  <p className="text-sm font-semibold text-foreground">
                    Drop your resume here
                  </p>

                  <p className="text-xs text-muted-foreground">
                    or click to browse · PDF,
                    DOC, DOCX, TXT · Max 5 MB
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2.5 rounded-xl">
                ⚠️ {error}
              </p>
            )}

            {!file && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    icon: "🔍",
                    label: "Skills Detection",
                    desc: "Frameworks, languages, tools",
                  },
                  {
                    icon: "📊",
                    label: "Experience Level",
                    desc: "Junior / Mid / Senior",
                  },
                  {
                    icon: "🎯",
                    label: "Domain Matching",
                    desc: "Best-fit interview areas",
                  },
                  {
                    icon: "💪",
                    label: "Strength Analysis",
                    desc: "Your competitive edge",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/40"
                  >
                    <span className="text-base flex-shrink-0">
                      {item.icon}
                    </span>

                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {item.label}
                      </p>

                      <p className="text-[11px] text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!file}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold py-5 disabled:opacity-40"
            >
              🤖 Analyse Resume with AI
            </Button>
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-10 flex flex-col items-center gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />

              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />

              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                🤖
              </div>
            </div>

            <div className="text-center space-y-1.5">
              <p className="text-sm font-bold text-foreground">
                Groq AI is reading your resume…
              </p>

              <p className="text-xs text-muted-foreground">
                {
                  analyzingSteps[
                    analyzingStep
                  ]
                }
              </p>
            </div>

            <div className="w-64 bg-border/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"
                style={{
                  width: "70%",
                }}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              This usually takes 5–10 seconds
            </p>
          </div>
        )}

        {step === "results" &&
          analysis && (
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">
                    🧠
                  </span>

                  <p className="text-xs font-bold text-foreground">
                    AI Summary
                  </p>

                  <span
                    className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full border ${
                      analysis.experienceLevel ===
                      "Senior"
                        ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                        : analysis.experienceLevel ===
                            "Mid"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          : "bg-green-500/10 text-green-600 border-green-500/20"
                    }`}
                  >
                    {
                      analysis.experienceLevel
                    }{" "}
                    Level
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {analysis.summary}
                </p>
              </div>

              {analysis.skillsDetected?.length >
                0 && (
                <div>
                  <p className="text-xs font-bold text-foreground mb-2">
                    🛠 Skills Detected
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skillsDetected.map(
                      (skill) => (
                        <span
                          key={skill}
                          className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium"
                        >
                          {skill}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-foreground mb-2.5">
                  🎯 Recommended Interview Domains
                </p>

                <div className="space-y-2">
                  {analysis.recommendedDomains?.map(
                    (rec, index) => {
                      const meta =
                        INTERVIEW_DOMAINS.find(
                          (domain) =>
                            domain.label ===
                            rec.label,
                        );

                      return (
                        <button
                          type="button"
                          key={rec.label}
                          onClick={() =>
                            onDomainSelect(
                              rec.label,
                            )
                          }
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:border-primary hover:bg-primary/5 transition-all group text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center text-xl flex-shrink-0">
                            {meta?.icon ||
                              "🎯"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {index ===
                                0 && (
                                <span className="text-[10px] bg-gradient-to-r from-primary to-accent text-white font-bold px-2 py-0.5 rounded-full">
                                  TOP PICK
                                </span>
                              )}

                              <p className="text-sm font-semibold text-foreground truncate">
                                {
                                  rec.label
                                }
                              </p>
                            </div>

                            <p className="text-xs text-muted-foreground truncate">
                              {
                                rec.reason
                              }
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <p className="text-xs font-bold text-primary">
                              {
                                rec.confidence
                              }
                              %
                            </p>

                            <div className="w-14 h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      rec.confidence,
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {analysis.strengths?.length >
                0 && (
                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-2.5">
                    ✅ Your Strengths
                  </p>

                  <ul className="space-y-1.5">
                    {analysis.strengths.map(
                      (strength) => (
                        <li
                          key={strength}
                          className="text-xs text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-green-500">
                            •
                          </span>

                          {strength}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground text-center">
                Click any domain above to start a
                tailored interview session
              </p>
            </div>
          )}
      </div>
    </Card>
  );
}

/* =========================================================
   MAIN DASHBOARD
   ========================================================= */

const Page = () => {
  const router = useRouter();

  const {
    isLoggedIn,
    isLoading: authLoading,
    user,
  } = useAuth();

  /* =======================================================
     INTERVIEW STATE
     ======================================================= */

  const [interviews, setInterviews] =
    useState<Interview[]>([]);

  const [dataLoading, setDataLoading] =
    useState(true);

  const [showDomainSelector, setShowDomainSelector] =
    useState(false);

  const [hoveredDomain, setHoveredDomain] =
    useState<string | null>(null);

  const [filterDomain, setFilterDomain] =
    useState<string>("All");

  const [activeTab, setActiveTab] =
    useState<
      "history" | "resume" | "arena"
    >("history");

  /* =======================================================
     COMPANY INTERVIEW STATE
     ======================================================= */

  const [selectedCompany, setSelectedCompany] =
    useState<string>("");

  const [companyMode, setCompanyMode] =
    useState<"general" | "company">(
      "general",
    );

  /* =======================================================
     CHALLENGE ARENA STATE
     ======================================================= */

  const [challenge, setChallenge] =
    useState<Challenge | null>(null);

  const [challengeType, setChallengeType] =
    useState<"daily" | "weekly">(
      "daily",
    );

  const [challengeLoading, setChallengeLoading] =
    useState(false);

  const [challengeAnswer, setChallengeAnswer] =
    useState("");

  const [challengeSubmitting, setChallengeSubmitting] =
    useState(false);

  const [challengeResult, setChallengeResult] =
    useState<ChallengeAttempt | null>(
      null,
    );

  const [leaderboard, setLeaderboard] =
    useState<LeaderboardUser[]>([]);

  const [myChallengeStats, setMyChallengeStats] =
    useState<ChallengeStats | null>(
      null,
    );

  const [challengeError, setChallengeError] =
    useState<string | null>(null);

  /* =======================================================
     AUTH
     ======================================================= */

  useEffect(() => {
    if (
      !authLoading &&
      !isLoggedIn
    ) {
      router.push("/login");
    }
  }, [
    isLoggedIn,
    authLoading,
    router,
  ]);

  /* =======================================================
     FETCH INTERVIEWS
     ======================================================= */

  const fetchInterviews =
    async () => {
      try {
        setDataLoading(true);

        const { data } =
          await axiosInstance.get(
            "/api/interviews",
          );

        setInterviews(
          data?.interviews || [],
        );
      } catch (error: any) {
        console.error(
          "Failed to fetch interviews:",
          error,
        );

        /*
         * Don't crash the dashboard if the
         * interview request fails.
         */
        setInterviews([]);
      } finally {
        setDataLoading(false);
      }
    };

  /* =======================================================
     LOAD INTERVIEWS AFTER LOGIN
     ======================================================= */

  useEffect(() => {
    if (isLoggedIn) {
      fetchInterviews();
    }
  }, [isLoggedIn]);

  /* =======================================================
     CHALLENGE FETCH
     ======================================================= */

  const fetchChallenge = async (
    type: "daily" | "weekly",
  ) => {
    try {
      setChallengeLoading(true);
      setChallengeError(null);

      setChallengeResult(null);
      setChallengeAnswer("");

      /*
       * Challenge route
       *
       * GET /api/challenges/daily
       * GET /api/challenges/weekly
       */
      const { data } =
        await axiosInstance.get(
          `/api/challenges/${type}`,
        );

      setChallenge(
        data?.challenge || null,
      );

      /*
       * If backend says the user has already
       * completed today's/weekly challenge,
       * display the previous attempt.
       */
      if (
        data?.completed &&
        data?.attempt
      ) {
        setChallengeResult(
          data.attempt,
        );
      }
    } catch (error: any) {
      console.error(
        "Failed to fetch challenge:",
        error,
      );

      setChallenge(null);

      setChallengeError(
        error?.response?.data
          ?.message ||
          "Unable to load the challenge right now.",
      );
    } finally {
      setChallengeLoading(false);
    }
  };

  /* =======================================================
     LEADERBOARD FETCH
     ======================================================= */

  const fetchLeaderboard =
    async () => {
      try {
        const { data } =
          await axiosInstance.get(
            "/api/challenges/leaderboard",
          );

        setLeaderboard(
          data?.leaderboard || [],
        );
      } catch (error) {
        console.error(
          "Failed to fetch leaderboard:",
          error,
        );

        setLeaderboard([]);
      }
    };

  /* =======================================================
     CHALLENGE STATS FETCH
     ======================================================= */

  const fetchChallengeStats =
    async () => {
      try {
        const { data } =
          await axiosInstance.get(
            "/api/challenges/stats",
          );

        setMyChallengeStats(
          data?.stats || null,
        );
      } catch (error) {
        console.error(
          "Failed to fetch challenge stats:",
          error,
        );

        setMyChallengeStats(null);
      }
    };

  /* =======================================================
     OPEN CHALLENGE ARENA
     ======================================================= */

  const openArena = async () => {
    setActiveTab("arena");

    await Promise.all([
      fetchChallenge(
        "daily",
      ),
      fetchLeaderboard(),
      fetchChallengeStats(),
    ]);
  };

  /* =======================================================
     CHANGE CHALLENGE TYPE
     ======================================================= */

  const changeChallengeType = async (
    type: "daily" | "weekly",
  ) => {
    setChallengeType(type);

    await fetchChallenge(type);
  };

  /* =======================================================
     SUBMIT CHALLENGE
     ======================================================= */

  const submitChallenge =
    async () => {
      if (
        !challenge ||
        !challengeAnswer.trim() ||
        challengeSubmitting
      ) {
        return;
      }

      try {
        setChallengeSubmitting(true);
        setChallengeError(null);

        /*
         * POST /api/challenges/submit
         *
         * Keep the payload aligned with the
         * Challenge controller.
         */
        const { data } =
          await axiosInstance.post(
            "/api/challenges/submit",
            {
              challengeId:
                challenge._id,
              answer:
                challengeAnswer.trim(),
              timeTaken: 0,
            },
          );

        setChallengeResult(
          data?.attempt ||
            data ||
            null,
        );

        /*
         * Refresh arena information after
         * successful submission.
         */
        await Promise.all([
          fetchLeaderboard(),
          fetchChallengeStats(),
        ]);
      } catch (error: any) {
        console.error(
          "Challenge submission failed:",
          error,
        );

        setChallengeError(
          error?.response?.data
            ?.message ||
            "Failed to submit challenge. Please try again.",
        );
      } finally {
        setChallengeSubmitting(false);
      }
    };

  /* =======================================================
     DOMAIN / INTERVIEW NAVIGATION
     ======================================================= */

  const handleSelectDomain = (
    domain: string,
    company?: string,
  ) => {
    const params =
      new URLSearchParams();

    params.set(
      "domain",
      domain,
    );

    if (company) {
      params.set(
        "company",
        company,
      );
    }

    router.push(
      `/interview?${params.toString()}`,
    );
  };

  const handleStartInterview = (
    domain: string,
  ) => {
    setShowDomainSelector(false);

    if (
      companyMode === "company" &&
      selectedCompany
    ) {
      handleSelectDomain(
        domain,
        selectedCompany,
      );
    } else {
      handleSelectDomain(
        domain,
      );
    }
  };

  const closeDomainSelector = () => {
    setShowDomainSelector(false);

    setCompanyMode(
      "general",
    );

    setSelectedCompany("");

    setHoveredDomain(null);
  };

  /* =======================================================
     AUTH LOADING
     ======================================================= */

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />

          <p className="text-sm text-muted-foreground">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  /* =======================================================
     INTERVIEW STATS
     ======================================================= */

  const avgScore =
    interviews.length > 0
      ? Math.round(
          interviews.reduce(
            (sum, interview) =>
              sum +
              Number(
                interview.score || 0,
              ),
            0,
          ) /
            interviews.length,
        )
      : null;

  const totalMinutes =
    interviews.reduce(
      (sum, interview) =>
        sum +
        Number(
          interview.duration || 0,
        ),
      0,
    );

  const bestScore =
    interviews.length > 0
      ? Math.max(
          ...interviews.map(
            (interview) =>
              Number(
                interview.score || 0,
              ),
          ),
        )
      : null;

  const recentScores =
    [...interviews]
      .slice(-6)
      .map((interview) =>
        Number(
          interview.score || 0,
        ),
      );

  const uniqueDomains = [
    "All",
    ...Array.from(
      new Set(
        interviews.map(
          (interview) =>
            interview.topic,
        ),
      ),
    ),
  ];

  const filtered =
    filterDomain === "All"
      ? interviews
      : interviews.filter(
          (interview) =>
            interview.topic ===
            filterDomain,
        );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
        {/* =================================================
            HEADER
            ================================================= */}

        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              👋 Welcome back
              {user?.name
                ? `, ${user.name.split(" ")[0]}`
                : ""}
            </p>

            <h1 className="text-3xl md:text-4xl font-black text-foreground">
              Your Dashboard
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <Button
              size="lg"
              onClick={() =>
                setShowDomainSelector(
                  true,
                )
              }
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white rounded-full px-6 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              ⚡ New Interview
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={openArena}
              className="rounded-full px-6 font-semibold"
            >
              🏆 Challenge Arena
            </Button>
          </div>
        </section>

        {/* =================================================
            STATS
            ================================================= */}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Sessions",
              value:
                interviews.length.toString(),
              sub: `${
                interviews.length
              } session${
                interviews.length !==
                1
                  ? "s"
                  : ""
              }`,
              icon: "📋",
            },
            {
              label: "Average Score",
              value:
                avgScore !== null
                  ? `${avgScore}%`
                  : "—",
              sub:
                avgScore !== null
                  ? avgScore >= 80
                    ? "Excellent 🔥"
                    : avgScore >= 60
                      ? "Good 👍"
                      : "Keep going 💪"
                  : "No data yet",
              icon: "📊",
              accent: true,
            },
            {
              label: "Best Score",
              value:
                bestScore !== null
                  ? `${bestScore}%`
                  : "—",
              sub:
                bestScore !== null
                  ? "Personal best"
                  : "No data yet",
              icon: "🏆",
            },
            {
              label: "Practice Time",
              value:
                totalMinutes >= 60
                  ? `${Math.floor(
                      totalMinutes /
                        60,
                    )}h ${
                      totalMinutes %
                      60
                    }m`
                  : `${totalMinutes}m`,
              sub: "Total invested",
              icon: "⏱",
            },
          ].map(
            (
              stat,
              index,
            ) => (
              <Card
                key={index}
                className={`p-5 border ${
                  stat.accent
                    ? "border-primary/30 bg-primary/[0.03]"
                    : "border-border/50"
                } hover:border-primary/40 transition-colors`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    {
                      stat.label
                    }
                  </p>

                  <span className="text-lg">
                    {stat.icon}
                  </span>
                </div>

                <p
                  className={`text-2xl font-black mb-0.5 ${
                    stat.accent
                      ? "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                      : "text-foreground"
                  }`}
                >
                  {
                    stat.value
                  }
                </p>

                <p className="text-xs text-muted-foreground">
                  {stat.sub}
                </p>
              </Card>
            ),
          )}
        </section>

        {/* =================================================
            SCORE TREND
            ================================================= */}

        {recentScores.length >=
          2 && (
          <Card className="p-5 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">
                  Score Trend
                </p>

                <p className="text-xs text-muted-foreground">
                  Last{" "}
                  {
                    recentScores.length
                  }{" "}
                  sessions
                </p>
              </div>

              <div className="flex items-end gap-3">
                <MiniSparkline
                  scores={
                    recentScores
                  }
                />

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Latest
                  </p>

                  <p className="text-sm font-bold text-primary">
                    {
                      recentScores[
                        recentScores.length -
                          1
                      ]
                    }
                    %
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* =================================================
            TABS
            ================================================= */}

        <section>
          <div className="flex items-center gap-1 mb-6 border-b border-border/50 overflow-x-auto">
            {(
              [
                "history",
                "resume",
                "arena",
              ] as const
            ).map(
              (tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => {
                    if (
                      tab ===
                      "arena"
                    ) {
                      openArena();
                    } else {
                      setActiveTab(
                        tab,
                      );
                    }
                  }}
                  className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
                    activeTab ===
                    tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab ===
                  "history"
                    ? "📋 Interview History"
                    : tab ===
                        "resume"
                      ? "📄 Resume Analysis"
                      : "🏆 Challenge Arena"}
                </button>
              ),
            )}
          </div>

          {/* =================================================
              INTERVIEW HISTORY
              ================================================= */}

          {activeTab ===
            "history" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  Your recent practice sessions
                </p>

                {uniqueDomains.length >
                  1 && (
                  <div className="flex flex-wrap gap-2">
                    {uniqueDomains.map(
                      (
                        domain,
                      ) => (
                        <button
                          type="button"
                          key={domain}
                          onClick={() =>
                            setFilterDomain(
                              domain,
                            )
                          }
                          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                            filterDomain ===
                            domain
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {
                            domain
                          }
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>

              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(
                    (index) => (
                      <Card
                        key={
                          index
                        }
                        className="p-5 border border-border/50"
                      >
                        <div className="animate-pulse flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />

                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3" />

                            <div className="h-3 bg-muted rounded w-1/2" />
                          </div>

                          <div className="w-16 h-8 bg-muted rounded-full" />
                        </div>
                      </Card>
                    ),
                  )}
                </div>
              ) : filtered.length ===
                  0 &&
                interviews.length ===
                  0 ? (
                <Card className="p-12 text-center border-2 border-dashed border-border">
                  <div className="text-5xl mb-4">
                    📝
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2">
                    No sessions yet
                  </h3>

                  <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                    Start a practice interview or upload your resume for personalised domain suggestions.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      onClick={() =>
                        setShowDomainSelector(
                          true,
                        )
                      }
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white rounded-full px-5"
                    >
                      ⚡ Start Interview
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        setActiveTab(
                          "resume",
                        )
                      }
                      className="rounded-full px-5"
                    >
                      📄 Analyse Resume
                    </Button>
                  </div>
                </Card>
              ) : filtered.length ===
                0 ? (
                <Card className="p-8 text-center border border-border/50">
                  <p className="text-muted-foreground text-sm">
                    No sessions for "
                    {
                      filterDomain
                    }
                    "
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {[...filtered]
                    .reverse()
                    .map(
                      (
                        interview,
                      ) => {
                        const meta =
                          INTERVIEW_DOMAINS.find(
                            (
                              domain,
                            ) =>
                              domain.label ===
                              interview.topic,
                          );

                        return (
                          <Card
                            key={
                              interview.id
                            }
                            className="p-5 border border-border/50 hover:border-primary/40 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center text-xl flex-shrink-0">
                                {meta?.icon ||
                                  "🎯"}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className="font-semibold text-foreground text-sm truncate">
                                    {
                                      interview.topic
                                    }
                                  </p>

                                  {interview.company && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                                      🏢{" "}
                                      {
                                        interview.company
                                      }
                                    </span>
                                  )}

                                  <ScoreBadge
                                    score={
                                      interview.score
                                    }
                                  />
                                </div>

                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                                  <span>
                                    📅{" "}
                                    {new Date(
                                      interview.date,
                                    ).toLocaleDateString(
                                      "en-IN",
                                      {
                                        day: "numeric",
                                        month:
                                          "short",
                                        year: "numeric",
                                      },
                                    )}
                                  </span>

                                  <span>
                                    ⏱{" "}
                                    {
                                      interview.duration
                                    }{" "}
                                    min
                                  </span>
                                </div>
                              </div>

                              <div className="hidden md:flex flex-col items-end gap-1 w-28">
                                <p className="text-xs text-muted-foreground">
                                  Score
                                </p>

                                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.max(
                                          0,
                                          interview.score,
                                        ),
                                      )}%`,
                                    }}
                                  />
                                </div>

                                <p className="text-xs font-semibold text-foreground">
                                  {
                                    interview.score
                                  }
                                  %
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full text-xs border-border/60 hidden sm:flex"
                                  onClick={() =>
                                    handleSelectDomain(
                                      interview.topic,
                                      interview.company ||
                                        undefined,
                                    )
                                  }
                                >
                                  Details
                                </Button>

                                <Button
                                  size="sm"
                                  className="rounded-full text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white"
                                  onClick={() =>
                                    handleSelectDomain(
                                      interview.topic,
                                      interview.company ||
                                        undefined,
                                    )
                                  }
                                >
                                  Retake
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      },
                    )}
                </div>
              )}
            </div>
          )}

          {/* =================================================
              RESUME
              ================================================= */}

          {activeTab ===
            "resume" && (
            <ResumePanel
              onDomainSelect={
                handleSelectDomain
              }
            />
          )}

          {/* =================================================
              CHALLENGE ARENA
              ================================================= */}

          {activeTab ===
            "arena" && (
            <div className="space-y-6">
              {/* ARENA HEADER */}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Compete. Improve. Climb the leaderboard.
                  </p>

                  <h2 className="text-2xl font-black text-foreground">
                    🏆 Peer Challenge Arena
                  </h2>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={
                      challengeType ===
                      "daily"
                        ? "default"
                        : "outline"
                    }
                    className="rounded-full"
                    disabled={
                      challengeLoading
                    }
                    onClick={() =>
                      changeChallengeType(
                        "daily",
                      )
                    }
                  >
                    ⚡ Daily
                  </Button>

                  <Button
                    variant={
                      challengeType ===
                      "weekly"
                        ? "default"
                        : "outline"
                    }
                    className="rounded-full"
                    disabled={
                      challengeLoading
                    }
                    onClick={() =>
                      changeChallengeType(
                        "weekly",
                      )
                    }
                  >
                    🔥 Weekly
                  </Button>
                </div>
              </div>

              {/* CHALLENGE ERROR */}

              {challengeError && (
                <Card className="p-4 border border-destructive/30 bg-destructive/5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-destructive">
                      ⚠️{" "}
                      {
                        challengeError
                      }
                    </p>

                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() =>
                        fetchChallenge(
                          challengeType,
                        )
                      }
                    >
                      Retry
                    </Button>
                  </div>
                </Card>
              )}

              {/* =================================================
                  MY CHALLENGE STATS
                  ================================================= */}

              {myChallengeStats && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-4 border border-border/50">
                      <p className="text-xs text-muted-foreground">
                        XP
                      </p>

                      <p className="text-2xl font-black text-primary">
                        {
                          myChallengeStats.xp
                        }
                      </p>
                    </Card>

                    <Card className="p-4 border border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Challenges
                      </p>

                      <p className="text-2xl font-black">
                        {
                          myChallengeStats.total
                        }
                      </p>
                    </Card>

                    <Card className="p-4 border border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Streak
                      </p>

                      <p className="text-2xl font-black">
                        🔥{" "}
                        {
                          myChallengeStats.currentStreak
                        }
                      </p>
                    </Card>

                    <Card className="p-4 border border-primary/30 bg-primary/[0.03]">
                      <p className="text-xs text-muted-foreground">
                        Rank
                      </p>

                      <p className="text-2xl font-black flex items-center gap-1.5">
                        <span>
                          {
                            getXpTier(
                              myChallengeStats.xp ||
                                0,
                            ).current
                              .icon
                          }
                        </span>

                        {
                          myChallengeStats.rank
                        }
                      </p>
                    </Card>
                  </div>

                  {/* RANK + STREAK */}

                  {(() => {
                    const xp =
                      myChallengeStats.xp ||
                      0;

                    const {
                      current,
                      next,
                      progress,
                    } =
                      getXpTier(
                        xp,
                      );

                    const streak =
                      Math.min(
                        myChallengeStats.currentStreak ||
                          0,
                        7,
                      );

                    return (
                      <Card className="p-5 border border-border/50">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {
                                current.icon
                              }
                            </span>

                            <p className="text-sm font-bold text-foreground">
                              {
                                current.name
                              }
                            </p>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {next
                              ? `${xp} / ${next.min} XP to ${next.name} ${next.icon}`
                              : "Top tier reached"}
                          </p>
                        </div>

                        <div className="w-full h-2 bg-border/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <div className="mt-5 pt-5 border-t border-border/40">
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-xs font-bold text-foreground">
                              🔥{" "}
                              {streak}
                              -day streak
                            </p>

                            <p className="text-xs text-muted-foreground">
                              Best:{" "}
                              {
                                myChallengeStats.longestStreak
                              }{" "}
                              days
                            </p>
                          </div>

                          <div className="flex gap-1.5">
                            {Array.from(
                              {
                                length: 7,
                              },
                            ).map(
                              (
                                _,
                                index,
                              ) => {
                                const lit =
                                  index >=
                                  7 -
                                    streak;

                                return (
                                  <div
                                    key={
                                      index
                                    }
                                    className={`flex-1 h-8 rounded-lg border flex items-center justify-center text-sm ${
                                      lit
                                        ? "bg-gradient-to-b from-primary/20 to-accent/10 border-primary/30"
                                        : "border-border/40 bg-muted/20"
                                    }`}
                                  >
                                    {lit
                                      ? "🔥"
                                      : ""}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })()}
                </>
              )}

              {/* =================================================
                  CHALLENGE CARD
                  ================================================= */}

              {challengeLoading ? (
                <Card className="p-10 text-center border border-border/50">
                  <div className="w-10 h-10 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />

                  <p className="text-sm text-muted-foreground">
                    Loading{" "}
                    {challengeType}{" "}
                    challenge...
                  </p>
                </Card>
              ) : challenge ? (
                <Card className="p-6 border border-border/50">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                    <div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {
                            challenge.category
                          }
                        </span>

                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                          {
                            challenge.domain
                          }
                        </span>

                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getDifficultyStyles(
                            challenge.difficulty,
                          )}`}
                        >
                          {
                            challenge.difficulty
                          }
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-foreground">
                        {
                          challenge.title
                        }
                      </h3>

                      <p className="text-sm text-muted-foreground mt-1">
                        {
                          challenge.description
                        }
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
                      <span>
                        ⏱{" "}
                        {
                          challenge.timeLimit
                        }{" "}
                        min
                      </span>

                      <span className="text-xs">
                        👥{" "}
                        {
                          challenge.participants
                        }{" "}
                        participants
                      </span>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-muted/30 border border-border/50 mb-5">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      CHALLENGE
                    </p>

                    <p className="text-sm md:text-base font-semibold text-foreground leading-relaxed">
                      {
                        challenge.question
                      }
                    </p>
                  </div>

                  {/* =================================================
                      COMPLETED RESULT
                      ================================================= */}

                  {challengeResult ? (
                    <div className="space-y-4">
                      <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 text-center">
                        <p className="text-xs text-muted-foreground">
                          Your Score
                        </p>

                        <p className="text-5xl font-black text-primary mt-1">
                          {
                            challengeResult.score
                          }
                          %
                        </p>

                        <p className="text-sm font-semibold mt-2 capitalize">
                          {
                            challengeResult.performance
                          }
                        </p>

                        {challengeResult.xpEarned >
                          0 && (
                          <p className="text-sm text-primary mt-2 font-bold">
                            +
                            {
                              challengeResult.xpEarned
                            }{" "}
                            XP
                          </p>
                        )}
                      </div>

                      {challengeResult.feedback && (
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                          <p className="text-xs font-bold mb-2">
                            🤖 AI Feedback
                          </p>

                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {
                              challengeResult.feedback
                            }
                          </p>
                        </div>
                      )}

                      {challengeResult.leaderboardPosition && (
                        <div className="text-center p-4 rounded-xl bg-muted/20 border border-border/40">
                          <p className="text-sm text-muted-foreground">
                            Your leaderboard position
                          </p>

                          <p className="text-3xl font-black text-foreground">
                            #
                            {
                              challengeResult.leaderboardPosition
                            }
                          </p>
                        </div>
                      )}

                      <Button
                        className="w-full rounded-xl"
                        onClick={async () => {
                          await Promise.all(
                            [
                              fetchLeaderboard(),
                              fetchChallengeStats(),
                            ],
                          );
                        }}
                      >
                        🔄 Refresh Leaderboard
                      </Button>
                    </div>
                  ) : (
                    /* =================================================
                       ANSWER FORM
                       ================================================= */

                    <div className="space-y-4">
                      <textarea
                        value={
                          challengeAnswer
                        }
                        onChange={(
                          event,
                        ) =>
                          setChallengeAnswer(
                            event.target
                              .value,
                          )
                        }
                        placeholder="Write your answer here..."
                        disabled={
                          challengeSubmitting
                        }
                        className="w-full min-h-[180px] rounded-xl border border-border bg-background p-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none disabled:opacity-60"
                      />

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {
                            challengeAnswer.length
                          }{" "}
                          characters
                        </span>

                        <span>
                          Max score:{" "}
                          {
                            challenge.maxScore
                          }
                        </span>
                      </div>

                      <Button
                        disabled={
                          !challengeAnswer.trim() ||
                          challengeSubmitting
                        }
                        onClick={
                          submitChallenge
                        }
                        className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold py-5 disabled:opacity-50"
                      >
                        {challengeSubmitting
                          ? "🤖 Evaluating..."
                          : "🚀 Submit Challenge"}
                      </Button>
                    </div>
                  )}
                </Card>
              ) : !challengeError ? (
                <Card className="p-10 text-center border border-border/50">
                  <div className="text-4xl mb-3">
                    🏆
                  </div>

                  <p className="font-bold text-foreground">
                    No challenge available
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Please try again later.
                  </p>
                </Card>
              ) : null}

              {/* =================================================
                  LEADERBOARD
                  ================================================= */}

              <Card className="border border-border/50 overflow-hidden">
                <div className="p-5 border-b border-border/50">
                  <h3 className="font-black text-lg">
                    🏆 Global Leaderboard
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1">
                    Compete with other interview candidates
                  </p>
                </div>

                {leaderboard.length ===
                0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No leaderboard data yet.
                  </div>
                ) : (
                  <>
                    {/* TOP 3 */}

                    {leaderboard.length >=
                      3 && (
                      <div className="grid grid-cols-3 gap-3 p-5 items-end border-b border-border/50">
                        {[
                          leaderboard[1],
                          leaderboard[0],
                          leaderboard[2],
                        ].map(
                          (
                            player,
                            index,
                          ) => {
                            const first =
                              index ===
                              1;

                            const medal =
                              first
                                ? "🥇"
                                : index ===
                                    0
                                  ? "🥈"
                                  : "🥉";

                            const isYou =
                              player.name ===
                              user?.name;

                            return (
                              <div
                                key={
                                  player.id
                                }
                                className={`flex flex-col items-center rounded-2xl border text-center ${
                                  first
                                    ? "border-primary/40 bg-gradient-to-b from-primary/10 to-accent/5 pt-3 pb-5 order-2"
                                    : "border-border/50 bg-muted/20 pt-3 pb-3 order-1 last:order-3"
                                }`}
                              >
                                <div
                                  className={`flex items-center justify-center rounded-full font-black flex-shrink-0 ${
                                    first
                                      ? "w-14 h-14 text-lg bg-gradient-to-br from-primary to-accent text-white"
                                      : "w-11 h-11 text-sm bg-muted border border-border/60 text-foreground"
                                  }`}
                                >
                                  {initialsOf(
                                    player.name,
                                  )}
                                </div>

                                <span className="text-lg mt-2">
                                  {
                                    medal
                                  }
                                </span>

                                <p className="text-sm font-bold text-foreground mt-0.5 px-1 truncate max-w-full">
                                  {
                                    player.name
                                  }
                                </p>

                                {isYou && (
                                  <span className="text-[10px] text-primary font-semibold">
                                    You
                                  </span>
                                )}

                                <p className="text-xs font-black text-primary mt-0.5">
                                  {
                                    player.xp
                                  }{" "}
                                  XP
                                </p>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}

                    {/* REST OF LEADERBOARD */}

                    <div className="divide-y divide-border/50">
                      {(leaderboard.length >=
                      3
                        ? leaderboard.slice(
                            3,
                            10,
                          )
                        : leaderboard.slice(
                            0,
                            10,
                          )
                      ).map(
                        (
                          player,
                        ) => {
                          const isYou =
                            player.name ===
                            user?.name;

                          return (
                            <div
                              key={
                                player.id
                              }
                              className={`p-4 flex items-center gap-3 ${
                                isYou
                                  ? "bg-primary/5"
                                  : ""
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-black text-sm flex-shrink-0">
                                #
                                {
                                  player.position
                                }
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate flex items-center gap-1.5">
                                  {
                                    player.name
                                  }

                                  {isYou && (
                                    <span className="text-[10px] text-primary font-semibold">
                                      You
                                    </span>
                                  )}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                  {
                                    player.rank
                                  }{" "}
                                  ·{" "}
                                  {
                                    player.completedChallenges
                                  }{" "}
                                  challenges
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-black text-primary">
                                  {
                                    player.xp
                                  }{" "}
                                  XP
                                </p>

                                {player.currentStreak >
                                  0 && (
                                  <p className="text-xs text-muted-foreground">
                                    🔥{" "}
                                    {
                                      player.currentStreak
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </>
                )}
              </Card>

              {/* =================================================
                  BADGES
                  ================================================= */}

              {myChallengeStats
                ?.badges
                ?.length ? (
                <Card className="p-5 border border-border/50">
                  <h3 className="font-black mb-4">
                    🎖 Your Achievements
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {myChallengeStats.badges.map(
                      (
                        badge,
                      ) => (
                        <span
                          key={
                            badge
                          }
                          className="px-3 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold"
                        >
                          🏅{" "}
                          {
                            badge
                          }
                        </span>
                      ),
                    )}
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {/* =====================================================
          NEW INTERVIEW MODAL
          ===================================================== */}

      {showDomainSelector && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDomainSelector();
            }
          }}
        >
          <Card className="w-full max-w-xl p-6 border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* HEADER */}

            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-foreground mb-1">
                  Start New Interview
                </h2>

                <p className="text-sm text-muted-foreground">
                  Choose how you want to practice
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeDomainSelector
                }
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* INTERVIEW TYPE */}

            <div className="mb-6">
              <p className="text-xs font-bold text-foreground mb-2.5">
                Interview Type
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyMode(
                      "general",
                    );
                    setSelectedCompany(
                      "",
                    );
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    companyMode ===
                    "general"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      🎯
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        General Interview
                      </p>

                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Practice normally
                      </p>
                    </div>
                  </div>

                  {companyMode ===
                    "general" && (
                    <div className="mt-2 text-[10px] text-primary font-semibold">
                      ✓ No company required
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCompanyMode(
                      "company",
                    )
                  }
                  className={`p-4 rounded-xl border text-left transition-all ${
                    companyMode ===
                    "company"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      🏢
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Company Interview
                      </p>

                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Target a company
                      </p>
                    </div>
                  </div>

                  {companyMode ===
                    "company" && (
                    <div className="mt-2 text-[10px] text-primary font-semibold">
                      ✓ Company-specific
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* COMPANY SELECTOR */}

            {companyMode ===
              "company" && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-bold text-foreground">
                    Select Company
                  </p>

                  <span className="text-[10px] text-muted-foreground">
                    Optional
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COMPANIES.map(
                    (
                      company,
                    ) => (
                      <button
                        type="button"
                        key={
                          company
                        }
                        onClick={() =>
                          setSelectedCompany(
                            company,
                          )
                        }
                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          selectedCompany ===
                          company
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                            : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <span className="mr-1.5">
                          🏢
                        </span>

                        {
                          company
                        }
                      </button>
                    ),
                  )}
                </div>

                {selectedCompany && (
                  <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        🏢
                      </span>

                      <div>
                        <p className="text-[10px] text-muted-foreground">
                          Selected company
                        </p>

                        <p className="text-xs font-bold text-foreground">
                          {
                            selectedCompany
                          }
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCompany(
                          "",
                        )
                      }
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {!selectedCompany && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Select a company to make the interview company-specific.
                  </p>
                )}
              </div>
            )}

            {/* DOMAIN */}

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-bold text-foreground">
                  Pick a Domain
                </p>

                {companyMode ===
                  "company" &&
                  selectedCompany && (
                    <span className="text-[10px] text-primary font-semibold">
                      {
                        selectedCompany
                      }{" "}
                      Interview
                    </span>
                  )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INTERVIEW_DOMAINS.map(
                  (
                    domain,
                  ) => (
                    <button
                      type="button"
                      key={
                        domain.label
                      }
                      onMouseEnter={() =>
                        setHoveredDomain(
                          domain.label,
                        )
                      }
                      onMouseLeave={() =>
                        setHoveredDomain(
                          null,
                        )
                      }
                      onClick={() =>
                        handleStartInterview(
                          domain.label,
                        )
                      }
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        hoveredDomain ===
                        domain.label
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">
                        {
                          domain.icon
                        }
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {
                            domain.label
                          }
                        </p>

                        <p className="text-xs text-muted-foreground truncate">
                          {
                            domain.desc
                          }
                        </p>
                      </div>

                      <span
                        className={`ml-auto text-primary transition-opacity ${
                          hoveredDomain ===
                          domain.label
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      >
                        →
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* MODE INFO */}

            <div className="mt-5 p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center gap-2">
                <span>
                  {companyMode ===
                  "company"
                    ? "🏢"
                    : "🎯"}
                </span>

                <p className="text-xs text-muted-foreground">
                  {companyMode ===
                    "company" &&
                  selectedCompany
                    ? `Starting a ${selectedCompany}-focused interview.`
                    : "Starting a general interview. No company will be selected."}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground hover:text-foreground text-sm mt-3"
              onClick={
                closeDomainSelector
              }
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Page;