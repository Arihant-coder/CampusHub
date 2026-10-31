-- =============================================================================
-- Migration: 20261031000005_communities_hot_sorting.sql
-- Description: Adds hot_score column, calculation function, and auto-triggers for time-decayed 'Hot' ranking
-- =============================================================================

-- 1. Add hot_score column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hot_score DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 2. Index on (subject_id, hot_score DESC) for query ranking
CREATE INDEX IF NOT EXISTS idx_posts_subject_hot ON public.posts (subject_id, hot_score DESC);

-- 3. Immutable function to calculate time-decayed hot score (Reddit-style logarithm + time decay)
-- Engagement = (upvotes - downvotes) + (reply_count * 2)
-- 45000 seconds = 12.5 hour half-life
CREATE OR REPLACE FUNCTION public.calculate_hot_score(
  p_upvotes INT,
  p_downvotes INT,
  p_reply_count INT,
  p_created_at TIMESTAMPTZ
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  v_net_score INT;
  v_order DOUBLE PRECISION;
  v_seconds DOUBLE PRECISION;
BEGIN
  v_net_score := (COALESCE(p_upvotes, 0) - COALESCE(p_downvotes, 0)) + (COALESCE(p_reply_count, 0) * 2);
  
  IF v_net_score > 0 THEN
    v_order := log(10, v_net_score);
  ELSIF v_net_score < 0 THEN
    v_order := -log(10, abs(v_net_score));
  ELSE
    v_order := 0;
  END IF;

  v_seconds := EXTRACT(EPOCH FROM COALESCE(p_created_at, timezone('utc'::text, now()))) - 1700000000;
  
  RETURN round((v_order + (v_seconds / 45000.0))::numeric, 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Triggers to maintain hot_score on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.trg_maintain_post_hot_score_insert()
RETURNS trigger AS $$
BEGIN
  NEW.hot_score := public.calculate_hot_score(NEW.upvotes, NEW.downvotes, NEW.reply_count, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_hot_score_insert ON public.posts;
CREATE TRIGGER trg_posts_hot_score_insert
  BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_maintain_post_hot_score_insert();

CREATE OR REPLACE FUNCTION public.trg_maintain_post_hot_score_update()
RETURNS trigger AS $$
BEGIN
  NEW.hot_score := public.calculate_hot_score(NEW.upvotes, NEW.downvotes, NEW.reply_count, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_hot_score_update ON public.posts;
CREATE TRIGGER trg_posts_hot_score_update
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_maintain_post_hot_score_update();

-- 5. Backfill existing posts with hot_score
UPDATE public.posts
SET hot_score = public.calculate_hot_score(upvotes, downvotes, reply_count, created_at);

