import { FileText, X } from "lucide-react";
import type { SubjectNote } from "../services";

interface Props {
  tabs: SubjectNote[];
  activeId: string | null;
  onSelect: (note: SubjectNote) => void;
  onClose: (id: string) => void;
}

export function ViewerTabs({ tabs, activeId, onSelect, onClose }: Props) {
  return (
    <div className="flex h-10 shrink-0 overflow-x-auto border-b bg-muted/35">
      {tabs.map((note) => (
        <div key={note.id} className={`group flex min-w-40 max-w-56 items-center gap-2 border-r px-3 text-xs ${note.id === activeId ? "bg-background text-foreground" : "text-muted-foreground hover:bg-muted/60"}`}>
          <button type="button" onClick={() => onSelect(note)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{note.title}</span>
          </button>
          <button type="button" onClick={() => onClose(note.id)} aria-label={`Close ${note.title}`} className="rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
