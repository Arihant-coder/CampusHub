/**
 * @file user.ts
 * @description User profile and subject structure types.
 * @owner Platform Core Team
 */

export type UserRole = "student" | "admin";

export interface UserProfile {
  id: string;
  handle: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  moderatedSubjectIds?: string[];
  email?: string;
  isPrivate?: boolean;
  privacyOnboardingCompleted?: boolean;
}

/**
 * Checks if a user has moderation authority for a specific subject community.
 * Admins are global moderators; non-admins must be assigned to the subject in community_moderators.
 */
export function canModerate(
  user: UserProfile | null | undefined,
  subjectId?: string | null
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!subjectId || !user.moderatedSubjectIds) return false;
  return user.moderatedSubjectIds.includes(subjectId);
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}
