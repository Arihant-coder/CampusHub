# Feature Guide: Student Dashboard (`features/dashboard`)

The **Dashboard** feature provides the home overview for enrolled university students. It presents student profile information, academic announcements, shortcuts to active subjects, and quick tool launchers (Communities, Daily Quiz).

- **Frontend Path:** `frontend/src/features/dashboard/`
- **Backend Path:** *None* (Direct Supabase)
- **Primary Route:** `/`
- **Backend Services:** Supabase (`profiles`, `subjects`, `subject_enrollments`)

> [!IMPORTANT]
> **Feature Isolation Rule:**
> Nothing outside this folder may import from it, except `app/routes.tsx` which imports `dashboardRoute`. Imports are only permitted from `components/ui`, `lib/`, `shared/`, and this feature's own directory.

---

## 1. File & Directory Anatomy

```text
frontend/src/features/dashboard/
├── DashboardPage.tsx         # Main page coordinator (renders hero, grids, and tool launchers)
├── routes.tsx                # Route definition (mounted at /)
├── components/               # Sub-components isolated to the dashboard
│   ├── StudentProfileCard.tsx# Displays avatar, handle, semester, and academic role
│   ├── EnrolledSubjectsGrid.tsx # Cards linking to enrolled course workspaces (/subjects/:id)
│   ├── QuickToolLaunchers.tsx# Grid of quick action buttons for tools (Quiz, Communities)
│   └── RecentActivityList.tsx# Activity feed showing hot discussions and quiz streaks
├── services/                 # Data access layer
│   ├── types.ts              # DashboardService interface & data contracts
│   ├── mockService.ts        # Mock implementation for offline UI development
│   ├── realService.ts        # Direct Supabase table queries
│   └── index.ts              # Active service switcher governed by VITE_USE_MOCKS
└── README.md                 # This developer guide
```

---

## 2. Service Architecture & Mock vs Real Workflow

All data operations must be declared in `services/types.ts` and implemented in both `mockService.ts` and `realService.ts`.

### Step 1: Define Service Types (`services/types.ts`)
Declare your service interface and data contracts:
```typescript
import type { Result } from "@/shared/result";
import type { Subject, UserProfile } from "@/shared/user";

export interface DashboardService {
  getProfile(): Promise<Result<UserProfile>>;
  getEnrolledSubjects(): Promise<Result<Subject[]>>;
  getAllSubjects(): Promise<Result<Subject[]>>;
  enrollSubject(subjectId: string): Promise<Result<void>>;
}
```

### Step 2: Implement Mock Service (`services/mockService.ts`)
Populate mock profile and enrolled courses with simulated network delay (300ms) to build all UI widgets offline:
```typescript
import type { Result } from "@/shared/result";
import type { Subject, UserProfile } from "@/shared/user";
import type { DashboardService } from "./types";

export const mockDashboardService: DashboardService = {
  async getProfile(): Promise<Result<UserProfile>> {
    await new Promise((r) => setTimeout(r, 250));
    return {
      data: { id: "mock-student", handle: "alex_chen", fullName: "Alex Chen", role: "student" },
      error: null,
    };
  },
  async getEnrolledSubjects(): Promise<Result<Subject[]>> {
    await new Promise((r) => setTimeout(r, 300));
    return {
      data: [
        { id: "cs301", name: "Database Management Systems", code: "CS301" },
        { id: "cs302", name: "Computer Networks", code: "CS302" },
      ],
      error: null,
    };
  },
  async getAllSubjects(): Promise<Result<Subject[]>> {
    await new Promise((r) => setTimeout(r, 250));
    return {
      data: [
        { id: "cs301", name: "Database Management Systems", code: "CS301" },
        { id: "cs302", name: "Computer Networks", code: "CS302" },
        { id: "cs303", name: "Operating Systems", code: "CS303" },
      ],
      error: null,
    };
  },
  async enrollSubject(_subjectId: string): Promise<Result<void>> {
    await new Promise((r) => setTimeout(r, 200));
    return { data: undefined, error: null };
  },
};
```

### Step 3: Implement Real Service (`services/realService.ts`)
Query Supabase tables directly using the `@/lib/supabase` singleton:
```typescript
import { supabase } from "@/lib/supabase";
import type { Result } from "@/shared/result";
import type { Subject, UserProfile } from "@/shared/user";
import type { DashboardService } from "./types";

export const realDashboardService: DashboardService = {
  async getProfile(): Promise<Result<UserProfile>> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: { code: "UNAUTHENTICATED", message: "Not logged in" } };

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error) return { data: null, error: { code: "INTERNAL", message: error.message } };
    return { data, error: null };
  },
  async getEnrolledSubjects(): Promise<Result<Subject[]>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { code: "UNAUTHENTICATED", message: "Not logged in" } };

    const { data, error } = await supabase
      .from("subject_enrollments")
      .select("subject_id, subjects(id, name, code)")
      .eq("user_id", user.id);
    if (error) return { data: null, error: { code: "INTERNAL", message: error.message } };

    const subjects = (data || []).map((row: any) => row.subjects as Subject);
    return { data: subjects, error: null };
  },
  async getAllSubjects(): Promise<Result<Subject[]>> {
    const { data, error } = await supabase.from("subjects").select("id, name, code");
    if (error) return { data: null, error: { code: "INTERNAL", message: error.message } };
    return { data: data as Subject[], error: null };
  },
  async enrollSubject(subjectId: string): Promise<Result<void>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { code: "UNAUTHENTICATED", message: "Not logged in" } };

    const { error } = await supabase.from("subject_enrollments").insert({ user_id: user.id, subject_id: subjectId });
    if (error) return { data: null, error: { code: "INTERNAL", message: error.message } };
    return { data: undefined, error: null };
  },
};
```

### Step 4: Dispatch in `services/index.ts`
```typescript
import { mockDashboardService } from "./mockService";
import { realDashboardService } from "./realService";
import type { DashboardService } from "./types";

export * from "./types";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";
export const dashboardService: DashboardService = isMock
  ? mockDashboardService
  : realDashboardService;
```

---

## 3. How to Develop

1. **Keep `VITE_USE_MOCKS=true`** in `frontend/.env`.
2. Open `DashboardPage.tsx`. Import `dashboardService` from `./services`:
   ```typescript
   import { dashboardService } from "./services";
   ```
3. Fetch profile and enrolled courses on mount:
   ```typescript
   const { data: profile } = await dashboardService.getProfile();
   const { data: subjects } = await dashboardService.getEnrolledSubjects();
   ```
4. Assemble `StudentProfileCard`, `EnrolledSubjectsGrid`, and `QuickToolLaunchers` using Tailwind CSS and shadcn/ui.
5. Set `VITE_USE_MOCKS=false` in `frontend/.env` to verify real database connections with live Supabase credentials.

---

## 4. How to Test

- **UI State Testing:** Verify loading skeletons when data is fetching, empty state when a student is enrolled in 0 subjects, and error banners when unauthenticated.
- **Type Checking:** Run from `frontend/`:
  ```bash
  pnpm tsc --noEmit
  ```
