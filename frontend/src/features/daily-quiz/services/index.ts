
/**
 * @file index.ts
 * @description Selects the appropriate Daily Quiz service.
 * @owner Daily Quiz Team
 */

import type { DailyQuizService } from "./types";
import { mockDailyQuizService } from "./mockService";
import { realDailyQuizService } from "./realService";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";

export const dailyQuizService: DailyQuizService = isMock
  ? mockDailyQuizService
  : realDailyQuizService;

export type {
  DailyQuizService,
  QuestionFeedbackItem,
  QuizQuestion,
  QuizSubmissionResult,
  TodayQuizResponse,
  UserStreak,
} from "./types";