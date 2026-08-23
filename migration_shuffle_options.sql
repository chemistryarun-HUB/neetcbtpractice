-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Adds an admin override for option shuffling.
--
-- THE PROBLEM: TestPage shuffles a question's four options on every attempt,
-- which is right for almost all of them but silently corrupts the few whose
-- option TEXT depends on position — "All of the above", or "Both (b) and (c)"
-- where (b) and (c) mean the second and third option. After a shuffle those
-- letters point somewhere else, and the question becomes unanswerable.
--
-- lib/optionShuffle.js already detects both shapes automatically, so this
-- column is not the primary defence — it is the manual override for the cases
-- detection cannot see. Two directions:
--
--   false → never shuffle this question, even though it looks safe. For a
--           question whose options are a deliberate sequence (ascending
--           values, chronological steps) that reads wrong out of order.
--   true  → the default; detection still applies, so a question that genuinely
--           says "All of the above" is still handled correctly.
--
-- Defaults to true so nothing changes for the 4,500-odd questions that shuffle
-- correctly today.
-- ============================================================

alter table questions
  add column if not exists shuffle_options boolean not null default true;

comment on column questions.shuffle_options is 'false = never shuffle this question''s options (admin override). Automatic detection of All-of-the-above / Both-(b)-and-(c) in lib/optionShuffle.js applies regardless of this flag.';
