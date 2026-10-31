import type { RouteObject } from "react-router-dom";
import CommunitiesLayout from "./CommunitiesLayout";
import CommunitiesPage from "./CommunitiesPage";
import PostDetailPage from "./PostDetailPage";
import CreatePostPage from "./CreatePostPage";
import ShareResourcePage from "./ShareResourcePage";

export const communitiesRoute: RouteObject = {
  path: "communities",
  element: <CommunitiesLayout />,
  children: [
    { index: true, element: <CommunitiesPage /> },
    { path: "new", element: <CreatePostPage /> },
    { path: "share", element: <ShareResourcePage /> },
    { path: "post/:postId", element: <PostDetailPage /> },
    { path: ":subjectId", element: <CommunitiesPage /> },
    { path: ":subjectId/new", element: <CreatePostPage /> },
    { path: ":subjectId/share", element: <ShareResourcePage /> },
    { path: ":subjectId/post/:postId", element: <PostDetailPage /> },
  ],
};
