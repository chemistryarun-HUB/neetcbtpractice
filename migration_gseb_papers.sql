-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Adds GSEB Std 12 board papers (Part A MCQs) as their own track,
-- separate from the NEET level-wise question bank (Admin → GSEB Papers).
--
-- WHY NOT THE `questions` TABLE: every row there means "a NEET question in
-- unit U, level L" — qid, unit, level and the unlock logic in
-- student_progress are all built on that. A board paper is a fixed set of
-- 50 questions in a fixed order, keyed by paper + question number, so it
-- gets its own tables. Column names for the question content (question,
-- option1..4, *_image, correct_option) deliberately match `questions`, so
-- the shared QuestionView renders both without changes.
-- ============================================================

create table if not exists gseb_papers (
  id uuid primary key default uuid_generate_v4(),
  subject text not null check (subject in ('physics', 'chemistry', 'biology', 'maths')),
  paper_code text,                       -- e.g. '054' (printed on the paper)
  year integer not null,
  session text not null default 'march' check (session in ('march', 'july')),
  medium text not null default 'en' check (medium in ('en', 'gu')),
  set_no text not null default '',       -- e.g. '15'; '' when unknown
  duration_min integer not null default 60,
  mcq_count integer not null default 50,
  -- 'provisional' until GSEB publishes the final key after objections.
  key_status text not null default 'provisional' check (key_status in ('provisional', 'final')),
  -- The same set in the other medium, for the EN/GU toggle (added later).
  twin_paper_id uuid references gseb_papers(id) on delete set null,
  -- Hidden from students until the admin has reviewed every question.
  is_published boolean not null default false,
  created_at timestamptz default now(),
  unique (subject, year, session, medium, set_no)
);

create table if not exists gseb_questions (
  id uuid primary key default uuid_generate_v4(),
  paper_id uuid not null references gseb_papers(id) on delete cascade,
  q_no integer not null check (q_no > 0),
  question text not null default '',
  question_image text,
  option1 text not null default '', option1_image text,
  option2 text not null default '', option2_image text,
  option3 text not null default '', option3_image text,
  option4 text not null default '', option4_image text,
  -- Same convention as questions.correct_option: the correct option's text,
  -- or the sentinel 'option1'..'option4' when the text is empty/ambiguous.
  -- See resolveCorrectOptionValue() in src/lib/questionOptions.js.
  correct_option text not null default '',
  chapter_no integer,                    -- GSEB_XII_SYLLABUS chapter id; null if unmapped
  explanation text,
  explanation_image text,
  created_at timestamptz default now(),
  unique (paper_id, q_no)
);

create index if not exists idx_gseb_questions_paper on gseb_questions(paper_id, q_no);

create table if not exists gseb_attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  paper_id uuid references gseb_papers(id) on delete cascade, -- null for chapter-wise practice
  mode text not null default 'full' check (mode in ('full', 'chapter')),
  question_ids uuid[] not null,
  answers jsonb not null default '{}'::jsonb,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  skipped_count integer not null default 0,
  score integer,
  time_taken integer,                    -- seconds
  submitted boolean not null default false,
  started_at timestamptz default now(),
  submitted_at timestamptz
);

create index if not exists idx_gseb_attempts_student on gseb_attempts(student_id, started_at desc);

-- Which sections a student sees. Everyone existing stays NEET-only; the admin
-- turns on 'gseb' per student.
alter table students
  add column if not exists programs text[] not null default '{neet}';

-- Same open policies as the rest of the schema (students use the anon role).
-- Tighten together with the rest once student login moves off anon.
alter table gseb_papers enable row level security;
alter table gseb_questions enable row level security;
alter table gseb_attempts enable row level security;

drop policy if exists "GSEB papers accessible by all" on gseb_papers;
create policy "GSEB papers accessible by all" on gseb_papers for all using (true);
drop policy if exists "GSEB questions accessible by all" on gseb_questions;
create policy "GSEB questions accessible by all" on gseb_questions for all using (true);
drop policy if exists "GSEB attempts accessible by all" on gseb_attempts;
create policy "GSEB attempts accessible by all" on gseb_attempts for all using (true);
