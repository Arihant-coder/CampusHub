/**
 * @file types.ts
 * @description Service interface and data models for Admin feature.
 * @owner Platform Core Team
 */

import type { Result } from "@/shared/result";
import type { UserRole } from "@/shared/user";

export interface AdminSubject {
  id: string;
  name: string;
  code: string;
}

export interface CommunityModerator {
  subjectId: string;
  userId: string;
  assignedBy?: string | null;
  createdAt: string;
  handle?: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface ProfileSearchResult {
  id: string;
  handle: string;
  fullName: string | null;
}

export interface AdminService {
  getSubjects(): Promise<Result<AdminSubject[]>>;
  getCommunityModerators(subjectId: string): Promise<Result<CommunityModerator[]>>;
  assignModerator(subjectId: string, userId: string): Promise<Result<void>>;
  removeModerator(subjectId: string, userId: string): Promise<Result<void>>;
  searchProfiles(query: string): Promise<Result<ProfileSearchResult[]>>;
  setUserRole(userId: string, role: UserRole): Promise<Result<void>>;
}

