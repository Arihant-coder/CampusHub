/**
 * @file types.ts
 * @description Type definitions for the Profile feature.
 * @owner Platform Core Team
 */

import type { UserRole } from "@/shared/user";
import type { Post } from "@/shared/communities";

export interface PublicUserProfile {
  id: string;
  handle: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  isPrivate: boolean;
  moderatedSubjects: { id: string; name: string; code: string }[];
}

export interface ProfileService {
  getProfileByHandle(handle: string): Promise<{ data: PublicUserProfile | null; error: any }>;
  getUserPosts(authorId: string): Promise<{ data: Post[] | null; error: any }>;
  togglePrivacy(userId: string, isPrivate: boolean): Promise<{ data: void | null; error: any }>;
}

