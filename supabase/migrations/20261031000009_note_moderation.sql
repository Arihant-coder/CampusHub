-- =============================================================================
-- Migration: 20261031000009_note_moderation.sql
-- Description: Note curation & moderation workflow: pending status, community storage migration on approval,
--              quota release, and staff moderation RPCs.
-- =============================================================================

-- 1. Add status column to public.notes
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

-- 3. Storage policy: Ensure community-shared files are readable by authenticated users
CREATE POLICY "Public read on community shared notes in subject-notes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'subject-notes' AND (
      (storage.foldername(name))[1] = 'community'
      OR (auth.uid()::text = (storage.foldername(name))[1])
      OR EXISTS (
        SELECT 1 FROM public.notes n
        WHERE n.storage_path = storage.objects.name
          AND (select public.is_staff_for(n.subject_id))
      )
    )
  );

-- 4. RPC: Approve submitted note, move file to community storage, release user quota, publish to public archive
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
  v_old_path TEXT;
  v_new_path TEXT;
  v_file_name TEXT;
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

  v_old_path := v_note.storage_path;
  v_file_name := (storage.filename(v_old_path));
  v_new_path := 'community/' || v_note.subject_id || '/' || v_file_name;

  -- 1. Copy file from user staging path to community shared path
  INSERT INTO storage.objects (
    bucket_id,
    name,
    owner,
    metadata,
    created_at,
    updated_at
  )
  SELECT
    bucket_id,
    v_new_path,
    owner,
    metadata,
    now(),
    now()
  FROM storage.objects
  WHERE bucket_id = 'subject-notes' AND name = v_old_path
  ON CONFLICT (bucket_id, name) DO NOTHING;

  -- 2. Delete file from user staging path so user's 50 MB personal quota is freed
  DELETE FROM storage.objects
  WHERE bucket_id = 'subject-notes' AND name = v_old_path;

  -- 3. Update public.notes record with approved state and community path
  UPDATE public.notes
  SET
    status = 'approved',
    is_shared = true,
    storage_path = v_new_path,
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

-- 5. RPC: Reject submitted note, purge file from storage, release user quota
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
  v_old_path TEXT;
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

  v_old_path := v_note.storage_path;

  IF v_old_path IS NOT NULL THEN
    -- Delete from storage bucket
    DELETE FROM storage.objects
    WHERE bucket_id = 'subject-notes' AND name = v_old_path;
  END IF;

  -- Delete from public.notes table
  DELETE FROM public.notes
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

-- 6. Permissions
REVOKE EXECUTE ON FUNCTION public.approve_note(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_note(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_note(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_note(UUID, TEXT) TO authenticated;

