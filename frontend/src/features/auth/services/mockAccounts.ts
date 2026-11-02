/**
 * @file mockAccounts.ts
 * @description In-memory mock accounts for local offline testing.
 * @owner Platform Core Team
 */

import type { MockAccount } from "../types";

export const MOCK_ACCOUNTS: Record<string, MockAccount> = {
  student: {
    email: "student@campushub.edu",
    password: "password123",
    role: "student",
    profile: {
      id: "mock-student-uuid",
      handle: "alex_chen",
      fullName: "Alex Chen",
      email: "student@campushub.edu",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces&q=80",
      role: "student",
      createdAt: "2026-09-01T08:00:00Z",
      moderatedSubjectIds: [],
      isPrivate: false,
      privacyOnboardingCompleted: true,
    },
  },
  moderator: {
    email: "moderator@campushub.edu",
    password: "password123",
    role: "student",
    profile: {
      id: "mock-moderator-uuid",
      handle: "morgan_t",
      fullName: "Morgan Taylor",
      email: "moderator@campushub.edu",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
      role: "student",
      createdAt: "2026-08-15T10:00:00Z",
      moderatedSubjectIds: ["cs301", "cs302", "dbms", "cn"],
      isPrivate: false,
      privacyOnboardingCompleted: true,
    },
  },
  admin: {
    email: "admin@campushub.edu",
    password: "password123",
    role: "admin",
    profile: {
      id: "mock-admin-uuid",
      handle: "sarah_vance",
      fullName: "Dr. Sarah Vance",
      email: "admin@campushub.edu",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&h=128&fit=crop&crop=faces&q=80",
      role: "admin",
      createdAt: "2026-07-01T09:00:00Z",
      moderatedSubjectIds: [],
      isPrivate: false,
      privacyOnboardingCompleted: true,
    },
  },
};

export const MOCK_REGISTERED_USERS_KEY = "campushub:mock_registered_users";

