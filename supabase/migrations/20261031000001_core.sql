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
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'moderator', 'admin')),
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

-- 3. STAFF HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('moderator', 'admin')
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

