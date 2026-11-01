# Subjects AI Backend (`backend/features/subjects_ai`)

The Subjects AI backend provides document-grounded AI companion services for subject study workspaces. It delivers contextual explanations, flashcard generation, and study quizzes.

- **Frontend Counterpart:** `frontend/src/features/subject-ai-panel/`
- **Backend Path:** `backend/features/subjects_ai/`
- **Route Prefix:** `/api/v1/subjects-ai`
- **Backend Services:** FastAPI with Google GenAI SDK (Gemini)

Nothing outside this folder may import from it.

---

## 1. Endpoints & Schemas

- **`POST /api/v1/subjects-ai/chat`** and **`POST /api/v1/subjects-ai/chat/stream`**: JWT-authenticated conversational Q&A grounded in inline documents and selected uploaded study materials. Send selected backend material IDs in `material_ids`; the backend resolves ownership and adds Gemini Files API PDF references to the Gemini request.
- **`DELETE /api/v1/subjects-ai/materials?subject_id=...`**: Clears temporary uploads for the current user and subject. The frontend calls this when a fresh page session starts; it also removes legacy persisted records created by older versions.
- **`POST /api/v1/subjects-ai/flashcards`**: Generates study flashcards from note text.
- **`POST /api/v1/subjects-ai/quiz`**: Generates a 5-question comprehension quiz.

Refer to `router.py`, `schemas.py`, and `service.py` within this folder.

Uploaded materials are temporary: text content and opaque IDs are kept in backend process memory, while PDFs are uploaded to Gemini Files API and their references are kept in process memory for at most 47 hours. A backend restart clears the registry; a fresh browser page session also calls the cleanup endpoint so previous uploads are removed and the UI starts empty. Gemini file deletion is attempted on cleanup; Google's 48-hour expiry is the fallback if a delete request fails. The clear endpoint also removes rows written to Supabase by an older implementation, using the current user's JWT and RLS. The Supabase migration remains needed only to clean up those legacy records.
