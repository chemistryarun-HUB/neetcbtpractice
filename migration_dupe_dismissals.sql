-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Makes "Not a duplicate" in Find Duplicates a real, permanent decision
-- instead of one that silently reverts on the next refresh.
--
-- THE BUG: dismissFromDupeGroup() in QuestionUploader.jsx only ever removed
-- the row from React state (setDupeGroups). Nothing was written to the
-- database. loadDuplicates() re-scans the whole question bank from scratch
-- on every load — clicking "Find Duplicates" again, refreshing the page, or
-- just coming back tomorrow — with no memory of any earlier dismissal, so a
-- pair correctly judged "not a duplicate" reappeared every time, indistin-
-- guishable from one nobody had looked at yet. Admin's report matches this
-- exactly: the disappear-then-reappear is what "purely a local dismissal"
-- in the old code's own comment actually meant in practice.
--
-- THE FIX: persist each dismissal as (question_id, group_key). group_key is
-- the same "first 80 chars of `question`, trimmed and lowercased" string
-- loadDuplicates() already groups by — so this table is really just "which
-- (question, text-grouping) pairs has an admin already looked at and ruled
-- out". Keying on group_key rather than question_id alone matters: if the
-- question's text is later edited enough to change its first 80 characters,
-- the old dismissal naturally stops applying instead of silently suppressing
-- a genuinely new duplicate signal under the new text.
-- ============================================================

create table if not exists dupe_dismissals (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references questions(id) on delete cascade,
  group_key text not null,
  dismissed_at timestamptz default now(),
  unique (question_id, group_key)
);

alter table dupe_dismissals enable row level security;

-- Same permissive policy as every other table here (attempt_counters,
-- questions, etc.) — the app uses custom auth, not Supabase auth.uid(), so
-- access control already happens at the application layer, not RLS.
create policy "Dupe dismissals accessible by all" on dupe_dismissals
  for all using (true);
