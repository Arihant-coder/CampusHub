/**
 * @file routes.tsx
 * @description Route definitions for Auth feature supporting /login, /signup, and /auth/callback entrypoints.
 * @owner Platform Core Team
 */

import type { RouteObject } from "react-router-dom";
import LoginPage from "./LoginPage";
import AuthCallbackPage from "./AuthCallbackPage";

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage initialMode="signin" />,
  },
  {
    path: "/signup",
    element: <LoginPage initialMode="signup" />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
];

// Single route export fallback
export const authRoute: RouteObject = authRoutes[0];
