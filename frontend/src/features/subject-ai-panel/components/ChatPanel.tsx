
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { ArrowDown } from "lucide-react";

import { useChat } from "../hooks/useChat";
import { MAX_STUDY_MATERIALS } from "../hooks/useStudyMaterials";

import { ChatInput } from "./ChatInput";
import { ChatMessageBubble } from "./ChatMessageBubble";

import {
  StudyMaterialsTray,
  type StudyMaterialsTrayProps,
} from "./StudyMaterialsTray";

interface ChatBodyProps {
  subjectId: string;
  subjectName?: string;
  studyMaterials: StudyMaterialsTrayProps;

  materialsVisible: boolean;
  onToggleMaterialsVisibility: () => void;

  onClearChatChange: (handler: (() => void) | null) => void;
}

export function ChatBody({
  subjectId,
  subjectName,
  studyMaterials,
  materialsVisible,
  onToggleMaterialsVisibility,
  onClearChatChange,
}: ChatBodyProps) {
  const {
    messages,
    isStreaming,
    send,
    regenerate,
    edit,
    stop,
    clear,
  } = useChat(subjectId, subjectName);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const clearRef = useRef(clear);

  const [showJump, setShowJump] = useState(false);

  const hasMaterials = studyMaterials.materials.length > 0;

  clearRef.current = clear;

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;

    stickRef.current = nearBottom;
    setShowJump(!nearBottom);
  }

  // Scroll only when the reader is already near the bottom.
  useEffect(() => {
    const el = scrollRef.current;

    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function jumpToLatest() {
    const el = scrollRef.current;
    if (!el) return;

    stickRef.current = true;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }

  function handleSend(text: string) {
    stickRef.current = true;
    void send(text);
  }

  function handleRegenerate() {
    stickRef.current = true;
    void regenerate();
  }

  // Register clear conversation action in parent header.
  const handleClearChat = useCallback(() => {
    stickRef.current = true;
    setShowJump(false);
    clearRef.current();
  }, []);

  useEffect(() => {
    onClearChatChange(
      messages.length > 0 ? handleClearChat : null,
    );

    return () => {
      onClearChatChange(null);
    };
  }, [
    messages.length,
    handleClearChat,
    onClearChatChange,
  ]);

  const starters = [
    `What are the key topics in ${subjectName ?? "this subject"}?`,
    "Explain the hardest concept with a simple example",
    "Quiz me with 3 short questions",
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* Conversation area */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full space-y-3 overflow-y-auto px-3 py-2"
        >
          {messages.length === 0 ? (
            <div className="mt-6 space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                Ask a question, or try one of these:
              </p>

              {starters.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handleSend(question)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  {question}
                </button>
              ))}
            </div>
          ) : (
            messages.map((message, index) => {
              const isLast = index === messages.length - 1;

              return (
                <ChatMessageBubble
                  key={message.id}
                  message={message}
                  streaming={isLast && isStreaming}
                  onRegenerate={
                    isLast && !isStreaming
                      ? handleRegenerate
                      : undefined
                  }
                  onEdit={
                    message.role === "user" && !isStreaming
                      ? (text) => void edit(message.id, text)
                      : undefined
                  }
                />
              );
            })
          )}
        </div>

        {showJump && messages.length > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label="Jump to latest"
            title="Jump to latest"
            className="absolute bottom-3 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-500/80 bg-zinc-400 text-zinc-900 shadow-md transition-colors hover:bg-zinc-500 hover:text-white dark:border-zinc-500 dark:bg-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-500"
          >
            <ArrowDown className="size-4" />
          </button>
        )}
      </div>

      {/* Shared Study Materials bar */}
      {hasMaterials && materialsVisible && (
        <StudyMaterialsTray
          {...studyMaterials}
          showAddButton={false}
        />
      )}

      {/* Upload error when no file has been added */}
      {studyMaterials.error && studyMaterials.materials.length === 0 && (
        <div
          role="alert"
          className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <span>{studyMaterials.error}</span>

          <button
            type="button"
            onClick={studyMaterials.onDismissError}
            aria-label="Dismiss error"
            className="shrink-0 rounded p-1 hover:bg-destructive/10"
          >
            ×
          </button>
        </div>
      )}

      {/* Chat composer */}
      <ChatInput
        isStreaming={isStreaming}
        onSend={handleSend}
        onStop={stop}
        onAddFiles={studyMaterials.onAddFiles}
        isUploadingFiles={Boolean(studyMaterials.uploadingFile)}
        canAddFiles={
          studyMaterials.materials.length < MAX_STUDY_MATERIALS
        }
        showAttachmentButton={true}
        showMaterialsToggle={hasMaterials}
        materialsVisible={materialsVisible}
        onToggleMaterials={onToggleMaterialsVisibility}
      />
    </div>
  );
}

export { ChatBody as ChatPanel };
