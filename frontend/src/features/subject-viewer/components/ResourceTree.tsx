import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  FolderOpen,
  FolderOpenDot,
  Plus,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NoteTag, SubjectNote } from "../services";

const sharedGroups: { tag: Extract<NoteTag, "Lecture / Day wise" | "Unit wise" | "Other" | "PYQ">; label: string }[] = [
  { tag: "Lecture / Day wise", label: "Lecture / Day wise" },
  { tag: "Unit wise", label: "Unit wise" },
  { tag: "PYQ", label: "PYQs" },
  { tag: "Other", label: "Other Resources" },
];

interface Props {
  notes: SubjectNote[];
  activeId: string | null;
  onOpen: (note: SubjectNote) => void;
  onCreate: () => void;
}

export function ResourceTree({ notes, activeId, onOpen, onCreate }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    Shared: true,
    "Lecture / Day wise": true,
    "Unit wise": true,
    PYQ: true,
    Other: true,
    Private: true,
  });

  const toggle = (key: string) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const privateNotes = notes.filter((n) => n.tag === "Private");
  const sharedNotesCount = notes.filter((n) => n.tag !== "Private").length;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-card select-none">
      <div className="flex items-center justify-between border-b px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
            Course Resources
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
          {notes.length}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-3">
        {/* Shared Community Resources */}
        <div>
          <button
            type="button"
            onClick={() => toggle("Shared")}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
          >
            {open.Shared ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <FolderOpenDot className="h-3.5 w-3.5 text-primary" />
            <span>Curriculum Archive</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              ({sharedNotesCount})
            </span>
          </button>

          {open.Shared && (
            <div className="ml-3 mt-1 border-l pl-2 space-y-1">
              {sharedGroups.map((group) => {
                const items = notes.filter((note) => note.tag === group.tag);
                const isExpanded = open[group.tag];

                return (
                  <div key={group.tag}>
                    <button
                      type="button"
                      onClick={() => toggle(group.tag)}
                      className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{group.label}</span>
                      <span className="ml-auto text-[10px] font-mono opacity-70">
                        {items.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="ml-2 mt-0.5 border-l pl-1.5 space-y-0.5">
                        {items.map((note) => {
                          const isActive = note.id === activeId;
                          return (
                            <button
                              key={note.id}
                              type="button"
                              onClick={() => onOpen(note)}
                              className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
                                isActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                              title={note.title}
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" />
                              <span className="truncate">{note.title}</span>
                            </button>
                          );
                        })}

                        {items.length === 0 && (
                          <p className="px-2 py-1 text-[11px] italic text-muted-foreground/60">
                            No files cataloged
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Private Student Notes */}
        <div>
          <button
            type="button"
            onClick={() => toggle("Private")}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
          >
            {open.Private ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Lock className="h-3.5 w-3.5 text-amber-500" />
            <span>Personal Notes</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              ({privateNotes.length})
            </span>
          </button>

          {open.Private && (
            <div className="ml-3 mt-1 border-l pl-2 space-y-0.5">
              {privateNotes.map((note) => {
                const isActive = note.id === activeId;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onOpen(note)}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    title={note.title}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    <span className="truncate">{note.title}</span>
                  </button>
                );
              })}

              {privateNotes.length === 0 && (
                <p className="px-2 py-1 text-[11px] italic text-muted-foreground/60">
                  No personal notes yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-2">
        <Button
          onClick={onCreate}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs font-semibold cursor-pointer shadow-xs"
        >
          <FilePlus2 className="h-3.5 w-3.5 text-primary" />
          <span>New Markdown Note</span>
          <Plus className="ml-auto h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    </aside>
  );
}
