import type { Result } from "@/shared/result";
import type { Subject } from "@/shared/user";
import type { CreateTextNoteInput, SubjectNote, SubjectViewerService } from "./types";

const subjects: Record<string, Subject> = {
  dbms: { id: "dbms", name: "Database Management Systems", code: "CS301" },
  cn: { id: "cn", name: "Computer Networks", code: "CS302" },
  os: { id: "os", name: "Operating Systems", code: "CS303" },
  dsa: { id: "dsa", name: "Data Structures & Algorithms", code: "CS201" },
};

let notes: SubjectNote[] = [
  { id: "lecture-1", subjectId: "dbms", title: "Lecture 1 — Introduction.pdf", tag: "Lecture / Day wise", storagePath: null, content: null },
  { id: "lecture-2", subjectId: "dbms", title: "Lecture 2 — ER Model.pdf", tag: "Lecture / Day wise", storagePath: null, content: null },
  { id: "unit-1", subjectId: "dbms", title: "Unit 1 — DBMS Basics.pdf", tag: "Unit wise", storagePath: null, content: null },
  { id: "pyq-1", subjectId: "dbms", title: "2021 Mid Semester.pdf", tag: "PYQ", storagePath: null, content: null },
  { id: "my-note-1", subjectId: "dbms", title: "Normalization revision", tag: "Private", storagePath: null, content: "# Normalization\n\n- 1NF: atomic values\n- 2NF: no partial dependency\n- 3NF: no transitive dependency" },
];

const pause = () => new Promise((resolve) => setTimeout(resolve, 180));

export const mockSubjectViewerService: SubjectViewerService = {
  async getSubject(subjectId) {
    await pause();
    return { data: subjects[subjectId] ?? { id: subjectId, name: "Subject workspace", code: "SUB" }, error: null };
  },
  async getNotesTree(subjectId) {
    await pause();
    return { data: notes.filter((note) => note.subjectId === subjectId), error: null };
  },
  async createTextNote(input: CreateTextNoteInput): Promise<Result<SubjectNote>> {
    await pause();
    const note: SubjectNote = { id: `note-${Date.now()}`, ...input, tag: "Private", storagePath: null };
    notes = [...notes, note];
    return { data: note, error: null };
  },
  async updateTextNote(noteId, title, content) {
    await pause();
    const index = notes.findIndex((note) => note.id === noteId);
    if (index === -1) return { data: null, error: { code: "NOT_FOUND", message: "Note was not found." } };
    const note = { ...notes[index], title, content };
    notes[index] = note;
    return { data: note, error: null };
  },
};
