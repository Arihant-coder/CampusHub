import type {
  GeneratedFlashcardDeck,
  GeneratedQuiz,
} from "./studyTools";

export type SavedStudyFile =
  | {
      id: string;
      kind: "flashcards";
      name: string;
      createdAt: string;
      content: GeneratedFlashcardDeck;
    }
  | {
      id: string;
      kind: "quiz";
      name: string;
      createdAt: string;
      content: GeneratedQuiz;
    };

const STORAGE_PREFIX = "campushub:study-files:";

function storageKey(subjectId: string) {
  return `${STORAGE_PREFIX}${subjectId}`;
}

export function loadSavedStudyFiles(subjectId: string): SavedStudyFile[] {
  try {
    const raw = localStorage.getItem(storageKey(subjectId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedStudyFile[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedStudyFiles(
  subjectId: string,
  files: SavedStudyFile[],
) {
  localStorage.setItem(storageKey(subjectId), JSON.stringify(files));
}

export function createSavedStudyFile(
  kind: "flashcards",
  content: GeneratedFlashcardDeck,
): SavedStudyFile;
export function createSavedStudyFile(
  kind: "quiz",
  content: GeneratedQuiz,
): SavedStudyFile;
export function createSavedStudyFile(
  kind: SavedStudyFile["kind"],
  content: GeneratedFlashcardDeck | GeneratedQuiz,
): SavedStudyFile {
  const title = content.title.trim() || (kind === "quiz" ? "Practice Quiz" : "Study Flashcards");
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    name: title,
    createdAt: new Date().toISOString(),
    content: content as never,
  } as SavedStudyFile;
}

