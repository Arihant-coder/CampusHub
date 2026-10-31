import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import SubjectWorkspaceLayout from "./layouts/SubjectWorkspaceLayout";
import SubjectViewerPage from "@/features/subject-viewer/SubjectViewerPage";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { authRoutes } from "@/features/auth/routes";
import { dashboardRoute } from "@/features/dashboard/routes";
import { communitiesRoute } from "@/features/communities/routes";
import { projectAnalysisRoute } from "@/features/project-analysis/routes";
import { resumeReviewerRoute } from "@/features/resume-reviewer/routes";
import { dailyQuizRoute } from "@/features/daily-quiz/routes";

export const router = createBrowserRouter([
  ...authRoutes,
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      dashboardRoute,
      communitiesRoute,
      {
        path: "subjects",
        element: <SubjectWorkspaceLayout />,
        children: [
          { index: true, element: <SubjectViewerPage /> },
          { path: ":subjectId", element: <SubjectViewerPage /> },
        ],
      },
      projectAnalysisRoute,
      resumeReviewerRoute,
      dailyQuizRoute,
    ],
  },
]);
