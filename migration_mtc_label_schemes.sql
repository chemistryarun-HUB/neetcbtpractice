-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Makes a Match-the-Column question's row labels editable per question.
--
-- THE PROBLEM: mtcColumns() always labelled Column A "1,2,3,4,5,6" and Column
-- B "p,q,r,s,t,u" — but the source books don't agree on a scheme. Some number
-- Column A with roman numerals and letter Column B, some do the reverse, some
-- use plain numbers. The rendered table and the question's own answer options
-- ("A-I, B-II, C-III, D-IV") ended up using two different alphabets for the
-- same items — confusing on every question that isn't already 1-6/p-u.
--
-- Adds two columns holding which label SCHEME each side uses, not the labels
-- themselves — six presets (src/lib/mtc.js: LABEL_SCHEMES) cover every style
-- already seen in the bank: plain numbers, upper/lower letters, upper/lower
-- roman numerals, and the p-u letters this app started with. Storing a scheme
-- key rather than free text keeps every question's labels internally
-- consistent (no picking "1" for item 2 by mistake) and is what the six-row
-- table already assumes — the row a piece of text sits in still decides its
-- position; only the printed label changes.
--
-- Defaults ('num' / 'lower_pu') exactly match the hardcoded behaviour every
-- MTC question has used up to now, so this changes nothing visually for any
-- existing row until an admin picks a different scheme in Edit.
-- ============================================================

alter table questions
  add column if not exists mtc_label_a text not null default 'num',
  add column if not exists mtc_label_b text not null default 'lower_pu';

comment on column questions.mtc_label_a is 'Match-the-Column: label scheme for Column A (num/upper/lower/roman_upper/roman_lower/lower_pu). See LABEL_SCHEMES in src/lib/mtc.js.';
comment on column questions.mtc_label_b is 'Match-the-Column: label scheme for Column B. Defaults to lower_pu (p,q,r,s,t,u), matching every MTC question converted before this migration.';
