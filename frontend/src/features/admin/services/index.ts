/**
 * @file index.ts
 * @description Service gateway for Admin feature with mock fallback.
 * @owner Platform Core Team
 */

import { mockAdminService } from "./mockService";
import { realAdminService } from "./realService";
import type { AdminService } from "./types";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";

export const adminService: AdminService = isMock
  ? mockAdminService
  : realAdminService;

export * from "./types";

