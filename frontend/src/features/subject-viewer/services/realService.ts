import { supabase } from "@/lib/supabase";
import type { AppError, Result } from "@/shared/result";
import type { Subject } from "@/shared/user";
import type { CreateTextNoteInput, SubjectNote, SubjectViewerService } from "./types";

const toError = (message: string): AppError => ({ code: "INTERNAL", message });

export const realSubjectViewerService: SubjectViewerService = {
  async getSubject(subjectId): Promise<Result<Subject>> {
    const { data, error } = await supabase.from("subjects").select("id, name, code").eq("id", subjectId).single();
    return error ? { data: null, error: { code: "NOT_FOUND", message: error.message } } : { data, error: null };
  },
  async getNotesTree(subjectId): Promise<Result<SubjectNote[]>> {
    const { data, error } = await supabase
      .from("notes")
      .select("id, subject_id, title, tag, storage_path, content, is_shared, is_approved, user_id, created_at")
      .eq("subject_id", subjectId)
      .order("created_at");
    if (error) return { data: null, error: toError(error.message) };
    const { data: auth } = await supabase.auth.getUser();
    const visibleNotes = (data ?? []).filter((note) => {
      // Community documents are only surfaced when an admin approved them.
      if (["Lecture / Day wise", "Unit wise", "PYQ"].includes(note.tag)) return note.is_shared && note.is_approved;
      // "Private" remains the student's own personal text-note area.
      return note.tag === "Private" && note.user_id === auth.user?.id;
    });
    const mapped = await Promise.all(visibleNotes.map(async (note) => {
      let contentUrl: string | null = null;
      if (note.storage_path) {
        const signed = await supabase.storage.from("subject-notes").createSignedUrl(note.storage_path, 60 * 30);
        contentUrl = signed.data?.signedUrl ?? null;
      }
      return { id: note.id, subjectId: note.subject_id, title: note.title, tag: note.tag, storagePath: note.storage_path, content: note.content, contentUrl, createdAt: note.created_at } as SubjectNote;
    }));
    return { data: mapped, error: null };
  },
  async createTextNote(input: CreateTextNoteInput): Promise<Result<SubjectNote>> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { data: null, error: { code: "UNAUTHENTICATED", message: "Sign in to save personal notes." } };
    const { data, error } = await supabase.from("notes").insert({
      subject_id: input.subjectId, user_id: auth.user.id, title: input.title, tag: "Private", content: input.content, storage_path: "",
    }).select("id, subject_id, title, tag, storage_path, content, created_at").single();
    if (error) return { data: null, error: toError(error.message) };
    return { data: { id: data.id, subjectId: data.subject_id, title: data.title, tag: data.tag, storagePath: data.storage_path || null, content: data.content, createdAt: data.created_at }, error: null };
  },
  async updateTextNote(noteId, title, content): Promise<Result<SubjectNote>> {
    const { data, error } = await supabase.from("notes").update({ title, content }).eq("id", noteId).eq("tag", "Private")
      .select("id, subject_id, title, tag, storage_path, content, created_at").single();
    if (error) return { data: null, error: toError(error.message) };
    return { data: { id: data.id, subjectId: data.subject_id, title: data.title, tag: data.tag, storagePath: data.storage_path || null, content: data.content, createdAt: data.created_at }, error: null };
  },
};
