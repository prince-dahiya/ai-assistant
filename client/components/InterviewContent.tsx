"use client";

import ChatContainer from "@/components/ChatContainer";
import { InputBox } from "@/components/InputBox";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/lib/axios";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const TOTAL_QUESTIONS = 3;

const domainEmoji: Record<string, string> = {
  JavaScript: "🟨",
  "JavaScript/Node.js": "🟨",
  React: "⚛️",
  Python: "🐍",
  "Data Science": "📊",
  DevOps: "⚙️",
  "System Design": "🏗️",
  "Database Design": "🗄️",
  General: "🎯",
};

const InterviewContent = () => {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const domain = searchParams.get("domain") || "General";

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [interviewScore, setInterviewScore] = useState<number | null>(null);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const [difficulty, setDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // ─────────────────────────────────────────────
  // START INTERVIEW
  // ─────────────────────────────────────────────
  const startInterview = useCallback(async () => {
    try {
      setIsLoading(true);

      // Reset frontend state for a fresh interview
      setMessages([]);
      setSessionId("");
      setQuestionsAnswered(0);
      setInterviewScore(null);
      setIsInterviewComplete(false);
      setElapsedSeconds(0);
      setDifficulty("medium");

      const { data } = await axiosInstance.post(
        "/api/interviews/start",
        {
          domain,
        }
      );

      if (data) {
        setSessionId(data.sessionId);
        setQuestionsAnswered(0);

        setDifficulty(
          data.difficulty === "easy" ||
            data.difficulty === "hard"
            ? data.difficulty
            : "medium"
        );

        setMessages([
          {
            id: "1",
            content:
              data.question ||
              "Tell me about yourself and your experience.",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to start interview:", error);

      setMessages([
        {
          id: "error-start",
          content:
            "Connection error. Please check your network and try again.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  // ─────────────────────────────────────────────
  // AUTH + START INTERVIEW
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;

    const timer = setTimeout(() => {
      startInterview();
    }, 0);

    return () => clearTimeout(timer);
  }, [isLoggedIn, startInterview]);

  // ─────────────────────────────────────────────
  // REDIRECT IF NOT LOGGED IN
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  // ─────────────────────────────────────────────
  // INTERVIEW TIMER
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isInterviewComplete || !sessionId) return;

    const timer = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isInterviewComplete, sessionId]);

  // ─────────────────────────────────────────────
  // FORMAT TIMER
  // ─────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // ─────────────────────────────────────────────
  // HANDLE SEND ANSWER
  // ─────────────────────────────────────────────
  const handleSendMessage = async (userMessage: string) => {
    if (
      !userMessage.trim() ||
      !sessionId ||
      isLoading ||
      isInterviewComplete
    ) {
      return;
    }

    const answer = userMessage.trim();

    // Immediately show user's answer
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content: answer,
        isUser: true,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    try {
      const { data } = await axiosInstance.post(
        "/api/interviews/submit-answer",
        {
          sessionId,
          answer,
          domain,
          questionsAnswered,
          skipped: false,
        }
      );

      if (!data) {
        throw new Error("No response received from server");
      }

      const newCount = questionsAnswered + 1;

      setQuestionsAnswered(newCount);

      // Adaptive difficulty from backend
      if (
        data.difficulty === "easy" ||
        data.difficulty === "medium" ||
        data.difficulty === "hard"
      ) {
        setDifficulty(data.difficulty);
      }

      // Show AI feedback
      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `feedback-${Date.now()}`,
            content: data.feedback,
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      }

      // ─────────────────────────────────────────
      // INTERVIEW COMPLETE
      // ─────────────────────────────────────────
      if (
        data.isComplete ||
        newCount >= TOTAL_QUESTIONS
      ) {
        setInterviewScore(
          typeof data.score === "number"
            ? data.score
            : 0
        );

        setIsInterviewComplete(true);

        if (data.finalReport) {
          setMessages((prev) => [
            ...prev,
            {
              id: `report-${Date.now()}`,
              content: data.finalReport,
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }

        return;
      }

      // ─────────────────────────────────────────
      // NEXT ADAPTIVE QUESTION
      // ─────────────────────────────────────────
      if (data.nextQuestion) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `question-${Date.now()}`,
              content: data.nextQuestion,
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }, 500);
      }
    } catch (error) {
      console.error(
        "Failed to submit answer:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content:
            "Connection error. Please try again.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // HANDLE SKIP QUESTION
  // ─────────────────────────────────────────────
  const handleSkipQuestion = async () => {
    if (
      !sessionId ||
      isLoading ||
      isInterviewComplete
    ) {
      return;
    }

    setIsLoading(true);

    // Show skipped message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: `skip-${Date.now()}`,
        content: "Skipped",
        isUser: true,
        timestamp: new Date(),
      },
    ]);

    try {
      const { data } = await axiosInstance.post(
        "/api/interviews/submit-answer",
        {
          sessionId,
          answer: "[SKIPPED]",
          domain,
          questionsAnswered,
          skipped: true,
        }
      );

      if (!data) {
        throw new Error("No response received from server");
      }

      const newCount = questionsAnswered + 1;

      setQuestionsAnswered(newCount);

      // Adaptive difficulty after skip
      if (
        data.difficulty === "easy" ||
        data.difficulty === "medium" ||
        data.difficulty === "hard"
      ) {
        setDifficulty(data.difficulty);
      }

      // Show skip feedback
      if (data.feedback) {
        setMessages((prev) => [
          ...prev,
          {
            id: `skip-feedback-${Date.now()}`,
            content: data.feedback,
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      }

      // ─────────────────────────────────────────
      // INTERVIEW COMPLETE
      // ─────────────────────────────────────────
      if (
        data.isComplete ||
        newCount >= TOTAL_QUESTIONS
      ) {
        setInterviewScore(
          typeof data.score === "number"
            ? data.score
            : 0
        );

        setIsInterviewComplete(true);

        if (data.finalReport) {
          setMessages((prev) => [
            ...prev,
            {
              id: `skip-report-${Date.now()}`,
              content: data.finalReport,
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }

        return;
      }

      // ─────────────────────────────────────────
      // NEXT QUESTION
      // ─────────────────────────────────────────
      if (data.nextQuestion) {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `next-skip-question-${Date.now()}`,
              content: data.nextQuestion,
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }, 300);
      }
    } catch (error) {
      console.error(
        "Failed to skip question:",
        error
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `skip-error-${Date.now()}`,
          content:
            "Unable to skip this question. Please try again.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // END INTERVIEW
  // ─────────────────────────────────────────────
  const handleEndInterview = () => {
    router.push("/dashboard");
  };

  // ─────────────────────────────────────────────
  // AUTH LOADING
  // ─────────────────────────────────────────────
  if (authLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return null;
  }

  const score = interviewScore ?? 0;

  // ─────────────────────────────────────────────
  // SCORE LABEL
  // ─────────────────────────────────────────────
  const scoreLabel =
    score >= 80
      ? {
          text: "Excellent! You’re interview-ready 🚀",
          color:
            "text-green-600 dark:text-green-400",
        }
      : score >= 60
        ? {
            text:
              "Good effort! A few more sessions will get you there 💪",
            color:
              "text-blue-600 dark:text-blue-400",
          }
        : {
            text:
              "Keep practicing! Every session makes you stronger 🌟",
            color:
              "text-orange-600 dark:text-orange-400",
          };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─────────────────────────────────────────
          STICKY HEADER
      ───────────────────────────────────────── */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">

            {/* DOMAIN */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center text-xl flex-shrink-0">
                {domainEmoji[domain] || "🎯"}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-foreground truncate">
                    {domain} Interview
                  </h1>

                  {!isInterviewComplete && (
                    <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  AI Mock Interview Session
                </p>
              </div>
            </div>

            {/* PROGRESS */}
            {!isInterviewComplete && (
              <div className="hidden sm:flex flex-col items-center gap-1.5">
                <ProgressDots
                  current={questionsAnswered}
                  total={TOTAL_QUESTIONS}
                />

                <p className="text-xs text-muted-foreground">
                  Question{" "}
                  {Math.min(
                    questionsAnswered + 1,
                    TOTAL_QUESTIONS
                  )}{" "}
                  of {TOTAL_QUESTIONS}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 flex-shrink-0">

              {/* DIFFICULTY */}
              {!isInterviewComplete && (
                <div className="hidden sm:flex items-center gap-1.5 bg-muted/50 border border-border/60 px-3 py-1.5 rounded-full">
                  <span className="text-xs">
                    {difficulty === "easy"
                      ? "🟢"
                      : difficulty === "medium"
                        ? "🟡"
                        : "🔴"}
                  </span>

                  <span className="text-xs font-semibold capitalize">
                    {difficulty}
                  </span>
                </div>
              )}

              {/* TIMER */}
              {!isInterviewComplete && (
                <div className="hidden sm:flex items-center gap-1.5 bg-muted/50 border border-border/60 px-3 py-1.5 rounded-full">
                  <span className="text-xs text-muted-foreground">
                    ⏱
                  </span>

                  <span className="text-sm font-mono font-semibold text-foreground tabular-nums">
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
              )}

              {/* EXIT / DASHBOARD */}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isInterviewComplete
                    ? handleEndInterview()
                    : setShowExitConfirm(true)
                }
                className="rounded-full text-xs border-border/60 hover:border-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-colors"
              >
                {isInterviewComplete
                  ? "Go to Dashboard"
                  : "Exit"}
              </Button>
            </div>
          </div>

          {/* MOBILE PROGRESS */}
          {!isInterviewComplete && (
            <div className="sm:hidden mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>
                  Q
                  {Math.min(
                    questionsAnswered + 1,
                    TOTAL_QUESTIONS
                  )}{" "}
                  of {TOTAL_QUESTIONS}
                </span>

                <span className="font-mono">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>

              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                  style={{
                    width: `${
                      (questionsAnswered /
                        TOTAL_QUESTIONS) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────
          EXIT CONFIRMATION
      ───────────────────────────────────────── */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() =>
            setShowExitConfirm(false)
          }
        >
          <Card
            className="w-full max-w-sm p-6 border border-border/60"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h2 className="text-lg font-bold text-foreground mb-2">
              Exit interview?
            </h2>

            <p className="text-sm text-muted-foreground mb-6">
              Your progress on this session will be
              lost if you leave now.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="rounded-full border-border/60"
                onClick={() =>
                  setShowExitConfirm(false)
                }
              >
                Stay
              </Button>

              <Button
                onClick={() => {
                  setShowExitConfirm(false);
                  handleEndInterview();
                }}
                className="rounded-full bg-destructive hover:opacity-90 text-white font-semibold"
              >
                Exit
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────
          MAIN CONTENT
      ───────────────────────────────────────── */}
      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">

        {isInterviewComplete ? (

          /* ───────────────────────────────────────
             COMPLETION SCREEN
          ─────────────────────────────────────── */
          <div className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-lg space-y-5">

              {/* SCORE CARD */}
              <Card className="p-8 border border-border/60 text-center">
                <div className="text-3xl mb-3">
                  🎉
                </div>

                <h2 className="text-2xl font-black text-foreground mb-1">
                  Interview Complete!
                </h2>

                <p className="text-sm text-muted-foreground mb-8">
                  Here&apos;s how you performed
                </p>

                <ScoreRing score={score} />

                <p
                  className={`text-sm font-semibold mt-6 ${scoreLabel.color}`}
                >
                  {scoreLabel.text}
                </p>
              </Card>

              {/* STATS */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Questions",
                    value: questionsAnswered,
                    icon: "❓",
                  },
                  {
                    label: "Domain",
                    value: domain.split("/")[0],
                    icon:
                      domainEmoji[domain] || "🎯",
                  },
                  {
                    label: "Duration",
                    value:
                      formatTime(elapsedSeconds),
                    icon: "⏱",
                  },
                ].map((stat, index) => (
                  <Card
                    key={index}
                    className="p-4 text-center border border-border/50"
                  >
                    <div className="text-lg mb-1">
                      {stat.icon}
                    </div>

                    <p className="text-base font-bold text-foreground">
                      {stat.value}
                    </p>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stat.label}
                    </p>
                  </Card>
                ))}
              </div>

              {/* SCORE BREAKDOWN */}
              <Card className="p-6 border border-border/50">
                <p className="text-sm font-semibold text-foreground mb-4">
                  Performance Breakdown
                </p>

                {[
                  {
                    label: "Technical Accuracy",
                    pct: Math.min(
                      score + 5,
                      100
                    ),
                  },
                  {
                    label:
                      "Communication Clarity",
                    pct: Math.max(
                      score - 8,
                      0
                    ),
                  },
                  {
                    label:
                      "Problem-Solving Approach",
                    pct: Math.min(
                      score + 2,
                      100
                    ),
                  },
                ].map((bar, index) => (
                  <div
                    key={index}
                    className="mb-3 last:mb-0"
                  >
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {bar.label}
                      </span>

                      <span className="font-semibold text-foreground">
                        {bar.pct}%
                      </span>
                    </div>

                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                        style={{
                          width: `${bar.pct}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Card>

              {/* ACTIONS */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={startInterview}
                  disabled={isLoading}
                  className="rounded-full border-border/60"
                >
                  🔄 Try Again
                </Button>

                <Button
                  onClick={handleEndInterview}
                  className="rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold"
                >
                  Dashboard →
                </Button>
              </div>
            </div>
          </div>

        ) : (

          /* ───────────────────────────────────────
             ACTIVE INTERVIEW
          ─────────────────────────────────────── */
          <>
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
            />

            <div className="border-t border-border/50 bg-background">
              <div className="max-w-4xl mx-auto px-4 pt-2">
                <p className="text-xs text-muted-foreground text-center">
                  💡 Tip: Be specific and use examples
                  from your experience for stronger
                  answers
                </p>
              </div>

              <InputBox
                onSend={handleSendMessage}
                onSkip={handleSkipQuestion}
                disabled={
                  isLoading ||
                  isInterviewComplete
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// SCORE RING
// ─────────────────────────────────────────────
function ScoreRing({
  score,
}: {
  score: number;
}) {
  const radius = 54;

  const circumference =
    2 * Math.PI * radius;

  const offset =
    circumference -
    (score / 100) * circumference;

  const color =
    score >= 80
      ? "#22c55e"
      : score >= 60
        ? "#3b82f6"
        : "#f97316";

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-border"
        />

        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-foreground">
          {score}
        </span>

        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
          Score
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROGRESS DOTS
// ─────────────────────────────────────────────
function ProgressDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map(
        (_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-500 ${
              index < current
                ? "bg-gradient-to-r from-primary to-accent w-6"
                : index === current
                  ? "bg-primary/40 w-4 animate-pulse"
                  : "bg-border w-2"
            }`}
          />
        )
      )}
    </div>
  );
}

export default InterviewContent;