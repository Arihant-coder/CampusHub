import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import SubjectWorkspaceLayout from "./layouts/SubjectWorkspaceLayout";
import SubjectViewerPage from "@/features/subject-viewer/SubjectViewerPage";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { authRoutes } from "@/features/auth/routes";
import { dashboardRoute } from "@/features/dashboard/routes";
import { communitiesRoute } from "@/features/communities/routes";
import { dailyQuizRoute } from "@/features/daily-quiz/routes";
import { adminRoute } from "@/features/admin/routes";
import { profileRoute } from "@/features/profile/routes";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RootErrorBoundary } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  ...authRoutes,
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    errorElement: <RootErrorBoundary />,
    children: [
      dashboardRoute,
      communitiesRoute,
      adminRoute,
      profileRoute,
      {
        path: "subjects",
        element: <SubjectWorkspaceLayout />,
        children: [
          { index: true, element: <SubjectViewerPage /> },
          { path: ":subjectId", element: <SubjectViewerPage /> },
        ],
      },
      dailyQuizRoute,
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
