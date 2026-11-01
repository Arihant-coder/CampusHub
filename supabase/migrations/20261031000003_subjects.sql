-- =============================================================================
-- Migration: 20261031000003_subjects.sql
-- Description: Subjects workspace notes, storage bucket, private hijack protection, and quota enforcement
-- =============================================================================

-- 1. NOTES (Academic notes & workspace resources)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description TEXT,
    storage_path TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL CHECK (tag IN ('Lecture', 'PYQ', 'Summary', 'My Notes')),
    is_shared BOOLEAN NOT NULL DEFAULT false,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    page_count INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_notes_storage_path_owner
      CHECK ((storage.foldername(storage_path))[1] = user_id::text)
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes or shared community notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR is_shared = true
  );

CREATE POLICY "Users can insert their own notes with matching storage path"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (storage.foldername(storage_path))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    (storage.foldername(storage_path))[1] = auth.uid()::text
  );

CREATE POLICY "Users or staff can delete notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR (select public.is_staff_for(subject_id))
  );

-- Guard notes updates: freeze immutable identifiers, storage path, and file size
CREATE OR REPLACE FUNCTION public.guard_notes_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.id              := OLD.id;
  NEW.user_id         := OLD.user_id;
  NEW.subject_id      := OLD.subject_id;
  NEW.storage_path    := OLD.storage_path;
  NEW.file_size_bytes := OLD.file_size_bytes;
  NEW.created_at      := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_notes_update ON public.notes;
CREATE TRIGGER trg_guard_notes_update
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.guard_notes_update();

-- 2. Storage Bucket: subject-notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subject-notes',
  'subject-notes',
  false,
  5242880, -- 5 MB ceiling
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf'];

-- 3. Storage Quota Check Functions
CREATE OR REPLACE FUNCTION public.check_subject_notes_quota(p_owner uuid, p_new_size bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_global_used bigint;
  v_user_used bigint;
  c_global_limit CONSTANT bigint := 524288000; -- 500 MB
  c_user_limit   CONSTANT bigint := 52428800;  -- 50 MB
BEGIN
  -- Sum global usage in subject-notes bucket
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO v_global_used
  FROM storage.objects
  WHERE bucket_id = 'subject-notes';

  IF (v_global_used + COALESCE(p_new_size, 0)) > c_global_limit THEN
    RETURN false;
  END IF;

  -- Sum user usage in subject-notes bucket
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO v_user_used
  FROM storage.objects
  WHERE bucket_id = 'subject-notes' AND (storage.foldername(name))[1] = p_owner::text;

  IF (v_user_used + COALESCE(p_new_size, 0)) > c_user_limit THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- RPC to inspect live storage usage for current user and community
CREATE OR REPLACE FUNCTION public.get_my_storage_usage()
RETURNS TABLE (
  user_used bigint,
  user_max bigint,
  global_used bigint,
  global_max bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  c_global_limit CONSTANT bigint := 524288000; -- 500 MB
  c_user_limit   CONSTANT bigint := 52428800;  -- 50 MB
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM((metadata->>'size')::bigint)
      FROM storage.objects
      WHERE bucket_id = 'subject-notes' AND (storage.foldername(name))[1] = v_user_id::text
    ), 0)::bigint AS user_used,
    c_user_limit AS user_max,
    COALESCE((
      SELECT SUM((metadata->>'size')::bigint)
      FROM storage.objects
      WHERE bucket_id = 'subject-notes'
    ), 0)::bigint AS global_used,
    c_global_limit AS global_max;
END;
$$;

-- Storage Policies for subject-notes
CREATE POLICY "Private read on subject-notes for owner or shared community notes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'subject-notes' AND (
      (auth.uid()::text = (storage.foldername(name))[1])
      OR
      EXISTS (
        SELECT 1 FROM public.notes
        WHERE notes.storage_path = name
          AND notes.is_shared = true
      )
    )
  );

CREATE POLICY "Users can upload own notes to subject-notes with quota verification"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'subject-notes' AND
    (auth.uid()::text = (storage.foldername(name))[1]) AND
    (
      -- When metadata size is provided, enforce quota; otherwise allow if under user file count limit
      (metadata->>'size') IS NULL OR
      public.check_subject_notes_quota(auth.uid(), (metadata->>'size')::bigint)
    )
  );

CREATE POLICY "Users or staff can delete notes in subject-notes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'subject-notes' AND (
      (auth.uid()::text = (storage.foldername(name))[1])
      OR EXISTS (
        SELECT 1 FROM public.notes n
        WHERE n.storage_path = storage.objects.name
          AND (select public.is_staff_for(n.subject_id))
      )
    )
  );

-- Audit trigger: Staff deletion of notes creates moderation_log row
CREATE OR REPLACE FUNCTION public.log_note_delete()
RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.user_id AND (select public.is_staff_for(OLD.subject_id)) THEN
    INSERT INTO public.moderation_log (subject_id, actor, target, action, details)
    VALUES (
      OLD.subject_id,
      auth.uid(),
      OLD.id::text,
      'delete_note',
      jsonb_build_object('title', OLD.title, 'owner_id', OLD.user_id)
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_log_note_delete ON public.notes;
CREATE TRIGGER trg_log_note_delete
  BEFORE DELETE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.log_note_delete();

