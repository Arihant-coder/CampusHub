/**
 * @file routes.tsx
 * @description Route definition for Profile feature.
 * @owner Platform Core Team
 */

import type { RouteObject } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";

export const profileRoute: RouteObject = {
  path: "u/:handle",
  element: <ProfilePage />,
};

