/**
 * @file types.ts
 * @description Service interface and data models for Communities feature.
 * @owner Communities Team
 */

import type { Result } from "@/shared/result";
import type { Post } from "@/shared/communities";

export type { Post };

export type ResourceCategory = "All" | "Day wise" | "Unit wise" | "Other";
export type ResourceType = "Note" | "PYQ";

export interface SubjectForum {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  isPinned?: boolean;
  description?: string;
  imageUrl?: string | null;
}

export interface Comment {
  id: string;
  postId: string;
  parentId?: string | null;
  depth?: number;
  authorId: string;
  authorHandle: string;
  authorAvatarUrl?: string | null;
  body: string;
  images?: string[];
  upvotes?: number;
  downvotes?: number;
  currentUserVote?: 1 | -1 | null;
  createdAt: string;
  children?: Comment[];
}

export interface ResourceNote {
  id: string;
  subjectId: string;
  title: string;
  type: ResourceType; // "Note" | "PYQ"
  category: ResourceCategory; // "Day wise" | "Unit wise" | "Other"
  uploaderHandle: string;
  pageCount?: number;
  fileSizeBytes?: number;
  storagePath: string;
  createdAt: string;
}

export interface GlobalSearchResult {
  forums: SubjectForum[];
  posts: (Post & { forumName?: string })[];
}

export interface CommunitiesService {
  getSubjectForums(): Promise<Result<SubjectForum[]>>;
  getPosts(subjectId: string, sort?: "new" | "top" | "hot", search?: string): Promise<Result<Post[]>>;
  getPost(postId: string): Promise<Result<Post>>;
  searchGlobal(query: string): Promise<Result<GlobalSearchResult>>;
  createPost(data: {
    subjectId: string;
    title: string;
    body?: string;
    imageUrl?: string | null;
    images?: string[];
  }): Promise<Result<Post>>;
  votePost(postId: string, voteValue: 1 | -1 | null): Promise<Result<{ upvotes: number; downvotes: number; currentUserVote: 1 | -1 | null }>>;
  getComments(postId: string): Promise<Result<Comment[]>>;
  createComment(
    postId: string,
    body: string,
    parentId?: string | null,
    images?: string[]
  ): Promise<Result<Comment>>;
  voteComment?(commentId: string, voteValue: 1 | -1 | null): Promise<Result<{ upvotes: number; downvotes: number; currentUserVote: 1 | -1 | null }>>;
  getResources(subjectId: string, type: ResourceType): Promise<Result<ResourceNote[]>>;
  uploadResource(data: {
    subjectId: string;
    title: string;
    type: ResourceType;
    category?: ResourceCategory;
    pageCount?: number;
    file?: File;
  }): Promise<Result<ResourceNote>>;
  deleteResource?(resourceId: string, storagePath: string): Promise<Result<boolean>>;
  deletePost?(postId: string, imagePaths?: string[]): Promise<Result<boolean>>;
  deleteComment?(commentId: string, imagePaths?: string[]): Promise<Result<boolean>>;
}
