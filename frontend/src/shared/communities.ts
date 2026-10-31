/**
 * @file communities.ts
 * @description Shared cross-feature communities data models.
 * @owner Platform Core Team
 */

export interface Post {
  id: string;
  subjectId: string;
  authorId: string;
  authorHandle: string;
  authorAvatarUrl?: string | null;
  title: string;
  body?: string;
  imageUrl?: string | null;
  images?: string[];
  upvotes: number;
  downvotes: number;
  replyCount: number;
  hotScore?: number;
  createdAt: string;
  currentUserVote?: 1 | -1 | null;
}

