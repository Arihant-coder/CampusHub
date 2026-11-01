import type { Result } from "@/shared/result";
import type { Subject } from "@/shared/user";

export type NoteTag = "Lecture / Day wise" | "Unit wise" | "Other" | "PYQ" | "Private";

export interface SubjectNote {
  id: string;
  subjectId: string;
  title: string;
  tag: NoteTag;
  storagePath: string | null;
  content: string | null;
  contentUrl?: string | null;
  createdAt?: string;
}

export interface CreateTextNoteInput {
  subjectId: string;
  title: string;
  content: string;
}

export interface SubjectViewerService {
  getSubject(subjectId: string): Promise<Result<Subject>>;
  getNotesTree(subjectId: string): Promise<Result<SubjectNote[]>>;
  createTextNote(input: CreateTextNoteInput): Promise<Result<SubjectNote>>;
  updateTextNote(noteId: string, title: string, content: string): Promise<Result<SubjectNote>>;
}
