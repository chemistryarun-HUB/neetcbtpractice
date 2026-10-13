-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, AFTER migration_gseb_papers.sql.
-- Turns the GSEB papers into a question bank:
--   * Part B (subjective) questions per paper, with marks, section and a
--     model answer, tagged by chapter like the MCQs.
--   * The paper's Part B choice rules ("answer any 8 of Q1-12").
--   * Chapter-wise MCQ tests, stored as gseb_attempts with no paper_id.
-- ============================================================

create table if not exists gseb_subjective (
  id uuid primary key default uuid_generate_v4(),
  paper_id uuid not null references gseb_papers(id) on delete cascade,
  q_no integer not null check (q_no > 0),    -- Part B numbering, as printed
  section text not null default '',          -- 'A', 'B', 'C'… as printed
  marks integer not null check (marks > 0),
  question text not null default '',
  question_image text,
  answer text,                               -- model answer written by the teacher
  answer_image text,
  chapter_no integer,                        -- GSEB_XII_SYLLABUS chapter id
  created_at timestamptz default now(),
  unique (paper_id, q_no)
);

create index if not exists idx_gseb_subjective_paper on gseb_subjective(paper_id, q_no);
create index if not exists idx_gseb_subjective_chapter on gseb_subjective(chapter_no);
create index if not exists idx_gseb_questions_chapter on gseb_questions(chapter_no);

-- [{ "section": "A", "from": 1, "to": 12, "attempt": 8, "marks": 2 }, …]
alter table gseb_papers add column if not exists part_b_rules jsonb not null default '[]'::jsonb;

-- Chapter-wise tests have no paper, so the attempt carries what the
-- test and result screens need on their own.
alter table gseb_attempts add column if not exists subject text;
alter table gseb_attempts add column if not exists title text;
alter table gseb_attempts add column if not exists duration_min integer;

-- Same open policy as the other GSEB tables (see migration_gseb_papers.sql).
alter table gseb_subjective enable row level security;
drop policy if exists "GSEB subjective accessible by all" on gseb_subjective;
create policy "GSEB subjective accessible by all" on gseb_subjective for all using (true);
