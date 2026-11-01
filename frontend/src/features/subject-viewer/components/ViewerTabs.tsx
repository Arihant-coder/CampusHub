import React from "react";
import { FileText, X } from "lucide-react";
import type { SubjectNote } from "../services";

interface Props {
  tabs: SubjectNote[];
  activeId: string | null;
  onSelect: (note: SubjectNote) => void;
  onClose: (id: string) => void;
}

export function ViewerTabs({ tabs, activeId, onSelect, onClose }: Props) {
  if (tabs.length === 0) {
    return (
      <div className="flex h-9 shrink-0 items-center border-b bg-muted/20 px-4 text-xs text-muted-foreground select-none">
        <span>No documents currently open</span>
      </div>
    );
  }

  return (
    <div className="flex h-9 shrink-0 overflow-x-auto border-b bg-muted/25 select-none no-scrollbar">
      {tabs.map((note) => {
        const isActive = note.id === activeId;
        return (
          <div
            key={note.id}
            className={`group flex min-w-36 max-w-64 items-center gap-2 border-r px-3 text-xs transition-colors ${
              isActive
                ? "bg-background text-foreground font-medium shadow-xs"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(note)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left truncate cursor-pointer py-1.5"
            >
              <FileText
                className={`h-3.5 w-3.5 shrink-0 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span className="truncate">{note.title}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(note.id);
              }}
              aria-label={`Close ${note.title}`}
              className="rounded p-0.5 opacity-60 hover:bg-muted hover:opacity-100 transition-opacity cursor-pointer shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
