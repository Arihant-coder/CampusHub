
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Plus,
  Square,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

type Props = {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;

  onAddFiles?: (files: File[]) => void;
  isUploadingFiles?: boolean;
  canAddFiles?: boolean;

  showAttachmentButton?: boolean;
  showMaterialsToggle?: boolean;
  materialsVisible?: boolean;
  onToggleMaterials?: () => void;
};

export function ChatInput({
  isStreaming,
  onSend,
  onStop,
  onAddFiles,
  isUploadingFiles = false,
  canAddFiles = true,
  showAttachmentButton = true,
  showMaterialsToggle = false,
  materialsVisible = true,
  onToggleMaterials,
}: Props) {
  const [value, setValue] = useState("");

  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wasStreaming = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [value]);

  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      ref.current?.focus();
    }

    wasStreaming.current = isStreaming;
  }, [isStreaming]);

  function submit() {
    if (!value.trim() || isStreaming) return;

    onSend(value);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      submit();
    }
  }

  function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = "";

    if (files.length > 0) {
      onAddFiles?.(files);
    }
  }

  return (
    <div className="shrink-0 border-t bg-background p-3">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">

        {/* Add study materials */}
        {showAttachmentButton && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                !onAddFiles ||
                !canAddFiles ||
                isUploadingFiles
              }
              aria-label="Add study materials"
              title="Upload PDF, TXT or MD notes"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isUploadingFiles ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Plus className="size-5" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              className="hidden"
              onChange={handleFilesSelected}
            />
          </>
        )}

        {/* Show / hide the entire Study Materials bar */}
        {showMaterialsToggle && (
          <button
            type="button"
            onClick={onToggleMaterials}
            aria-label={
              materialsVisible
                ? "Hide study materials bar"
                : "Show study materials bar"
            }
            aria-expanded={materialsVisible}
            title={
              materialsVisible
                ? "Hide study materials"
                : "Show study materials"
            }
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {materialsVisible ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
        )}

        {/* Message input */}
        <textarea
          ref={ref}
          rows={1}
          maxLength={4000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this subject..."
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
        />

        {/* Send / Stop */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted hover:bg-muted/70"
          >
            <Square className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send message"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-white disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
