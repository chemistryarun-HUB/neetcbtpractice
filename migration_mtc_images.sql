-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Adds per-item text + optional image to "Match the Column" (MTC) questions.
--
-- Before this, an MTC question's whole match table was flattened into the
-- `question` column as plain text with nowhere to attach a per-item image.
-- These 16 columns store each of the 8 items (Column A: 1-4, Column B: p-s)
-- as its own text + optional image, matching the existing option{N}_image
-- naming convention. Questions created before this migration have all 16 of
-- these as null — the app detects that and keeps showing their old flattened
-- `question` text as-is, so nothing needs backfilling.
-- ============================================================

alter table questions add column if not exists col_a1 text;
alter table questions add column if not exists col_a2 text;
alter table questions add column if not exists col_a3 text;
alter table questions add column if not exists col_a4 text;
alter table questions add column if not exists col_b1 text;
alter table questions add column if not exists col_b2 text;
alter table questions add column if not exists col_b3 text;
alter table questions add column if not exists col_b4 text;

alter table questions add column if not exists col_a1_image text;
alter table questions add column if not exists col_a2_image text;
alter table questions add column if not exists col_a3_image text;
alter table questions add column if not exists col_a4_image text;
alter table questions add column if not exists col_b1_image text;
alter table questions add column if not exists col_b2_image text;
alter table questions add column if not exists col_b3_image text;
alter table questions add column if not exists col_b4_image text;
