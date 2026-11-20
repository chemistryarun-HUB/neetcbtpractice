-- Exam a student is preparing for (NEET or JEE).
--
-- Set when the student is added (single add or bulk upload) and editable from
-- the Student List. The target year stays in students.neet_year, which now
-- means "target year" for either exam. Everyone who exists today is a NEET
-- student, so the column defaults to 'NEET'.
--
-- Safe to run more than once.

alter table students add column if not exists exam text not null default 'NEET';

do $$ begin
  alter table students add constraint students_exam_check check (exam in ('NEET', 'JEE'));
exception when duplicate_object then null; end $$;
