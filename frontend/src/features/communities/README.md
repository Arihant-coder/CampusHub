# Feature Guide: Communities & Resource Archive (`features/communities`)

The **Communities** feature unites peer discussions and academic resource sharing across university subjects. It includes threaded discussions with image attachments, atomic upvoting/downvoting (`vote_post` RPC), and an academic document archive for notes and previous year exam questions (PYQs).

- **Frontend Path:** `frontend/src/features/communities/`
- **Backend Path:** *None* (Direct Supabase)
- **Primary Route:** `/communities` and `/communities/:subjectId`
- **Backend Services:** Supabase (`posts`, `comments`, `notes`, `vote_post` RPC, storage)

> [!IMPORTANT]
> **Feature Isolation Rule:**
> Nothing outside this folder may import from it, except `app/routes.tsx` which imports `communitiesRoute`. Imports are only permitted from `components/ui`, `lib/`, `shared/`, and this feature's own directory.

---

## 1. File & Directory Anatomy

```text
frontend/src/features/communities/
├── CommunitiesPage.tsx          # Main tabbed view: "Discussions" & "Academic Resources"
├── CommunitiesLayout.tsx        # Shell layout with subject forum sidebar
├── CreatePostPage.tsx           # Standalone post authoring view
├── PostDetailPage.tsx           # Full discussion view with nested comments
├── ShareResourcePage.tsx        # Resource submission form with quota tracking
├── ResourceModerationPage.tsx   # Admin/moderator review queue with filter, sort & category overrides
├── routes.tsx                   # Route definitions including role-guarded /moderation
├── components/                  # Sub-components isolated to communities
│   ├── PostFeed.tsx             # Scrollable list of discussion threads with sort/filter controls
│   ├── PostCard.tsx             # Thread preview: author, subject tag, upvotes/downvotes, reply count
│   ├── ThreadComments.tsx       # Comment list and reply input box
│   ├── CommentTree.tsx          # Recursive nested comment renderer
│   ├── PostComposer.tsx         # Modal/form to draft a new post with image upload
│   ├── ResourceArchive.tsx      # Sub-tabs for Notes/PYQs with moderation queue badge
│   ├── ResourceTable.tsx        # Filterable table of downloadable subject notes and PYQs
│   ├── UploadModal.tsx          # Quick upload modal for notes/PDFs (moderation queue)
│   └── PdfOptimizerModal.tsx    # Client-side PDF compression studio and live preview
├── utils/
│   ├── pdfCompressor.ts         # In-browser WebAssembly/canvas PDF compression engine
│   └── storageUpload.ts         # Client-side image optimization pipeline
├── services/                    # Data access layer
│   ├── types.ts                 # CommunitiesService interface & data models
│   ├── mockService.ts           # Mock implementation with moderation staging & approval
│   ├── realService.ts           # Direct Supabase queries, RPC caller, and moderation RPCs
│   └── index.ts                 # Active service switcher governed by VITE_USE_MOCKS
└── README.md                    # This developer guide
```

---

## 2. Service Architecture & Mock vs Real Workflow

All data operations must be declared in `services/types.ts` and implemented in both `mockService.ts` and `realService.ts`.

### Step 1: Define Service Types (`services/types.ts`)
```typescript
import type { Result } from "@/shared/result";

export interface Post {
  id: string;
  subjectId: string;
  authorId: string;
  authorHandle: string;
  title: string;
  body: string;
  imageUrl: string | null;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  createdAt: string;
  currentUserVote?: 1 | -1 | null;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorHandle: string;
  body: string;
  createdAt: string;
}

export interface ResourceNote {
  id: string;
  subjectId: string;
  title: string;
  tag: "Lecture" | "PYQ" | "Summary" | "My Notes";
  storagePath: string;
  createdAt: string;
}

export interface CommunitiesService {
  getPosts(subjectId?: string): Promise<Result<Post[]>>;
  createPost(data: { subjectId: string; title: string; body: string; imageFile?: File }): Promise<Result<Post>>;
  votePost(postId: string, voteValue: 1 | -1): Promise<Result<void>>;
  getComments(postId: string): Promise<Result<Comment[]>>;
  createComment(postId: string, body: string): Promise<Result<Comment>>;
  getNotes(subjectId?: string): Promise<Result<ResourceNote[]>>;
  uploadNote(data: { subjectId: string; title: string; tag: string; file: File }): Promise<Result<ResourceNote>>;
}
```

### Step 2: Implement Mock Service (`services/mockService.ts`)
Return mock posts and comments with 300ms simulated latency to test voting, filtering, and tab switching offline:
```typescript
import type { Result } from "@/shared/result";
import type { CommunitiesService, Post, Comment, ResourceNote } from "./types";

export const mockCommunitiesService: CommunitiesService = {
  async getPosts(subjectId?: string): Promise<Result<Post[]>> {
    await new Promise((r) => setTimeout(r, 250));
    return {
      data: [
        {
          id: "p1",
          subjectId: subjectId || "cs301",
          authorId: "u1",
          authorHandle: "alex_chen",
          title: "How to balance AVL tree on double rotation?",
          body: "Struggling with LR and RL balance factor sign differences.",
          imageUrl: null,
          upvotes: 12,
          downvotes: 1,
          replyCount: 2,
          createdAt: new Date().toISOString(),
          currentUserVote: null,
        },
      ],
      error: null,
    };
  },
  async createPost(data): Promise<Result<Post>> {
    await new Promise((r) => setTimeout(r, 300));
    return {
      data: {
        id: `p-${Date.now()}`,
        subjectId: data.subjectId,
        authorId: "mock-student",
        authorHandle: "alex_chen",
        title: data.title,
        body: data.body,
        imageUrl: null,
        upvotes: 0,
        downvotes: 0,
        replyCount: 0,
        createdAt: new Date().toISOString(),
      },
      error: null,
    };
  },
  async votePost(_postId, _val): Promise<Result<void>> {
    await new Promise((r) => setTimeout(r, 150));
    return { data: undefined, error: null };
  },
  async getComments(_postId): Promise<Result<Comment[]>> {
    await new Promise((r) => setTimeout(r, 200));
    return { data: [], error: null };
  },
  async createComment(postId, body): Promise<Result<Comment>> {
    await new Promise((r) => setTimeout(r, 250));
    return {
      data: { id: `c-${Date.now()}`, postId, authorId: "mock-student", authorHandle: "alex_chen", body, createdAt: new Date().toISOString() },
      error: null,
    };
  },
  async getNotes(_subjectId): Promise<Result<ResourceNote[]>> {
    await new Promise((r) => setTimeout(r, 300));
    return { data: [], error: null };
  },
  async uploadNote(data): Promise<Result<ResourceNote>> {
    await new Promise((r) => setTimeout(r, 400));
    return {
      data: { id: `n-${Date.now()}`, subjectId: data.subjectId, title: data.title, tag: data.tag as any, storagePath: "notes/sample.pdf", createdAt: new Date().toISOString() },
      error: null,
    };
  },
};
```

### Step 3: Implement Real Service (`services/realService.ts`)
Connect to Supabase tables, storage buckets, and RPC functions:
- **Voting:** Call `supabase.rpc("vote_post", { p_post_id: postId, p_vote_value: voteValue })`.
- **Public Images:** Upload to `public-attachments` bucket under `{userId}/{fileName}`.
- **Notes Archive:** Upload to `subject-notes` bucket under `{userId}/{fileName}`.

```typescript
import { supabase } from "@/lib/supabase";
import type { Result } from "@/shared/result";
import type { CommunitiesService, Post, Comment, ResourceNote } from "./types";

export const realCommunitiesService: CommunitiesService = {
  async getPosts(subjectId?: string) {
    let query = supabase.from("posts").select("*, profiles!inner(handle)").order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data, error } = await query;
    if (error) return { data: null, error: { code: "INTERNAL", message: error.message } };
    return { data: data as any, error: null };
  },
  async votePost(postId: string, voteValue: 1 | -1) {
    const { error } = await supabase.rpc("vote_post", { p_post_id: postId, p_vote_value: voteValue });
    if (error) return { data: null, error: { code: "INTERNAL", message: error.message } };
    return { data: undefined, error: null };
  },
  // Implement createPost, getComments, createComment, getNotes, uploadNote following similar patterns...
} as CommunitiesService;
```

### Step 4: Dispatch in `services/index.ts`
```typescript
import { mockCommunitiesService } from "./mockService";
import { realCommunitiesService } from "./realService";
import type { CommunitiesService } from "./types";

export * from "./types";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";
export const communitiesService: CommunitiesService = isMock
  ? mockCommunitiesService
  : realCommunitiesService;
```

---

## 3. Academic Resource Scarcity & Moderation Architecture

The academic resource library is designed around a **curated contribution model** to address note scarcity without degrading community quality:

1. **Student Submission (`status: "pending"`, `is_shared: false`)**:
   - Students submit notes via `ShareResourcePage` or `UploadModal`.
   - Files are compressed locally via `PdfOptimizerModal` (100% in-browser).
   - The file is uploaded to `{userId}/{fileName}` in the `subject-notes` bucket, temporarily counting toward the student's 50 MB personal quota.
   - Submissions are **never** directly published to the public archive.
2. **Staff Review & Approval (`/communities/moderation`)**:
   - Role-guarded via `<RoleRoute allowedRoles={["admin", "moderator"]}>`.
   - Admins/moderators inspect submissions, preview the PDF, and override the target category (`Day wise`, `Unit wise`, `Other`).
   - **Approve (`approveResource` / `approve_note` RPC)**:
     - File is moved to `community/{subjectId}/{fileName}` in `subject-notes`.
     - Deletes the original `{userId}/...` object, freeing the student's personal 50 MB quota.
     - Note is marked `is_shared = true`, `status = 'approved'`, making it publicly visible to all students.
   - **Reject (`rejectResource` / `reject_note` RPC)**:
     - File is purged from storage and the note record deleted, releasing the student's quota.

---

## 4. How to Develop

1. Keep `VITE_USE_MOCKS=true` in `frontend/.env`.
2. In `CommunitiesPage.tsx`, construct the top tabs ("Discussions" and "Academic Resources").
3. Wire the discussions tab to `communitiesService.getPosts()`. Build `PostFeed` and `PostCard`.
4. Implement optimistic voting when a user clicks upvote/downvote.
5. Wire the resources tab to `communitiesService.getResources()`. Build `ResourceTable`.
6. Access `/communities/moderation` as `moderator@campushub.edu` or `admin@campushub.edu` to review pending submissions.
7. Set `VITE_USE_MOCKS=false` in `frontend/.env` to test with live Supabase database and buckets.

---

## 5. How to Test

- **Student Submission Test:** Submit a note as `student@campushub.edu` and verify it displays a pending review toast and does NOT appear in the active archive.
- **Moderator Approval Test:** Switch account to `moderator@campushub.edu`, visit `/communities/moderation`, preview the document, select a category, and click "Approve". Verify the note now appears in the public archive.
- **Moderator Rejection Test:** Reject a pending note and confirm it is purged from the queue.
- **Type Checking:** Run from root:
  ```bash
  npm --prefix frontend run build
  ```
