import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/api-client";

export type UploadedStudyMaterial = {
  id: string;
  title: string;
  kind: "pdf" | "text";
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export class StudyMaterialApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StudyMaterialApiError";
    this.status = status;
  }
}

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;
  if (import.meta.env.DEV) return "mock-dev";
  throw new StudyMaterialApiError("Please log in again.", 401);
}

async function readError(
  response: Response,
): Promise<StudyMaterialApiError> {
  let message = "Something went wrong while handling study materials.";

  try {
    const body: {
      detail?: unknown;
    } = await response.json();

    if (typeof body.detail === "string") {
      message = body.detail;
    } else if (
      body.detail &&
      typeof body.detail === "object"
    ) {
      const detail = body.detail as {
        error?: {
          message?: unknown;
        };
        message?: unknown;
      };

      if (typeof detail.error?.message === "string") {
        message = detail.error.message;
      } else if (typeof detail.message === "string") {
        message = detail.message;
      }
    }
  } catch {
    // Keep the fallback message if the response isn't JSON.
  }

  if (response.status === 401) {
    message = "Your session has expired. Please log in again.";
  } else if (response.status === 429) {
    message =
      message === "Something went wrong while handling study materials."
        ? "Too many requests. Please wait a minute and try again."
        : message;
  }

  return new StudyMaterialApiError(message, response.status);
}

export async function listStudyMaterials(subjectId: string): Promise<UploadedStudyMaterial[]> {
  const token = await getAuthToken();
  const query = new URLSearchParams({ subject_id: subjectId });
  const response = await fetch(
    `${BACKEND_URL}/api/v1/subjects-ai/materials?${query.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw await readError(response);
  return (await response.json()) as UploadedStudyMaterial[];
}

export async function clearStudyMaterials(subjectId: string): Promise<void> {
  const token = await getAuthToken();
  const query = new URLSearchParams({ subject_id: subjectId });
  const response = await fetch(
    `${BACKEND_URL}/api/v1/subjects-ai/materials?${query.toString()}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw await readError(response);
}

export async function uploadStudyMaterial(
  subjectId: string,
  file: File,
): Promise<UploadedStudyMaterial> {
  const token = await getAuthToken();
  const form = new FormData();
  form.set("subject_id", subjectId);
  form.set("file", file, file.name);

  const response = await fetch(`${BACKEND_URL}/api/v1/subjects-ai/materials`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    // Do not set Content-Type manually; the browser adds the multipart boundary.
    body: form,
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as UploadedStudyMaterial;
}

export async function deleteStudyMaterial(
  subjectId: string,
  materialId: string,
): Promise<void> {
  const token = await getAuthToken();
  const query = new URLSearchParams({ subject_id: subjectId });
  const response = await fetch(
    `${BACKEND_URL}/api/v1/subjects-ai/materials/${encodeURIComponent(materialId)}?${query.toString()}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok) throw await readError(response);
}
