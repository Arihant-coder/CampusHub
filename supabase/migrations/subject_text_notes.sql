-- Adds database-backed content for personal, editable text notes on projects
-- where subjects.sql has already been applied.
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS content TEXT;

-- Resource categories shown in the subject viewer. Existing records are
-- preserved under their closest matching category before the new constraint.
UPDATE public.notes SET tag = 'Lecture / Day wise' WHERE tag = 'Lecture';
UPDATE public.notes SET tag = 'Unit wise' WHERE tag = 'Summary';
UPDATE public.notes SET tag = 'Private' WHERE tag = 'My Notes';

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_tag_check;
ALTER TABLE public.notes
  ADD CONSTRAINT notes_tag_check
  CHECK (tag IN ('Lecture / Day wise', 'Unit wise', 'Other', 'PYQ', 'Private'));
