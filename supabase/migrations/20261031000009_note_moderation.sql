-- =============================================================================
-- Migration: 20261031000009_note_moderation.sql
-- Description: Note curation & moderation workflow: pending status, staff moderation RPCs,
--              and audit logging.
-- =============================================================================

-- 1. Add status column to public.notes (if not already added)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Backfill existing shared notes as approved
UPDATE public.notes
SET status = 'approved'
WHERE is_shared = true;

-- 2. Index on status and subject_id for fast moderation queue queries
CREATE INDEX IF NOT EXISTS idx_notes_status ON public.notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_subject_status ON public.notes(subject_id, status);

-- 3. RPC: Approve submitted note and publish to public archive
CREATE OR REPLACE FUNCTION public.approve_note(
  p_note_id UUID,
  p_category TEXT DEFAULT NULL
)
RETURNS public.notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_note public.notes;
BEGIN
  SELECT * INTO v_note
  FROM public.notes
  WHERE id = p_note_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Note with id % not found.', p_note_id;
  END IF;

  -- Verify caller is staff for this subject
  IF NOT public.is_staff_for(v_note.subject_id) THEN
    RAISE EXCEPTION 'Access denied. Moderator or Admin privileges required for subject %.', v_note.subject_id;
  END IF;

  -- Set trusted session configuration flag to authorize status & is_shared mutation
  PERFORM set_config('app.trusted_note_update', '1', true);

  -- Update public.notes record with approved state; storage_path remains unchanged
  UPDATE public.notes
  SET
    status = 'approved',
    is_shared = true,
    description = COALESCE(p_category, description, 'Other')
  WHERE id = p_note_id
  RETURNING * INTO v_note;

  INSERT INTO public.moderation_log (subject_id, actor, target, action, details)
  VALUES (
    v_note.subject_id,
    auth.uid(),
    p_note_id::text,
    'approve_note',
    jsonb_build_object('title', v_note.title, 'category', p_category)
  );

  RETURN v_note;
END;
$$;

-- 4. RPC: Reject submitted note (storage file is purged by client before RPC call)
CREATE OR REPLACE FUNCTION public.reject_note(
  p_note_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_note public.notes;
BEGIN
  SELECT * INTO v_note
  FROM public.notes
  WHERE id = p_note_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Note with id % not found.', p_note_id;
  END IF;

  -- Verify caller is staff for this subject
  IF NOT public.is_staff_for(v_note.subject_id) THEN
    RAISE EXCEPTION 'Access denied. Moderator or Admin privileges required for subject %.', v_note.subject_id;
  END IF;

  -- Set trusted session configuration flag to authorize status mutation
  PERFORM set_config('app.trusted_note_update', '1', true);

  -- Mark note as rejected and unshared (no storage SQL operations)
  UPDATE public.notes
  SET
    status = 'rejected',
    is_shared = false
  WHERE id = p_note_id;

  INSERT INTO public.moderation_log (subject_id, actor, target, action, details)
  VALUES (
    v_note.subject_id,
    auth.uid(),
    p_note_id::text,
    'reject_note',
    jsonb_build_object('title', v_note.title, 'reason', p_reason)
  );

  RETURN true;
END;
$$;

-- 5. Permissions
REVOKE EXECUTE ON FUNCTION public.approve_note(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_note(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_note(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_note(UUID, TEXT) TO authenticated;

