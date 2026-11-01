-- =============================================================================
-- Migration: 20261031000008_permissions_and_grants.sql
-- Description: Least-privilege per-table permissions, routine execution controls, and service_role grants
-- =============================================================================

-- 1. Schema Usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Revoke default PUBLIC execution on all SECURITY DEFINER routines
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_moderator_of(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_for(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.assign_moderator(TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_moderator(TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_profiles_for_admin(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vote_post(UUID, SMALLINT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vote_comment(UUID, SMALLINT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_subject_notes_quota(UUID, BIGINT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_storage_usage() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_community_images_quota(UUID, BIGINT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_handle_available(TEXT) FROM PUBLIC;

-- 3. Grant routine execution specifically
GRANT EXECUTE ON FUNCTION public.check_handle_available(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_moderator_of(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff_for(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_moderator(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_moderator(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_profiles_for_admin(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vote_post(UUID, SMALLINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vote_comment(UUID, SMALLINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_subject_notes_quota(UUID, BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_storage_usage() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_community_images_quota(UUID, BIGINT) TO authenticated, service_role;

-- 4. Unauthenticated (anon) Table Permissions (strictly minimal)
GRANT SELECT ON public.allowed_email_domains TO anon;

-- 5. Authenticated User Table Permissions (least privilege)
-- Profiles
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (handle, full_name, avatar_url) ON public.profiles TO authenticated;

-- Allowed Domains
GRANT SELECT ON public.allowed_email_domains TO authenticated;

-- Subjects & Enrollments
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_subjects TO authenticated;

-- Community Moderators (Read-only for clients; mutations via admin RPCs)
GRANT SELECT ON public.community_moderators TO authenticated;

-- Moderation Log (Audit trail, read-only for authorized staff)
GRANT SELECT ON public.moderation_log TO authenticated;

-- Reports (Queue for student reports & staff resolution)
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;

-- Forum Posts & Comments
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;

-- Votes (Mutations go through vote_post / vote_comment RPCs)
GRANT SELECT ON public.post_votes TO authenticated;
GRANT SELECT ON public.comment_votes TO authenticated;

-- Academic Notes / Resources
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;

-- Daily Quiz
GRANT SELECT ON public.daily_quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_streaks TO authenticated;
GRANT SELECT, INSERT ON public.daily_quiz_submissions TO authenticated;

-- Tool Runs (Audit)
GRANT SELECT, INSERT ON public.tool_runs TO authenticated;

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Service Role (Backend & Administrative processes)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

