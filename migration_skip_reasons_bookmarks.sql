-- Two additions to mistake_entries (the per-student, per-question row behind the
-- Mistake Copy and the Error Type dropdown):
--
--   1. Reasons for skipping a question. They live in the same error_type column as
--      the wrong-answer types, so the check constraint has to allow four more:
--        forgot         Forgot Concept
--        never_read     Never read this concept
--        not_understood Didn't understand Problem
--        no_time        Didn't get time
--   2. bookmarked, for the star in the review window. It applies to any question,
--      right, wrong or skipped, so a row may now hold only a bookmark.
--
-- Nothing already saved changes. Safe to run more than once.

alter table mistake_entries add column if not exists bookmarked boolean not null default false;

alter table mistake_entries drop constraint if exists mistake_entries_error_type_check;
alter table mistake_entries add constraint mistake_entries_error_type_check check (
  error_type is null or error_type in (
    'conceptual', 'calculation', 'reading', 'time', 'guesswork', 'silly', 'other',
    'forgot', 'never_read', 'not_understood', 'no_time'
  )
);
