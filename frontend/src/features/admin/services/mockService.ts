/**
 * @file mockService.ts
 * @description In-memory mock implementation of AdminService for offline mode.
 * @owner Platform Core Team
 */

import { subjects } from "@/shared/subjects";
import type { Result } from "@/shared/result";
import type { UserRole } from "@/shared/user";
import type {
  AdminService,
  AdminSubject,
  CommunityModerator,
  ProfileSearchResult,
} from "./types";

let mockModerators: CommunityModerator[] = [
  {
    subjectId: "cs301",
    userId: "mock-moderator-uuid",
    assignedBy: "mock-admin-uuid",
    createdAt: "2026-08-15T10:00:00Z",
    handle: "morgan_t",
    fullName: "Morgan Taylor",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
  },
  {
    subjectId: "cs302",
    userId: "mock-moderator-uuid",
    assignedBy: "mock-admin-uuid",
    createdAt: "2026-08-15T10:00:00Z",
    handle: "morgan_t",
    fullName: "Morgan Taylor",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
  },
  {
    subjectId: "dbms",
    userId: "mock-moderator-uuid",
    assignedBy: "mock-admin-uuid",
    createdAt: "2026-08-15T10:00:00Z",
    handle: "morgan_t",
    fullName: "Morgan Taylor",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
  },
  {
    subjectId: "cn",
    userId: "mock-moderator-uuid",
    assignedBy: "mock-admin-uuid",
    createdAt: "2026-08-15T10:00:00Z",
    handle: "morgan_t",
    fullName: "Morgan Taylor",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
  },
];

export const mockAdminService: AdminService = {
  async getSubjects(): Promise<Result<AdminSubject[]>> {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const list: AdminSubject[] = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
    }));
    return { data: list, error: null };
  },

  async getCommunityModerators(subjectId: string): Promise<Result<CommunityModerator[]>> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const filtered = mockModerators.filter(
      (m) => m.subjectId.toLowerCase() === subjectId.toLowerCase()
    );
    return { data: filtered, error: null };
  },

  async assignModerator(subjectId: string, userId: string): Promise<Result<void>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const exists = mockModerators.some(
      (m) => m.subjectId === subjectId && m.userId === userId
    );
    if (!exists) {
      const handle =
        userId === "mock-student-uuid"
          ? "alex_chen"
          : userId === "mock-moderator-uuid"
          ? "morgan_t"
          : "user_" + userId.slice(0, 5);
      const fullName =
        userId === "mock-student-uuid"
          ? "Alex Chen"
          : userId === "mock-moderator-uuid"
          ? "Morgan Taylor"
          : "User " + userId.slice(0, 5);

      mockModerators.push({
        subjectId,
        userId,
        assignedBy: "mock-admin-uuid",
        createdAt: new Date().toISOString(),
        handle,
        fullName,
      });
    }
    return { data: undefined, error: null };
  },

  async removeModerator(subjectId: string, userId: string): Promise<Result<void>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    mockModerators = mockModerators.filter(
      (m) => !(m.subjectId === subjectId && m.userId === userId)
    );
    return { data: undefined, error: null };
  },

  async searchProfiles(query: string): Promise<Result<ProfileSearchResult[]>> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const q = query.toLowerCase().trim();
    const candidateProfiles: ProfileSearchResult[] = [
      { id: "mock-student-uuid", handle: "alex_chen", fullName: "Alex Chen" },
      { id: "mock-moderator-uuid", handle: "morgan_t", fullName: "Morgan Taylor" },
      { id: "mock-admin-uuid", handle: "sarah_vance", fullName: "Dr. Sarah Vance" },
      { id: "mock-user-4", handle: "jordan_lee", fullName: "Jordan Lee" },
      { id: "mock-user-5", handle: "priya_sharma", fullName: "Priya Sharma" },
    ];
    const filtered = candidateProfiles.filter(
      (p) =>
        (p.handle && p.handle.toLowerCase().includes(q)) ||
        (p.fullName && p.fullName.toLowerCase().includes(q))
    );
    return { data: filtered.slice(0, 20), error: null };
  },

  async setUserRole(_userId: string, _role: UserRole): Promise<Result<void>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { data: undefined, error: null };
  },
};

