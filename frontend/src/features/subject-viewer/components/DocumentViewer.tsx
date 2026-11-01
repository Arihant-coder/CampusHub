import React, { useEffect } from "react";
import { FileText, Save, Trash2, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SubjectNote } from "../services";
import { MilkdownEditor } from "./MilkdownEditor";

interface Props {
  note: SubjectNote | null;
  title: string;
  content: string;
  saving: boolean;
  onTitle: (value: string) => void;
  onContent: (value: string) => void;
  onSave: () => void;
  onDelete?: () => void;
}

export function DocumentViewer({
  note,
  title,
  content,
  saving,
  onTitle,
  onContent,
  onSave,
  onDelete,
}: Props) {
  // Listen for Ctrl+S / Cmd+S shortcut to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (note?.tag === "Private" && !saving) {
          onSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [note?.tag, saving, onSave]);

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground select-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
          <FileText className="h-8 w-8" />
        </div>
        <div>
          <p className="font-semibold text-foreground text-base">Select a resource</p>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">
            Choose a curated PDF or personal note from the resources sidebar to start reading or editing.
          </p>
        </div>
      </div>
    );
  }

  // Admin-approved community resource
  if (note.tag !== "Private") {
    return (
      <div className="flex h-full flex-col bg-muted/15">
        <div className="flex items-center justify-between border-b bg-background px-4 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-foreground truncate">{note.title}</span>
            <Badge variant="secondary" className="text-[10px] shrink-0 font-medium">
              {note.tag}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Approved community resource · read-only</span>
          </div>
        </div>

        {note.contentUrl ? (
          <iframe
            className="min-h-0 flex-1 w-full bg-white border-0"
            src={note.contentUrl}
            title={note.title}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <p className="font-semibold text-foreground text-base">{note.title}</p>
              <p className="text-sm text-muted-foreground">
                This verified academic document is cataloged under the{" "}
                <span className="font-medium text-foreground">{note.tag}</span> curriculum category.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Read-Only Archive
                </Badge>
                <Badge variant="outline" className="text-xs">
                  PDF Format
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Personal editable Markdown note
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-background px-4 py-2.5">
        <Input
          value={title}
          onChange={(event) => onTitle(event.target.value)}
          aria-label="Note title"
          placeholder="Untitled note..."
          className="h-8 max-w-sm text-sm font-medium"
        />

        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Private Note</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {onDelete && (
            <Button
              onClick={onDelete}
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}

          <Button
            onClick={onSave}
            disabled={saving}
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
            title="Save note (Ctrl+S)"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving…" : "Save"}</span>
          </Button>
        </div>
      </div>

      <MilkdownEditor key={note.id} initialValue={content} onChange={onContent} />
    </div>
  );
}
