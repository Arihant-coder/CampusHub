/**
 * @file SubjectViewerPage.tsx
 * @description Subject Editor & Document Viewer feature for course curriculum notes.
 * @owner Subject Viewer Team
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { DocumentViewer } from "./components/DocumentViewer";
import { ResourceTree } from "./components/ResourceTree";
import { ViewerTabs } from "./components/ViewerTabs";
import { subjectViewerService, type SubjectNote } from "./services";

export default function SubjectViewerPage() {
  const { subjectId = "dbms" } = useParams();
  const [notes, setNotes] = useState<SubjectNote[]>([]);
  const [tabs, setTabs] = useState<SubjectNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const active = useMemo(
    () => tabs.find((note) => note.id === activeId) ?? null,
    [tabs, activeId]
  );

  // Load notes tree whenever the active subjectId changes
  useEffect(() => {
    let isMounted = true;

    subjectViewerService.getNotesTree(subjectId).then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        toast.error(error.message);
        return;
      }
      const loaded = data ?? [];
      setNotes(loaded);
      setTabs((currentTabs) => {
        // Keep only tabs belonging to this subject
        const validTabs = currentTabs.filter((t) => t.subjectId === subjectId);
        if (validTabs.length > 0) return validTabs;
        // If no tabs are open, automatically open the first note if available
        if (loaded.length > 0) {
          setActiveId(loaded[0].id);
          return [loaded[0]];
        }
        setActiveId(null);
        return [];
      });
    });

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  // Sync editor buffer whenever the active note changes
  useEffect(() => {
    setTitle(active?.title ?? "");
    setContent(active?.content ?? "");
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (note: SubjectNote) => {
    setTabs((current) =>
      current.some((item) => item.id === note.id) ? current : [...current, note]
    );
    setActiveId(note.id);
  };

  const close = (id: string) => {
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (id === activeId) {
      setActiveId(remaining.at(-1)?.id ?? null);
    }
  };

  const create = async () => {
    const result = await subjectViewerService.createTextNote({
      subjectId,
      title: "Untitled note",
      content: "",
    });
    if (result.error || !result.data) {
      return toast.error(result.error?.message ?? "Could not create note.");
    }
    const newNote = result.data;
    setNotes((current) => [...current, newNote]);
    open(newNote);
    toast.success("New personal note created.");
  };

  const save = async () => {
    if (!active || active.tag !== "Private") return;
    setSaving(true);
    const saveTitle = title.trim() || "Untitled note";
    const result = await subjectViewerService.updateTextNote(active.id, saveTitle, content);
    setSaving(false);

    if (result.error || !result.data) {
      return toast.error(result.error?.message ?? "Could not save note.");
    }

    const updated = result.data;
    setNotes((current) => current.map((n) => (n.id === updated.id ? updated : n)));
    setTabs((current) => current.map((n) => (n.id === updated.id ? updated : n)));
    toast.success("Note saved successfully.");
  };

  const remove = async () => {
    if (!active || active.tag !== "Private") return;
    const confirmDelete = window.confirm(`Delete "${active.title}"? This cannot be undone.`);
    if (!confirmDelete) return;

    const result = await subjectViewerService.deleteTextNote(active.id);
    if (result.error) {
      return toast.error(result.error.message);
    }

    const noteId = active.id;
    setNotes((current) => current.filter((n) => n.id !== noteId));
    close(noteId);
    toast.success("Note deleted.");
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <ResourceTree
        notes={notes}
        activeId={activeId}
        onOpen={open}
        onCreate={create}
      />
      <section className="flex min-w-0 flex-1 flex-col h-full overflow-hidden bg-background">
        <ViewerTabs
          tabs={tabs}
          activeId={activeId}
          onSelect={open}
          onClose={close}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <DocumentViewer
            note={active}
            title={title}
            content={content}
            saving={saving}
            onTitle={setTitle}
            onContent={setContent}
            onSave={save}
            onDelete={active?.tag === "Private" ? remove : undefined}
          />
        </div>
      </section>
    </div>
  );
}
