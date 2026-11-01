export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatDocument = { title: string; text: string };
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/api-client";
export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export class ChatApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Real Supabase token when logged in. In dev builds only, fall back to the
// team's mock token so the panel works before real login is finished.
async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;
  if (import.meta.env.DEV) return "mock-dev";
  throw new ChatApiError("Please log in again.", 401);
}

async function toApiError(
  response: Response,
  subjectId?: string,
): Promise<ChatApiError> {
  let detail: any = null;
  try {
    detail = (await response.json()).detail;
  } catch {
    // response had no JSON body
  }

  if (response.status === 404 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("campushub:study-materials-invalid", {
      detail: { subjectId },
    }));
  }

  if (response.status === 429) {
    return new ChatApiError(
      detail?.error?.message ?? "Too many requests. Please slow down.",
      429,
      detail?.error?.details?.retry_after_seconds,
    );
  }
  if (response.status === 401) {
    return new ChatApiError("Please log in again.", 401);
  }
  const message = typeof detail === "string" ? detail : "Something went wrong.";
  return new ChatApiError(message, response.status);
}

export async function* streamChat(params: {
  subjectId: string;
  messages: ChatMessage[];
  materialIds?: string[];
  documents?: ChatDocument[];
  signal?: AbortSignal;
  subjectName?: string,
}): AsyncGenerator<StreamEvent> {
  const token = await getAuthToken();

  const response = await fetch(`${BACKEND_URL}/api/v1/subjects-ai/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subject_id: params.subjectId,
      subject_name: params.subjectName,
      messages: params.messages,
      material_ids: params.materialIds ?? [],
      documents: params.documents ?? [],
    }),
    signal: params.signal,
  });

  if (!response.ok || !response.body) {
    throw await toApiError(response, params.subjectId);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Each event ends with a blank line. Network chunks can split an event
    // in half, so keep the unfinished tail in the buffer.
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      yield JSON.parse(line.slice(5).trim()) as StreamEvent;
    }
  }
}
