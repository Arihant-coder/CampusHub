/**
 * @file mockService.ts
 * @description Offline mock implementation for ProfileService with local storage support.
 * @owner Platform Core Team
 */

import { subjects } from "@/shared/subjects";
import type { Post } from "@/shared/communities";
import type { UserProfile } from "@/shared/user";
import type { ProfileService, PublicUserProfile } from "../types";

const MOCK_STORAGE_KEY = "campushub:mock_user";
const MOCK_REGISTERED_USERS_KEY = "campushub:mock_registered_users";

const DEFAULT_MOCK_PROFILES: Record<string, UserProfile> = {
  alex_chen: {
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
  morgan_t: {
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
  sarah_vance: {
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
};

const SAMPLE_POSTS: Post[] = [
  {
    id: "p1",
    subjectId: "cs301",
    authorId: "mock-moderator-uuid",
    authorHandle: "morgan_t",
    authorName: "Morgan Taylor",
    authorAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
    authorRole: "moderator",
    title: "Mid-Term Exam Practice Questions (Units 1-3)",
    body: "Compiled a set of high-yield practice problems for the upcoming midterms covering relational algebra, B+ trees, and normalization. Check the attached diagrams.",
    imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80"],
    upvotes: 17,
    downvotes: 0,
    replyCount: 14,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p2",
    subjectId: "cs301",
    authorId: "mock-student-uuid",
    authorHandle: "alex_chen",
    authorName: "Alex Chen",
    authorAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces&q=80",
    authorRole: "student",
    title: "Question regarding 2PL concurrency graph cycles",
    body: "In question 4 of assignment 4 regarding 2PL concurrency control, the conflict serializability graph produces a cycle if T2 reads before T1 finishes. Isn't that an inconsistency?",
    imageUrl: null,
    images: [],
    upvotes: 23,
    downvotes: 0,
    replyCount: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    currentUserVote: null,
  },
];

export const mockProfileService: ProfileService = {
  async getProfileByHandle(handle: string) {
    const cleanHandle = handle.trim().toLowerCase().replace(/^@/, "");

    // 1. Check active user in local storage
    const activeRaw = localStorage.getItem(MOCK_STORAGE_KEY);
    let matchedProfile: UserProfile | null = null;
    if (activeRaw) {
      try {
        const parsed = JSON.parse(activeRaw) as UserProfile;
        if (parsed.handle.toLowerCase() === cleanHandle) {
          matchedProfile = parsed;
        }
      } catch {
        // ignore
      }
    }

    // 2. Check default mock accounts
    if (!matchedProfile && DEFAULT_MOCK_PROFILES[cleanHandle]) {
      matchedProfile = DEFAULT_MOCK_PROFILES[cleanHandle];
    }

    // 3. Check registered mock users
    if (!matchedProfile) {
      const regRaw = localStorage.getItem(MOCK_REGISTERED_USERS_KEY);
      if (regRaw) {
        try {
          const registered = JSON.parse(regRaw) as Array<{ profile: UserProfile }>;
          const match = registered.find((r) => r.profile.handle.toLowerCase() === cleanHandle);
          if (match) matchedProfile = match.profile;
        } catch {
          // ignore
        }
      }
    }

    if (!matchedProfile) {
      return { data: null, error: { code: "NOT_FOUND", message: "User not found." } };
    }

    const moderatedSubjects = (matchedProfile.moderatedSubjectIds || [])
      .map((id) => subjects.find((s) => s.id.toLowerCase() === id.toLowerCase()))
      .filter((s): s is (typeof subjects)[0] => Boolean(s))
      .map((s) => ({ id: s.id, name: s.name, code: s.code }));

    const publicProfile: PublicUserProfile = {
      id: matchedProfile.id,
      handle: matchedProfile.handle,
      fullName: matchedProfile.fullName,
      avatarUrl: matchedProfile.avatarUrl,
      role: matchedProfile.role,
      createdAt: matchedProfile.createdAt,
      isPrivate: matchedProfile.isPrivate ?? false,
      moderatedSubjects,
    };

    return { data: publicProfile, error: null };
  },

  async getUserPosts(authorId: string) {
    // Return sample mock posts or posts created by author
    const posts = SAMPLE_POSTS.filter((p) => p.authorId === authorId || p.authorHandle === authorId);
    return { data: posts, error: null };
  },

  async togglePrivacy(userId: string, isPrivate: boolean) {
    const activeRaw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (activeRaw) {
      try {
        const parsed = JSON.parse(activeRaw) as UserProfile;
        if (parsed.id === userId) {
          parsed.isPrivate = isPrivate;
          localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
    }
    return { data: undefined, error: null };
  },
};

