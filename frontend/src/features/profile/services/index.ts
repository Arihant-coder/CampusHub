/**
 * @file index.ts
 * @description Profile service gateway selecting mock or live Supabase implementation.
 * @owner Platform Core Team
 */

import { mockProfileService } from "./mockService";
import { realProfileService } from "./realService";
import type { ProfileService } from "../types";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";

export const profileService: ProfileService = isMock ? mockProfileService : realProfileService;

