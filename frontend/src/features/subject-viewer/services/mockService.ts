import type { Result } from "@/shared/result";
import type { Subject } from "@/shared/user";
import type { CreateTextNoteInput, SubjectNote, SubjectViewerService } from "./types";

const subjectMap: Record<string, { id: string; name: string; code: string; canonicalId: string }> = {
  dbms: { id: "dbms", name: "Database Management Systems", code: "CS301", canonicalId: "dbms" },
  cs301: { id: "cs301", name: "Database Management Systems", code: "CS301", canonicalId: "dbms" },
  cn: { id: "cn", name: "Computer Networks", code: "CS302", canonicalId: "cn" },
  cs302: { id: "cs302", name: "Computer Networks", code: "CS302", canonicalId: "cn" },
  os: { id: "os", name: "Operating Systems", code: "CS303", canonicalId: "os" },
  cs303: { id: "cs303", name: "Operating Systems", code: "CS303", canonicalId: "os" },
  dsa: { id: "dsa", name: "Data Structures & Algorithms", code: "CS201", canonicalId: "dsa" },
  cs201: { id: "cs201", name: "Data Structures & Algorithms", code: "CS201", canonicalId: "dsa" },
};

function resolveSubjectKey(id: string): string {
  const lower = id.toLowerCase();
  return subjectMap[lower]?.canonicalId ?? lower;
}

let notes: SubjectNote[] = [
  // DBMS
  { id: "dbms-lec-1", subjectId: "dbms", title: "Lecture 1 — Introduction to DBMS.pdf", tag: "Lecture / Day wise", storagePath: null, content: null },
  { id: "dbms-lec-2", subjectId: "dbms", title: "Lecture 2 — ER Modeling & Schema Design.pdf", tag: "Lecture / Day wise", storagePath: null, content: null },
  { id: "dbms-unit-1", subjectId: "dbms", title: "Unit 1 — Relational Algebra & SQL Basics.pdf", tag: "Unit wise", storagePath: null, content: null },
  { id: "dbms-pyq-1", subjectId: "dbms", title: "2023 End Semester Examination.pdf", tag: "PYQ", storagePath: null, content: null },
  { id: "dbms-priv-1", subjectId: "dbms", title: "Normalization Quick Cheatsheet", tag: "Private", storagePath: null, content: "# Normalization Revision Guide\n\n- **1NF**: Atomic attributes, no repeating groups.\n- **2NF**: In 1NF and no partial dependencies on composite keys.\n- **3NF**: In 2NF and no transitive dependencies.\n- **BCNF**: For every functional dependency $X \\to Y$, $X$ is a superkey.\n\n### Boyce-Codd Decomposition Steps\n1. Find non-trivial FD $X \\to Y$ violating BCNF.\n2. Decompose $R$ into $R_1(X \\cup Y)$ and $R_2(R - Y)$." },

  // Computer Networks
  { id: "cn-lec-1", subjectId: "cn", title: "Lecture 1 — OSI 7-Layer Reference Model.pdf", tag: "Lecture / Day wise", storagePath: null, content: null },
  { id: "cn-unit-1", subjectId: "cn", title: "Unit 2 — Subnetting and CIDR Routing.pdf", tag: "Unit wise", storagePath: null, content: null },
  { id: "cn-pyq-1", subjectId: "cn", title: "2022 Mid Semester Exam.pdf", tag: "PYQ", storagePath: null, content: null },
  { id: "cn-priv-1", subjectId: "cn", title: "TCP Congestion Control Notes", tag: "Private", storagePath: null, content: "# TCP Congestion Control\n\n- **Slow Start**: Double CWND every RTT until threshold.\n- **Congestion Avoidance**: Additive increase (+1 MSS per RTT).\n- **Fast Retransmit**: Triggered by 3 duplicate ACKs." },

  // Operating Systems
  { id: "os-lec-1", subjectId: "os", title: "Lecture 3 — Process Synchronization & Semaphores.pdf", tag: "Lecture / Day wise", storagePath: null, content: null },
  { id: "os-unit-1", subjectId: "os", title: "Unit 3 — Virtual Memory & Page Replacement.pdf", tag: "Unit wise", storagePath: null, content: null },
  { id: "os-pyq-1", subjectId: "os", title: "2021 End Semester Solutions.pdf", tag: "PYQ", storagePath: null, content: null },

  // Data Structures & Algorithms
  { id: "dsa-lec-1", subjectId: "dsa", title: "Lecture 4 — Balanced Binary Search Trees (AVL/Red-Black).pdf", tag: "Lecture / Day wise", storagePath: null, content: null },
  { id: "dsa-unit-1", subjectId: "dsa", title: "Unit 4 — Graph Algorithms (Dijkstra, Bellman-Ford).pdf", tag: "Unit wise", storagePath: null, content: null },
  { id: "dsa-pyq-1", subjectId: "dsa", title: "2023 Mid Term PYQ.pdf", tag: "PYQ", storagePath: null, content: null },
];

const pause = () => new Promise((resolve) => setTimeout(resolve, 150));

export const mockSubjectViewerService: SubjectViewerService = {
  async getSubject(subjectId) {
    await pause();
    const entry = subjectMap[subjectId.toLowerCase()];
    if (entry) {
      return { data: { id: entry.id, name: entry.name, code: entry.code }, error: null };
    }
    return { data: { id: subjectId, name: "Subject Workspace", code: "SUB" }, error: null };
  },

  async getNotesTree(subjectId) {
    await pause();
    const canonical = resolveSubjectKey(subjectId);
    return {
      data: notes.filter((note) => resolveSubjectKey(note.subjectId) === canonical),
      error: null,
    };
  },

  async createTextNote(input: CreateTextNoteInput): Promise<Result<SubjectNote>> {
    await pause();
    const canonical = resolveSubjectKey(input.subjectId);
    const note: SubjectNote = {
      id: `note-${Date.now()}`,
      subjectId: canonical,
      title: input.title,
      content: input.content,
      tag: "Private",
      storagePath: null,
      createdAt: new Date().toISOString(),
    };
    notes = [...notes, note];
    return { data: note, error: null };
  },

  async updateTextNote(noteId, title, content) {
    await pause();
    const index = notes.findIndex((note) => note.id === noteId);
    if (index === -1) {
      return { data: null, error: { code: "NOT_FOUND", message: "Note was not found." } };
    }
    const updated = { ...notes[index], title, content };
    notes[index] = updated;
    return { data: updated, error: null };
  },

  async deleteTextNote(noteId) {
    await pause();
    const index = notes.findIndex((note) => note.id === noteId);
    if (index === -1) {
      return { data: null, error: { code: "NOT_FOUND", message: "Note was not found." } };
    }
    notes = notes.filter((note) => note.id !== noteId);
    return { data: true, error: null };
  },
};
