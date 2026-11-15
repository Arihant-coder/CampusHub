import React, { useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SubjectNote } from "../services";
import { MilkdownEditor } from "./MilkdownEditor";
import { PdfJsViewer } from "./PdfJsViewer";

interface Props {
  note: SubjectNote | null;
  title?: string;
  content: string;
  saving: boolean;
  isDirty?: boolean;
  isActive?: boolean;
  contentUrl?: string | null;
  isLoadingUrl?: boolean;
  onTitle?: (value: string) => void;
  onContent: (value: string) => void;
  onSave: () => void;
  onDelete?: () => void;
}

export function DocumentViewer({
  note,
  title: _title,
  content,
  saving,
  isDirty = false,
  isActive = true,
  contentUrl,
  isLoadingUrl = false,
  onTitle: _onTitle,
  onContent,
  onSave,
  onDelete,
}: Props) {
  // Listen for Ctrl+S / Cmd+S shortcut to save (only on active tab)
  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive, note?.tag, saving, onSave]);

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
    const activeUrl = contentUrl ?? note.contentUrl;

    return (
      <div className="flex h-full flex-col bg-muted/15">
        {isLoadingUrl ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Preparing document viewer…</span>
          </div>
        ) : activeUrl ? (
          <PdfJsViewer url={activeUrl} title={note.title} />
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
    <div className="relative flex h-full flex-col overflow-hidden">
      <MilkdownEditor
        key={note.id}
        initialValue={content}
        onChange={onContent}
        onSave={onSave}
        onDelete={onDelete}
        isDirty={isDirty}
        saving={saving}
      />
    </div>
  );
}
