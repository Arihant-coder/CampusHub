-- =============================================================================
-- Migration: 20261101000011_posts_global_hot_index.sql
-- Description: Adds standalone descending index on posts.hot_score for global top hot discussions queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_posts_hot_score ON public.posts (hot_score DESC);
