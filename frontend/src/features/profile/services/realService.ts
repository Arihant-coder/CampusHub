/**
 * @file realService.ts
 * @description Supabase live database implementation of ProfileService.
 * @owner Platform Core Team
 */

import { supabase } from "@/lib/supabase";
import { subjects } from "@/shared/subjects";
import type { Post } from "@/shared/communities";
import type { ProfileService, PublicUserProfile } from "../types";

export const realProfileService: ProfileService = {
  async getProfileByHandle(handle: string) {
    const cleanHandle = handle.trim().toLowerCase().replace(/^@/, "");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url, role, created_at, is_private")
      .ilike("handle", cleanHandle)
      .maybeSingle();

    if (error || !data) {
      return { data: null, error: { code: "NOT_FOUND", message: "User not found." } };
    }

    const { data: modRows } = await supabase
      .from("community_moderators")
      .select("subject_id")
      .eq("user_id", data.id);

    const moderatedSubjects = (modRows || [])
      .map((r: { subject_id: string }) => subjects.find((s) => s.id.toLowerCase() === r.subject_id.toLowerCase()))
      .filter((s): s is (typeof subjects)[0] => Boolean(s))
      .map((s) => ({ id: s.id, name: s.name, code: s.code }));

    const publicProfile: PublicUserProfile = {
      id: data.id,
      handle: data.handle,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      role: data.role as "student" | "admin",
      createdAt: data.created_at,
      isPrivate: data.is_private ?? false,
      moderatedSubjects,
    };

    return { data: publicProfile, error: null };
  },

  async getUserPosts(authorId: string) {
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(handle, full_name, avatar_url, role)")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: { code: "INTERNAL", message: error.message } };
    }

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
      authorRole: row.profiles?.role === "admin" ? "admin" : "student",
      title: row.title,
      body: row.body,
      images: row.images || [],
      imageUrl: row.images?.[0] || null,
      upvotes: row.upvotes ?? 0,
      downvotes: row.downvotes ?? 0,
      replyCount: row.reply_count ?? 0,
      createdAt: row.created_at,
      currentUserVote: userVotes[row.id] ?? null,
    }));

    return { data: posts, error: null };
  },

  async togglePrivacy(userId: string, isPrivate: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_private: isPrivate })
      .eq("id", userId);

    if (error) {
      return { data: null, error: { code: "INTERNAL", message: error.message } };
    }

    return { data: undefined, error: null };
  },
};

