# CampusHub Frontend

The frontend for CampusHub is built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **shadcn/ui** primitives. It provides an academic collaboration workspace combining community discussions, subject note viewing, AI-powered study assistance, and technical student tools.

---

## Table of Contents

1. [Local Development & Quick Start](#1-local-development--quick-start)
2. [Environment Configuration (`.env.local`)](#2-environment-configuration-envlocal)
3. [Design & UI Philosophy ("Keep It Simple")](#3-design--ui-philosophy-keep-it-simple)
4. [Git Collaboration & Synchronization Guide](#4-git-collaboration--synchronization-guide)
5. [Directory Structure](#5-directory-structure)
6. [Developer Feature Ownership Matrix](#6-developer-feature-ownership-matrix)
7. [Feature Deep Dive & Routes](#7-feature-deep-dive--routes)
8. [Service Architecture & Mock-First Workflow](#8-service-architecture--mock-first-workflow)
9. [Available Scripts](#9-available-scripts)

---

## 1. Local Development & Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **pnpm**: v9+ (recommended package manager)

### Installation & Launch
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
pnpm install

# 3. Create your local environment file
# On Windows (PowerShell):
Copy-Item .env.example .env.local

# On macOS/Linux:
cp .env.example .env.local

# 4. Start the Vite development server
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 2. Environment Configuration (`.env.local`)

### Why `.env.local`?
Vite uses a cascading environment variable system. While `.env` sets project defaults, **`.env.local`** is your personal overrides file. It is ignored by Git, meaning changes to it will never accidentally overwrite other teammates' settings or leak personal keys.

```text
Priority (Lowest -> Highest):
.env  -->  .env.example (template only)  -->  .env.local (YOUR OVERRIDES)
```

### Supported Environment Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_USE_MOCKS` | `boolean` (`"true"` \| `"false"`) | `"true"` | When `"true"`, all features run offline using realistic mock services and simulated network latency. When `"false"`, features connect to live Supabase and FastAPI backend services. |
| `VITE_MOCK_ROLE` | `string` | `""` | Quick role bypass for mock mode. Set to `"student"`, `"moderator"`, or `"admin"` to skip the `/login` screen automatically upon page refresh. Leave empty to display the interactive login screen. |
| `VITE_SUPABASE_URL` | `string` | Placeholder | Your Supabase project URL (required when `VITE_USE_MOCKS=false`). |
| `VITE_SUPABASE_ANON_KEY` | `string` | Placeholder | Your Supabase anonymous/public API key (required when `VITE_USE_MOCKS=false`). |
| `VITE_BACKEND_URL` | `string` | `http://localhost:8000` | Base URL for the FastAPI backend service. |

---

### Common Setup Profiles

#### Profile A: Rapid UI Development (Auto-Login as Student)
Ideal when building frontend UI components without wanting to sign in on every refresh:
```env
# In frontend/.env.local
VITE_USE_MOCKS=true
VITE_MOCK_ROLE=student
```

#### Profile B: Auth & Multi-Role Testing (Interactive Login Screen)
Ideal when testing permissions, role badges, or sign-in flows:
```env
# In frontend/.env.local
VITE_USE_MOCKS=true
VITE_MOCK_ROLE=
```
Visit `/login` and click any of the preset role cards or enter credentials manually.

#### Profile C: Full-Stack Live Integration
Ideal when verifying end-to-end functionality against Supabase and FastAPI:
```env
# In frontend/.env.local
VITE_USE_MOCKS=false
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
VITE_BACKEND_URL=http://localhost:8000
```

---

### Built-in Mock Accounts Reference

When `VITE_USE_MOCKS=true`, you can sign in with any of these accounts (Password for all: **`password123`**):

| Role | Email | Password | Display Name | Handle | Description / Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | `student@campushub.edu` | `password123` | Alex Chen | `@alex_chen` | Standard student access: enrolled subjects, communities feed, daily quiz. |
| **Moderator** | `moderator@campushub.edu` | `password123` | Morgan Taylor | `@morgan_t` | Community moderator: forum moderation, post pinning, elevated permissions. |
| **Admin** | `admin@campushub.edu` | `password123` | Dr. Sarah Vance | `@sarah_vance` | System administrator: full access across all platform features. |

> [!TIP]
> **Signing Out vs Auto-Bypass:**
> When you explicitly click **Sign Out** from the user avatar menu, the app stores a temporary session flag (`campushub:signed_out=true`) in `sessionStorage`. This prevents `VITE_MOCK_ROLE` from instantly logging you back in while you want to test the `/login` screen. Closing the browser tab or signing back in clears the flag.

---

## 3. Design & UI Philosophy ("Keep It Simple")

CampusHub is designed for students and educators who need focus and clarity. All features must adhere to the following core UI guidelines:

1. **Simplicity Over Clutter**:
   - Keep interfaces breathable, uncluttered, and purposeful.
   - Do not fill empty screen real estate with decorative widgets, fake stats, or filler blocks unless they provide immediate academic value.

2. **No Random Long Text**:
   - **Never insert paragraphs of explanatory filler text for no reason.**
   - Microcopy should be concise and action-oriented (1–2 sentences maximum).
   - Use concise tooltips, badges, or helper text beneath inputs instead of multi-sentence instructions.
   - Empty states must feature **one short sentence** describing the state plus **one direct action button** (e.g., *"No posts in this channel yet. [Start a Discussion]"*).

3. **Consistent Design Tokens**:
   - Use standard **shadcn/ui** primitives and **Tailwind CSS** semantic utility classes (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`).
   - Dark/Light mode is fully integrated via `next-themes`—never hardcode hex color values.

4. **Visual Hierarchy & Iconography**:
   - Establish clear visual hierarchy: `Page Title` > `Section Header` > `Content Card` > `Action Button`.
   - Prefer intuitive **Lucide icons** alongside concise text labels to reduce word count.

---

## 4. Git Collaboration & Synchronization Guide

CampusHub follows a strict **1 Feature Folder = 1 Developer Ownership** model. Follow these essential Git practices to avoid merge conflicts and keep your work clean.

### The Upstream Repository
- **Central Repository**: `https://github.com/Peanutbrain-pro/CampusHub.git`
- **Origin**: Your personal fork or your local clone remote.

---

### Step 1: Configure the Upstream Remote (One-Time Setup)

Check your existing remotes:
```bash
git remote -v
```

If `upstream` is not listed, add it:
```bash
git remote add upstream https://github.com/Peanutbrain-pro/CampusHub.git
```

Verify that both `origin` and `upstream` are properly configured:
```bash
git remote -v
# origin    https://github.com/<your-username>/CampusHub.git (fetch & push)
# upstream  https://github.com/Peanutbrain-pro/CampusHub.git (fetch & push)
```

---

### Step 2: Daily Sync Routine (Always Sync Before Working)

**Never start new work on an outdated branch.** Before creating a branch or writing code, sync your local `main` with upstream:

```bash
# 1. Switch to your local main branch
git checkout main

# 2. Fetch the latest changes from the central repository
git fetch upstream

# 3. Fast-forward merge the latest upstream commits into local main
git merge upstream/main --ff-only

# 4. Push updated main to your personal GitHub fork (origin)
git push origin main
```

---

### Step 3: Create an Isolated Feature Branch

Never commit directly to `main`. Always create a dedicated branch off your updated `main`:

```bash
# Format: feature/<feature-name> or fix/<bug-name>
git checkout -b feature/communities-search-filters
```

---

### Step 4: Keep Your Active Branch Synced (Rebase, Don't Merge)

If teammates merge changes into `upstream/main` while you are working on your feature branch, rebase your branch on top of `upstream/main` rather than creating messy merge commits:

```bash
# 1. Fetch latest upstream commits
git fetch upstream

# 2. Rebase your current feature branch onto upstream/main
git rebase upstream/main

# 3. If conflicts occur:
#    a. Open the conflicting files and resolve conflicts
#    b. Stage the resolved files: git add <filename>
#    c. Continue rebasing: git rebase --continue
#    (To abort if needed: git rebase --abort)
```

---

### Step 5: Pre-Commit Hygiene & Secret Protection

Before committing, check your changed files:
```bash
git status
```

> [!CAUTION]
> **NEVER commit `.env.local` or API keys.**
> Verify that `.env.local` is listed in `.gitignore` and never appears under `Changes to be committed`.

Stage only the files within your designated feature folder or specific shared files you intentionally updated:
```bash
# Stage specific files
git add src/features/communities/

# Commit with a clear, concise message
git commit -m "feat(communities): add tag filters to post feed"
```

---

### Step 6: Push & Open a Pull Request

Push your feature branch to your fork (`origin`):
```bash
git push -u origin feature/communities-search-filters
```

Then visit [Peanutbrain-pro/CampusHub](https://github.com/Peanutbrain-pro/CampusHub) on GitHub and open a **Pull Request** targeting the `main` branch.

### Step 7: Post-Merge Cleanup

After your PR is merged into upstream `main`:
```bash
git checkout main
git fetch upstream
git merge upstream/main --ff-only
git push origin main
git branch -d feature/communities-search-filters
```

---

## 5. Directory Structure

```text
frontend/
├── .env                        # Default environment variables (committed)
├── .env.example                # Template with documentation for .env.local
├── .env.local                  # Local developer overrides (GITIGNORED - do not commit)
├── package.json                # Project dependencies and npm scripts
├── vite.config.ts              # Vite bundler configuration
├── tailwind.config.js          # Tailwind CSS styling configuration
│
└── src/
    ├── app/                    # Global layouts & centralized routing
    │   ├── layouts/
    │   │   ├── RootLayout.tsx              # Main shell (collapsible sidebar, global header)
    │   │   ├── SubjectWorkspaceLayout.tsx  # Dual-pane layout (main viewer + right AI sidebar)
    │   │   └── ProtectedRoute.tsx          # Authentication & session route guard
    │   └── routes.tsx                      # Master React Router configuration
    │
    ├── components/
    │   └── ui/                 # Reusable shadcn/ui primitives (button, card, dialog, etc.)
    │
    ├── lib/                    # Core singleton utilities & contexts
    │   ├── api-client.ts       # Typed fetch wrapper for FastAPI backend
    │   ├── auth-context.tsx    # AuthProvider & useAuth hook
    │   ├── header-context.tsx  # Dynamic header action injection (HeaderActions)
    │   ├── image-viewer-context.tsx # Global image preview lightbox
    │   ├── supabase.ts         # Supabase client singleton
    │   ├── use-resizable.ts    # Resizable drawer drag hook
    │   └── utils.ts            # Tailwind clsx/twMerge helper
    │
    ├── shared/                 # Cross-feature shared TypeScript types
    │   ├── result.ts           # Standard Result<T, E> error handling type
    │   ├── subjects.ts         # Master subject registry & metadata
    │   └── user.ts             # UserProfile & UserRole types
    │
    └── features/               # 🎯 1 Folder = 1 Developer Ownership
        ├── auth/               # Login, signup, role selector & avatar management
        ├── dashboard/          # Enrolled subjects, tools shortcuts, calendar & deadlines
        ├── communities/        # Forums, channels sidebar, rich composer, comments & archive
        ├── subject-viewer/     # Note explorer & PDF/document viewer canvas
        ├── subject-ai-panel/   # AI Study Companion panel (right sidebar)
        ├── daily-quiz/         # Daily practice quiz with timer & streak tracking
        ├── project-analysis/   # GitHub repository architecture & code audit tool
        └── resume-reviewer/    # ATS PDF resume reviewer
```

---

## 6. Developer Feature Ownership Matrix

Every developer owns **one isolated feature directory**. Features must never import internal components directly from another feature folder.

| Feature Directory | Primary Route(s) | Data & API Flow | Backend Reference | Status |
| :--- | :--- | :--- | :--- | :--- |
| **[`features/auth/`](src/features/auth/)** | `/login`, `/signup` | Supabase Auth UI / Mock Account presets | Core Supabase Auth | **Active** |
| **[`features/dashboard/`](src/features/dashboard/)** | `/` | Direct **Supabase** (`profiles`, `subjects`, `enrollments`) | *None* | **Active** |
| **[`features/communities/`](src/features/communities/)** | `/communities`, `/communities/:subjectId`, `/communities/post/:postId` | Direct **Supabase** (`posts`, `comments`, `notes`, `vote_post` RPC) | *None* | **Active** |
| **[`features/subject-viewer/`](src/features/subject-viewer/)** | `/subjects/:subjectId` (Main Canvas) | Direct **Supabase** (`subjects`, `notes`, `subject-notes` bucket) | *None* | **Scaffolded** |
| **[`features/subject-ai-panel/`](src/features/subject-ai-panel/)** | `/subjects/:subjectId` (Right Drawer) | **FastAPI** (`/api/v1/subjects-ai/*`) | [`backend/features/subjects_ai/`](../backend/features/subjects_ai/README.md) | **Active** |
| **[`features/daily-quiz/`](src/features/daily-quiz/)** | `/daily-quiz` | **FastAPI** `/api/v1/daily-quiz/*` + Supabase `user_streaks` | [`backend/features/daily_quiz/`](../backend/features/daily_quiz/README.md) | **Active** |
| **[`features/project-analysis/`](src/features/project-analysis/)** | `/project-analysis` | Stateless via **FastAPI** `POST /api/v1/project-analysis/analyze` | [`backend/features/project_analysis/`](../backend/features/project_analysis/README.md) | **Scaffolded** |
| **[`features/resume-reviewer/`](src/features/resume-reviewer/)** | `/resume-reviewer` | Stateless via **FastAPI** `POST /api/v1/resume-reviewer/review` | [`backend/features/resume_reviewer/`](../backend/features/resume_reviewer/README.md) | **Scaffolded** |

---

## 7. Feature Deep Dive & Routes

### 1. Authentication (`features/auth`)
- **Routes**: `/login`, `/signup`
- **Protected Routing**: Wrapped by `<ProtectedRoute>` which redirects unauthenticated visitors to `/login`.
- **Dual-Mode Operation**:
  - **Mock Mode**: One-click quick login presets for Student, Moderator, and Admin roles, or custom credentials. Supports automated login bypass via `VITE_MOCK_ROLE`.
  - **Live Mode**: Official Supabase Auth UI with custom dark/light theme integration matching the platform design.
- **Avatar Dialog**: Built-in avatar selector (`AvatarUploadDialog.tsx`) supporting preset avatars or custom image uploads.

### 2. Dashboard (`features/dashboard`)
- **Route**: `/`
- **Overview**:
  - Minimalist enrolled subject cards with quick launch links directly to `/subjects/:subjectId`.
  - Clean, interactive mini Calendar widget with centered navigation and properly bounded month switcher.
  - Recent posts from followed subject communities with direct navigation to discussions.

### 3. Communities (`features/communities`)
- **Routes**:
  - `/communities`: Global discussions feed.
  - `/communities/:subjectId`: Subject-filtered forum feed.
  - `/communities/new` or `/communities/:subjectId/new`: Rich post creation editor.
  - `/communities/post/:postId`: Threaded discussion post detail view.
- **Key Capabilities**:
  - **Markdown & Math**: `FormattedText.tsx` renders GitHub Flavored Markdown, inline code blocks, tables, and KaTeX LaTeX math equations.
  - **Nested Comments**: `CommentTree.tsx` supports multi-level replies, collapse/expand toggles, and relative timestamps.
  - **Interactive Voting**: Upvote/downvote counter with optimistic UI updates.
  - **Media & Attachments**: Image carousel with fullscreen lightbox modal (`useImageViewer`).
  - **Resource Archive**: Tabular view of subject-related downloadable study materials.

### 4. Subject Workspace (`features/subject-viewer` & `features/subject-ai-panel`)
- **Routes**: `/subjects`, `/subjects/:subjectId`
- **Layout Architecture**: Managed by `SubjectWorkspaceLayout.tsx`:
  - **Left Canvas (`subject-viewer`)**: Notes explorer and PDF/Markdown document reader.
  - **Right Sidebar (`subject-ai-panel`)**: Collapsible and resizable AI Study Companion panel.
  - **Header Toggle**: Main navigation bar contains a dedicated button (`HeaderActions`) to toggle the AI panel open or closed.
  - **Persistent State**: Drawer width and toggle states are saved across browser sessions using `localStorage`.
  - **Streaming AI Chat**: Interactive conversation panel with prompt suggestions tailored to the active subject.

### 5. Daily Quiz (`features/daily-quiz`)
- **Route**: `/daily-quiz`
- **Overview**:
  - Multiple-choice CS practice questions.
  - 30-second countdown timer per question.
  - Instant answer validation with concise explanations.
  - Streak tracking counter integrated with Supabase `user_streaks` table.

### 6. Project Analysis (`features/project-analysis`)
- **Route**: `/project-analysis`
- **Overview**: GitHub repository inspector providing code complexity audits, architectural breakdown, and dependency summaries via the FastAPI backend.

### 7. Resume Reviewer (`features/resume-reviewer`)
- **Route**: `/resume-reviewer`
- **Overview**: ATS PDF resume evaluator delivering scoring, keyword analysis, and actionable feedback via the FastAPI backend.

---

## 8. Service Architecture & Mock-First Workflow

Every feature follows a standardized service abstraction in `services/`:

```text
src/features/<feature-name>/services/
├── types.ts          # Strongly-typed TypeScript interfaces
├── mockService.ts    # Realistic mock dataset with artificial network latency
├── realService.ts    # Live queries via Supabase client or FastAPI api-client
└── index.ts          # Exports mock or real service according to VITE_USE_MOCKS
```

### The 3-Step Development Process:
1. **Develop UI with Mocks (`VITE_USE_MOCKS=true`)**:
   Implement UI components against `mockService.ts`. Ensure all UI states (loading, empty, success, error) look great and render quickly.
2. **Implement Real Backend / Database Service (`realService.ts`)**:
   Implement matching methods calling `@/lib/supabase` or `@/lib/api-client`.
3. **Connect Live (`VITE_USE_MOCKS=false`)**:
   Switch the environment flag in `.env.local` to verify live end-to-end integration without modifying a single line of component code.

---

## 9. Available Scripts

All scripts are executed from the `frontend/` directory using `pnpm`:

```bash
# Start development server with Hot Module Replacement (HMR)
pnpm dev

# Typecheck code without emitting build output
pnpm tsc --noEmit

# Run Oxlint for fast code analysis
pnpm lint

# Build production bundle with TypeScript verification
pnpm build

# Preview the local production build
pnpm preview
```
