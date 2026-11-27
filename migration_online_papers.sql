-- ============================================================
-- ONLINE PRACTICE PAPERS
--
-- A paper the admin builds from the question bank and publishes to students'
-- dashboards. Two kinds:
--   mode = 'same'   every student gets the same questions (question_ids),
--                   in their own shuffled question and option order
--   mode = 'random' every student gets their own random questions drawn from
--                   the paper's sources when they start it
--
-- sources: [{ "subject": "Chemistry", "unit_id": 6, "level": 3 | null, "count": 10 }]
--          (unit_id is the practice unit id: Physics +100, Biology +200;
--           level null = the whole unit, i.e. CCT)
--
-- Run this ONCE in the Supabase SQL Editor. Safe to run again.
-- ============================================================

create table if not exists online_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  mode text not null default 'same' check (mode in ('same', 'random')),
  sources jsonb not null default '[]'::jsonb,
  question_ids uuid[] not null default '{}',
  duration_min integer not null default 60,
  medium text not null default 'en',
  class_filter text,
  target_year text,
  is_published boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists online_paper_attempts (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references online_papers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  question_ids uuid[] not null default '{}',
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  skipped_count integer not null default 0,
  time_taken integer,
  submitted boolean not null default false,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  unique (paper_id, student_id)
);

create index if not exists online_paper_attempts_student_idx on online_paper_attempts (student_id);

alter table online_papers enable row level security;
alter table online_paper_attempts enable row level security;

drop policy if exists "Online papers accessible" on online_papers;
create policy "Online papers accessible" on online_papers for all using (true);
drop policy if exists "Online paper attempts accessible" on online_paper_attempts;
create policy "Online paper attempts accessible" on online_paper_attempts for all using (true);
