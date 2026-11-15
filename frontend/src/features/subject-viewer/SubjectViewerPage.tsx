/**
 * @file SubjectViewerPage.tsx
 * @description Subject Editor & Document Viewer feature for course curriculum notes.
 * @owner Subject Viewer Team
 */

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useBlocker } from "react-router-dom";
import { toast } from "sonner";
import { DocumentViewer } from "./components/DocumentViewer";
import { ResourceTree } from "./components/ResourceTree";
import { ViewerTabs } from "./components/ViewerTabs";
import { ActivityBar } from "./components/ActivityBar";
import { HeaderTabs, HeaderSidebarOffset } from "@/lib/header-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePersistentToggle } from "@/lib/use-persistent-toggle";
import { useResizable } from "@/lib/use-resizable";
import {
  subjectViewerService,
  type SubjectNote,
  getCachedDocumentBlobUrl,
  invalidateCachedDocument,
} from "./services";

interface DraftNote {
  title: string;
  content: string;
  isDirty: boolean;
}

interface CachedDocUrl {
  url: string;
  fetchedAt: number;
}

export default function SubjectViewerPage() {
  const { subjectId = "dbms" } = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = usePersistentToggle(
    "campushub:sidebar:subject-resources",
    true
  );
  const {
    width: drawerWidth,
    isDragging: isDraggingDrawer,
    handleProps: drawerResizeProps,
  } = useResizable({
    direction: "right",
    defaultWidth: 256,
    minWidth: 180,
    maxWidth: 550,
    storageKey: "campushub:sidebar-width:subject-resources",
  });
  const [notes, setNotes] = useState<SubjectNote[]>([]);
  const [tabs, setTabs] = useState<SubjectNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftNote>>({});
  const [docUrls, setDocUrls] = useState<Record<string, CachedDocUrl>>({});
  const [loadingDocUrl, setLoadingDocUrl] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const active = useMemo(
    () => tabs.find((note) => note.id === activeId) ?? null,
    [tabs, activeId]
  );

  // Track if any draft has unsaved changes
  const hasDirtyDrafts = useMemo(
    () => Object.values(drafts).some((d) => d.isDirty),
    [drafts]
  );

  // In-app navigation blocker: intercepts clicking links, switching subjects, or routes
  const blocker = useBlocker(hasDirtyDrafts);

  // Browser window / tab close warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasDirtyDrafts) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDirtyDrafts]);

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

      // Do NOT auto-open the first note when opening a subject: start empty
      setTabs((currentTabs) => {
        const validTabs = currentTabs.filter((t) => t.subjectId === subjectId);
        return validTabs;
      });

      setActiveId((currentActiveId) => {
        const stillValid = loaded.some((n) => n.id === currentActiveId);
        if (stillValid) return currentActiveId;
        return null;
      });
    });

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  // Lazy on-demand signed URL retrieval with persistent browser cache for PDFs
  useEffect(() => {
    if (!active || active.tag === "Private" || (!active.storagePath && !active.contentUrl)) return;

    if (active.contentUrl && !docUrls[active.id]) {
      setDocUrls((prev) => ({
        ...prev,
        [active.id]: { url: active.contentUrl!, fetchedAt: Date.now() },
      }));
      return;
    }

    if (!active.storagePath) return;

    const cached = docUrls[active.id];
    const now = Date.now();
    // Reuse in-memory URL if fetched less than 50 minutes ago
    if (cached && now - cached.fetchedAt < 50 * 60 * 1000) {
      return;
    }

    let isMounted = true;
    setLoadingDocUrl(true);

    const storagePath = active.storagePath;
    const version = active.createdAt;

    getCachedDocumentBlobUrl(storagePath, version, async () => {
      const { data, error } = await subjectViewerService.getDocumentUrl(storagePath);
      if (error || !data) {
        throw new Error(error?.message ?? "Could not load document preview.");
      }
      return data;
    })
      .then((url) => {
        if (!isMounted) return;
        setLoadingDocUrl(false);
        setDocUrls((prev) => ({
          ...prev,
          [active.id]: { url, fetchedAt: Date.now() },
        }));
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadingDocUrl(false);
        toast.error(err.message || "Could not load document preview.");
      });

    return () => {
      isMounted = false;
    };
  }, [active?.id, active?.storagePath, active?.contentUrl, active?.tag, active?.createdAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleChange = (noteId: string, newTitle: string) => {
    const targetNote = notes.find((n) => n.id === noteId);
    const originalTitle = targetNote?.title ?? "";
    const isActuallyDirty = newTitle.trim() !== originalTitle.trim();

    setDrafts((prev) => ({
      ...prev,
      [noteId]: {
        title: newTitle,
        content: prev[noteId]?.content ?? (targetNote?.content || ""),
        isDirty: isActuallyDirty || Boolean(prev[noteId]?.isDirty),
      },
    }));
  };

  const handleRename = async (noteId: string, newTitle: string) => {
    // Optimistically update notes and tabs
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, title: newTitle } : n))
    );
    setTabs((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, title: newTitle } : n))
    );
    setDrafts((prev) => ({
      ...prev,
      [noteId]: {
        title: newTitle,
        content: prev[noteId]?.content ?? (notes.find((n) => n.id === noteId)?.content || ""),
        isDirty: false,
      },
    }));

    try {
      const existingContent =
        drafts[noteId]?.content ?? (notes.find((n) => n.id === noteId)?.content || "");
      const res = await subjectViewerService.updateTextNote(
        noteId,
        newTitle,
        existingContent
      );
      if (res.error) {
        toast.error(res.error.message || "Failed to rename note.");
        return;
      }
      toast.success("Note renamed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename note.");
    }
  };

  const handleContentChange = (noteId: string, newContent: string) => {
    const targetNote = notes.find((n) => n.id === noteId);
    const originalContent = targetNote?.content ?? "";
    // Only mark dirty if the content actually differs from the persisted note content
    const isActuallyDirty = newContent.trim() !== originalContent.trim();

    setDrafts((prev) => {
      // If content is identical to saved version and not previously dirty, don't flag dirty
      if (!isActuallyDirty && !prev[noteId]?.isDirty) {
        return prev;
      }
      return {
        ...prev,
        [noteId]: {
          title: prev[noteId]?.title ?? targetNote?.title ?? "Untitled note",
          content: newContent,
          isDirty: isActuallyDirty,
        },
      };
    });
  };

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
    // Clean up draft for closed tab
    setDrafts((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    // Revoke object URL from memory if closed tab was using an active blob URL
    if (docUrls[id]?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(docUrls[id].url);
      setDocUrls((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
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

  const save = async (noteId?: string) => {
    const targetId = noteId ?? active?.id;
    if (!targetId) return;
    const targetNote = notes.find((n) => n.id === targetId);
    if (!targetNote || targetNote.tag !== "Private") return;

    setSaving(true);
    const draft = drafts[targetId];
    const saveTitle = (draft?.title ?? targetNote.title).trim() || "Untitled note";
    const saveContent = draft?.content ?? targetNote.content ?? "";
    const result = await subjectViewerService.updateTextNote(targetId, saveTitle, saveContent);
    setSaving(false);

    if (result.error || !result.data) {
      return toast.error(result.error?.message ?? "Could not save note.");
    }

    const updated = result.data;
    setNotes((current) => current.map((n) => (n.id === updated.id ? updated : n)));
    setTabs((current) => current.map((n) => (n.id === updated.id ? updated : n)));

    // Clear isDirty only if the draft was not further modified while the save was in flight
    setDrafts((prev) => {
      const currentDraft = prev[updated.id];
      if (!currentDraft) return prev;
      const stillSame = currentDraft.title === saveTitle && currentDraft.content === saveContent;
      return {
        ...prev,
        [updated.id]: {
          ...currentDraft,
          isDirty: !stillSame,
        },
      };
    });

    toast.success("Note saved successfully.");
  };

  const remove = (noteId?: string) => {
    const targetId = noteId ?? active?.id;
    if (!targetId) return;
    const targetNote = notes.find((n) => n.id === targetId);
    if (!targetNote || targetNote.tag !== "Private") return;

    setNoteToDeleteId(targetId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    const targetId = noteToDeleteId ?? active?.id;
    if (!targetId) return;

    try {
      setIsDeleting(true);
      const result = await subjectViewerService.deleteTextNote(targetId);
      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      if (noteToDelete?.storagePath) {
        invalidateCachedDocument(noteToDelete.storagePath);
      }
      setNotes((current) => current.filter((n) => n.id !== targetId));
      close(targetId);
      setDrafts((prev) => {
        const { [targetId]: _, ...rest } = prev;
        return rest;
      });
      toast.success("Note deleted.");
      setShowDeleteConfirm(false);
      setNoteToDeleteId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note.");
    } finally {
      setIsDeleting(false);
    }
  };

  const noteToDelete = useMemo(
    () => notes.find((n) => n.id === noteToDeleteId) ?? active,
    [notes, noteToDeleteId, active]
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Align tabs in top header with the right boundary of the sidebar */}
      <HeaderSidebarOffset
        offset={isSidebarOpen ? 44 + drawerWidth : 0}
        isDragging={isDraggingDrawer}
      />

      {/* Project open document tabs into top main header */}
      <HeaderTabs>
        <ViewerTabs
          tabs={tabs}
          activeId={activeId}
          onSelect={open}
          onClose={close}
          getTabTitle={(note) => drafts[note.id]?.title ?? note.title}
          isTabDirty={(id) => Boolean(drafts[id]?.isDirty)}
        />
      </HeaderTabs>

      {/* VS Code-style Slim Activity Rail */}
      <ActivityBar
        isResourcesOpen={isSidebarOpen}
        onToggleResources={() => setIsSidebarOpen((prev) => !prev)}
        onCreateNote={create}
      />

      {/* Course Resources Drawer with draggable splitter handle */}
      <ResourceTree
        notes={notes}
        activeId={activeId}
        onOpen={open}
        onCreate={create}
        onRename={handleRename}
        onDelete={remove}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        width={drawerWidth}
        isDragging={isDraggingDrawer}
        resizeHandleProps={drawerResizeProps}
      />

      {/* Transparent overlay while dragging to prevent iframes from capturing mouse events */}
      {isDraggingDrawer && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto" />
      )}

      {/* Main Document Canvas: All open tabs stay mounted in DOM to preserve PDF scroll & avoid re-fetching */}
      <section className="flex min-w-0 flex-1 flex-col h-full overflow-hidden bg-background">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {tabs.length === 0 ? (
            <DocumentViewer
              note={null}
              title=""
              content=""
              saving={false}
              isDirty={false}
              isActive={false}
              onTitle={() => {}}
              onContent={() => {}}
              onSave={() => {}}
            />
          ) : (
            tabs.map((tab) => {
              const isActive = tab.id === activeId;
              const draft = drafts[tab.id];
              const tabTitle = draft?.title ?? tab.title;
              const tabContent = draft?.content ?? tab.content ?? "";
              const tabIsDirty = draft?.isDirty ?? false;
              const tabDoc = docUrls[tab.id];
              const activeUrl = tabDoc?.url || tab.contentUrl;

              return (
                <div
                  key={tab.id}
                  className={`absolute inset-0 h-full w-full ${
                    isActive ? "z-10 visible" : "z-0 invisible pointer-events-none"
                  }`}
                  aria-hidden={!isActive}
                >
                  <DocumentViewer
                    note={tab}
                    title={tabTitle}
                    content={tabContent}
                    saving={saving && isActive}
                    isDirty={tabIsDirty}
                    isActive={isActive}
                    contentUrl={activeUrl}
                    isLoadingUrl={loadingDocUrl && isActive && !tabDoc}
                    onTitle={(val) => handleTitleChange(tab.id, val)}
                    onContent={(val) => handleContentChange(tab.id, val)}
                    onSave={() => save(tab.id)}
                    onDelete={tab.tag === "Private" ? () => remove(tab.id) : undefined}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Private Note"
        description={
          noteToDelete ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{noteToDelete.title}&rdquo;</span>? This cannot be undone.
            </>
          ) : undefined
        }
        confirmText="Delete Note"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* In-app navigation blocker confirmation */}
      <ConfirmDialog
        open={blocker.state === "blocked"}
        onOpenChange={(openState) => {
          if (!openState && blocker.state === "blocked") {
            blocker.reset?.();
          }
        }}
        title="Unsaved Changes"
        description="You have unsaved changes in your notes. Leaving this page will discard your recent edits."
        confirmText="Discard and Leave"
        cancelText="Keep Editing"
        variant="destructive"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
