
/**
 * @file mockService.ts
 * @description Mock implementation of the Daily Quiz service.
 * @owner Daily Quiz Team
 */

import type { Result } from "@/shared/result";
import type {
  DailyQuizService,
  QuizQuestion,
  QuizSubmissionResult,
  TodayQuizResponse,
  UserStreak,
} from "./types";

const mockQuestions: QuizQuestion[] = [
  {
    id: "q1",
    question: "Which data structure follows the LIFO principle?",
    options: ["Queue", "Stack", "Linked List", "Tree"],
    correctAnswerIndex: 1,
    explanation:
      "A Stack follows Last In, First Out (LIFO). The last element inserted is the first one removed.",
  },
  {
    id: "q2",
    question: "Which of the following is not a Java primitive data type?",
    options: ["int", "boolean", "String", "char"],
    correctAnswerIndex: 2,
    explanation:
      "String is a Java class, not a primitive data type. int, boolean, and char are primitive types.",
  },
  {
    id: "q3",
    question: "What is the time complexity of binary search on a sorted array?",
    options: ["O(n)", "O(n²)", "O(log n)", "O(1)"],
    correctAnswerIndex: 2,
    explanation:
      "Binary search halves the search space at each step, giving it O(log n) time complexity.",
  },
  {
    id: "q4",
    question: "Which SQL command retrieves data from a database?",
    options: ["SELECT", "UPDATE", "DELETE", "INSERT"],
    correctAnswerIndex: 0,
    explanation: "SELECT retrieves data from one or more database tables.",
  },
  {
    id: "q5",
    question: "Which scheduling algorithm gives each process a fixed time slice?",
    options: [
      "First Come First Served",
      "Shortest Job First",
      "Round Robin",
      "Priority Scheduling",
    ],
    correctAnswerIndex: 2,
    explanation:
      "Round Robin assigns each process a fixed time slice, called a time quantum.",
  },
];

const STORAGE_KEY = "campushub:mock_quiz_streak";

function loadStreak(): UserStreak {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as UserStreak;
    }
  } catch {
    // Ignore storage errors
  }
  return {
    currentStreak: 1,
    bestStreak: 1,
    lastCompletedDate: null,
  };
}

function saveStreak(streak: UserStreak): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(streak));
  } catch {
    // Ignore storage errors
  }
}

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export const mockDailyQuizService: DailyQuizService = {
  async getTodayQuiz(): Promise<Result<TodayQuizResponse>> {
    await delay(300);

    return {
      data: {
        date: new Date().toISOString().slice(0, 10),
        questions: mockQuestions,
      },
      error: null,
    };
  },

  async submitQuiz(
    answers: Record<string, number>,
  ): Promise<Result<QuizSubmissionResult>> {
    await delay(300);

    const streak = loadStreak();

    const details: Record<string, { isCorrect: boolean; correctAnswerIndex: number; explanation: string }> = {};
    let score = 0;

    mockQuestions.forEach((question) => {
      const isCorrect = answers[question.id] === question.correctAnswerIndex;
      if (isCorrect) score += 1;
      details[question.id] = {
        isCorrect,
        correctAnswerIndex: question.correctAnswerIndex ?? 0,
        explanation: question.explanation ?? "",
      };
    });

    const total = mockQuestions.length;
    const today = new Date().toISOString().slice(0, 10);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    if (streak.lastCompletedDate !== today) {
      streak.currentStreak =
        streak.lastCompletedDate === yesterday
          ? streak.currentStreak + 1
          : 1;

      streak.bestStreak = Math.max(
        streak.bestStreak,
        streak.currentStreak,
      );

      streak.lastCompletedDate = today;
      saveStreak(streak);
    }

    return {
      data: {
        score,
        total,
        streakCount: streak.currentStreak,
        details,
      },
      error: null,
    };
  },

  async getUserStreak(): Promise<Result<UserStreak>> {
    await delay(200);

    return {
      data: loadStreak(),
      error: null,
    };
  },
};