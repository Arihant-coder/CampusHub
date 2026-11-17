-- =============================================================================
-- Migration: 20261117000001_community_images.sql
-- Description: Adds banner_url and logo_url columns to public.subjects,
--              creates the public community-images storage bucket, and
--              configures RLS and moderation audit triggers.
-- Permissions: Only admins/moderators can update these fields (is_staff_for).
-- =============================================================================

-- 1. Add image columns to subjects
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url   TEXT;

-- 2. Public storage bucket for community images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-images',
  'community-images',
  true,            -- public: served without signed URLs (like avatars)
  1048576,         -- 1 MB ceiling for images
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- 3. Storage policies for community-images bucket
DROP POLICY IF EXISTS "Community images are publicly readable" ON storage.objects;
CREATE POLICY "Community images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

DROP POLICY IF EXISTS "Staff can upload community images" ON storage.objects;
CREATE POLICY "Staff can upload community images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-images' AND
    public.is_staff_for((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Staff can update community images" ON storage.objects;
CREATE POLICY "Staff can update community images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'community-images' AND
    public.is_staff_for((storage.foldername(name))[1])
  );

DROP POLICY IF EXISTS "Staff can delete community images" ON storage.objects;
CREATE POLICY "Staff can delete community images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-images' AND
    public.is_staff_for((storage.foldername(name))[1])
  );

-- 4. Table Privileges and RLS policy: only staff can UPDATE banner_url/logo_url on subjects
GRANT UPDATE (banner_url, logo_url) ON public.subjects TO authenticated;

DROP POLICY IF EXISTS "Staff can update subject community images" ON public.subjects;
CREATE POLICY "Staff can update subject community images"
  ON public.subjects FOR UPDATE
  TO authenticated
  USING (public.is_staff_for(id))
  WITH CHECK (public.is_staff_for(id));

-- 5. Audit trigger: log banner/logo changes into moderation_log
CREATE OR REPLACE FUNCTION public.log_subject_image_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF (OLD.banner_url IS DISTINCT FROM NEW.banner_url) OR
     (OLD.logo_url   IS DISTINCT FROM NEW.logo_url) THEN
    INSERT INTO public.moderation_log (subject_id, actor, action, details)
    VALUES (
      NEW.id,
      auth.uid(),
      'update_community_images',
      jsonb_build_object(
        'old_banner_url', OLD.banner_url,
        'new_banner_url', NEW.banner_url,
        'old_logo_url',   OLD.logo_url,
        'new_logo_url',   NEW.logo_url
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_subject_image_update ON public.subjects;
CREATE TRIGGER trg_log_subject_image_update
  AFTER UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.log_subject_image_update();
