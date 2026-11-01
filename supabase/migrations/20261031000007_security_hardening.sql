-- =============================================================================
-- Migration: 20261031000007_security_hardening.sql
-- Description: Handle uniqueness index, handle availability RPC, profile update guard, and size constraints
-- =============================================================================

-- 1. Unique case-insensitive index on profiles(handle)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle_lower ON public.profiles (LOWER(handle));

-- 2. Availability checking RPC for unauthenticated & authenticated clients
CREATE OR REPLACE FUNCTION public.check_handle_available(p_handle text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean text;
  v_exists boolean;
BEGIN
  IF p_handle IS NULL THEN
    RETURN false;
  END IF;

  v_clean := LOWER(TRIM(p_handle));
  IF v_clean LIKE '@%' THEN
    v_clean := SUBSTRING(v_clean FROM 2);
  END IF;

  -- Verify handle format: 4-20 characters, lowercase alphanumeric and underscores
  IF NOT (v_clean ~ '^[a-z0-9_]{4,20}$') THEN
    RETURN false;
  END IF;

  -- Guard against reserved system handles
  IF v_clean IN ('admin', 'moderator', 'system', 'campushub', 'support', 'anonymous', 'null', 'undefined', 'root', 'staff') THEN
    RETURN false;
  END IF;

  -- Check if handle already exists in profiles
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE LOWER(handle) = v_clean
  ) INTO v_exists;

  RETURN NOT v_exists;
END;
$$;

-- 3. Guard profile updates: freeze id, role, created_at for client requests; validate handle format
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger AS $$
DECLARE
  v_clean text;
BEGIN
  -- When invoked via trusted admin RPC, allow role modification
  IF current_setting('app.trusted_role_update', true) = '1' THEN
    NEW.id         := OLD.id;
    NEW.created_at := OLD.created_at;
  ELSIF auth.uid() IS NOT NULL THEN
    -- Client session: disallow role and id self-escalation
    NEW.id         := OLD.id;
    NEW.role       := OLD.role;
    NEW.created_at := OLD.created_at;
  END IF;

  -- If handle is being updated, enforce uniqueness, format, and reserved keyword rules
  IF NEW.handle IS DISTINCT FROM OLD.handle THEN
    v_clean := LOWER(TRIM(NEW.handle));
    IF v_clean LIKE '@%' THEN
      v_clean := SUBSTRING(v_clean FROM 2);
    END IF;

    IF NOT (v_clean ~ '^[a-z0-9_]{4,20}$') THEN
      RAISE EXCEPTION 'Invalid username: must be 4–20 alphanumeric characters or underscores.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_clean IN ('admin', 'moderator', 'system', 'campushub', 'support', 'anonymous', 'null', 'undefined', 'root', 'staff') THEN
      RAISE EXCEPTION 'Username "%" is reserved and cannot be claimed.', v_clean
        USING ERRCODE = 'check_violation';
    END IF;

    IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(handle) = v_clean AND id <> OLD.id) THEN
      RAISE EXCEPTION 'Username "%" is already taken.', v_clean
        USING ERRCODE = 'duplicate_object';
    END IF;

    NEW.handle := v_clean;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- 4. Constraint on post body length
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_posts_body_length'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT chk_posts_body_length
      CHECK (body IS NULL OR char_length(body) <= 50000);
  END IF;
END $$;

