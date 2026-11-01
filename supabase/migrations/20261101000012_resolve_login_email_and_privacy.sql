-- =============================================================================
-- Migration: 20261101000012_resolve_login_email_and_privacy.sql
-- Description: Handle-to-email resolution for login and user privacy settings
-- =============================================================================

-- 1. Add privacy columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- 2. Secure handle-to-email lookup function for login
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_email text;
  v_clean_handle text;
BEGIN
  IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
    RETURN NULL;
  END IF;

  -- If it already contains an '@', return it directly
  IF POSITION('@' IN p_identifier) > 0 THEN
    RETURN LOWER(TRIM(p_identifier));
  END IF;

  v_clean_handle := LOWER(TRIM(p_identifier));

  -- Look up email from auth.users joining public.profiles
  SELECT u.email INTO v_email
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(p.handle) = v_clean_handle
  LIMIT 1;

  RETURN v_email;
END;
$$;

-- 3. Grants for anon and authenticated users
GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated;

