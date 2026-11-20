-- Gujarati medium for the level-wise NEET course.
--
-- English and Gujarati medium students practise from separate question banks
-- (different printed sources, their own Q IDs ending in G), so a question
-- carries the medium it is written in and a student carries the medium they
-- study in. Everything that exists today is English: both columns default
-- to 'en', so nothing changes for current students or questions.
--
-- Subjects are unchanged: a question's subject column plus "Unit N - Name"
-- (numbers restart per subject, see lib/subjects.js).
--
-- Safe to run more than once.

alter table questions add column if not exists medium text not null default 'en';
alter table students  add column if not exists medium text not null default 'en';

do $$ begin
  alter table questions add constraint questions_medium_check check (medium in ('en', 'gu'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table students add constraint students_medium_check check (medium in ('en', 'gu'));
exception when duplicate_object then null; end $$;

-- The dashboard and every test filter on medium alongside unit and level.
create index if not exists questions_medium_unit_level_idx on questions (medium, unit, level);
