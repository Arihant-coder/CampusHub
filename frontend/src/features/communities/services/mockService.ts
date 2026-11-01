/**
 * @file mockService.ts
 * @description In-memory mock implementation of CommunitiesService matching wireframes.
 * @owner Communities Team
 */

import type { Result } from "@/shared/result";
import type {
  CommunitiesService,
  SubjectForum,
  Post,
  Comment,
  ResourceNote,
  ResourceType,
  ResourceCategory,
  GlobalSearchResult,
  CommunityModerator,
  ProfileSearchResult,
  Report,
} from "./types";
import type { UserRole } from "@/shared/user";

const INITIAL_SUBJECT_FORUMS: SubjectForum[] = [
  {
    id: "cs301",
    name: "Database Management Systems",
    code: "CS301",
    memberCount: 1200,
    isPinned: false,
    description: "Discussion forum and academic resource archive for DBMS course.",
    imageUrl: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "cs302",
    name: "Computer Networks",
    code: "CS302",
    memberCount: 980,
    isPinned: false,
    description: "OSI stack, TCP/IP, routing protocols, and lab assignments.",
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "cs303",
    name: "Operating Systems",
    code: "CS303",
    memberCount: 1100,
    isPinned: false,
    description: "Concurrency, scheduling, memory paging, and Unix kernel calls.",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "cs304",
    name: "Data Structures & Algorithms",
    code: "CS304",
    memberCount: 1540,
    isPinned: false,
    description: "Trees, graphs, dynamic programming, sorting, and complexity.",
    imageUrl: "https://images.unsplash.com/photo-1516116211227-bbc6732f790c?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "ee101",
    name: "Basic Electrical Engineering",
    code: "EE101",
    memberCount: 850,
    isPinned: false,
    description: "Circuit analysis, AC/DC transients, transformers, and theorems.",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "me102",
    name: "Engineering Graphics",
    code: "ME102",
    memberCount: 620,
    isPinned: true,
    description: "Orthographic projections, isometric views, and CAD models.",
    imageUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "cs305",
    name: "Design and Analysis of Algorithms",
    code: "CS305",
    memberCount: 950,
    isPinned: true,
    description: "Advanced algorithmic paradigms, NP-completeness, and greedy heuristics.",
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=100&auto=format&fit=crop&q=80",
  },
];

const INITIAL_POSTS: any[] = [
  {
    id: "p1",
    subjectId: "cs301",
    authorId: "u1",
    authorHandle: "Brownbunny",
    authorAvatarUrl: null,
    title: "Hi, my friend asked me how to solve this problem, can anyone explain me how to find the answer",
    body: "It has been a long time since I've done any geometry so I don't remember anymore how to find x in that angle, could anyone explain how to get to the answer and the steps to find it? Thank you so much!",
    imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    ],
    upvotes: 17,
    downvotes: 0,
    replyCount: 14,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p2",
    subjectId: "cs301",
    authorId: "u2",
    authorHandle: "Hashpotato",
    authorAvatarUrl: null,
    title: "Is Q.4 from this assignment 4 (CSE-12) wrong here?",
    body: "In question 4 of assignment 4 regarding 2PL concurrency control, the conflict serializability graph produces a cycle if T2 reads before T1 finishes. Isn't that an inconsistency in the question statement?",
    imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    ],
    upvotes: 23,
    downvotes: 0,
    replyCount: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p3",
    subjectId: "cs302",
    authorId: "u3",
    authorHandle: "CodeCrafter",
    authorAvatarUrl: null,
    title: "Subnetting cheat sheet for CIDR /26 and /28",
    body: "Put together a quick table to calculate network and broadcast addresses on the fly for tomorrow's lab quiz.",
    imageUrl: null,
    images: [],
    upvotes: 31,
    downvotes: 1,
    replyCount: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p4",
    subjectId: "cs301",
    authorId: "u4",
    authorHandle: "CampusDev",
    authorAvatarUrl: null,
    title: "Quick reminder: Midsem schedule changed for CS301 tutorial slot!",
    body: "", // Optional body demo
    imageUrl: null,
    images: [],
    upvotes: 12,
    downvotes: 0,
    replyCount: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p-me1",
    subjectId: "me102",
    authorId: "u-me1",
    authorHandle: "CadMaster",
    authorAvatarUrl: null,
    title: "Isometric vs Orthographic Projection: Summary sheet for Unit 2 exam",
    body: "Here is a quick reference guide on converting first-angle to third-angle projection and calculating missing isometric views for tomorrow's revision.",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
    images: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
    ],
    upvotes: 34,
    downvotes: 0,
    replyCount: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p-me2",
    subjectId: "me102",
    authorId: "u-me2",
    authorHandle: "DraftingPro",
    authorAvatarUrl: null,
    title: "How to construct a parabola using the rectangle and tangent method?",
    body: "Struggling with step 3 in sheet 4 where the vertex touches the auxiliary axis. Can someone check my construction lines?",
    imageUrl: null,
    images: [],
    upvotes: 19,
    downvotes: 1,
    replyCount: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p-me3",
    subjectId: "me102",
    authorId: "u-me3",
    authorHandle: "TechDraw99",
    authorAvatarUrl: null,
    title: "AutoCAD 2024 Lab shortcut key cheatsheet",
    body: "Handy shortcuts for drafting, snap tracking, chamfer, and fillet commands for tomorrow's practical evaluation.",
    imageUrl: null,
    images: [],
    upvotes: 45,
    downvotes: 0,
    replyCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p-me4",
    subjectId: "me102",
    authorId: "u-me4",
    authorHandle: "SolidModeler",
    authorAvatarUrl: null,
    title: "Section of Solids: True shape vs Apparent shape explained",
    body: "A lot of students got confused on the cylinder cut by an inclined plane in tutorial 3. Here is the breakdown of why the true shape is an ellipse.",
    imageUrl: null,
    images: [],
    upvotes: 27,
    downvotes: 0,
    replyCount: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p-os1",
    subjectId: "cs303",
    authorId: "u-os1",
    authorHandle: "KernelHacker",
    authorAvatarUrl: null,
    title: "Deadlock Banker's Algorithm solved step-by-step with safety state check",
    body: "Detailed example walkthrough calculating Need matrix, Available vector, and safe execution sequences.",
    imageUrl: null,
    images: [],
    upvotes: 42,
    downvotes: 0,
    replyCount: 9,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    currentUserVote: null,
  },
  {
    id: "p-dsa1",
    subjectId: "cs304",
    authorId: "u-dsa1",
    authorHandle: "AlgoExpert",
    authorAvatarUrl: null,
    title: "Dijkstra vs Bellman-Ford: When to choose which shortest path algorithm?",
    body: "Comprehensive comparison table focusing on negative cycles, time complexities, and typical interview edge cases.",
    imageUrl: null,
    images: [],
    upvotes: 38,
    downvotes: 1,
    replyCount: 7,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
    currentUserVote: null,
  },
];

const INITIAL_COMMENTS: any[] = [
  // Top-level comment for post p1 (Level 1, depth 0)
  {
    id: "c1",
    postId: "p1",
    parentId: null,
    depth: 0,
    authorId: "u4",
    authorHandle: "QuantumDev",
    authorAvatarUrl: null,
    body: "The angle sum of the right triangles around the squares gives you the required angle. Notice that the squares have internal 90° angles.",
    upvotes: 12,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
  },
  // Level 2 reply (depth 1)
  {
    id: "c1-1",
    postId: "p1",
    parentId: "c1",
    depth: 1,
    authorId: "u1",
    authorHandle: "Brownbunny",
    authorAvatarUrl: null,
    body: "Thanks! So for the middle square (乙), the two adjacent angles are 128° and the square corner (90°)?",
    upvotes: 5,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  // Level 3 reply (depth 2)
  {
    id: "c1-2",
    postId: "p1",
    parentId: "c1-1",
    depth: 2,
    authorId: "u4",
    authorHandle: "QuantumDev",
    authorAvatarUrl: null,
    body: "Exactly. The full revolution around that vertex is 360°. So subtracting those gives you the inside angle.",
    upvotes: 4,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
  },
  // Level 4 reply (depth 3)
  {
    id: "c1-3",
    postId: "p1",
    parentId: "c1-2",
    depth: 3,
    authorId: "u5",
    authorHandle: "MathEnthusiast",
    authorAvatarUrl: null,
    body: "360 - 128 - 90 = 142° for that interior segment.",
    upvotes: 3,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  // Level 5 reply (depth 4)
  {
    id: "c1-4",
    postId: "p1",
    parentId: "c1-3",
    depth: 4,
    authorId: "u1",
    authorHandle: "Brownbunny",
    authorAvatarUrl: null,
    body: "Then we carry that down to square 丙?",
    upvotes: 2,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  // Level 6 reply (depth 5)
  {
    id: "c1-5",
    postId: "p1",
    parentId: "c1-4",
    depth: 5,
    authorId: "u5",
    authorHandle: "MathEnthusiast",
    authorAvatarUrl: null,
    body: "Yes! Use the 34° given at the vertex between 乙 and 丙.",
    upvotes: 2,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 100).toISOString(),
  },
  // Level 7 reply (depth 6)
  {
    id: "c1-6",
    postId: "p1",
    parentId: "c1-5",
    depth: 6,
    authorId: "u6",
    authorHandle: "GeometryWhiz",
    authorAvatarUrl: null,
    body: "The angle between the squares is complementary because of the straight line reference on the left.",
    upvotes: 2,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  // Level 8 reply (depth 7)
  {
    id: "c1-7",
    postId: "p1",
    parentId: "c1-6",
    depth: 7,
    authorId: "u1",
    authorHandle: "Brownbunny",
    authorAvatarUrl: null,
    body: "I see! Does that mean x is 56°?",
    upvotes: 2,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
  },
  // Level 9 reply (depth 8)
  {
    id: "c1-8",
    postId: "p1",
    parentId: "c1-7",
    depth: 8,
    authorId: "u6",
    authorHandle: "GeometryWhiz",
    authorAvatarUrl: null,
    body: "Almost, check the 90° angle at the bottom corner of the bounding box.",
    upvotes: 1,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
  },
  // Level 10 reply (depth 9)
  {
    id: "c1-9",
    postId: "p1",
    parentId: "c1-8",
    depth: 9,
    authorId: "u1",
    authorHandle: "Brownbunny",
    authorAvatarUrl: null,
    body: "Right, subtracting 34° from 90° gives 56°, then taking the supplementary angle...",
    upvotes: 1,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  // Level 11 reply (depth 10)
  {
    id: "c1-10",
    postId: "p1",
    parentId: "c1-9",
    depth: 10,
    authorId: "u6",
    authorHandle: "GeometryWhiz",
    authorAvatarUrl: null,
    body: "You got it! 64° is the final result for x.",
    upvotes: 3,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
  },
  // Level 12 reply (depth 11 - STRICT CEILING)
  {
    id: "c1-11",
    postId: "p1",
    parentId: "c1-10",
    depth: 11,
    authorId: "u1",
    authorHandle: "Brownbunny",
    authorAvatarUrl: null,
    body: "Awesome! That matches the answer key in the tutorial sheet. Thank you everyone!",
    upvotes: 4,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  // Another top-level comment for p1 (depth 0)
  {
    id: "c2",
    postId: "p1",
    parentId: null,
    depth: 0,
    authorId: "u2",
    authorHandle: "Hashpotato",
    authorAvatarUrl: null,
    body: "I uploaded the tutorial worksheet solution to the Resources tab under Notes!",
    upvotes: 8,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  // Comments for p2
  {
    id: "c3",
    postId: "p2",
    parentId: null,
    authorId: "u5",
    authorHandle: "ByteMe",
    authorAvatarUrl: null,
    body: "You're right! Prof mentioned in Section B that T2 should be a Read-only transaction instead of Read-Write.",
    upvotes: 6,
    downvotes: 0,
    currentUserVote: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

const INITIAL_RESOURCES: any[] = [
  {
    id: "n1",
    subjectId: "cs301",
    userId: "mock-student-uuid",
    title: "Day1-ABCD.pdf",
    type: "Note",
    category: "Day wise",
    uploaderHandle: "Hashpotato",
    pageCount: 24,
    fileSizeBytes: 2450000,
    storagePath: "community/cs301/day1-abcd.pdf",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    status: "approved",
    isShared: true,
  },
  {
    id: "n2",
    subjectId: "cs301",
    userId: "mock-student-uuid",
    title: "Day2-ABCD.pdf",
    type: "Note",
    category: "Day wise",
    uploaderHandle: "Hashpotato",
    pageCount: 21,
    fileSizeBytes: 1890000,
    storagePath: "community/cs301/day2-abcd.pdf",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: "approved",
    isShared: true,
  },
  {
    id: "n3",
    subjectId: "cs301",
    userId: "mock-student-uuid",
    title: "Day3-ABCD.pdf",
    type: "Note",
    category: "Day wise",
    uploaderHandle: "Hashpotato",
    pageCount: 18,
    fileSizeBytes: 1420000,
    storagePath: "community/cs301/day3-abcd.pdf",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    status: "approved",
    isShared: true,
  },
  {
    id: "q1",
    subjectId: "cs301",
    userId: "mock-student-uuid",
    title: "2023 End sem.pdf",
    type: "PYQ",
    category: "Other",
    uploaderHandle: "Hashpotato",
    pageCount: 2,
    fileSizeBytes: 950000,
    storagePath: "community/cs301/2023-endsem.pdf",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: "approved",
    isShared: true,
  },
  {
    id: "p1",
    subjectId: "cs301",
    userId: "mock-user-4",
    title: "Unit 3 TCP/IP Subnetting Cheat Sheet.pdf",
    type: "Note",
    category: "Unit wise",
    uploaderHandle: "student_coder",
    pageCount: 6,
    fileSizeBytes: 1200000,
    storagePath: "staging/cs301/tcp-ip-subnetting.pdf",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: "pending",
    isShared: false,
  },
];

let communityModerators: CommunityModerator[] = [
  {
    subjectId: "cs301",
    userId: "mock-moderator-uuid",
    assignedBy: "mock-admin-uuid",
    createdAt: "2026-08-15T10:00:00Z",
    handle: "morgan_t",
    fullName: "Morgan Taylor",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
  },
  {
    subjectId: "cs302",
    userId: "mock-moderator-uuid",
    assignedBy: "mock-admin-uuid",
    createdAt: "2026-08-15T10:00:00Z",
    handle: "morgan_t",
    fullName: "Morgan Taylor",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
  },
  {
    subjectId: "dbms",
    userId: "mock-moderator-uuid",
    assignedBy: "mock-admin-uuid",
    createdAt: "2026-08-15T10:00:00Z",
    handle: "morgan_t",
    fullName: "Morgan Taylor",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
  },
  {
    subjectId: "cn",
    userId: "mock-moderator-uuid",
    assignedBy: "mock-admin-uuid",
    createdAt: "2026-08-15T10:00:00Z",
    handle: "morgan_t",
    fullName: "Morgan Taylor",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces&q=80",
  },
];

let mockReports: Report[] = [
  {
    id: "rep-1",
    subjectId: "cs301",
    reporterId: "mock-student-uuid",
    targetType: "post",
    targetId: "p1",
    reason: "Off-topic content and spam links in comment section.",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    reporterName: "Alex Chen",
    reporterHandle: "alex_chen",
  },
  {
    id: "rep-2",
    subjectId: "cs301",
    reporterId: "mock-student-uuid",
    targetType: "comment",
    targetId: "c1-2",
    reason: "Inappropriate language towards peers.",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    reporterName: "Alex Chen",
    reporterHandle: "alex_chen",
  },
];

// In-memory state
let subjectForums = [...INITIAL_SUBJECT_FORUMS];
let posts: Post[] = INITIAL_POSTS.map((p) => ({ ...p, authorName: p.authorName || p.authorHandle || "Anonymous" }));
let comments: Comment[] = INITIAL_COMMENTS.map((c) => ({ ...c, authorName: c.authorName || c.authorHandle || "Anonymous" }));
let resources: ResourceNote[] = INITIAL_RESOURCES.map((r) => ({ ...r, uploaderName: r.uploaderName || r.uploaderHandle || "Anonymous" }));

export const mockCommunitiesService: CommunitiesService = {
  async getSubjectForums(): Promise<Result<SubjectForum[]>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { data: [...subjectForums], error: null };
  },

  async getPosts(subjectId: string, sort: "new" | "top" | "hot" = "new", search?: string): Promise<Result<Post[]>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    let filtered = posts.filter((p) => p.subjectId === subjectId);

    if (search && search.trim()) {
      const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
      filtered = filtered.filter((post) => {
        const titleLower = post.title.toLowerCase();
        return terms.every((term) => titleLower.includes(term));
      });
    }

    if (sort === "top") {
      filtered = [...filtered].sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
    } else if (sort === "hot") {
      const calcHotScore = (p: Post) => {
        const net = (p.upvotes - p.downvotes) + (p.replyCount * 2);
        const order = net > 0 ? Math.log10(net) : net < 0 ? -Math.log10(Math.abs(net)) : 0;
        const seconds = (new Date(p.createdAt).getTime() / 1000) - 1700000000;
        return order + (seconds / 45000);
      };
      filtered = [...filtered].sort((a, b) => calcHotScore(b) - calcHotScore(a));
    } else {
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return { data: filtered, error: null };
  },

  async getPost(postId: string): Promise<Result<Post>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return { data: null, error: { code: "NOT_FOUND", message: "Post not found" } };
    }
    return { data: post, error: null };
  },

  async searchGlobal(query: string): Promise<Result<GlobalSearchResult>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return { data: { forums: [], posts: [] }, error: null };
    }

    const terms = trimmed.split(/\s+/).filter(Boolean);

    // Search subject forums by name, code, or description
    const matchingForums = subjectForums.filter((f) => {
      const target = `${f.name} ${f.code} ${f.description || ""}`.toLowerCase();
      return terms.every((term) => target.includes(term));
    });

    // Forum lookup map for attaching forumName
    const forumMap = new Map(subjectForums.map((f) => [f.id, f.name]));

    // Search posts across all forums
    const matchingPosts = posts
      .filter((p) => {
        const target = `${p.title} ${p.body || ""}`.toLowerCase();
        return terms.every((term) => target.includes(term));
      })
      .map((p) => ({
        ...p,
        forumName: forumMap.get(p.subjectId) || "Community",
      }));

    return {
      data: {
        forums: matchingForums,
        posts: matchingPosts,
      },
      error: null,
    };
  },

  async createPost(data): Promise<Result<Post>> {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const trimmedTitle = (data.title || "").trim();
    if (!trimmedTitle) {
      return {
        data: null,
        error: { code: "VALIDATION", message: "Post title is required." },
      };
    }
    if (trimmedTitle.length > 300) {
      return {
        data: null,
        error: { code: "VALIDATION", message: "Post title cannot exceed 300 characters." },
      };
    }

    if (data.body && data.body.length > 2000) {
      return {
        data: null,
        error: { code: "VALIDATION", message: "Post body cannot exceed 2000 characters." },
      };
    }

    const images = data.images && data.images.length > 0
      ? data.images
      : data.imageUrl
      ? [data.imageUrl]
      : [];

    if (images.length > 5) {
      return {
        data: null,
        error: { code: "VALIDATION", message: "Maximum of 5 images allowed per post." },
      };
    }

    const newPost: Post = {
      id: `p-${Date.now()}`,
      subjectId: data.subjectId,
      authorId: "mock-student",
      authorName: "Alex Chen",
      authorHandle: "Hashpotato",
      authorAvatarUrl: null,
      title: trimmedTitle,
      body: data.body ? data.body.trim() : "",
      imageUrl: images[0] || null,
      images: images,
      upvotes: 1,
      downvotes: 0,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      currentUserVote: 1,
    };
    posts = [newPost, ...posts];
    return { data: newPost, error: null };
  },

  async votePost(postId: string, voteValue: 1 | -1 | null): Promise<Result<{ upvotes: number; downvotes: number; currentUserVote: 1 | -1 | null }>> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) {
      return {
        data: null,
        error: { code: "NOT_FOUND", message: "Post not found" },
      };
    }

    const post = posts[postIndex];
    const prevVote = post.currentUserVote;

    let upvotes = post.upvotes;
    let downvotes = post.downvotes;

    // Remove previous vote if existed
    if (prevVote === 1) upvotes = Math.max(0, upvotes - 1);
    if (prevVote === -1) downvotes = Math.max(0, downvotes - 1);

    // Apply new vote
    if (voteValue === 1) upvotes += 1;
    if (voteValue === -1) downvotes += 1;

    posts[postIndex] = {
      ...post,
      upvotes,
      downvotes,
      currentUserVote: voteValue,
    };

    return {
      data: { upvotes, downvotes, currentUserVote: voteValue },
      error: null,
    };
  },

  async getComments(postId: string): Promise<Result<Comment[]>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const postComments = comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { data: postComments, error: null };
  },

  async createComment(
    postId: string,
    body: string,
    parentId?: string | null,
    images?: string[]
  ): Promise<Result<Comment>> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 1. Validation: Body length between 1 and 2000 chars
    const trimmedBody = (body || "").trim();
    if (!trimmedBody || trimmedBody.length > 2000) {
      return {
        data: null,
        error: {
          code: "VALIDATION",
          message: "Comment body must be between 1 and 2,000 characters.",
        },
      };
    }

    // 2. Validation: Max 2 images per comment
    if (images && images.length > 2) {
      return {
        data: null,
        error: {
          code: "VALIDATION",
          message: "A comment reply can attach at most 2 images.",
        },
      };
    }

    let calculatedDepth = 0;

    // 3. Parent validations and depth ceiling
    if (parentId) {
      const parent = comments.find((c) => c.id === parentId);
      if (!parent) {
        return {
          data: null,
          error: { code: "NOT_FOUND", message: "Parent comment not found." },
        };
      }

      // Cross-post hijacking prevention
      if (parent.postId !== postId) {
        return {
          data: null,
          error: {
            code: "VALIDATION",
            message: "Cannot reply to a comment belonging to another post.",
          },
        };
      }

      // 12-level ceiling check: 0-indexed depths 0..11 = 12 levels.
      // Replying to depth 11 would yield depth 12 (13th level), which is strictly forbidden.
      const parentDepth = parent.depth ?? 0;
      if (parentDepth >= 11) {
        return {
          data: null,
          error: {
            code: "VALIDATION",
            message: "Maximum comment nesting depth (12 levels) reached.",
          },
        };
      }

      calculatedDepth = parentDepth + 1;
    }

    const newComment: Comment = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      parentId: parentId || null,
      depth: calculatedDepth,
      authorId: "mock-student",
      authorName: "Alex Chen",
      authorHandle: "Hashpotato",
      authorAvatarUrl: null,
      body: trimmedBody,
      images: images || [],
      upvotes: 1,
      downvotes: 0,
      currentUserVote: 1,
      createdAt: new Date().toISOString(),
    };
    comments = [...comments, newComment];

    // Increment reply count on post
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex !== -1) {
      posts[postIndex] = {
        ...posts[postIndex],
        replyCount: posts[postIndex].replyCount + 1,
      };
    }

    return { data: newComment, error: null };
  },

  async voteComment(commentId: string, voteValue: 1 | -1 | null): Promise<Result<{ upvotes: number; downvotes: number; currentUserVote: 1 | -1 | null }>> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const commentIndex = comments.findIndex((c) => c.id === commentId);
    if (commentIndex === -1) {
      return { data: null, error: { code: "NOT_FOUND", message: "Comment not found" } };
    }

    const comment = comments[commentIndex];
    const prevVote = comment.currentUserVote;
    let upvotes = comment.upvotes ?? 0;
    let downvotes = comment.downvotes ?? 0;

    if (prevVote === 1) upvotes = Math.max(0, upvotes - 1);
    if (prevVote === -1) downvotes = Math.max(0, downvotes - 1);

    if (voteValue === 1) upvotes += 1;
    if (voteValue === -1) downvotes += 1;

    comments[commentIndex] = {
      ...comment,
      upvotes,
      downvotes,
      currentUserVote: voteValue,
    };

    return {
      data: { upvotes, downvotes, currentUserVote: voteValue },
      error: null,
    };
  },

  async getResources(subjectId: string, type: ResourceType): Promise<Result<ResourceNote[]>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const filtered = resources
      .filter((r) => r.subjectId === subjectId && r.type === type && (r.status === "approved" || r.isShared === true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { data: filtered, error: null };
  },

  async getPendingResources(subjectId?: string): Promise<Result<ResourceNote[]>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let pending = resources.filter((r) => r.status === "pending" || r.isShared === false);
    if (subjectId) {
      pending = pending.filter((r) => r.subjectId === subjectId);
    }
    pending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { data: [...pending], error: null };
  },

  async approveResource(resourceId: string, category?: ResourceCategory): Promise<Result<ResourceNote>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const idx = resources.findIndex((r) => r.id === resourceId);
    if (idx === -1) {
      return {
        data: null,
        error: { code: "NOT_FOUND", message: "Resource not found in moderation queue." },
      };
    }
    const updated: ResourceNote = {
      ...resources[idx],
      status: "approved",
      isShared: true,
      category: category || resources[idx].category || "Other",
      storagePath: `community/${resources[idx].subjectId}/${resources[idx].title}`,
    };
    resources[idx] = updated;
    return { data: updated, error: null };
  },

  async rejectResource(resourceId: string): Promise<Result<boolean>> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const idx = resources.findIndex((r) => r.id === resourceId);
    if (idx === -1) {
      return {
        data: null,
        error: { code: "NOT_FOUND", message: "Resource not found in moderation queue." },
      };
    }
    resources = resources.filter((r) => r.id !== resourceId);
    return { data: true, error: null };
  },

  async uploadResource(data): Promise<Result<ResourceNote>> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const newResource: ResourceNote = {
      id: `r-${Date.now()}`,
      subjectId: data.subjectId,
      userId: "mock-student-uuid",
      title: data.title,
      type: data.type,
      category: data.category || "Other",
      uploaderName: "Alex Chen",
      uploaderHandle: "Hashpotato",
      pageCount: data.pageCount || (Math.floor(Math.random() * 20) + 2),
      fileSizeBytes: data.file?.size || 1500000,
      storagePath: `staging/${data.subjectId}/${data.title}`,
      createdAt: new Date().toISOString(),
      status: "pending",
      isShared: false,
    };
    resources = [newResource, ...resources];
    return { data: newResource, error: null };
  },

  async deleteResource(resourceId: string): Promise<Result<boolean>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    resources = resources.filter((r) => r.id !== resourceId);
    return { data: true, error: null };
  },

  async deletePost(postId: string): Promise<Result<boolean>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    posts = posts.filter((p) => p.id !== postId);
    return { data: true, error: null };
  },

  async deleteComment(commentId: string): Promise<Result<boolean>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const toDelete = new Set<string>([commentId]);
    let added = true;
    while (added) {
      added = false;
      for (const c of comments) {
        if (c.parentId && toDelete.has(c.parentId) && !toDelete.has(c.id)) {
          toDelete.add(c.id);
          added = true;
        }
      }
    }
    comments = comments.filter((c) => !toDelete.has(c.id));
    return { data: true, error: null };
  },

  async getCommunityModerators(subjectId: string): Promise<Result<CommunityModerator[]>> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const matched = communityModerators.filter((m) => m.subjectId === subjectId);
    return { data: matched, error: null };
  },

  async assignModerator(subjectId: string, userId: string): Promise<Result<void>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const existing = communityModerators.find(
      (m) => m.subjectId === subjectId && m.userId === userId
    );
    if (!existing) {
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

      communityModerators.push({
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
    communityModerators = communityModerators.filter(
      (m) => !(m.subjectId === subjectId && m.userId === userId)
    );
    return { data: undefined, error: null };
  },

  async searchProfilesForAdmin(query: string): Promise<Result<ProfileSearchResult[]>> {
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

  async getReports(subjectId?: string): Promise<Result<Report[]>> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    let result = [...mockReports];
    if (subjectId) {
      result = result.filter((r) => r.subjectId === subjectId);
    }

    const enriched: Report[] = result.map((r) => {
      let targetContent: Report["targetContent"] = undefined;
      if (r.targetType === "post") {
        const p = posts.find((item) => item.id === r.targetId);
        if (p) {
          targetContent = {
            title: p.title,
            body: p.body,
            authorHandle: p.authorHandle,
            authorName: p.authorName,
            authorAvatarUrl: p.authorAvatarUrl,
            postId: p.id,
            subjectId: p.subjectId,
            exists: true,
          };
        } else {
          targetContent = { exists: false };
        }
      } else if (r.targetType === "comment") {
        const c = comments.find((item) => item.id === r.targetId);
        if (c) {
          const parentPost = posts.find((item) => item.id === c.postId);
          targetContent = {
            title: parentPost?.title,
            body: c.body,
            authorHandle: c.authorHandle,
            authorName: c.authorName,
            authorAvatarUrl: c.authorAvatarUrl,
            postId: c.postId,
            subjectId: c.subjectId || parentPost?.subjectId,
            exists: true,
          };
        } else {
          targetContent = { exists: false };
        }
      } else if (r.targetType === "note") {
        const n = resources.find((item) => item.id === r.targetId);
        if (n) {
          targetContent = {
            title: n.title,
            authorHandle: n.uploaderHandle,
            authorName: n.uploaderName,
            subjectId: n.subjectId,
            exists: true,
          };
        } else {
          targetContent = { exists: false };
        }
      }
      return {
        ...r,
        targetContent,
      };
    });

    return { data: enriched, error: null };
  },

  async createReport(data: {
    subjectId: string;
    targetType: "post" | "comment" | "note" | "user";
    targetId: string;
    reason: string;
  }): Promise<Result<Report>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const newReport: Report = {
      id: `rep-${Date.now()}`,
      subjectId: data.subjectId,
      reporterId: "mock-student-uuid",
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reporterName: "Alex Chen",
      reporterHandle: "alex_chen",
    };
    mockReports.unshift(newReport);
    return { data: newReport, error: null };
  },

  async resolveReport(reportId: string, status: "resolved" | "dismissed"): Promise<Result<boolean>> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const idx = mockReports.findIndex((r) => r.id === reportId);
    if (idx !== -1) {
      mockReports[idx] = {
        ...mockReports[idx],
        status,
        resolvedBy: "mock-admin-uuid",
        updatedAt: new Date().toISOString(),
      };
    }
    return { data: true, error: null };
  },

  async getStorageUsage(): Promise<
    Result<{
      userUsed: number;
      userMax: number;
      globalUsed: number;
      globalMax: number;
    }>
  > {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return {
      data: {
        userUsed: 12500000, // ~11.9 MB
        userMax: 52428800, // 50 MB
        globalUsed: 142000000, // ~135 MB
        globalMax: 524288000, // 500 MB
      },
      error: null,
    };
  },
};
