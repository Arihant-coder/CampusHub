-- =============================================================================
-- Migration: 20261031000006_daily_quiz.sql
-- Description: Daily Quiz feature tables, streaks, and history schema
-- =============================================================================

-- 1. DAILY QUIZ QUESTIONS
CREATE TABLE IF NOT EXISTS public.daily_quiz_questions (
    id TEXT PRIMARY KEY,
    quiz_date DATE NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer_index INTEGER NOT NULL,
    explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT valid_options CHECK (
        jsonb_typeof(options) = 'array'
        AND jsonb_array_length(options) >= 2
    ),

    CONSTRAINT valid_answer_index CHECK (
        correct_answer_index >= 0
        AND correct_answer_index < jsonb_array_length(options)
    )
);

CREATE INDEX IF NOT EXISTS idx_daily_quiz_questions_date
    ON public.daily_quiz_questions (quiz_date);

-- 2. USER QUIZ STREAKS
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    last_completed_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT valid_current_streak CHECK (current_streak >= 0),
    CONSTRAINT valid_best_streak CHECK (best_streak >= 0),
    CONSTRAINT best_streak_not_below_current CHECK (best_streak >= current_streak)
);

-- 3. DAILY QUIZ SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.daily_quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_date DATE NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::JSONB,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT valid_quiz_score CHECK (
        score >= 0 AND score <= total_questions
    ),
    CONSTRAINT valid_total_questions CHECK (total_questions > 0),
    CONSTRAINT valid_submission_answers CHECK (
        jsonb_typeof(answers) = 'object'
    ),
    CONSTRAINT one_submission_per_user_per_day UNIQUE (user_id, quiz_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_quiz_submissions_user
    ON public.daily_quiz_submissions (user_id);

CREATE INDEX IF NOT EXISTS idx_daily_quiz_submissions_date
    ON public.daily_quiz_submissions (quiz_date);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.daily_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quiz_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quiz questions"
    ON public.daily_quiz_questions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can read their own quiz streak"
    ON public.user_streaks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz streak"
    ON public.user_streaks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz streak"
    ON public.user_streaks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own quiz submissions"
    ON public.daily_quiz_submissions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz submissions"
    ON public.daily_quiz_submissions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

