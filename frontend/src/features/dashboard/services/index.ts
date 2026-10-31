/**
 * @file index.ts
 * @description Service entry point for Dashboard feature.
 * @owner Dashboard Team
 */

import { mockDashboardService } from "./mockService";
import { realDashboardService } from "./realService";
import type { DashboardService } from "./types";

export * from "./types";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";

export const dashboardService: DashboardService = isMock
  ? mockDashboardService
  : realDashboardService;
