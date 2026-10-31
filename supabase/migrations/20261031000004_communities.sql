-- =============================================================================
-- Migration: 20261031000004_communities.sql
-- Description: Forum posts, comments, atomic voting RPCs, trusted counter triggers, and WebP media bucket
-- =============================================================================

-- 1. POSTS (Discussions & Forum)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
    body TEXT,
    images TEXT[] DEFAULT '{}' CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 5),
    upvotes INT NOT NULL DEFAULT 0,
    downvotes INT NOT NULL DEFAULT 0,
    reply_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_posts_subject_created ON public.posts (subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts (author_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are readable by authenticated users"
  ON public.posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or staff can delete posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_staff());

-- Guard post updates: freeze counters unless modified by trusted RPC/triggers
CREATE OR REPLACE FUNCTION public.guard_post_update()
RETURNS trigger AS $$
BEGIN
  IF current_setting('app.trusted_counter_update', true) = '1' THEN
    RETURN NEW;
  END IF;

  NEW.upvotes     := OLD.upvotes;
  NEW.downvotes   := OLD.downvotes;
  NEW.reply_count := OLD.reply_count;
  NEW.author_id   := OLD.author_id;
  NEW.subject_id  := OLD.subject_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_post_update ON public.posts;
CREATE TRIGGER trg_guard_post_update
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_post_update();

-- 2. POST_VOTES
CREATE TABLE IF NOT EXISTS public.post_votes (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view post votes"
  ON public.post_votes FOR SELECT
  TO authenticated
  USING (true);

-- Atomic vote RPC for Posts
CREATE OR REPLACE FUNCTION public.vote_post(p_post_id UUID, p_vote_value SMALLINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  IF p_vote_value IS NOT NULL AND p_vote_value NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invalid vote value';
  END IF;

  IF p_vote_value IS NULL THEN
    DELETE FROM public.post_votes WHERE post_id = p_post_id AND user_id = v_user_id;
  ELSE
    INSERT INTO public.post_votes (post_id, user_id, vote)
    VALUES (p_post_id, v_user_id, p_vote_value)
    ON CONFLICT (post_id, user_id)
    DO UPDATE SET vote = p_vote_value;
  END IF;

  -- Enable trusted bypass to recalculate counters on posts
  PERFORM set_config('app.trusted_counter_update', '1', true);

  UPDATE public.posts
  SET
    upvotes = (SELECT count(*) FROM public.post_votes WHERE post_id = p_post_id AND vote = 1),
    downvotes = (SELECT count(*) FROM public.post_votes WHERE post_id = p_post_id AND vote = -1)
  WHERE id = p_post_id;
END;
$$;

-- 3. COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    depth INT NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 11),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    image_urls TEXT[] DEFAULT '{}' CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 2),
    upvotes INT NOT NULL DEFAULT 0,
    downvotes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments (author_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are readable by authenticated users"
  ON public.comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors or staff can delete comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR public.is_staff());

-- Enforce comment nesting depth limit (12 levels: 0 to 11) and prevent cross-post hijacking
CREATE OR REPLACE FUNCTION public.handle_comment_depth_and_safety()
RETURNS trigger AS $$
DECLARE
  v_parent_depth INT;
  v_parent_post_id UUID;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth := 0;
  ELSE
    SELECT depth, post_id INTO v_parent_depth, v_parent_post_id
    FROM public.comments
    WHERE id = NEW.parent_id;

    IF v_parent_post_id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found';
    END IF;

    IF v_parent_post_id <> NEW.post_id THEN
      RAISE EXCEPTION 'Cannot reply to a comment belonging to another post';
    END IF;

    IF v_parent_depth >= 11 THEN
      RAISE EXCEPTION 'Maximum comment nesting depth (12 levels) reached';
    END IF;

    NEW.depth := v_parent_depth + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_depth_and_safety ON public.comments;
CREATE TRIGGER trg_comment_depth_and_safety
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_depth_and_safety();

-- Comment count trigger maintaining posts.reply_count
CREATE OR REPLACE FUNCTION public.handle_comment_count()
RETURNS trigger AS $$
BEGIN
  PERFORM set_config('app.trusted_counter_update', '1', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_count ON public.comments;
CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_count();

-- Guard comment updates: freeze counters and nesting fields
CREATE OR REPLACE FUNCTION public.guard_comment_update()
RETURNS trigger AS $$
BEGIN
  IF current_setting('app.trusted_counter_update', true) = '1' THEN
    RETURN NEW;
  END IF;

  NEW.upvotes    := OLD.upvotes;
  NEW.downvotes  := OLD.downvotes;
  NEW.author_id  := OLD.author_id;
  NEW.post_id    := OLD.post_id;
  NEW.parent_id  := OLD.parent_id;
  NEW.depth      := OLD.depth;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_comment_update ON public.comments;
CREATE TRIGGER trg_guard_comment_update
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.guard_comment_update();

-- 4. COMMENT_VOTES
CREATE TABLE IF NOT EXISTS public.comment_votes (
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comment votes"
  ON public.comment_votes FOR SELECT
  TO authenticated
  USING (true);

-- Atomic vote RPC for Comments
CREATE OR REPLACE FUNCTION public.vote_comment(p_comment_id UUID, p_vote_value SMALLINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  IF p_vote_value IS NOT NULL AND p_vote_value NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'Invalid vote value';
  END IF;

  IF p_vote_value IS NULL THEN
    DELETE FROM public.comment_votes WHERE comment_id = p_comment_id AND user_id = v_user_id;
  ELSE
    INSERT INTO public.comment_votes (comment_id, user_id, vote)
    VALUES (p_comment_id, v_user_id, p_vote_value)
    ON CONFLICT (comment_id, user_id)
    DO UPDATE SET vote = p_vote_value;
  END IF;

  -- Enable trusted bypass to recalculate counters on comments
  PERFORM set_config('app.trusted_counter_update', '1', true);

  UPDATE public.comments
  SET
    upvotes = (SELECT count(*) FROM public.comment_votes WHERE comment_id = p_comment_id AND vote = 1),
    downvotes = (SELECT count(*) FROM public.comment_votes WHERE comment_id = p_comment_id AND vote = -1)
  WHERE id = p_comment_id;
END;
$$;

-- 5. STORAGE BUCKET: communities-images (Public WebP, 1MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'communities-images',
  'communities-images',
  true,
  1048576, -- 1 MB ceiling
  ARRAY['image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/webp'];

-- Per-user storage cap for communities-images (25 MB max per user)
CREATE OR REPLACE FUNCTION public.check_community_images_quota(p_owner uuid, p_new_size bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_user_used bigint;
  c_user_limit CONSTANT bigint := 26214400; -- 25 MB
BEGIN
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO v_user_used
  FROM storage.objects
  WHERE bucket_id = 'communities-images' AND (storage.foldername(name))[1] = p_owner::text;

  IF (v_user_used + COALESCE(p_new_size, 0)) > c_user_limit THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE POLICY "Public read on communities-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'communities-images');

CREATE POLICY "Users can upload WebP images to communities-images with quota"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'communities-images' AND
    (auth.uid()::text = (storage.foldername(name))[1]) AND
    (
      (metadata->>'size') IS NULL OR
      public.check_community_images_quota(auth.uid(), (metadata->>'size')::bigint)
    )
  );

CREATE POLICY "Users or staff can delete images in communities-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'communities-images' AND (
      (auth.uid()::text = (storage.foldername(name))[1])
      OR public.is_staff()
    )
  );

