-- =============================================================================
-- Migration: 20261031000001_core.sql
-- Description: Core tables, identity verification, staff helper, and user provisioning
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ALLOWED EMAIL DOMAINS (Campus identity verification)
CREATE TABLE IF NOT EXISTS public.allowed_email_domains (
    domain TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed email domains are readable by all"
    ON public.allowed_email_domains FOR SELECT
    USING (true);

-- 2. PROFILES (Bound to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    handle TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. ADMIN HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 4. USER PROVISIONING TRIGGER (handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email_domain text;
  v_raw_handle text;
  v_base_handle text;
  v_handle text;
  v_suffix int := 0;
  v_max_attempts int := 100;
BEGIN
  -- 1. Verify email domain against allowed_email_domains table
  v_email_domain := LOWER(split_part(NEW.email, '@', 2));
  IF NOT EXISTS (SELECT 1 FROM public.allowed_email_domains WHERE LOWER(domain) = v_email_domain) THEN
    RAISE EXCEPTION 'Registration restricted to authorized campus email domains.'
      USING ERRCODE = 'check_violation';
  END IF;

  v_raw_handle := NEW.raw_user_meta_data->>'handle';

  -- 2. Explicit custom handle provided during registration
  IF v_raw_handle IS NOT NULL AND TRIM(v_raw_handle) <> '' THEN
    v_handle := LOWER(TRIM(v_raw_handle));
    IF v_handle LIKE '@%' THEN
      v_handle := SUBSTRING(v_handle FROM 2);
    END IF;

    -- Format validation
    IF NOT (v_handle ~ '^[a-z0-9_]{4,20}$') THEN
      RAISE EXCEPTION 'Invalid username: must be 4–20 alphanumeric characters or underscores.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Reserved keywords protection
    IF v_handle IN ('admin', 'moderator', 'system', 'campushub', 'support', 'anonymous', 'null', 'undefined', 'root', 'staff') THEN
      RAISE EXCEPTION 'Username "%" is reserved and cannot be registered.', v_handle
        USING ERRCODE = 'check_violation';
    END IF;

    -- Check availability for explicit handle
    IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(handle) = v_handle) THEN
      RAISE EXCEPTION 'Username "%" is already taken. Please choose another username.', v_handle
        USING ERRCODE = 'duplicate_object';
    END IF;

  ELSE
    -- 3. Derived handle from email local-part
    v_base_handle := LOWER(TRIM(split_part(NEW.email, '@', 1)));
    v_base_handle := REGEXP_REPLACE(v_base_handle, '[^a-z0-9_]', '_', 'g');
    
    IF LENGTH(v_base_handle) < 4 THEN
      v_base_handle := RPAD(v_base_handle, 4, '0');
    ELSIF LENGTH(v_base_handle) > 16 THEN
      v_base_handle := SUBSTRING(v_base_handle FROM 1 FOR 16);
    END IF;

    v_handle := v_base_handle;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(handle) = v_handle) LOOP
      v_suffix := v_suffix + 1;
      v_handle := v_base_handle || v_suffix::text;
      IF v_suffix > v_max_attempts THEN
        v_handle := 'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 8);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- 4. Concurrency-safe insert with retry on race
  BEGIN
    INSERT INTO public.profiles (id, handle, full_name, avatar_url, role)
    VALUES (
      NEW.id,
      v_handle,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'avatar_url',
      'student'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- Fallback to unique UUID segment on race condition
    v_handle := 'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 8);
    INSERT INTO public.profiles (id, handle, full_name, avatar_url, role)
    VALUES (
      NEW.id,
      v_handle,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'avatar_url',
      'student'
    )
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. SUBJECTS
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subjects are readable by authenticated users"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

-- 6. USER_SUBJECTS (Enrollment)
CREATE TABLE IF NOT EXISTS public.user_subjects (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, subject_id)
);

ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all enrollments"
  ON public.user_subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can enroll themselves in subjects"
  ON public.user_subjects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unenroll themselves from subjects"
  ON public.user_subjects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. TOOL_RUNS (Audit & History)
CREATE TABLE IF NOT EXISTS public.tool_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    input_params JSONB,
    output_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.tool_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tool runs"
  ON public.tool_runs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can record own tool runs"
  ON public.tool_runs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 8. COMMUNITY_MODERATORS (Per-Community Scoped Moderation)
CREATE TABLE IF NOT EXISTS public.community_moderators (
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (subject_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_moderators_user_id ON public.community_moderators (user_id);

ALTER TABLE public.community_moderators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community moderators are readable by authenticated users"
  ON public.community_moderators FOR SELECT
  TO authenticated
  USING (true);
-- Note: No INSERT, UPDATE, or DELETE policies and no write grants for clients; mutations exclusively via assign/remove RPCs.

-- 9. COMMUNITY MODERATION HELPERS
CREATE OR REPLACE FUNCTION public.is_moderator_of(p_subject_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_subject_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.community_moderators
    WHERE subject_id = p_subject_id AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_for(p_subject_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.is_admin() OR public.is_moderator_of(p_subject_id);
END;
$$;

-- 10. MODERATION_LOG (Audit trail for staff actions)
CREATE TABLE IF NOT EXISTS public.moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
    actor UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target TEXT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_moderation_log_subject ON public.moderation_log (subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_log_actor ON public.moderation_log (actor);

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view moderation log for their subjects"
  ON public.moderation_log FOR SELECT
  TO authenticated
  USING (
    (subject_id IS NOT NULL AND (select public.is_staff_for(subject_id)))
    OR (subject_id IS NULL AND public.is_admin())
  );

-- 11. REPORTS (Moderation reports queue)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'note', 'user')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reports_subject_status ON public.reports (subject_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports (reporter_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters can view their own reports or staff can view for their subjects"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id
    OR (select public.is_staff_for(subject_id))
  );

CREATE POLICY "Staff can update reports for their subjects"
  ON public.reports FOR UPDATE
  TO authenticated
  USING ((select public.is_staff_for(subject_id)))
  WITH CHECK ((select public.is_staff_for(subject_id)));

-- 12. ADMIN RPCS
CREATE OR REPLACE FUNCTION public.assign_moderator(p_subject_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_subject_id) THEN
    RAISE EXCEPTION 'Subject "%" does not exist.', p_subject_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % does not exist.', p_user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  INSERT INTO public.community_moderators (subject_id, user_id, assigned_by)
  VALUES (p_subject_id, p_user_id, v_admin_id)
  ON CONFLICT (subject_id, user_id) DO NOTHING;

  INSERT INTO public.moderation_log (subject_id, actor, target, action, details)
  VALUES (
    p_subject_id,
    v_admin_id,
    p_user_id::text,
    'assign_moderator',
    jsonb_build_object('subject_id', p_subject_id, 'user_id', p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_moderator(p_subject_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.community_moderators
  WHERE subject_id = p_subject_id AND user_id = p_user_id;

  INSERT INTO public.moderation_log (subject_id, actor, target, action, details)
  VALUES (
    p_subject_id,
    v_admin_id,
    p_user_id::text,
    'remove_moderator',
    jsonb_build_object('subject_id', p_subject_id, 'user_id', p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.search_profiles_for_admin(p_query text)
RETURNS TABLE (
  id UUID,
  handle TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean text;
  v_escaped text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_clean := TRIM(COALESCE(p_query, ''));
  IF v_clean = '' THEN
    RETURN;
  END IF;

  v_escaped := replace(replace(replace(v_clean, '\', '\\'), '%', '\%'), '_', '\_');

  RETURN QUERY
  SELECT p.id, p.handle, p.full_name
  FROM public.profiles p
  WHERE (p.handle ILIKE ('%' || v_escaped || '%') ESCAPE '\')
     OR (p.full_name ILIKE ('%' || v_escaped || '%') ESCAPE '\')
  ORDER BY p.handle ASC
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_target_old_role TEXT;
  v_admin_count INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_user_id = v_admin_id THEN
    RAISE EXCEPTION 'Administrators cannot modify their own role.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_role NOT IN ('student', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: "%". Must be "student" or "admin".', p_role
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT role INTO v_target_old_role
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found.', p_user_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_target_old_role = 'admin' AND p_role <> 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.profiles
    WHERE role = 'admin' AND id <> p_user_id;

    IF v_admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot demote the last remaining administrator.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  PERFORM set_config('app.trusted_role_update', '1', true);

  UPDATE public.profiles
  SET role = p_role
  WHERE id = p_user_id;

  INSERT INTO public.moderation_log (subject_id, actor, target, action, details)
  VALUES (
    NULL,
    v_admin_id,
    p_user_id::text,
    'set_user_role',
    jsonb_build_object('old_role', v_target_old_role, 'new_role', p_role)
  );
END;
$$;

