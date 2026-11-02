/**
 * @file realService.ts
 * @description Direct Supabase client implementation of AdminService using hardened RPCs.
 * @owner Platform Core Team
 */

import { supabase } from "@/lib/supabase";
import type { Result } from "@/shared/result";
import type { UserRole } from "@/shared/user";
import type {
  AdminService,
  AdminSubject,
  CommunityModerator,
  ProfileSearchResult,
} from "./types";

export const realAdminService: AdminService = {
  async getSubjects(): Promise<Result<AdminSubject[]>> {
    try {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, code")
        .order("name", { ascending: true });

      if (error) {
        return { data: null, error: { code: "INTERNAL", message: error.message } };
      }

      const subjects: AdminSubject[] = (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      }));

      return { data: subjects, error: null };
    } catch (err: unknown) {
      return { data: null, error: { code: "NETWORK", message: (err as Error).message } };
    }
  },

  async getCommunityModerators(subjectId: string): Promise<Result<CommunityModerator[]>> {
    try {
      const { data, error } = await supabase
        .from("community_moderators")
        .select(
          "subject_id, user_id, assigned_by, created_at, profiles!community_moderators_user_id_fkey(handle, full_name, avatar_url)"
        )
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

  async searchProfiles(query: string): Promise<Result<ProfileSearchResult[]>> {
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
};

