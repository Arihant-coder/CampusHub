-- Persist study material references across backend reloads.
-- The Gemini URI remains server-side; user JWT RLS scopes every operation.
CREATE TABLE IF NOT EXISTS public.subject_ai_study_materials (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('pdf', 'text')),
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    text_content TEXT,
    gemini_file_name TEXT,
    gemini_file_uri TEXT,
    expires_at TIMESTAMPTZ,
    CONSTRAINT study_material_payload_matches_kind CHECK (
        (kind = 'pdf' AND gemini_file_name IS NOT NULL AND gemini_file_uri IS NOT NULL AND expires_at IS NOT NULL AND text_content IS NULL)
        OR
        (kind = 'text' AND text_content IS NOT NULL AND gemini_file_name IS NULL AND gemini_file_uri IS NULL AND expires_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_subject_ai_materials_owner_subject
    ON public.subject_ai_study_materials (user_id, subject_id, created_at);

ALTER TABLE public.subject_ai_study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own subject AI materials"
    ON public.subject_ai_study_materials FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own subject AI materials"
    ON public.subject_ai_study_materials FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subject AI materials"
    ON public.subject_ai_study_materials FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.subject_ai_study_materials TO authenticated;
