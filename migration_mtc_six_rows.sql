-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Widens Match-the-Column questions from 4 rows per column to 6.
--
-- THE PROBLEM: the structured MTC fields added in migration_mtc_images.sql
-- hold exactly 4 items per column. Measured against the real bank on
-- 2026-08-31, that is too small for the questions actually in it:
--
--     Column A runs to 5 items, Column B to 6
--     6 of the 11 non-empty MTC questions exceed 4 on at least one side
--     e.g. NCU11116 is 5 x 6 = 11 items
--
-- Which is why ALL 17 MTC rows in the bank are still unstructured blobs:
-- the editor physically could not hold a real question, so nobody used it.
-- Every one of them renders today as one flat block of text.
--
-- 6 covers every question in the bank with room to spare, and matches the
-- largest table NEET/JEE actually asks. The app derives its row count from
-- MTC_ROWS in src/lib/mtc.js, so going wider later is this file plus that
-- one constant — no component changes.
--
-- Safe and additive: new columns default to NULL, so every existing row is
-- untouched and keeps rendering exactly as it does now. hasStructuredMtc()
-- treats all-NULL as "legacy, show the flat text", which stays true until
-- someone fills the new fields in.
-- ============================================================

alter table questions
  add column if not exists col_a5       text,
  add column if not exists col_a5_image text,
  add column if not exists col_a6       text,
  add column if not exists col_a6_image text,
  add column if not exists col_b5       text,
  add column if not exists col_b5_image text,
  add column if not exists col_b6       text,
  add column if not exists col_b6_image text;

comment on column questions.col_a5 is 'Match-the-Column: Column A item 5 (labelled "5"). Columns A/B run 1-6; see src/lib/mtc.js.';
comment on column questions.col_b5 is 'Match-the-Column: Column B item 5 (labelled "t"). Columns A/B run 1-6; see src/lib/mtc.js.';
