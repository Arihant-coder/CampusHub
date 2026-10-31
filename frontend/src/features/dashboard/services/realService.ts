/**
 * @file realService.ts
 * @description Direct Supabase client implementation of DashboardService.
 * @owner Dashboard Team
 */

import { supabase } from "@/lib/supabase";
import type { Result } from "@/shared/result";
import type { Subject } from "@/shared/user";
import type { Post } from "@/shared/communities";
import type { DashboardService } from "./types";

export const realDashboardService: DashboardService = {
  async getEnrolledSubjects(): Promise<Result<Subject[]>> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        // Fallback to all subjects if no user session
        return realDashboardService.getAllSubjects();
      }

      const { data, error } = await supabase
        .from("user_subjects")
        .select("subject_id, subjects(id, name, code)")
        .eq("user_id", user.id);

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      // If user hasn't enrolled in specific subjects, show default subject catalog
      if (!data || data.length === 0) {
        return realDashboardService.getAllSubjects();
      }

      const enrolled: Subject[] = data
        .map((row: any) => row.subjects)
        .filter(Boolean)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code,
        }));

      return { data: enrolled, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async getAllSubjects(): Promise<Result<Subject[]>> {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, code")
        .order("name", { ascending: true });

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      const subjects: Subject[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        code: row.code,
      }));

      return { data: subjects, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },

  async getHotDiscussions(limit = 5): Promise<Result<Post[]>> {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles!posts_author_id_fkey(handle, avatar_url)")
        .order("hot_score", { ascending: false })
        .limit(limit);

      if (error) {
        return {
          data: null,
          error: { code: "INTERNAL", message: error.message },
        };
      }

      const posts: Post[] = (data || []).map((row: any) => ({
        id: row.id,
        subjectId: row.subject_id,
        authorId: row.author_id,
        authorHandle: row.profiles?.handle || "Anonymous",
        authorAvatarUrl: row.profiles?.avatar_url || null,
        title: row.title,
        body: row.body || "",
        images: row.images || [],
        imageUrl: row.images?.[0] || null,
        upvotes: row.upvotes ?? 0,
        downvotes: row.downvotes ?? 0,
        replyCount: row.reply_count ?? 0,
        hotScore: row.hot_score,
        createdAt: row.created_at,
      }));

      return { data: posts, error: null };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message },
      };
    }
  },
};
