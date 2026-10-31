# CampusHub

CampusHub is a campus learning and collaboration platform that brings together student community discussions, academic resource archives, split-pane subject study workspaces with AI companions, and standalone technical tools.

---

## 1. System Architecture

The project is structured into three clean layers:

- **`frontend/`**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui.
  - **App Shell:** Collapsible sidebar and header with account avatar.
  - **Feature Modules:** Fully isolated feature folders with placeholder views.
- **`backend/`**: FastAPI service running in Python 3.11+.
  - **`core/`**: Server runtime (settings, CORS, auth, rate limiting).
  - **`features/`**: 1:1 matching feature modules (`subjects_ai`, `project_analysis`, `resume_reviewer`, `daily_quiz`).
  - **`shared/`**: System health check endpoint.
- **`supabase/`**: PostgreSQL database migrations split by feature plus shared core tables.

---

## 2. 1:1 Developer Ownership Matrix

Every developer is assigned one isolated feature folder in Frontend (+ 1 matching folder in Backend if it uses FastAPI) with zero overlapping files or cross-feature imports:

| Feature / Module | Frontend Path | Backend Path | Data & API Flow |
| :--- | :--- | :--- | :--- |
| **Auth** | [`src/features/auth/`](frontend/src/features/auth/) | *None* | Supabase Auth UI / Mock Presets |
| **Dashboard** | [`src/features/dashboard/`](frontend/src/features/dashboard/README.md) | *None* | Direct **Supabase** |
| **Communities** | [`src/features/communities/`](frontend/src/features/communities/README.md) | *None* | Direct **Supabase** |
| **Subject Editor & Viewer** | [`src/features/subject-viewer/`](frontend/src/features/subject-viewer/README.md) | *None* | Direct **Supabase** |
| **Subject AI Companion** | [`src/features/subject-ai-panel/`](frontend/src/features/subject-ai-panel/README.md) | [`backend/features/subjects_ai/`](backend/features/subjects_ai/README.md) | **FastAPI** (`/api/v1/subjects-ai/*`) |
| **Project Analysis** | [`src/features/project-analysis/`](frontend/src/features/project-analysis/README.md) | [`backend/features/project_analysis/`](backend/features/project_analysis/README.md) | **FastAPI** |
| **Resume Reviewer** | [`src/features/resume-reviewer/`](frontend/src/features/resume-reviewer/README.md) | [`backend/features/resume_reviewer/`](backend/features/resume_reviewer/README.md) | **FastAPI** |
| **Daily Quiz** | [`src/features/daily-quiz/`](frontend/src/features/daily-quiz/README.md) | [`backend/features/daily_quiz/`](backend/features/daily_quiz/README.md) | **FastAPI** & **Supabase** |

> **Note on Subjects Workspace:**
> [`src/features/subject-viewer/`](frontend/src/features/subject-viewer/README.md) and [`src/features/subject-ai-panel/`](frontend/src/features/subject-ai-panel/README.md) remain completely isolated modules with zero cross-imports. The app shell layout ([`SubjectWorkspaceLayout.tsx`](frontend/src/app/layouts/SubjectWorkspaceLayout.tsx)) brings them together on `/subjects/:subjectId`, placing the document viewer in the main canvas and the AI study companion in the right sidebar (toggled directly from the customizable top main header).

---

## 3. Directory Layouts

### Frontend (`frontend/src/`)
```text
frontend/src/
├── app/                        # Shell layout (RootLayout.tsx) & aggregated route definitions (routes.tsx)
│   ├── layouts/RootLayout.tsx
│   └── routes.tsx
├── components/
│   └── ui/                     # shadcn/ui primitives
├── lib/                        # Core singletons: supabase.ts, api-client.ts, utils.ts
├── shared/                     # Global result and user types
│   ├── result.ts
│   └── user.ts
│
└── features/                   # 🎯 1 Folder = 1 Developer Ownership
    ├── auth/                   # Login, signup, role selector & avatar management
    ├── dashboard/              # Dashboard overview (components/, services/, routes.tsx, DashboardPage.tsx)
    ├── communities/            # Forum & resource archive (components/, services/, routes.tsx, CommunitiesPage.tsx)
    ├── subject-viewer/         # Notes tree & document viewer (components/, services/, routes.tsx, SubjectViewerPage.tsx)
    ├── subject-ai-panel/       # AI companion panel (components/, services/, routes.tsx, SubjectAiPanelPage.tsx)
    ├── project-analysis/       # GitHub repo audit tool (components/, services/, routes.tsx, ProjectAnalysisPage.tsx)
    ├── resume-reviewer/        # ATS PDF resume reviewer (components/, services/, routes.tsx, ResumeReviewerPage.tsx)
    └── daily-quiz/             # CS fundamentals practice quiz (components/, services/, routes.tsx, DailyQuizPage.tsx)
```

### Backend (`backend/`)
```text
backend/
├── core/                       # Server runtime configuration
│   ├── config.py
│   ├── rate_limit.py
│   └── security.py
├── features/                   # 1:1 Matching Feature Modules
│   ├── subjects_ai/            # router.py, schemas.py, service.py
│   ├── project_analysis/       # router.py, schemas.py, service.py
│   ├── resume_reviewer/        # router.py, schemas.py, service.py
│   └── daily_quiz/             # router.py, schemas.py, service.py
├── shared/                     # Health check endpoint
│   └── health.py
├── main.py                     # Registers routers under /api/v1/...
└── requirements.txt
```

### Supabase (`supabase/`)
```text
supabase/
└── migrations/                 # Migrations partitioned per feature
    ├── core.sql                # Shared tables (profiles, subjects, enrollments)
    ├── communities.sql         # Communities posts, votes, comments, attachments
    ├── subjects.sql            # Subjects notes & storage
    ├── daily_quiz.sql          # Daily quiz schema
    ├── project_analysis.sql    # Project analysis schema
    ├── resume_reviewer.sql     # Resume reviewer schema
    └── dashboard.sql           # Dashboard preferences schema
```

---

## 4. Quick Start

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173).

To build the production bundle:
```bash
pnpm build
```

### Backend
```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Health check:
```bash
curl http://localhost:8000/api/v1/health
# {"status":"ok","version":"0.1.0"}
```

---

## 5. Authentication & Mock Accounts

CampusHub features a dual-mode authentication layer:
- **Live Mode (`VITE_USE_MOCKS=false`)**: Integrates the official **Supabase Auth UI** (`@supabase/auth-ui-react` & `@supabase/auth-ui-shared`) with `ThemeSupa` matching CampusHub's dark/light design system. It handles user registration, password logins, OAuth, and magic links with PostgreSQL Row Level Security (RLS) and JWT verification in FastAPI.
- **Mock Mode (`VITE_USE_MOCKS=true`)**: Provides an offline authentication experience with quick role presets and test credentials.

### Skipping the Mock Login Screen (`VITE_MOCK_ROLE`)

When developing features offline, you can skip the login screen entirely by setting `VITE_MOCK_ROLE` in `frontend/.env.local`:

```env
# In frontend/.env.local
VITE_MOCK_ROLE=student
```

* **When set to `student`, `moderator`, or `admin`:** The app bypasses `/login` and automatically authenticates you into that role upon loading.
* **When left empty (`VITE_MOCK_ROLE=`):** The app presents the interactive Login screen where you can test the login experience or switch between accounts.

### Working Test Accounts (Mock Mode)

All test accounts use the password: `password123`

| Role | Email | Password | Display Name | Handle | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | `student@campushub.edu` | `password123` | Alex Chen | `@alex_chen` | Standard student account with enrolled subjects and daily quiz access. |
| **Moderator** | `moderator@campushub.edu` | `password123` | Morgan Taylor | `@morgan_t` | Community moderator with elevated forum and moderation permissions. |
| **Admin** | `admin@campushub.edu` | `password123` | Dr. Sarah Vance | `@sarah_vance` | System administrator with full access across modules. |

You can also use the one-click preset buttons on the `/login` screen to sign in instantly as any role.

For complete local environment variables and `.env.local` instructions, see [frontend/README.md](frontend/README.md#2-environment-configuration-envlocal).

---

## 6. Git Collaboration & Synchronization Guide

CampusHub follows a strict **1 Feature Folder = 1 Developer Ownership** model with a centralized upstream repository.

- **Upstream Repository**: `https://github.com/Peanutbrain-pro/CampusHub.git`

### Essential Git Commands:

1. **One-Time Setup (Add Upstream)**:
   ```bash
   git remote add upstream https://github.com/Peanutbrain-pro/CampusHub.git
   git remote -v
   ```

2. **Daily Routine (Always Sync Before Starting Work)**:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main --ff-only
   git push origin main
   ```

3. **Feature Branching (1 Feature = 1 Branch)**:
   ```bash
   git checkout -b feature/<feature-name>
   ```

4. **Syncing While Working (Rebase on Upstream)**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

5. **Protecting Secrets & Staging Hygiene**:
   - **Never commit `.env.local`** or API keys.
   - Stage only files within your assigned feature directory (`git add src/features/<feature>/`).

6. **Submitting a Pull Request**:
   ```bash
   git push -u origin feature/<feature-name>
   ```
   Open a PR against `Peanutbrain-pro/CampusHub:main`.

For detailed Git instructions and conflict resolution steps, see [frontend/README.md](frontend/README.md#4-git-collaboration--synchronization-guide).

---

## 7. Design & UI Philosophy ("Keep It Simple")

1. **Simplicity Over Clutter**: The interface must remain clean, breathable, and distraction-free. Avoid filling empty spaces with decorative widgets or unnecessary cards.
2. **No Random Long Text**: Do not include walls of text, multi-paragraph background explanations, or filler copy for no reason. Keep microcopy to 1–2 actionable sentences maximum.
3. **Empty States**: Present a single concise sentence describing the status plus a clear action button.
4. **Consistency**: Use standard shadcn/ui components, semantic Tailwind tokens, and intuitive Lucide icons.


