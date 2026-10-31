import React, { useEffect, useState } from "react";
import {
  Brain,
  Flame,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Trophy,
  Clock,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dailyQuizService } from "./services";
import type {
  QuestionFeedbackItem,
  QuizQuestion,
  UserStreak,
} from "./services";

const QUESTION_TIME = 30;

export default function DailyQuizPage() {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [feedbackDetails, setFeedbackDetails] = useState<
    Record<string, QuestionFeedbackItem>
  >({});

  const question = quizQuestions[currentQuestion];

  async function loadQuiz() {
    setLoading(true);
    setErrorMessage("");

    const result = await dailyQuizService.getTodayQuiz();

    if (result.error) {
      setErrorMessage(result.error.message);
      setLoading(false);
      return;
    }

    setQuizQuestions(result.data.questions);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers({});
    setScore(0);
    setQuizFinished(false);
    setTimeLeft(QUESTION_TIME);
    setFeedbackDetails({});
    setLoading(false);

    const streakResult = await dailyQuizService.getUserStreak();
    if (!streakResult.error) {
      setStreak(streakResult.data);
    }
  }

  useEffect(() => {
    void loadQuiz();
  }, []);

  // Question countdown timer
  useEffect(() => {
    if (loading || quizFinished || !question) return;

    if (timeLeft <= 0) {
      // Auto advance or submit when time runs out
      void handleAdvance(selectedAnswer ?? -1);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft, quizFinished, loading, question]);

  async function handleAdvance(chosenIndex: number) {
    if (!question) return;

    const updatedAnswers = {
      ...answers,
      [question.id]: chosenIndex,
    };
    setAnswers(updatedAnswers);

    if (currentQuestion === quizQuestions.length - 1) {
      setSubmitting(true);
      const result = await dailyQuizService.submitQuiz(updatedAnswers);
      setSubmitting(false);

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      setScore(result.data.score);
      if (result.data.details) {
        setFeedbackDetails(result.data.details);
      }
      setStreak((prev) =>
        prev
          ? { ...prev, currentStreak: result.data.streakCount }
          : { currentStreak: result.data.streakCount, bestStreak: result.data.streakCount, lastCompletedDate: new Date().toISOString().slice(0, 10) },
      );
      setQuizFinished(true);
      return;
    }

    setCurrentQuestion((prev) => prev + 1);
    setSelectedAnswer(null);
    setTimeLeft(QUESTION_TIME);
  }

  function handleRestart() {
    void loadQuiz();
  }

  const progress =
    quizFinished || quizQuestions.length === 0
      ? 100
      : ((currentQuestion + 1) / quizQuestions.length) * 100;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm text-muted-foreground">
        Loading today&apos;s quiz...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        <Card className="border-destructive/40">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-5" />
              <CardTitle className="text-lg">Failed to Load Quiz</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => void loadQuiz()}>
              <RotateCcw className="mr-2 size-4" /> Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center text-sm text-muted-foreground">
        No questions are available today. Please check back tomorrow!
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Brain className="size-4 text-primary" />
            <span>CampusHub Daily Practice</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Daily Quiz
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Challenge yourself with core CS questions and keep your learning streak alive.
          </p>
        </div>

        {streak && (
          <Badge
            variant="secondary"
            className="flex w-fit items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-semibold"
          >
            <Flame className="size-4 text-orange-500 fill-orange-500" />
            <span>{streak.currentStreak} Day Streak</span>
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-muted-foreground">
          <span>
            Question {quizFinished ? quizQuestions.length : currentQuestion + 1} of{" "}
            {quizQuestions.length}
          </span>
          <span>{Math.round(progress)}% Completed</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {quizFinished ? (
        /* Results View */
        <div className="space-y-6">
          <Card className="overflow-hidden border-border bg-card shadow-sm">
            <CardContent className="p-6 text-center sm:p-8">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {score >= 4 ? (
                  <Trophy className="size-8" />
                ) : score >= 3 ? (
                  <CheckCircle2 className="size-8" />
                ) : (
                  <Brain className="size-8" />
                )}
              </div>

              <h2 className="text-2xl font-bold text-foreground">
                Quiz Completed!
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                {score >= 4
                  ? "Outstanding job! You have demonstrated a strong mastery of today's topics."
                  : score >= 3
                    ? "Great effort! A solid performance across core concepts."
                    : "Good attempt! Keep reviewing your fundamentals and practice daily."}
              </p>

              <div className="my-6 inline-flex flex-col items-center justify-center rounded-xl border border-border bg-muted/40 px-8 py-5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Final Score
                </span>
                <span className="mt-1 text-4xl font-extrabold text-foreground">
                  {score} <span className="text-xl font-normal text-muted-foreground">/ {quizQuestions.length}</span>
                </span>
                <span className="mt-1 text-xs font-medium text-primary">
                  {Math.round((score / quizQuestions.length) * 100)}% Accuracy
                </span>
              </div>

              <div>
                <Button onClick={handleRestart} className="gap-2">
                  <RotateCcw className="size-4" /> Practice Again
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Question Review & Explanations
            </h3>

            <div className="space-y-3">
              {quizQuestions.map((q, idx) => {
                const feedback = feedbackDetails[q.id];
                const studentAnswer = answers[q.id];
                const isCorrect =
                  feedback?.isCorrect ?? (studentAnswer === q.correctAnswerIndex);
                const correctIdx =
                  feedback?.correctAnswerIndex ?? q.correctAnswerIndex ?? 0;
                const explanation =
                  feedback?.explanation ?? q.explanation ?? "";

                return (
                  <Card key={q.id} className="border-border bg-card">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                            {idx + 1}
                          </span>
                          <h4 className="text-sm font-semibold text-foreground">
                            {q.question}
                          </h4>
                        </div>
                        {isCorrect ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-green-500/15 text-green-700 dark:text-green-400 border-none gap-1"
                          >
                            <CheckCircle2 className="size-3.5" /> Correct
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="shrink-0 bg-destructive/15 text-destructive border-none gap-1"
                          >
                            <XCircle className="size-3.5" /> Incorrect
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 text-xs space-y-2">
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {q.options.map((opt, optIdx) => {
                          const wasSelected = studentAnswer === optIdx;
                          const isTheCorrectOne = correctIdx === optIdx;

                          let itemClass = "border border-border bg-muted/20 text-muted-foreground";
                          if (isTheCorrectOne) {
                            itemClass = "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300 font-medium";
                          } else if (wasSelected && !isCorrect) {
                            itemClass = "border-destructive/40 bg-destructive/10 text-destructive font-medium";
                          }

                          return (
                            <div
                              key={opt}
                              className={`flex items-center gap-2 rounded-md p-2 text-xs ${itemClass}`}
                            >
                              <span className="font-semibold">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span>{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      {explanation && (
                        <div className="mt-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Explanation: </span>
                          {explanation}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Active Quiz Question View */
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge variant="outline" className="text-xs">
                Question {currentQuestion + 1} of {quizQuestions.length}
              </Badge>

              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  timeLeft <= 10 ? "text-destructive animate-pulse" : "text-muted-foreground"
                }`}
              >
                <Clock className="size-3.5" />
                <span>00:{String(timeLeft).padStart(2, "0")} remaining</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            <h2 className="text-base font-semibold leading-relaxed text-foreground sm:text-lg">
              {question.question}
            </h2>

            <div className="space-y-2.5">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;

                return (
                  <button
                    key={`${question.id}-${option}`}
                    type="button"
                    onClick={() => setSelectedAnswer(index)}
                    className={`flex w-full cursor-pointer items-center justify-start rounded-xl border p-3.5 text-left text-sm transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground font-medium ring-1 ring-primary"
                        : "border-border bg-card text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`mr-3 flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">
                Select an option to advance
              </span>

              <Button
                type="button"
                disabled={selectedAnswer === null || submitting}
                onClick={() => void handleAdvance(selectedAnswer ?? 0)}
                className="gap-2"
              >
                {currentQuestion === quizQuestions.length - 1 ? (
                  submitting ? "Submitting..." : "Submit Quiz"
                ) : (
                  <>
                    Next Question <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
