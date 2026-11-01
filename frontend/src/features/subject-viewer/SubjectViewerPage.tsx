/**
 * @file SubjectViewerPage.tsx
 * @description Main view for Subject Editor & Document Viewer feature.
 * @owner Subject Viewer Team
 */

import { useEffect, useMemo, useState } from "react";
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
  const active = useMemo(() => tabs.find((note) => note.id === activeId) ?? null, [tabs, activeId]);

  useEffect(() => { setTabs([]); setActiveId(null); subjectViewerService.getNotesTree(subjectId).then(({ data, error }) => { if (error) toast.error(error.message); else setNotes(data ?? []); }); }, [subjectId]);
  useEffect(() => { setTitle(active?.title ?? ""); setContent(active?.content ?? ""); }, [active]);
  const open = (note: SubjectNote) => { setTabs((current) => current.some((item) => item.id === note.id) ? current : [...current, note]); setActiveId(note.id); };
  const close = (id: string) => { const remaining = tabs.filter((tab) => tab.id !== id); setTabs(remaining); if (id === activeId) setActiveId(remaining.at(-1)?.id ?? null); };
  const create = async () => { const result = await subjectViewerService.createTextNote({ subjectId, title: "Untitled note", content: "" }); if (result.error || !result.data) return toast.error(result.error?.message ?? "Could not create note."); setNotes((current) => [...current, result.data!]); open(result.data); };
  const save = async () => { if (!active || active.tag !== "Private") return; setSaving(true); const result = await subjectViewerService.updateTextNote(active.id, title.trim() || "Untitled note", content); setSaving(false); if (result.error || !result.data) return toast.error(result.error?.message ?? "Could not save note."); const updated = result.data; setNotes((current) => current.map((note) => note.id === updated.id ? updated : note)); setTabs((current) => current.map((note) => note.id === updated.id ? updated : note)); toast.success("Note saved to your account."); };

  return <div className="flex h-full min-h-[calc(100vh-7rem)] overflow-hidden rounded-lg border bg-card shadow-sm"><ResourceTree notes={notes} activeId={activeId} onOpen={open} onCreate={create} /><section className="flex min-w-0 flex-1 flex-col"><ViewerTabs tabs={tabs} activeId={activeId} onSelect={open} onClose={close} /><div className="min-h-0 flex-1"><DocumentViewer note={active} title={title} content={content} saving={saving} onTitle={setTitle} onContent={setContent} onSave={save} /></div></section></div>;
}
