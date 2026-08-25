-- ============================================================
-- NEETCBT Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- FACULTY TABLE
-- ============================================================
create table if not exists faculty (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  city text,
  state text,
  subject text default 'Chemistry',
  experience text,
  qualification text,
  email text unique not null,
  created_at timestamptz default now()
);

alter table faculty enable row level security;

create policy "Faculty can view own profile" on faculty
  for select using (auth.uid() = user_id);

create policy "Faculty can update own profile" on faculty
  for update using (auth.uid() = user_id);

create policy "Admin can view all faculty" on faculty
  for all using (true);

-- ============================================================
-- STUDENTS TABLE
-- ============================================================
create table if not exists students (
  id uuid primary key default uuid_generate_v4(),
  roll_number text unique not null,
  name text not null,
  class text,
  password_hash text not null,
  phone_student text,
  phone_father text,
  phone_mother text,
  is_first_login boolean default true,
  added_by uuid references faculty(id),
  created_at timestamptz default now()
);

alter table students enable row level security;

create policy "Students accessible by faculty and admin" on students
  for all using (true);

-- ============================================================
-- QUESTIONS TABLE
-- ============================================================
create table if not exists questions (
  id uuid primary key default uuid_generate_v4(),
  qid text unique not null,
  question_type text default 'MCQ',
  subject text not null default 'Chemistry',
  unit text not null default 'Unit 11 - d and f Block Elements',
  chapter_name text,
  topic text,
  level integer not null,
  question text not null,
  option1 text not null,
  option2 text not null,
  option3 text not null,
  option4 text not null,
  correct_option text not null,
  difficulty_level text check (difficulty_level in ('Easy', 'Medium', 'Hard')),
  question_tag text,
  source text,
  uploaded_by uuid,
  created_at timestamptz default now(),
  -- Set true when an admin manually fixes this row via the Edit panel (e.g. uploading
  -- real images to replace "[Image]" placeholders). Excel re-uploads must not silently
  -- revert that fix, so handleExcelUpload() in QuestionUploader.jsx skips overwriting
  -- question/options/correct_option/question_image for locked rows.
  -- NOTE: this covers the CONTENT half of a row only. The metadata half
  -- (unit/level/topic/difficulty/tag/source) is deliberately still re-synced from
  -- Excel on a locked row — pin those individually with the five columns below.
  content_locked boolean not null default false,
  -- Per-field locks for the metadata an Excel re-upload would otherwise revert.
  -- Independent of content_locked and of each other; all default false, so a field
  -- is only protected once an admin edits it in the Edit panel (which pins it) or
  -- clicks its lock on. `topic` has no lock of its own — it's derived from
  -- (unit, level), so it follows unit_locked/level_locked. See src/lib/fieldLocks.js
  -- and migration_field_locks.sql.
  unit_locked       boolean not null default false,
  level_locked      boolean not null default false,
  difficulty_locked boolean not null default false,
  tag_locked        boolean not null default false,
  source_locked     boolean not null default false,
  -- Match the Column (MTC): per-item text + optional image for each of the 8 items
  -- (Column A: 1-4, Column B: p-s). Null on every question created before this existed
  -- (and on every non-MTC question) — see migration_mtc_images.sql.
  col_a1 text, col_a1_image text,
  col_a2 text, col_a2_image text,
  col_a3 text, col_a3_image text,
  col_a4 text, col_a4_image text,
  col_b1 text, col_b1_image text,
  col_b2 text, col_b2_image text,
  col_b3 text, col_b3_image text,
  col_b4 text, col_b4_image text
);

-- NOTE: this CREATE TABLE is already behind the live DB for several older
-- columns (question_image, option1_image..option4_image, is_active) that
-- were added directly against Supabase outside any tracked migration —
-- not addressed here, out of scope for this change.

-- Review gate — see migration_question_publish.sql for the reasoning and the
-- one-time backfill. A student sees a question only when is_active AND
-- is_published are both true:
--   is_active     is this question in service at all?  (admin retires it)
--   is_published  has it been reviewed and released?   (admin publishes it)
-- Defaults to false so an Excel upload cannot reach students unreviewed.
alter table questions
  add column if not exists is_published boolean not null default false;

alter table questions enable row level security;

-- Students use custom auth (anon role), so policy must allow anon reads too
-- Run these DROP lines first if updating an existing database:
-- drop policy if exists "Questions readable by all authenticated" on questions;
-- drop policy if exists "Questions readable by all" on questions;
create policy "Questions readable by all" on questions
  for select using (true);

create policy "Questions writable by faculty and admin" on questions
  for insert with check (true);

create policy "Questions updatable by faculty and admin" on questions
  for update using (true);

create policy "Questions deletable by faculty and admin" on questions
  for delete using (true);

-- ============================================================
-- STUDENT SESSIONS (test attempts)
-- ============================================================
create table if not exists test_attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  level integer not null,
  attempt_number integer not null,
  question_ids text[] not null,
  answers jsonb default '{}',
  score integer,
  correct_count integer default 0,
  wrong_count integer default 0,
  skipped_count integer default 0,
  time_taken integer, -- seconds
  submitted boolean default false,
  started_at timestamptz default now(),
  submitted_at timestamptz
);

alter table test_attempts enable row level security;

create policy "Test attempts accessible by all" on test_attempts
  for all using (true);

-- ============================================================
-- STUDENT PROGRESS TABLE
-- ============================================================
create table if not exists student_progress (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade unique,
  unlocked_levels integer[] default '{1}',
  total_questions_attempted integer default 0,
  updated_at timestamptz default now()
);

alter table student_progress enable row level security;

create policy "Progress accessible by all" on student_progress
  for all using (true);

-- ============================================================
-- USED QUESTIONS TRACKER (per student per level)
-- ============================================================
create table if not exists used_questions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  level integer not null,
  question_id uuid references questions(id),
  status text check (status in ('correct', 'wrong', 'skipped')),
  created_at timestamptz default now(),
  unique(student_id, question_id)
);

alter table used_questions enable row level security;

create policy "Used questions accessible by all" on used_questions
  for all using (true);

-- ============================================================
-- PRACTICE PAPERS (offline/PDF papers — answer key + student self-scoring)
-- ============================================================
create table if not exists practice_papers (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  physics_count integer not null default 45,
  chemistry_count integer not null default 45,
  botany_count integer not null default 45,
  zoology_count integer not null default 45,
  syllabus_physics text,
  syllabus_chemistry text,
  syllabus_botany text,
  syllabus_zoology text,
  answer_key jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz default now()
);

alter table practice_papers enable row level security;

create policy "Practice papers readable by all" on practice_papers
  for select using (true);
create policy "Practice papers writable by admin" on practice_papers
  for insert with check (true);
create policy "Practice papers updatable by admin" on practice_papers
  for update using (true);

create table if not exists practice_paper_attempts (
  id uuid primary key default uuid_generate_v4(),
  paper_id uuid references practice_papers(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  responses jsonb not null default '{}'::jsonb,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  skipped_count integer not null default 0,
  score integer not null default 0,
  subject_breakdown jsonb not null default '{}'::jsonb,
  submitted_at timestamptz default now(),
  unique(paper_id, student_id)
);

alter table practice_paper_attempts enable row level security;

create policy "Practice paper attempts accessible by all" on practice_paper_attempts
  for all using (true);

-- ============================================================
-- LEVEL VIDEOS (YouTube lectures shown to students before a level's test)
-- Videos are usually "unlisted" on YouTube — they embed exactly like public
-- ones as long as the uploader left embedding enabled on the video.
-- ============================================================
create table if not exists level_videos (
  id uuid primary key default uuid_generate_v4(),
  unit_id integer not null,
  level integer not null,
  title text not null,
  youtube_id text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  -- The same lecture can legitimately be reused across levels, but listing it
  -- twice inside one level is always a mistake.
  unique(unit_id, level, youtube_id)
);

alter table level_videos enable row level security;

create policy "Level videos readable by all" on level_videos
  for select using (true);
create policy "Level videos writable by admin" on level_videos
  for insert with check (true);
create policy "Level videos updatable by admin" on level_videos
  for update using (true);
create policy "Level videos deletable by admin" on level_videos
  for delete using (true);

-- ============================================================
-- DUPLICATE DISMISSALS (Find Duplicates tab in the Question Bank)
-- "Not a duplicate" persists here as (question_id, group_key) rather than
-- only living in React state, so it survives a refresh or a later re-scan
-- instead of the pair silently reappearing. group_key is the same first-80-
-- characters grouping key loadDuplicates() uses, so editing a question's
-- text enough to change its grouping naturally invalidates any old
-- dismissal instead of it wrongly suppressing a new duplicate signal.
-- See migration_dupe_dismissals.sql.
-- ============================================================
create table if not exists dupe_dismissals (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references questions(id) on delete cascade,
  group_key text not null,
  dismissed_at timestamptz default now(),
  unique (question_id, group_key)
);

alter table dupe_dismissals enable row level security;

create policy "Dupe dismissals accessible by all" on dupe_dismissals
  for all using (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_level_videos_unit_level on level_videos(unit_id, level, sort_order);
create index if not exists idx_questions_level on questions(level);
create index if not exists idx_questions_subject on questions(subject);
create index if not exists idx_test_attempts_student on test_attempts(student_id);
create index if not exists idx_used_questions_student_level on used_questions(student_id, level);
