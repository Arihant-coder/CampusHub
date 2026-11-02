/**
 * @file realService.ts
 * @description Direct Supabase client implementation of CommunitiesService with Storage CDN uploads,
 *              atomic comment voting, query sanitization, and safe database-first deletions.
 * @owner Communities Team
 */

import { supabase } from "@/lib/supabase";
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
  ModerationLogEntry,
} from "./types";
import type { UserRole } from "@/shared/user";
import { uploadCommunityImage } from "../utils/storageUpload";

/**
 * Escapes PostgREST filter injection characters
 */
function sanitizeSearchQuery(query: string): string {
  return query.trim().replace(/[%_(),]/g, "");
}

export const realCommunitiesService: CommunitiesService = {
  async getSubjectForums(): Promise<Result<SubjectForum[]>> {
    try {
      const { data: subjects, error } = await supabase
        .from("subjects")
        .select("id, name, code, created_at")
        .order("name", { ascending: true });

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      // Query enrollment counts for dynamic community sizing
      const forums: SubjectForum[] = await Promise.all(
        (subjects || []).map(async (s) => {
          const { count } = await supabase
            .from("user_subjects")
            .select("*", { count: "exact", head: true })
            .eq("subject_id", s.id);

          return {
            id: s.id,
            name: s.name,
            code: s.code,
            memberCount: Math.max(1, count ?? 0),
            isPinned: false,
          };
        })
      );

      return { data: forums, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async getPosts(
    subjectId: string,
    sort: "new" | "top" | "hot" = "new",
    search?: string
  ): Promise<Result<Post[]>> {
    try {
      let query = supabase
        .from("posts")
        .select("*, profiles!posts_author_id_fkey(handle, full_name, avatar_url, role)")
        .eq("subject_id", subjectId);

      if (search && search.trim()) {
        const clean = sanitizeSearchQuery(search);
        if (clean) {
          query = query.ilike("title", `%${clean}%`);
        }
      }

      if (sort === "top") {
        query = query.order("upvotes", { ascending: false });
      } else if (sort === "hot") {
        query = query.order("hot_score", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      // Query subject moderators for dynamic authorRole assignment
      const { data: modRows } = await supabase
        .from("community_moderators")
        .select("user_id")
        .eq("subject_id", subjectId);
      const modIds = new Set((modRows || []).map((m: any) => m.user_id));

      const user = (await supabase.auth.getUser()).data.user;

      let userVotes: Record<string, 1 | -1> = {};
      if (user && data && data.length > 0) {
        const postIds = data.map((p) => p.id);
        const { data: votes } = await supabase
          .from("post_votes")
          .select("post_id, vote")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        if (votes) {
          votes.forEach((v) => {
            userVotes[v.post_id] = v.vote as 1 | -1;
          });
        }
      }

      const posts: Post[] = (data || []).map((row: any) => ({
        id: row.id,
        subjectId: row.subject_id,
        authorId: row.author_id,
        authorName: row.profiles?.full_name || "Student",
        authorHandle: row.profiles?.handle || "Anonymous",
        authorAvatarUrl: row.profiles?.avatar_url || null,
        authorRole: row.profiles?.role === "admin"
          ? "admin"
          : modIds.has(row.author_id)
          ? "moderator"
          : "student",
        title: row.title,
        body: row.body,
        images: row.images || [],
        imageUrl: row.images?.[0] || null,
        upvotes: row.upvotes ?? 0,
        downvotes: row.downvotes ?? 0,
        replyCount: row.reply_count ?? 0,
        hotScore: row.hot_score,
        createdAt: row.created_at,
        currentUserVote: userVotes[row.id] ?? null,
      }));

      return { data: posts, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async getPost(postId: string): Promise<Result<Post>> {
    try {
      const { data: row, error } = await supabase
        .from("posts")
        .select("*, profiles!posts_author_id_fkey(handle, full_name, avatar_url, role)")
        .eq("id", postId)
        .single();

      if (error || !row) {
        return {
          data: null,
          error: { code: "NOT_FOUND", message: error?.message || "Post not found" },
        };
      }

      // Check author role dynamically
      let authorRole: "admin" | "moderator" | "student" = "student";
      if (row.profiles?.role === "admin") {
        authorRole = "admin";
      } else {
        const { data: modCheck } = await supabase
          .from("community_moderators")
          .select("user_id")
          .eq("subject_id", row.subject_id)
          .eq("user_id", row.author_id)
          .maybeSingle();
        if (modCheck) {
          authorRole = "moderator";
        }
      }

      const user = (await supabase.auth.getUser()).data.user;
      let currentUserVote: 1 | -1 | null = null;
      if (user) {
        const { data: voteData } = await supabase
          .from("post_votes")
          .select("vote")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (voteData) {
          currentUserVote = voteData.vote as 1 | -1;
        }
      }

      const post: Post = {
        id: row.id,
        subjectId: row.subject_id,
        authorId: row.author_id,
        authorName: row.profiles?.full_name || "Student",
        authorHandle: row.profiles?.handle || "Anonymous",
        authorAvatarUrl: row.profiles?.avatar_url || null,
        authorRole,
        title: row.title,
        body: row.body || "",
        images: row.images || [],
        imageUrl: row.images?.[0] || null,
        upvotes: row.upvotes ?? 0,
        downvotes: row.downvotes ?? 0,
        replyCount: row.reply_count ?? 0,
        hotScore: row.hot_score,
        createdAt: row.created_at,
        currentUserVote,
      };

      return { data: post, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async searchGlobal(query: string): Promise<Result<GlobalSearchResult>> {
    try {
      const clean = sanitizeSearchQuery(query);
      if (!clean) {
        return { data: { forums: [], posts: [] }, error: null };
      }

      // 1. Fetch matching subjects
      const { data: subjectRows } = await supabase
        .from("subjects")
        .select("id, name, code, created_at")
        .or(`name.ilike.%${clean}%,code.ilike.%${clean}%`)
        .order("name", { ascending: true })
        .limit(6);

      const forums: SubjectForum[] = (subjectRows || []).map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        memberCount: 1,
        isPinned: false,
        description: "",
      }));

      // 2. Fetch matching posts
      const { data: postRows } = await supabase
        .from("posts")
        .select("*, profiles!posts_author_id_fkey(handle, full_name, avatar_url, role), subjects(name)")
        .ilike("title", `%${clean}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      // Check community_moderators for the matched posts' author + subject pairs
      let moderatorPairSet = new Set<string>();
      if (postRows && postRows.length > 0) {
        const authorIds = Array.from(new Set(postRows.map((r: any) => r.author_id)));
        const subjectIds = Array.from(new Set(postRows.map((r: any) => r.subject_id)));
        const { data: modRows } = await supabase
          .from("community_moderators")
          .select("user_id, subject_id")
          .in("user_id", authorIds)
          .in("subject_id", subjectIds);

        if (modRows) {
          moderatorPairSet = new Set(modRows.map((m: any) => `${m.user_id}:${m.subject_id}`));
        }
      }

      const posts: (Post & { forumName?: string })[] = (postRows || []).map((row: any) => {
        const isMod = moderatorPairSet.has(`${row.author_id}:${row.subject_id}`);
        return {
          id: row.id,
          subjectId: row.subject_id,
          forumName: row.subjects?.name || "Community",
          authorId: row.author_id,
          authorName: row.profiles?.full_name || "Student",
          authorHandle: row.profiles?.handle || "Anonymous",
          authorAvatarUrl: row.profiles?.avatar_url || null,
          authorRole: row.profiles?.role === "admin" ? "admin" : isMod ? "moderator" : "student",
          title: row.title,
          body: row.body || "",
          images: row.images || [],
          imageUrl: row.images?.[0] || null,
          upvotes: row.upvotes ?? 0,
          downvotes: row.downvotes ?? 0,
          replyCount: row.reply_count ?? 0,
          hotScore: row.hot_score,
          createdAt: row.created_at,
          currentUserVote: null,
        };
      });

      return {
        data: { forums, posts },
        error: null,
      };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async createPost(data): Promise<Result<Post>> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        return {
          data: null,
          error: { code: "UNAUTHENTICATED", message: "User is not authenticated" },
        };
      }

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

      const rawImages = data.images && data.images.length > 0
        ? data.images
        : data.imageUrl
        ? [data.imageUrl]
        : [];

      if (rawImages.length > 5) {
        return {
          data: null,
          error: { code: "VALIDATION", message: "Maximum of 5 images allowed per post." },
        };
      }

      // Convert any base64 data URLs to permanent Supabase Storage CDN URLs
      const uploadedImageUrls: string[] = [];
      for (const img of rawImages) {
        if (img.startsWith("data:") || img.startsWith("blob:")) {
          const publicUrl = await uploadCommunityImage(img, user.id, data.subjectId);
          uploadedImageUrls.push(publicUrl);
        } else {
          uploadedImageUrls.push(img);
        }
      }

      const { data: inserted, error } = await supabase
        .from("posts")
        .insert({
          subject_id: data.subjectId,
          author_id: user.id,
          title: trimmedTitle,
          body: data.body ? data.body.trim() : "",
          images: uploadedImageUrls,
        })
        .select("*, profiles!posts_author_id_fkey(handle, full_name, avatar_url)")
        .single();

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      const post: Post = {
        id: inserted.id,
        subjectId: inserted.subject_id,
        authorId: inserted.author_id,
        authorName: inserted.profiles?.full_name || "Student",
        authorHandle: inserted.profiles?.handle || "Anonymous",
        authorAvatarUrl: inserted.profiles?.avatar_url || null,
        title: inserted.title,
        body: inserted.body,
        images: uploadedImageUrls,
        imageUrl: uploadedImageUrls[0] || null,
        upvotes: 0,
        downvotes: 0,
        replyCount: 0,
        createdAt: inserted.created_at,
        currentUserVote: null,
      };

      return { data: post, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async votePost(
    postId: string,
    voteValue: 1 | -1 | null
  ): Promise<Result<{ upvotes: number; downvotes: number; currentUserVote: 1 | -1 | null }>> {
    try {
      const { error } = await supabase.rpc("vote_post", {
        p_post_id: postId,
        p_vote_value: voteValue,
      });

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      // Refetch post vote counters
      const { data: postData } = await supabase
        .from("posts")
        .select("upvotes, downvotes")
        .eq("id", postId)
        .single();

      return {
        data: {
          upvotes: postData?.upvotes ?? 0,
          downvotes: postData?.downvotes ?? 0,
          currentUserVote: voteValue,
        },
        error: null,
      };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async deletePost(postId: string, imagePaths?: string[]): Promise<Result<boolean>> {
    try {
      // 1. Delete database row first
      const { error: dbError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (dbError) {
        return { data: null, error: { code: "INTERNAL", message: dbError.message } };
      }

      // 2. Remove associated images from storage if paths provided
      if (imagePaths && imagePaths.length > 0) {
        const cleanPaths = imagePaths
          .map((url) => {
            const parts = url.split("/communities-images/");
            return parts[1] || "";
          })
          .filter(Boolean);

        if (cleanPaths.length > 0) {
          await supabase.storage.from("communities-images").remove(cleanPaths);
        }
      }

      return { data: true, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async getComments(postId: string): Promise<Result<Comment[]>> {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles!comments_author_id_fkey(handle, full_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      // Fetch user's comment votes
      const user = (await supabase.auth.getUser()).data.user;
      let userVotes: Record<string, 1 | -1> = {};
      if (user && data && data.length > 0) {
        const commentIds = data.map((c) => c.id);
        const { data: votes } = await supabase
          .from("comment_votes")
          .select("comment_id, vote")
          .eq("user_id", user.id)
          .in("comment_id", commentIds);

        if (votes) {
          votes.forEach((v) => {
            userVotes[v.comment_id] = v.vote as 1 | -1;
          });
        }
      }

      const comments: Comment[] = (data || []).map((row: any) => ({
        id: row.id,
        postId: row.post_id,
        parentId: row.parent_id || null,
        depth: row.depth ?? 0,
        authorId: row.author_id,
        authorName: row.profiles?.full_name || "Student",
        authorHandle: row.profiles?.handle || "Anonymous",
        authorAvatarUrl: row.profiles?.avatar_url || null,
        body: row.body,
        images: row.image_urls || [],
        upvotes: row.upvotes ?? 0,
        downvotes: row.downvotes ?? 0,
        currentUserVote: userVotes[row.id] ?? null,
        createdAt: row.created_at,
      }));

      return { data: comments, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async createComment(
    postId: string,
    body: string,
    parentId?: string | null,
    images?: string[]
  ): Promise<Result<Comment>> {
    try {
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

      if (images && images.length > 2) {
        return {
          data: null,
          error: {
            code: "VALIDATION",
            message: "A comment reply can attach at most 2 images.",
          },
        };
      }

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        return {
          data: null,
          error: { code: "UNAUTHENTICATED", message: "User is not authenticated" },
        };
      }

      // Look up post subject_id for storage folder routing: {subjectId}/{userId}/{uuid}.webp
      const { data: postRecord } = await supabase
        .from("posts")
        .select("subject_id")
        .eq("id", postId)
        .maybeSingle();
      const subjectId = postRecord?.subject_id || "general";

      // Convert any base64 data URLs to Supabase Storage CDN URLs
      const uploadedImageUrls: string[] = [];
      if (images && images.length > 0) {
        for (const img of images) {
          if (img.startsWith("data:") || img.startsWith("blob:")) {
            const publicUrl = await uploadCommunityImage(img, user.id, subjectId);
            uploadedImageUrls.push(publicUrl);
          } else {
            uploadedImageUrls.push(img);
          }
        }
      }

      const insertPayload: Record<string, any> = {
        post_id: postId,
        author_id: user.id,
        body: trimmedBody,
      };
      if (parentId) {
        insertPayload.parent_id = parentId;
      }
      if (uploadedImageUrls.length > 0) {
        insertPayload.image_urls = uploadedImageUrls;
      }

      const { data: inserted, error } = await supabase
        .from("comments")
        .insert(insertPayload)
        .select("*, profiles!comments_author_id_fkey(handle, full_name, avatar_url)")
        .single();

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      const comment: Comment = {
        id: inserted.id,
        postId: inserted.post_id,
        parentId: inserted.parent_id || null,
        depth: inserted.depth ?? 0,
        authorId: inserted.author_id,
        authorName: inserted.profiles?.full_name || "Student",
        authorHandle: inserted.profiles?.handle || "Anonymous",
        authorAvatarUrl: inserted.profiles?.avatar_url || null,
        body: inserted.body,
        images: uploadedImageUrls,
        upvotes: 0,
        downvotes: 0,
        createdAt: inserted.created_at,
        currentUserVote: null,
      };

      return { data: comment, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async voteComment(
    commentId: string,
    voteValue: 1 | -1 | null
  ): Promise<Result<{ upvotes: number; downvotes: number; currentUserVote: 1 | -1 | null }>> {
    try {
      const { error } = await supabase.rpc("vote_comment", {
        p_comment_id: commentId,
        p_vote_value: voteValue,
      });

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      const { data: commentData } = await supabase
        .from("comments")
        .select("upvotes, downvotes")
        .eq("id", commentId)
        .single();

      return {
        data: {
          upvotes: commentData?.upvotes ?? 0,
          downvotes: commentData?.downvotes ?? 0,
          currentUserVote: voteValue,
        },
        error: null,
      };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async deleteComment(commentId: string, imagePaths?: string[]): Promise<Result<boolean>> {
    try {
      // 1. Delete database row first
      const { error: dbError } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (dbError) {
        return { data: null, error: { code: "INTERNAL", message: dbError.message } };
      }

      // 2. Remove images from storage
      if (imagePaths && imagePaths.length > 0) {
        const cleanPaths = imagePaths
          .map((url) => {
            const parts = url.split("/communities-images/");
            return parts[1] || "";
          })
          .filter(Boolean);

        if (cleanPaths.length > 0) {
          await supabase.storage.from("communities-images").remove(cleanPaths);
        }
      }

      return { data: true, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async getResources(subjectId: string, type: ResourceType): Promise<Result<ResourceNote[]>> {
    try {
      let query = supabase
        .from("notes")
        .select("*, profiles!notes_user_id_fkey(handle, full_name)")
        .eq("subject_id", subjectId)
        .eq("is_shared", true)
        .eq("status", "approved");

      if (type === "PYQ") {
        query = query.eq("tag", "PYQ");
      } else {
        query = query.neq("tag", "PYQ");
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      const notes: ResourceNote[] = (data || []).map((row: any) => ({
        id: row.id,
        subjectId: row.subject_id,
        userId: row.user_id,
        title: row.title,
        type: row.tag === "PYQ" ? "PYQ" : "Note",
        category: (row.description && ["Day wise", "Unit wise", "Other"].includes(row.description))
          ? (row.description as any)
          : "Other",
        uploaderName: row.profiles?.full_name || "Community Contributor",
        uploaderHandle: row.profiles?.handle || "Anonymous",
        pageCount: row.page_count ?? 1,
        fileSizeBytes: row.file_size_bytes ?? 0,
        storagePath: row.storage_path,
        createdAt: row.created_at,
      }));

      return { data: notes, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async uploadResource(data): Promise<Result<ResourceNote>> {
    let uploadedStoragePath: string | null = null;
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        return {
          data: null,
          error: { code: "UNAUTHENTICATED", message: "User is not authenticated" },
        };
      }

      if (!data.file) {
        return {
          data: null,
          error: { code: "VALIDATION", message: "Document PDF file is required." },
        };
      }

      // Safe clean filename without special characters
      const cleanFileName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${Date.now()}_${cleanFileName}`;
      uploadedStoragePath = storagePath;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("subject-notes")
        .upload(storagePath, data.file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        return {
          data: null,
          error: { code: "INTERNAL", message: `Storage upload failed: ${uploadError.message}` },
        };
      }

      // 2. Insert record into public.notes (queued as pending for moderation)
      const { data: inserted, error: insertError } = await supabase
        .from("notes")
        .insert({
          subject_id: data.subjectId,
          user_id: user.id,
          title: data.title.trim(),
          description: data.category || "Other",
          storage_path: storagePath,
          tag: data.type === "PYQ" ? "PYQ" : "Lecture",
          is_shared: false,
          status: "pending",
          file_size_bytes: data.file.size,
          page_count: data.pageCount || 1,
        })
        .select("*, profiles!notes_user_id_fkey(handle, full_name)")
        .single();

      if (insertError) {
        // Clean up orphaned storage object if database insert fails
        await supabase.storage.from("subject-notes").remove([storagePath]);
        return {
          data: null,
          error: { code: "INTERNAL", message: `Database insert failed: ${insertError.message}` },
        };
      }

      const note: ResourceNote = {
        id: inserted.id,
        subjectId: inserted.subject_id,
        title: inserted.title,
        type: inserted.tag === "PYQ" ? "PYQ" : "Note",
        category: data.category || "Other",
        uploaderName: inserted.profiles?.full_name || "Community Contributor",
        uploaderHandle: inserted.profiles?.handle || "Anonymous",
        pageCount: inserted.page_count ?? 1,
        storagePath: inserted.storage_path,
        createdAt: inserted.created_at,
      };

      return { data: note, error: null };
    } catch (err: unknown) {
      if (uploadedStoragePath) {
        await supabase.storage.from("subject-notes").remove([uploadedStoragePath]).catch(() => {});
      }
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async deleteResource(resourceId: string, storagePath?: string): Promise<Result<boolean>> {
    try {
      let resolvedPath = storagePath;
      if (!resolvedPath) {
        const { data: note } = await supabase
          .from("notes")
          .select("storage_path")
          .eq("id", resourceId)
          .maybeSingle();
        if (note?.storage_path) {
          resolvedPath = note.storage_path;
        }
      }

      // 1. Delete file from Supabase Storage API FIRST (while notes row still exists for RLS staff check)
      if (resolvedPath) {
        const { error: storageError } = await supabase.storage
          .from("subject-notes")
          .remove([resolvedPath]);

        if (storageError) {
          console.warn("Storage removal warning:", storageError.message);
        }
      }

      // 2. Delete database record
      const { error: dbError } = await supabase
        .from("notes")
        .delete()
        .eq("id", resourceId);

      if (dbError) {
        return {
          data: null,
          error: { code: "INTERNAL", message: dbError.message },
        };
      }

      return { data: true, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async getPendingResources(subjectId?: string): Promise<Result<ResourceNote[]>> {
    try {
      let query = supabase
        .from("notes")
        .select("*, profiles!notes_user_id_fkey(handle, full_name)")
        .eq("status", "pending");

      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      const notes: ResourceNote[] = (data || []).map((row: any) => ({
        id: row.id,
        subjectId: row.subject_id,
        userId: row.user_id,
        title: row.title,
        type: row.tag === "PYQ" ? "PYQ" : "Note",
        category: (row.description && ["Day wise", "Unit wise", "Other"].includes(row.description))
          ? (row.description as any)
          : "Other",
        uploaderName: row.profiles?.full_name || "Community Contributor",
        uploaderHandle: row.profiles?.handle || "Anonymous",
        pageCount: row.page_count ?? 1,
        fileSizeBytes: row.file_size_bytes ?? 0,
        storagePath: row.storage_path,
        createdAt: row.created_at,
        status: row.status,
        isShared: row.is_shared,
      }));

      return { data: notes, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async approveResource(resourceId: string, category?: ResourceCategory): Promise<Result<ResourceNote>> {
    try {
      const { data, error } = await supabase.rpc("approve_note", {
        p_note_id: resourceId,
        p_category: category || "Other",
      });

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      const approved: ResourceNote = {
        id: data.id,
        subjectId: data.subject_id,
        title: data.title,
        type: data.tag === "PYQ" ? "PYQ" : "Note",
        category: (data.description as any) || "Other",
        uploaderName: "Community Contributor",
        uploaderHandle: "Community Contributor",
        pageCount: data.page_count ?? 1,
        fileSizeBytes: data.file_size_bytes ?? 0,
        storagePath: data.storage_path,
        createdAt: data.created_at,
        status: "approved",
        isShared: true,
      };

      return { data: approved, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async rejectResource(resourceId: string, storagePath?: string, reason?: string): Promise<Result<boolean>> {
    try {
      let resolvedPath = storagePath;
      if (!resolvedPath) {
        const { data: note } = await supabase
          .from("notes")
          .select("storage_path")
          .eq("id", resourceId)
          .maybeSingle();
        if (note?.storage_path) {
          resolvedPath = note.storage_path;
        }
      }

      // 1. Delete file from Supabase Storage API FIRST
      if (resolvedPath) {
        const { error: storageError } = await supabase.storage
          .from("subject-notes")
          .remove([resolvedPath]);

        if (storageError) {
          console.warn("Storage removal warning:", storageError.message);
        }
      }

      // 2. Reject note via RPC (which updates status to 'rejected', logs to audit trail, without touching storage)
      const { error } = await supabase.rpc("reject_note", {
        p_note_id: resourceId,
        p_reason: reason || null,
      });

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      return { data: true, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async getCommunityModerators(subjectId: string): Promise<Result<CommunityModerator[]>> {
    try {
      const { data, error } = await supabase
        .from("community_moderators")
        .select("subject_id, user_id, assigned_by, created_at, profiles!community_moderators_user_id_fkey(handle, full_name, avatar_url)")
        .eq("subject_id", subjectId);

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      const moderators: CommunityModerator[] = (data || []).map((row: any) => ({
        subjectId: row.subject_id,
        userId: row.user_id,
        assignedBy: row.assigned_by,
        createdAt: row.created_at,
        handle: row.profiles?.handle || "unknown",
        fullName: row.profiles?.full_name || null,
        avatarUrl: row.profiles?.avatar_url || null,
      }));

      return { data: moderators, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async assignModerator(subjectId: string, userId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase.rpc("assign_moderator", {
        p_subject_id: subjectId,
        p_user_id: userId,
      });

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      return { data: undefined, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async removeModerator(subjectId: string, userId: string): Promise<Result<void>> {
    try {
      const { error } = await supabase.rpc("remove_moderator", {
        p_subject_id: subjectId,
        p_user_id: userId,
      });

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      return { data: undefined, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async searchProfilesForAdmin(query: string): Promise<Result<ProfileSearchResult[]>> {
    try {
      const { data, error } = await supabase.rpc("search_profiles_for_admin", {
        p_query: query,
      });

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      const results: ProfileSearchResult[] = (data || []).map((row: any) => ({
        id: row.id,
        handle: row.handle,
        fullName: row.full_name,
      }));

      return { data: results, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async setUserRole(userId: string, role: UserRole): Promise<Result<void>> {
    try {
      const { error } = await supabase.rpc("set_user_role", {
        p_user_id: userId,
        p_role: role,
      });

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      return { data: undefined, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async getReports(subjectId?: string): Promise<Result<Report[]>> {
    try {
      let query = supabase
        .from("reports")
        .select("*, profiles!reports_reporter_id_fkey(handle, full_name)")
        .order("created_at", { ascending: false });

      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }

      const { data, error } = await query;
      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      const rows = data || [];

      // Batch fetch target content to eliminate N+1 round trips
      const postIds = Array.from(
        new Set(rows.filter((r: any) => r.target_type === "post").map((r: any) => r.target_id))
      );
      const commentIds = Array.from(
        new Set(rows.filter((r: any) => r.target_type === "comment").map((r: any) => r.target_id))
      );
      const noteIds = Array.from(
        new Set(rows.filter((r: any) => r.target_type === "note").map((r: any) => r.target_id))
      );

      const [postsRes, commentsRes, notesRes] = await Promise.all([
        postIds.length > 0
          ? supabase
              .from("posts")
              .select("id, title, body, subject_id, profiles!posts_author_id_fkey(handle, full_name, avatar_url)")
              .in("id", postIds)
          : Promise.resolve({ data: [] }),
        commentIds.length > 0
          ? supabase
              .from("comments")
              .select("id, body, post_id, subject_id, profiles!comments_author_id_fkey(handle, full_name, avatar_url), posts(title)")
              .in("id", commentIds)
          : Promise.resolve({ data: [] }),
        noteIds.length > 0
          ? supabase
              .from("notes")
              .select("id, title, subject_id, profiles!notes_user_id_fkey(handle, full_name)")
              .in("id", noteIds)
          : Promise.resolve({ data: [] }),
      ]);

      const postsMap = new Map((postsRes.data || []).map((p: any) => [p.id, p]));
      const commentsMap = new Map((commentsRes.data || []).map((c: any) => [c.id, c]));
      const notesMap = new Map((notesRes.data || []).map((n: any) => [n.id, n]));

      const reports: Report[] = rows.map((row: any) => {
        let targetContent: Report["targetContent"] = undefined;
        if (row.target_type === "post") {
          const postRow = postsMap.get(row.target_id);
          if (postRow) {
            targetContent = {
              title: postRow.title,
              body: postRow.body,
              authorHandle: postRow.profiles?.handle,
              authorName: postRow.profiles?.full_name,
              authorAvatarUrl: postRow.profiles?.avatar_url,
              postId: postRow.id,
              subjectId: postRow.subject_id,
              exists: true,
            };
          } else {
            targetContent = { exists: false };
          }
        } else if (row.target_type === "comment") {
          const commentRow = commentsMap.get(row.target_id);
          if (commentRow) {
            targetContent = {
              title: commentRow.posts?.title,
              body: commentRow.body,
              authorHandle: commentRow.profiles?.handle,
              authorName: commentRow.profiles?.full_name,
              authorAvatarUrl: commentRow.profiles?.avatar_url,
              postId: commentRow.post_id,
              subjectId: commentRow.subject_id,
              exists: true,
            };
          } else {
            targetContent = { exists: false };
          }
        } else if (row.target_type === "note") {
          const noteRow = notesMap.get(row.target_id);
          if (noteRow) {
            targetContent = {
              title: noteRow.title,
              authorHandle: noteRow.profiles?.handle,
              authorName: noteRow.profiles?.full_name,
              subjectId: noteRow.subject_id,
              exists: true,
            };
          } else {
            targetContent = { exists: false };
          }
        }

        return {
          id: row.id,
          subjectId: row.subject_id,
          reporterId: row.reporter_id,
          targetType: row.target_type,
          targetId: row.target_id,
          reason: row.reason,
          status: row.status,
          resolvedBy: row.resolved_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          reporterName: row.profiles?.full_name || "Anonymous",
          reporterHandle: row.profiles?.handle || "anonymous",
          targetContent,
        };
      });

      return { data: reports, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async getModerationLogs(subjectId?: string): Promise<Result<ModerationLogEntry[]>> {
    try {
      let query = supabase
        .from("moderation_log")
        .select("*, profiles!moderation_log_actor_fkey(handle, full_name), subjects(name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (subjectId && subjectId !== "all") {
        query = query.eq("subject_id", subjectId);
      }

      const { data, error } = await query;
      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      const logs: ModerationLogEntry[] = (data || []).map((row: any) => ({
        id: row.id,
        subjectId: row.subject_id,
        subjectName: row.subjects?.name,
        actor: row.actor,
        actorHandle: row.profiles?.handle || "staff",
        actorName: row.profiles?.full_name || "Staff Member",
        target: row.target,
        action: row.action,
        details: row.details || {},
        createdAt: row.created_at,
      }));

      return { data: logs, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async createReport(data: {
    subjectId: string;
    targetType: "post" | "comment" | "note" | "user";
    targetId: string;
    reason: string;
  }): Promise<Result<Report>> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        return { data: null, error: { code: "UNAUTHENTICATED", message: "Sign in to report" } };
      }

      const { data: row, error } = await supabase
        .from("reports")
        .insert({
          subject_id: data.subjectId,
          reporter_id: user.id,
          target_type: data.targetType,
          target_id: data.targetId,
          reason: data.reason,
          status: "pending",
        })
        .select("*, profiles!reports_reporter_id_fkey(handle, full_name)")
        .single();

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      const report: Report = {
        id: row.id,
        subjectId: row.subject_id,
        reporterId: row.reporter_id,
        targetType: row.target_type,
        targetId: row.target_id,
        reason: row.reason,
        status: row.status,
        resolvedBy: row.resolved_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reporterName: row.profiles?.full_name || "Anonymous",
        reporterHandle: row.profiles?.handle || "anonymous",
      };

      return { data: report, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async resolveReport(reportId: string, status: "resolved" | "dismissed"): Promise<Result<boolean>> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from("reports")
        .update({
          status,
          resolved_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      return { data: true, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async getDocumentUrl(storagePath: string): Promise<Result<string>> {
    try {
      const { data, error } = await supabase.storage
        .from("subject-notes")
        .createSignedUrl(storagePath, 120);

      if (error || !data?.signedUrl) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error?.message || "Failed to generate document download link." },
        };
      }

      return { data: data.signedUrl, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async getStorageUsage(): Promise<
    Result<{
      userUsed: number;
      userMax: number;
      globalUsed: number;
      globalMax: number;
    }>
  > {
    try {
      const { data, error } = await supabase.rpc("get_my_storage_usage");
      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }
      if (data && data.length > 0) {
        return {
          data: {
            userUsed: Number(data[0].user_used) || 0,
            userMax: Number(data[0].user_max) || 52428800,
            globalUsed: Number(data[0].global_used) || 0,
            globalMax: Number(data[0].global_max) || 524288000,
          },
          error: null,
        };
      }
      return {
        data: {
          userUsed: 0,
          userMax: 52428800,
          globalUsed: 0,
          globalMax: 524288000,
        },
        error: null,
      };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },
};
