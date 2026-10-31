
/**
 * @file realService.ts
 * @description Real service implementation for Daily Quiz feature.
 * @owner Daily Quiz Team
 */

import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api-client";
import type { Result } from "@/shared/result";
import type {
  DailyQuizService,
  QuestionFeedbackItem,
  QuizQuestion,
  QuizSubmissionResult,
  TodayQuizResponse,
  UserStreak,
} from "./types";

export const realDailyQuizService: DailyQuizService = {
  async getTodayQuiz(): Promise<Result<TodayQuizResponse>> {
    const result = await apiGet<{
      date: string;
      questions: Array<{
        id: string;
        question: string;
        options: string[];
        correct_answer_index?: number;
        explanation?: string;
      }>;
    }>("/api/v1/daily-quiz/today");

    if (result.error) {
      return { data: null, error: result.error };
    }

    return {
      data: {
        date: result.data.date,
        questions: result.data.questions.map(
          (question): QuizQuestion => ({
            id: question.id,
            question: question.question,
            options: question.options,
            correctAnswerIndex: question.correct_answer_index,
            explanation: question.explanation,
          }),
        ),
      },
      error: null,
    };
  },

  async submitQuiz(
    answers: Record<string, number>,
  ): Promise<Result<QuizSubmissionResult>> {
    const result = await apiPost<{
      score: number;
      total: number;
      streak_count: number;
      details?: Record<
        string,
        {
          is_correct: boolean;
          correct_answer_index: number;
          explanation: string;
        }
      >;
    }>("/api/v1/daily-quiz/submit", { answers });

    if (result.error) {
      return { data: null, error: result.error };
    }

    const details: Record<string, QuestionFeedbackItem> = {};
    if (result.data.details) {
      Object.entries(result.data.details).forEach(([qid, item]) => {
        details[qid] = {
          isCorrect: item.is_correct,
          correctAnswerIndex: item.correct_answer_index,
          explanation: item.explanation,
        };
      });
    }

    return {
      data: {
        score: result.data.score,
        total: result.data.total,
        streakCount: result.data.streak_count,
        details,
      },
      error: null,
    };
  },

  async getUserStreak(): Promise<Result<UserStreak>> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        data: null,
        error: {
          code: "UNAUTHENTICATED",
          message: "Please sign in to view your quiz streak.",
          details: authError,
        },
      };
    }

    const { data, error } = await supabase
      .from("user_streaks")
      .select("current_streak, best_streak, last_completed_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: {
          code: "INTERNAL",
          message: error.message,
          details: error,
        },
      };
    }

    return {
      data: {
        currentStreak: data?.current_streak ?? 0,
        bestStreak: data?.best_streak ?? 0,
        lastCompletedDate: data?.last_completed_date ?? null,
      },
      error: null,
    };
  },
};