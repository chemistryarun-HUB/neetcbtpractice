-- Mistake Copy: a student's Error Analysis Register inside the app.
--
-- WHICH questions are in the copy is NOT stored here. It is worked out from
-- test_attempts and the current answer key every time, so correcting a key
-- removes (or adds) a question on its own. These two tables hold only what
-- can't be worked out:
--
--   mistake_entries  what the student wrote about a question, and the teacher's
--                    check. One row per (student, question), created on first
--                    save, so a question with nothing written has no row.
--   mistake_retries  each answer given in a Mistake Copy re-attempt. Kept apart
--                    from test_attempts on purpose: a re-attempt must never
--                    touch score, level unlocks or the Performance page.
--
-- Open policies, same as test_attempts: students and faculty use the app's own
-- login rather than Supabase Auth, so they reach the database as the anon role.
--
-- Safe to run more than once.

create table if not exists mistake_entries (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  error_type text,
  error_other text,
  reason text,
  solution text,
  learning text,
  prevention text,
  needs_teacher boolean not null default false,
  checked_at timestamptz,
  checked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, question_id)
);

do $$ begin
  alter table mistake_entries add constraint mistake_entries_error_type_check check (
    error_type is null or error_type in ('conceptual', 'calculation', 'reading', 'time', 'guesswork', 'silly', 'other')
  );
exception when duplicate_object then null; end $$;

create table if not exists mistake_retries (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references students(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  selected text not null,
  option_order text[],
  created_at timestamptz not null default now()
);

create index if not exists idx_mistake_retries_student on mistake_retries(student_id);

alter table mistake_entries enable row level security;
alter table mistake_retries enable row level security;

drop policy if exists "Mistake entries accessible by all" on mistake_entries;
create policy "Mistake entries accessible by all" on mistake_entries
  for all using (true) with check (true);

drop policy if exists "Mistake retries accessible by all" on mistake_retries;
create policy "Mistake retries accessible by all" on mistake_retries
  for all using (true) with check (true);
