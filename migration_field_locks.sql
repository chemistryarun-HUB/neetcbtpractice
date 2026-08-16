-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Adds per-field locks for the five metadata fields an Excel re-upload
-- would otherwise silently revert.
--
-- The existing `content_locked` boolean protects the *content* half of a row
-- (question text, options, correct_option, images) and deliberately lets a
-- re-upload keep re-syncing the metadata half. That's still what it does —
-- this migration does NOT change its meaning, and does NOT backfill anything,
-- so the rows already carrying content_locked = true behave exactly as before.
--
-- These five are independent of it and of each other: locking Level does not
-- lock Unit. All default false, so nothing is protected until an admin edits
-- that field in the Edit panel (which pins it automatically) or clicks its
-- lock on. Clicking a lock off hands the field back to Excel.
--
-- `topic` gets no lock column of its own: it's derived from (unit, level) via
-- deriveTopic(), so it follows unit_locked / level_locked. See
-- lockedColumnsFor() in src/lib/fieldLocks.js.
-- ============================================================

alter table questions add column if not exists unit_locked       boolean not null default false;
alter table questions add column if not exists level_locked      boolean not null default false;
alter table questions add column if not exists difficulty_locked boolean not null default false;
alter table questions add column if not exists tag_locked        boolean not null default false;
alter table questions add column if not exists source_locked     boolean not null default false;
