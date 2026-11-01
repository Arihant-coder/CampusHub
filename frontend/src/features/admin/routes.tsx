/**
 * @file routes.tsx
 * @description Route definition for Admin features guarded by RoleRoute (admin only).
 * @owner Platform Admin Team
 */

import type { RouteObject } from "react-router-dom";
import { ModeratorsAdminPage } from "./ModeratorsAdminPage";
import { RoleRoute } from "@/app/layouts/RoleRoute";

export const adminRoute: RouteObject = {
  path: "admin",
  children: [
    {
      path: "moderators",
      element: (
        <RoleRoute allowedRoles={["admin"]}>
          <ModeratorsAdminPage />
        </RoleRoute>
      ),
    },
  ],
};

