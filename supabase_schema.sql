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
  content_locked boolean not null default false
);

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
-- INDEXES
-- ============================================================
create index if not exists idx_questions_level on questions(level);
create index if not exists idx_questions_subject on questions(subject);
create index if not exists idx_test_attempts_student on test_attempts(student_id);
create index if not exists idx_used_questions_student_level on used_questions(student_id, level);
