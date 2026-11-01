import { FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SubjectNote } from "../services";
import { MilkdownEditor } from "./MilkdownEditor";

interface Props { note: SubjectNote | null; title: string; content: string; saving: boolean; onTitle: (value: string) => void; onContent: (value: string) => void; onSave: () => void; }
export function DocumentViewer({ note, title, content, saving, onTitle, onContent, onSave }: Props) {
  if (!note) return <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground"><FileText className="h-10 w-10" /><div><p className="font-medium text-foreground">Open a resource to begin</p><p className="text-sm">Choose a PDF or personal note from the resources panel.</p></div></div>;
  if (note.tag !== "Private") return <div className="flex h-full flex-col bg-muted/20"><div className="flex items-center justify-between border-b bg-background px-4 py-2 text-xs text-muted-foreground"><span>{note.title}</span><span>Admin-approved community PDF · read-only</span></div>{note.contentUrl ? <iframe className="min-h-0 flex-1 bg-white" src={note.contentUrl} title={note.title} /> : <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center"><FileText className="h-12 w-12 text-primary" /><p className="font-medium text-foreground">{note.title}</p><p className="max-w-sm text-sm text-muted-foreground">This admin-approved community resource will display here once its PDF has been uploaded to Supabase storage.</p></div>}</div>;
  return <div className="flex h-full flex-col"><div className="flex items-center gap-3 border-b bg-background p-3"><Input value={title} onChange={(event) => onTitle(event.target.value)} aria-label="Note title" className="h-8 max-w-sm text-sm" /><span className="text-xs text-muted-foreground">Markdown · saved to your account</span><Button onClick={onSave} disabled={saving} size="sm" className="ml-auto gap-2"><Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}</Button></div><MilkdownEditor key={note.id} initialValue={content} onChange={onContent} /></div>;
}
