/**
 * @file types.ts
 * @description Service interface and types for Daily Quiz feature.
 * @owner Daily Quiz Team
 */

import type { Result } from "@/shared/result";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex?: number;
  explanation?: string;
}

export interface TodayQuizResponse {
  date: string;
  questions: QuizQuestion[];
}

export interface QuestionFeedbackItem {
  isCorrect: boolean;
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizSubmissionResult {
  score: number;
  total: number;
  streakCount: number;
  details?: Record<string, QuestionFeedbackItem>;
}

export interface UserStreak {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
}

export interface DailyQuizService {
  getTodayQuiz(): Promise<Result<TodayQuizResponse>>;

  submitQuiz(
    answers: Record<string, number>,
  ): Promise<Result<QuizSubmissionResult>>;

  getUserStreak(): Promise<Result<UserStreak>>;
}