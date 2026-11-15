/**
 * @file ViewerTabs.tsx
 * @description Sleek top-header tabs for open documents in the Subject Workspace.
 * @owner Subject Viewer Team
 */

import React from "react";
import { FileText, X } from "lucide-react";
import type { SubjectNote } from "../services";

interface Props {
  tabs: SubjectNote[];
  activeId: string | null;
  onSelect: (note: SubjectNote) => void;
  onClose: (id: string) => void;
  getTabTitle?: (note: SubjectNote) => string;
  isTabDirty?: (id: string) => boolean;
}

export function ViewerTabs({
  tabs,
  activeId,
  onSelect,
  onClose,
  getTabTitle,
  isTabDirty,
}: Props) {
  if (tabs.length === 0) {
    return null;
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  return (
    <div
      onWheel={handleWheel}
      className="flex items-center h-full gap-1.5 overflow-x-auto no-scrollbar select-none scroll-smooth min-w-0"
    >
      {tabs.map((note) => {
        const isActive = note.id === activeId;
        const isDirty = isTabDirty?.(note.id);
        const displayTitle = getTabTitle ? getTabTitle(note) : note.title;

        return (
          <div
            key={note.id}
            className={`group flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition-colors shrink-0 max-w-[190px] border ${
              isActive
                ? "bg-secondary text-foreground font-medium border-border/80 shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(note)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left truncate cursor-pointer leading-none"
              title={displayTitle}
            >
              <FileText
                className={`h-3.5 w-3.5 shrink-0 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span className="truncate leading-none">{displayTitle}</span>
            </button>

            {/* Unsaved indicator dot */}
            {isDirty && (
              <span
                className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
                title="Unsaved changes"
                aria-label="Unsaved changes"
              />
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(note.id);
              }}
              aria-label={`Close ${displayTitle}`}
              className="rounded-sm p-0.5 opacity-60 hover:bg-background/80 hover:opacity-100 transition-opacity cursor-pointer shrink-0 ml-0.5 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
