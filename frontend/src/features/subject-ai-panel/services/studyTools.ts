import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/api-client";

export interface GeneratedFlashcard {
  question: string;
  answer: string;
}

export interface GeneratedFlashcardDeck {
  title: string;
  cards: GeneratedFlashcard[];
}

interface GenerateFlashcardsInput {
  subjectId: string;
  materialIds: string[];
  topic?: string;
  count: number;
}

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();

  if (data.session?.access_token) {
    return data.session.access_token;
  }

  // Match the existing studyMaterials.ts development behavior.
  if (import.meta.env.DEV) {
    return "mock-dev";
  }

  throw new Error("Your session has expired. Please log in again.");
}

export async function generateFlashcards(
  input: GenerateFlashcardsInput,
): Promise<GeneratedFlashcardDeck> {
  if (input.materialIds.length === 0) {
    throw new Error("Select at least one study material.");
  }

  const token = await getAuthToken();

  const response = await fetch(
    `${BACKEND_URL}/api/v1/subjects-ai/flashcards/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_id: input.subjectId,
        material_ids: input.materialIds,
        topic: input.topic?.trim() || null,
        count: input.count,
      }),
    },
  );

  if (!response.ok) {
    let message = "Could not generate flashcards. Please try again.";

    try {
      const body: { detail?: unknown } = await response.json();

      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Retain the fallback error.
    }

    throw new Error(message);
  }

  return (await response.json()) as GeneratedFlashcardDeck;
}

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedQuiz {
  title: string;
  questions: GeneratedQuizQuestion[];
}

interface GenerateQuizInput {
  subjectId: string;
  materialIds: string[];
  topic?: string;
  count: number;
}

export async function generateQuiz(
  input: GenerateQuizInput,
): Promise<GeneratedQuiz> {
  if (input.materialIds.length === 0) {
    throw new Error("Select at least one study material.");
  }

  const token = await getAuthToken();

  const response = await fetch(
    `${BACKEND_URL}/api/v1/subjects-ai/quiz/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_id: input.subjectId,
        material_ids: input.materialIds,
        topic: input.topic?.trim() || null,
        count: input.count,
      }),
    },
  );

  if (!response.ok) {
    let message = "Could not generate the quiz. Please try again.";

    try {
      const body: { detail?: unknown } = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Use the default error message.
    }

    if (response.status === 401) {
      message = "Your session has expired. Please log in again.";
    }

    throw new Error(message);
  }

  const data = (await response.json()) as {
    title: string;
    questions: Array<{
      question: string;
      options: string[];
      correct_index: number;
      explanation: string;
    }>;
  };

  return {
    title: data.title,
    questions: data.questions.map((question) => ({
      question: question.question,
      options: question.options,
      correctIndex: question.correct_index,
      explanation: question.explanation,
    })),
  };
}