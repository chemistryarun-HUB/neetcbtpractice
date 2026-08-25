-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Adds a review gate so newly uploaded questions stay hidden from students
-- until the admin has actually checked them.
--
-- THE PROBLEM: an Excel upload lands questions straight into the live bank.
-- StudentDashboard and TestPage both select on `is_active`, which defaults to
-- true, so the moment a sheet is uploaded students can open the level and sit
-- a test on questions that still have no image, a typo in the stem, or an
-- answer key the admin has not corrected yet. The admin's review work happens
-- *after* the questions are already in front of students.
--
-- WHY NOT REUSE is_active: it already means something different — "this
-- question is retired / taken out of service" (57 rows are false today for
-- that reason). If publishing a level flipped is_active to true in bulk it
-- would resurrect exactly those deliberately-retired questions. The two facts
-- are independent, so they need two columns:
--
--   is_active     — is this question in service at all?      (admin retires)
--   is_published  — has it been reviewed and released?       (this column)
--
-- A student sees a question only when BOTH are true.
--
-- DEFAULT false is the whole point: every row a future Excel upload or manual
-- add INSERTs arrives unpublished, with no application code needed to remember
-- to set it. Re-uploading a sheet that contains an ALREADY published question
-- does not un-publish it — PostgREST's upsert only writes the columns present
-- in its payload, and is_published is never in that payload.
--
-- The backfill below then marks everything that exists TODAY as published, so
-- students lose nothing at the moment this runs and the gate applies only to
-- what gets uploaded from here on.
-- ============================================================

alter table questions
  add column if not exists is_published boolean not null default false;

-- Everything already in the bank is live for students right now; keep it that
-- way. Only rows added after this migration start life unpublished.
-- Safe to re-run: after the first pass there are no is_published = false rows
-- left that predate the column.
update questions set is_published = true where is_published = false;

comment on column questions.is_published is
  'false = uploaded but not yet reviewed; hidden from students. Students see a question only when is_active AND is_published. New rows default to false so an Excel upload cannot reach students unreviewed; the admin releases them per level from Admin > Questions.';
