import { FileText, Pencil, Trash2 } from "lucide-react";
import type { SavedStudyFile } from "../services/savedStudyFiles";

interface Props {
  files: SavedStudyFile[];
  activeFileId: string | null;
  onOpen: (id: string) => void;
  onRename: (file: SavedStudyFile) => void;
  onDelete: (id: string) => void;
}

export function SavedStudyFilesList({
  files,
  activeFileId,
  onOpen,
  onRename,
  onDelete,
}: Props) {
  if (files.length === 0) return null;

  return (
    <section className="border-b px-3 py-2" aria-label="Saved study files">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Saved files
      </p>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${
              file.id === activeFileId ? "bg-secondary" : "hover:bg-muted"
            }`}
          >
            <button
              type="button"
              onClick={() => onOpen(file.id)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="truncate text-xs font-medium">{file.name}</span>
            </button>
            <button
              type="button"
              onClick={() => onRename(file)}
              aria-label={`Rename ${file.name}`}
              className="rounded p-1 text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(file.id)}
              aria-label={`Delete ${file.name}`}
              className="rounded p-1 text-muted-foreground opacity-0 hover:bg-background hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

