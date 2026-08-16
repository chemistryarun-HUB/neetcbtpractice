-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Closes the race behind the duplicate/gapped attempt_number bug fixed for
-- existing rows by scripts/renumber-attempts.mjs (see that script's header
-- and lib/performanceMetrics.js's attemptsInOrder() for the full history).
--
-- THE RACE: TestPage.jsx currently assigns attempt_number by COUNTING
-- existing submitted rows, client-side, then INSERTs a new (unsubmitted) row
-- with count+1 — two statements, with a gap between them. Two test-starts
-- landing in that gap (a genuine double-click, two tabs, or — the case that
-- actually hit production after the counting logic was fixed once already —
-- a student on a stale cached bundle racing one on the new build) both read
-- the same count and both insert the same number. Nothing rejects it: the
-- column has no uniqueness constraint at all.
--
-- THIS MIGRATION, in two parts:
--
--   1. next_attempt_number(student, unit, level) — an atomic counter function
--      the app must call INSTEAD of the count-then-insert it does today (see
--      "REQUIRED APP CHANGE" below). `INSERT ... ON CONFLICT DO UPDATE
--      ... RETURNING` takes a row lock on the counter row for the duration of
--      the statement, so two concurrent calls for the same (student, unit,
--      level) are serialized by Postgres itself and always hand out two
--      different numbers. This is what actually closes the race — nothing
--      client-side can be made race-proof, because two separate browser tabs
--      have no way to coordinate with each other.
--
--   2. A unique index enforcing it can never regress. Deliberately partial —
--      WHERE submitted = true — because abandoned (never-submitted) sessions
--      are real, already share numbers with each other today, and aren't
--      shown anywhere: Performance pages, the unlock-eligibility count in
--      TestPage.jsx, and every screen that displays "Attempt #N" all filter
--      to submitted = true already. A full-table constraint would (a) fail to
--      even apply given that existing data, and (b) start rejecting a
--      legitimate abandon → retry → abandon → retry flow.
--
--      Given #1 actually prevents the collision, this index should never
--      fire in practice — it exists as a backstop so a future regression
--      surfaces as a loud, immediate constraint violation instead of quietly
--      reintroducing the exact bug this migration closes.
--
-- REQUIRED APP CHANGE (paired with this migration, not optional): TestPage.jsx
-- must call next_attempt_number() and use its result as attempt_number on the
-- insert, replacing the count() call. Deploying the unique index WITHOUT that
-- change makes things worse, not better: the race would then hit at SUBMIT
-- time instead of test-start (the row is created unsubmitted, then updated to
-- submitted = true later) — so a raced student would finish an entire test
-- and have the final submit fail outright, instead of just getting a
-- cosmetically wrong attempt number. Do not deploy this migration on its own.
-- ============================================================

-- ── 1. Atomic per-(student, unit, level) counter ──────────────────────────
create table if not exists attempt_counters (
  student_id uuid not null references students(id) on delete cascade,
  unit_id integer not null,
  level integer not null,
  next_number integer not null default 1,
  primary key (student_id, unit_id, level)
);

alter table attempt_counters enable row level security;

create policy "Attempt counters accessible by all" on attempt_counters
  for all using (true);

-- SECURITY INVOKER (the default) is correct here, not DEFINER: the app's
-- anon-role key already has table access via the permissive RLS policies
-- above and on test_attempts (this table uses custom auth, not Supabase
-- auth.uid()-scoped policies), so no privilege escalation is needed — the
-- function's only job is atomicity, not access control.
create or replace function next_attempt_number(p_student_id uuid, p_unit_id integer, p_level integer)
returns integer
language sql
as $$
  insert into attempt_counters (student_id, unit_id, level, next_number)
  values (p_student_id, p_unit_id, p_level, 2)
  on conflict (student_id, unit_id, level)
  do update set next_number = attempt_counters.next_number + 1
  returning next_number - 1;
$$;

-- New installs of Postgres/Supabase generally grant EXECUTE on new functions
-- to PUBLIC by default, but this makes it explicit rather than relying on
-- that default holding.
grant execute on function next_attempt_number(uuid, integer, integer) to anon, authenticated;

-- One-time seed so existing students' next call continues their real count
-- instead of restarting at 1 and colliding with attempt numbers they already
-- have. Counts SUBMITTED attempts only, matching what TestPage.jsx's old
-- count() call did and what attempt_number is actually used for (the
-- unlock-threshold math in thresholdPctFor() is keyed off it) — an abandoned
-- session was never supposed to consume a slot.
insert into attempt_counters (student_id, unit_id, level, next_number)
select student_id, unit_id, level, max(attempt_number) + 1
from test_attempts
where submitted = true and unit_id is not null
group by student_id, unit_id, level
on conflict (student_id, unit_id, level) do update
  set next_number = greatest(attempt_counters.next_number, excluded.next_number);

-- ── 2. Backstop: make a collision impossible to reintroduce silently ──────
-- Run scripts/renumber-attempts.mjs --apply BEFORE this if you haven't
-- already applied it — this will refuse to create (fail with a duplicate-key
-- error) if any duplicate (student_id, unit_id, level, attempt_number) among
-- submitted rows still exists.
create unique index if not exists test_attempts_unique_submitted_attempt_number
  on test_attempts (student_id, unit_id, level, attempt_number)
  where submitted = true;
