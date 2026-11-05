-- Mistake Copy now also holds GSEB board questions, which live in gseb_questions,
-- not questions. question_id can point at either bank, so it can't be a foreign
-- key to one of them any more. Ids are UUIDs, so the two banks never collide.
--
-- Nothing already saved changes. Safe to run more than once.

alter table mistake_entries drop constraint if exists mistake_entries_question_id_fkey;
alter table mistake_retries drop constraint if exists mistake_retries_question_id_fkey;
