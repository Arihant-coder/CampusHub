/**
 * @file mockService.ts
 * @description In-memory mock service implementation for Dashboard feature.
 * @owner Dashboard Team
 */

import type { Result } from "@/shared/result";
import type { Subject } from "@/shared/user";
import type { Post } from "@/shared/communities";
import { subjects } from "@/shared/subjects";
import type { DashboardService } from "./types";

const MOCK_HOT_POSTS: Post[] = [
  {
    id: "p1",
    subjectId: "cs301",
    authorId: "u1",
    authorHandle: "Brownbunny",
    authorAvatarUrl: null,
    title: "Hi, my friend asked me how to solve this problem, can anyone explain me how to find the answer",
    body: "It has been a long time since I've done any geometry so I don't remember anymore how to find x in that angle.",
    imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
    images: ["https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80"],
    upvotes: 42,
    downvotes: 1,
    replyCount: 14,
    hotScore: 120,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p2",
    subjectId: "cs302",
    authorId: "u2",
    authorHandle: "Hashpotato",
    authorAvatarUrl: null,
    title: "Can someone share the subnetting shortcut cheat-sheet from today's lecture?",
    body: "Prof. mentioned a 256 minus subnet mask trick for CIDR blocks. Missed the end of the slide.",
    imageUrl: null,
    images: [],
    upvotes: 29,
    downvotes: 0,
    replyCount: 8,
    hotScore: 95,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p3",
    subjectId: "cs303",
    authorId: "u3",
    authorHandle: "KernelPanic",
    authorAvatarUrl: null,
    title: "Banker's Algorithm deadlock avoidance example clarification",
    body: "Need help understanding safe sequences vs unsafe states when available resources are exhausted.",
    imageUrl: null,
    images: [],
    upvotes: 19,
    downvotes: 0,
    replyCount: 5,
    hotScore: 72,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p4",
    subjectId: "cs304",
    authorId: "u4",
    authorHandle: "AlgoMaster",
    authorAvatarUrl: null,
    title: "Dijkstra vs Bellman-Ford on negative cycle detection",
    body: "Quick summary of time complexities and why greedy fails on negative edge weights.",
    imageUrl: null,
    images: [],
    upvotes: 35,
    downvotes: 2,
    replyCount: 11,
    hotScore: 68,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    currentUserVote: null,
  },
];

export const mockDashboardService: DashboardService = {
  async getEnrolledSubjects(): Promise<Result<Subject[]>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      data: [...subjects],
      error: null,
    };
  },

  async getAllSubjects(): Promise<Result<Subject[]>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      data: [...subjects],
      error: null,
    };
  },

  async getHotDiscussions(limit = 5): Promise<Result<Post[]>> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      data: MOCK_HOT_POSTS.slice(0, limit),
      error: null,
    };
  },
};
