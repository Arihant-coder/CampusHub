
import { useRef, useState, type ChangeEvent } from "react";

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  LoaderCircle,
  Paperclip,
  Plus,
  X,
} from "lucide-react";

import {
  MAX_STUDY_MATERIALS,
  type StudyMaterial,
} from "../hooks/useStudyMaterials";

export interface StudyMaterialsTrayProps {
  materials: StudyMaterial[];
  isLoading: boolean;
  uploadingFile: string | null;
  removingId: string | null;
  error: string | null;

  onAddFiles: (files: File[]) => void;
  onToggle: (materialId: string) => void;
  onRemove: (materialId: string) => void;
  onDismissError: () => void;

  // Controlled state shared by all three tools.
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;

  // Hide the tray upload button when the composer handles uploads.
  showAddButton?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(
  title: string,
  kind: StudyMaterial["kind"],
): string {
  const extension = title.split(".").pop()?.toUpperCase();

  return kind === "pdf"
    ? "PDF"
    : extension === "MD"
      ? "Markdown"
      : "Text file";
}

export function StudyMaterialsTray({
  materials,
  isLoading,
  uploadingFile,
  removingId,
  error,
  onAddFiles,
  onToggle,
  onRemove,
  onDismissError,
  expanded,
  onExpandedChange,
  showAddButton = true,
}: StudyMaterialsTrayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local fallback for use outside the shared parent.
  const [localExpanded, setLocalExpanded] = useState(false);

  const isExpanded = expanded ?? localExpanded;

  const canAddMore =
    materials.length < MAX_STUDY_MATERIALS && !uploadingFile && !isLoading;

  const selectedCount = materials.filter(
    (material) => material.selected,
  ).length;

  function toggleExpanded() {
    const next = !isExpanded;

    setLocalExpanded(next);
    onExpandedChange?.(next);
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);

    event.currentTarget.value = "";

    if (files.length > 0) {
      onAddFiles(files);
    }
  }

  return (
    <section
      className="relative z-30 shrink-0 border-t bg-background px-3 py-3"
      aria-label="Shared study materials"
    >
      {/* Floating file panel. It does not push the conversation upward. */}
      {isExpanded && materials.length > 0 && (
        <div
          className="absolute bottom-full left-3 z-50 mb-2 max-h-72 w-[min(480px,calc(100%-1.5rem))] overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
          role="region"
          aria-label="Uploaded study files"
        >
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/30"
            >
              {/* Selection checkbox */}
              <input
                type="checkbox"
                checked={material.selected}
                onChange={() => onToggle(material.id)}
                aria-label={`Use ${material.title} for study tools`}
                className="size-4 shrink-0 accent-primary"
              />

              <FileText className="size-4 shrink-0 text-muted-foreground" />

              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  title={material.title}
                >
                  {material.title}
                </p>

                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {fileKind(material.title, material.kind)} ·{" "}
                  {formatSize(material.size_bytes)}
                </p>
              </div>

              {/* Remove file */}
              <button
                type="button"
                onClick={() => onRemove(material.id)}
                disabled={removingId === material.id}
                aria-label={`Remove ${material.title}`}
                title="Remove file"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-40"
              >
                {removingId === material.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <X className="size-4" />
                )}
              </button>
            </div>
          ))}

          {uploadingFile && (
            <div className="flex items-center gap-2 border-t px-3 py-2.5 text-xs text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              Uploading {uploadingFile}...
            </div>
          )}

          {/* Selection summary */}
          <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
            {selectedCount} of {materials.length} selected
          </div>
        </div>
      )}

      {/* Compact Study Materials bar */}
      <div className="flex h-[52px] items-center gap-2 rounded-xl border border-border bg-background px-2">
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          aria-label={
            isExpanded ? "Collapse uploaded files" : "Show uploaded files"
          }
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
        >
          <Paperclip className="size-4 shrink-0 text-muted-foreground" />

          <span className="truncate text-sm font-semibold">
            Study materials
          </span>

          <span className="shrink-0 text-xs text-muted-foreground">
            {materials.length}/{MAX_STUDY_MATERIALS}
          </span>

          {selectedCount > 0 && (
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              · {selectedCount} selected
            </span>
          )}
        </button>

        {/* Add another file */}
        {showAddButton && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canAddMore}
            title="Add PDF, TXT or MD files"
            aria-label="Add study materials"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploadingFile ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-5" />
            )}
          </button>
        )}

        {/* Pop-out / close file panel */}
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          aria-label={
            isExpanded ? "Hide uploaded files" : "Show uploaded files"
          }
          title={isExpanded ? "Close file panel" : "Open file panel"}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
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
      </div>

      {/* Upload / removal errors */}
      {error && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />

          <p className="min-w-0 flex-1">
            {error}
          </p>

          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="shrink-0 rounded p-0.5 hover:bg-destructive/10"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {isLoading && materials.length === 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Loading study materials...
        </p>
      )}
    </section>
  );
}
