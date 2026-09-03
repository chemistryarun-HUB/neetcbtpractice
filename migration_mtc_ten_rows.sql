-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Widens Match-the-Column questions from 6 rows per column to 10.
--
-- Arun asked for Column A and Column B to both support labels "1 to 10" —
-- the num scheme added by migration_mtc_label_schemes.sql only had 6 entries
-- (matching the 6-row table at the time), so a question with 7-10 items had
-- nowhere to put the rest. This adds the 4 missing rows' worth of columns;
-- src/lib/mtc.js's MTC_ROWS constant (bumped to 10 alongside this) is what
-- the app actually reads to decide how many rows exist, so going wider again
-- later is just that number plus another migration like this one.
--
-- Safe and additive: new columns default to NULL, so every existing question
-- (none of which use more than 6 items today) renders exactly as it does now.
-- ============================================================

alter table questions
  add column if not exists col_a7        text,
  add column if not exists col_a7_image  text,
  add column if not exists col_a8        text,
  add column if not exists col_a8_image  text,
  add column if not exists col_a9        text,
  add column if not exists col_a9_image  text,
  add column if not exists col_a10       text,
  add column if not exists col_a10_image text,
  add column if not exists col_b7        text,
  add column if not exists col_b7_image  text,
  add column if not exists col_b8        text,
  add column if not exists col_b8_image  text,
  add column if not exists col_b9        text,
  add column if not exists col_b9_image  text,
  add column if not exists col_b10       text,
  add column if not exists col_b10_image text;

comment on column questions.col_a10 is 'Match-the-Column: Column A item 10. Columns A/B run 1-10; see MTC_ROWS in src/lib/mtc.js.';
comment on column questions.col_b10 is 'Match-the-Column: Column B item 10. Columns A/B run 1-10; see MTC_ROWS in src/lib/mtc.js.';
