-- =============================================================================
-- Seed Data: seed.sql
-- Description: Initial authorized campus email domains and academic subjects catalogue
-- =============================================================================

-- 1. Authorized Campus Email Domains
INSERT INTO public.allowed_email_domains (domain)
VALUES
  ('college.edu'),
  ('campushub.edu')
ON CONFLICT (domain) DO NOTHING;

-- 2. Academic Subjects Catalogue
INSERT INTO public.subjects (id, name, code)
VALUES
  ('dbms', 'Database Management Systems', 'CS301'),
  ('cn', 'Computer Networks', 'CS302'),
  ('os', 'Operating Systems', 'CS303'),
  ('dsa', 'Data Structures & Algorithms', 'CS201'),
  ('bee', 'Basic Electrical Engineering', 'EE101'),
  ('eg', 'Engineering Graphics', 'ME102'),
  ('daa', 'Design and Analysis of Algorithms', 'CS304'),
  ('dm', 'Discrete Mathematics', 'MA202')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code;
