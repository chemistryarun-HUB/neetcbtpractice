-- ============================================================
-- Run this ONCE in the Supabase SQL Editor.
-- Records every change to a question's correct_option, so answer-key
-- corrections can be reviewed and re-graded instead of silently desyncing
-- the grades already frozen into test_attempts.
--
-- This is a TRIGGER rather than app-side logging on purpose: keys change
-- through the Edit panel, through Excel re-uploads, and through raw SQL.
-- App code can only see the first two.
-- ============================================================

create table if not exists answer_key_changes (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references questions(id) on delete cascade,
  qid text not null,
  old_correct_option text,
  new_correct_option text not null,
  changed_at timestamptz not null default now(),
  -- pending   → not yet re-graded
  -- applied   → re-grade run against affected attempts
  -- dismissed → nothing to do (no submitted attempt ever answered this question)
  status text not null default 'pending' check (status in ('pending', 'applied', 'dismissed')),
  applied_at timestamptz,
  note text
);

create index if not exists idx_answer_key_changes_status on answer_key_changes(status, changed_at desc);
create index if not exists idx_answer_key_changes_question on answer_key_changes(question_id);

alter table answer_key_changes enable row level security;

create policy "Key changes readable by all" on answer_key_changes for select using (true);
create policy "Key changes writable by admin" on answer_key_changes for insert with check (true);
create policy "Key changes updatable by admin" on answer_key_changes for update using (true);
create policy "Key changes deletable by admin" on answer_key_changes for delete using (true);

-- ── Trigger ─────────────────────────────────────────────────────────────────
create or replace function log_answer_key_change() returns trigger as $$
begin
  -- `is distinct from` (not `<>`) so a null → value change is caught too.
  if new.correct_option is distinct from old.correct_option then
    insert into answer_key_changes (question_id, qid, old_correct_option, new_correct_option)
    values (new.id, new.qid, old.correct_option, new.correct_option);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_log_answer_key_change on questions;

-- `update of correct_option` narrows which statements fire the trigger; the
-- is-distinct-from check above then filters out no-op writes, which matters
-- because a full Excel re-upload rewrites correct_option on every row.
create trigger trg_log_answer_key_change
  after update of correct_option on questions
  for each row execute function log_answer_key_change();

-- ── Attempt re-grade stamp ──────────────────────────────────────────────────
-- So a score that changed months ago is explainable rather than merely inferrable.
alter table test_attempts add column if not exists regraded_at timestamptz;
alter table test_attempts add column if not exists regrade_note text;
