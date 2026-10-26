-- ============================================================
-- Physics and Biology subjects (units = NCERT chapters, numbering restarts at
-- 1 per subject). Run ONCE in the Supabase SQL Editor, after
-- migration_faculty_portal.sql.
--
-- Only change: faculty drafts can now be filed under Physics or Biology, with
-- their own question-ID series (NPH… / NBI…) so they never collide with
-- Chemistry's NCU… IDs.
-- ============================================================

create or replace function public.faculty_add_question(p_token uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f faculty; u int; subj text; prefix text; next_qid text; r questions;
begin
  f := faculty_from_token(p_token);
  subj := coalesce(nullif(p->>'subject', ''), 'Chemistry');
  prefix := case subj when 'Chemistry' then 'NCU' when 'Physics' then 'NPH' when 'Biology' then 'NBI' end;
  if prefix is null then raise exception 'Unknown subject %', subj; end if;
  if coalesce(p->>'unit', '') = '' or coalesce(p->>'level', '') = '' then raise exception 'Choose a unit and level'; end if;
  if coalesce(trim(p->>'question'), '') = '' and coalesce(p->>'question_image', '') = '' then raise exception 'The question is empty'; end if;
  if coalesce(p->>'correct_option', '') = '' then raise exception 'Mark the correct option'; end if;
  u := substring(p->>'unit' from '^Unit (\d+)')::int;
  if u is null then raise exception 'Unknown unit'; end if;
  -- prefix + 2-digit unit + 3-digit serial, continuing that unit's numbering.
  select prefix || lpad(u::text, 2, '0') || lpad((coalesce(max(substring(qid from 6)::int), 0) + 1)::text, 3, '0')
    into next_qid
    from questions where qid ~ ('^' || prefix || lpad(u::text, 2, '0') || '\d{3}$');
  insert into questions (qid, subject, question_type, unit, level, topic, question, question_image,
      option1, option2, option3, option4, option1_image, option2_image, option3_image, option4_image,
      correct_option, difficulty_level, question_tag, source,
      uploaded_by, is_published, is_active, review_status)
  select next_qid, subj, 'Single Choice MCQ', x.unit, x.level, x.topic, x.question, x.question_image,
      x.option1, x.option2, x.option3, x.option4, x.option1_image, x.option2_image, x.option3_image, x.option4_image,
      x.correct_option, coalesce(x.difficulty_level, 'Medium'), x.question_tag, x.source,
      f.id, false, true, 'pending'
  from jsonb_populate_record(null::questions, _faculty_question_fields(p)) x
  returning * into r;
  return jsonb_build_object('id', r.id, 'qid', r.qid);
end $$;

grant execute on function public.faculty_add_question(uuid, jsonb) to anon, authenticated;
