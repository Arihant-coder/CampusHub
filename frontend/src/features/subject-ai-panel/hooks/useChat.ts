import { useCallback, useSyncExternalStore } from "react";
import { ChatApiError, streamChat, type ChatMessage } from "../services/chat";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
};

export type SubjectChatState = {
  messages: UiMessage[];
  isStreaming: boolean;
};

const MAX_HISTORY = 20;

// Clean up any legacy persistent storage so refreshes/restarts always start fresh
if (typeof window !== "undefined") {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("campushub:subject_ai_chat:")) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

// What we send to the backend: no error bubbles, no empty bubbles,
// roles alternating, starting with a user message, capped in length.
function buildHistory(messages: UiMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (m.isError || !m.content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      out[out.length - 1] = { role: m.role, content: m.content };
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  const trimmed = out.slice(-MAX_HISTORY);
  while (trimmed.length > 0 && trimmed[0].role !== "user") trimmed.shift();
  return trimmed;
}

function friendlyError(e: unknown): string {
  if (e instanceof ChatApiError) {
    if (e.status === 429) {
      return e.retryAfterSeconds
        ? `You're sending messages too fast. Try again in ${e.retryAfterSeconds}s.`
        : "You're sending messages too fast. Please wait a moment.";
    }
    if (e.status === 401) return "Your session has expired. Please log in again.";
    return e.message;
  }
  return "Couldn't reach the server. Check your connection and try again.";
}

// In-memory background state:
// - Persists in memory across client route switches (dashboard, communities, subjects)
// - Keeps active streaming requests alive in the background
// - Resets completely on page refresh or server restart
const DEFAULT_STATE: SubjectChatState = {
  messages: [],
  isStreaming: false,
};

const subjectStates = new Map<string, SubjectChatState>();
const activeAbortControllers = new Map<string, AbortController>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function getSubjectSnapshot(subjectId: string): SubjectChatState {
  if (!subjectId) return DEFAULT_STATE;
  let state = subjectStates.get(subjectId);
  if (!state) {
    state = {
      messages: [],
      isStreaming: false,
    };
    subjectStates.set(subjectId, state);
  }
  return state;
}

function updateSubjectState(
  subjectId: string,
  updater: (prev: SubjectChatState) => SubjectChatState
) {
  const current = getSubjectSnapshot(subjectId);
  const next = updater(current);
  subjectStates.set(subjectId, next);
  notify();
}

async function runStream(
  subjectId: string,
  subjectName: string | undefined,
  base: UiMessage[],
  materialIds: string[],
) {
  if (!subjectId) return;

  // Cancel any prior in-flight stream for this specific subject
  activeAbortControllers.get(subjectId)?.abort();

  const botId = crypto.randomUUID();
  const history = buildHistory(base);

  // Set streaming state with an initial empty assistant bubble (displays "Thinking…")
  updateSubjectState(subjectId, (prev) => ({
    ...prev,
    messages: [...base, { id: botId, role: "assistant", content: "" }],
    isStreaming: true,
  }));

  const controller = new AbortController();
  activeAbortControllers.set(subjectId, controller);

  try {
    for await (const ev of streamChat({
      subjectId,
      subjectName,
      messages: history,
      materialIds,
      signal: controller.signal,
    })) {
      if (ev.type === "token") {
        updateSubjectState(subjectId, (prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === botId ? { ...m, content: m.content + ev.text } : m
          ),
        }));
      } else if (ev.type === "error") {
        updateSubjectState(subjectId, (prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === botId ? { ...m, content: ev.message, isError: true } : m
          ),
        }));
      }
    }
  } catch (e) {
    if (controller.signal.aborted) {
      // User pressed Stop: keep what arrived, drop the bubble if it's empty
      updateSubjectState(subjectId, (prev) => ({
        ...prev,
        messages: prev.messages.filter(
          (m) => !(m.id === botId && m.content === "")
        ),
      }));
    } else {
      updateSubjectState(subjectId, (prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === botId ? { ...m, content: friendlyError(e), isError: true } : m
        ),
      }));
    }
  } finally {
    if (activeAbortControllers.get(subjectId) === controller) {
      activeAbortControllers.delete(subjectId);
    }
    updateSubjectState(subjectId, (prev) => ({
      ...prev,
      isStreaming: false,
    }));
  }
}

export function useChat(subjectId: string, subjectName?: string) {
  const subscribe = useCallback((callback: () => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, []);

  const getSnapshot = useCallback(
    () => getSubjectSnapshot(subjectId),
    [subjectId]
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { messages, isStreaming } = state;

  const send = useCallback(
    async (text: string, materialIds: string[] = []) => {
      const content = text.trim();
      if (!content || isStreaming) return;
      const userMsg: UiMessage = { id: crypto.randomUUID(), role: "user", content };
      await runStream(subjectId, subjectName, [...messages, userMsg], materialIds);
    },
    [subjectId, subjectName, messages, isStreaming],
  );

  // Re-answers the last question. Also used by "Try again" on an error bubble.
  const regenerate = useCallback(async (materialIds: string[] = []) => {
    if (isStreaming) return;
    let lastUser = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUser = i;
        break;
      }
    }
    if (lastUser === -1) return;
    await runStream(subjectId, subjectName, messages.slice(0, lastUser + 1), materialIds);
  }, [subjectId, subjectName, messages, isStreaming]);

  // Edits a previously sent question and re-runs the answer
  const edit = useCallback(
    async (id: string, newText: string, materialIds: string[] = []) => {
      const content = newText.trim();
      if (!content || isStreaming) return;
      const index = messages.findIndex((m) => m.id === id);
      if (index === -1) return;
      const updatedUserMsg: UiMessage = { ...messages[index], content };
      await runStream(subjectId, subjectName, [...messages.slice(0, index), updatedUserMsg], materialIds);
    },
    [subjectId, subjectName, messages, isStreaming],
  );

  const stop = useCallback(() => {
    activeAbortControllers.get(subjectId)?.abort();
  }, [subjectId]);

  const clear = useCallback(() => {
    activeAbortControllers.get(subjectId)?.abort();
    activeAbortControllers.delete(subjectId);
    updateSubjectState(subjectId, () => ({
      messages: [],
      isStreaming: false,
    }));
  }, [subjectId]);

  return { messages, isStreaming, send, regenerate, edit, stop, clear };
}
