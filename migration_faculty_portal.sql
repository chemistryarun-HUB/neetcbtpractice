-- ============================================================
-- Faculty portal: question drafts (admin approves), corrections suggested
-- on existing questions, and faculty-made practice papers.
-- Run ONCE in the Supabase SQL Editor, AFTER migration_faculty_login.sql.
-- ============================================================

-- ── Question drafts ──
-- review_status is NULL for every question the admin added; faculty drafts
-- carry 'pending' → 'approved' (published by the admin) or 'rejected'.
alter table questions
  add column if not exists review_status text check (review_status in ('pending', 'approved', 'rejected')),
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz;

-- Builds the stored question row from what the faculty form sent. Never lets
-- a faculty draft be published or point at another author.
create or replace function public._faculty_question_fields(p jsonb)
returns jsonb language sql immutable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'unit', p->>'unit', 'level', (p->>'level')::int, 'topic', p->>'topic',
    'question', coalesce(p->>'question', ''), 'question_image', p->>'question_image',
    'option1', coalesce(p->>'option1', ''), 'option2', coalesce(p->>'option2', ''),
    'option3', coalesce(p->>'option3', ''), 'option4', coalesce(p->>'option4', ''),
    'option1_image', p->>'option1_image', 'option2_image', p->>'option2_image',
    'option3_image', p->>'option3_image', 'option4_image', p->>'option4_image',
    'correct_option', p->>'correct_option', 'difficulty_level', p->>'difficulty_level',
    'question_tag', p->>'question_tag', 'source', p->>'source'))
$$;

create or replace function public.faculty_add_question(p_token uuid, p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f faculty; u int; next_qid text; r questions;
begin
  f := faculty_from_token(p_token);
  if coalesce(p->>'unit', '') = '' or coalesce(p->>'level', '') = '' then raise exception 'Choose a unit and level'; end if;
  if coalesce(trim(p->>'question'), '') = '' and coalesce(p->>'question_image', '') = '' then raise exception 'The question is empty'; end if;
  if coalesce(p->>'correct_option', '') = '' then raise exception 'Mark the correct option'; end if;
  u := substring(p->>'unit' from '^Unit (\d+)')::int;
  if u is null then raise exception 'Unknown unit'; end if;
  -- NCU + 2-digit unit + 3-digit serial, continuing the unit's own numbering.
  select 'NCU' || lpad(u::text, 2, '0') || lpad((coalesce(max(substring(qid from 6)::int), 0) + 1)::text, 3, '0')
    into next_qid
    from questions where qid ~ ('^NCU' || lpad(u::text, 2, '0') || '\d{3}$');
  insert into questions (qid, subject, question_type, unit, level, topic, question, question_image,
      option1, option2, option3, option4, option1_image, option2_image, option3_image, option4_image,
      correct_option, difficulty_level, question_tag, source,
      uploaded_by, is_published, is_active, review_status)
  select next_qid, 'Chemistry', 'Single Choice MCQ', x.unit, x.level, x.topic, x.question, x.question_image,
      x.option1, x.option2, x.option3, x.option4, x.option1_image, x.option2_image, x.option3_image, x.option4_image,
      x.correct_option, coalesce(x.difficulty_level, 'Medium'), x.question_tag, x.source,
      f.id, false, true, 'pending'
  from jsonb_populate_record(null::questions, _faculty_question_fields(p)) x
  returning * into r;
  return jsonb_build_object('id', r.id, 'qid', r.qid);
end $$;

-- A faculty member may change only their own draft, and only until the
-- admin publishes it. Editing a rejected draft sends it back for review.
create or replace function public.faculty_update_question(p_token uuid, p_id uuid, p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare f faculty; x questions;
begin
  f := faculty_from_token(p_token);
  if not exists (select 1 from questions where id = p_id and uploaded_by = f.id and is_published = false) then
    raise exception 'Only your own unpublished drafts can be edited';
  end if;
  x := jsonb_populate_record(null::questions, _faculty_question_fields(p));
  update questions set unit = x.unit, level = x.level, topic = x.topic, question = x.question,
    question_image = x.question_image, option1 = x.option1, option2 = x.option2, option3 = x.option3,
    option4 = x.option4, option1_image = x.option1_image, option2_image = x.option2_image,
    option3_image = x.option3_image, option4_image = x.option4_image, correct_option = x.correct_option,
    difficulty_level = coalesce(x.difficulty_level, difficulty_level), question_tag = x.question_tag,
    source = x.source, review_status = 'pending', is_active = true
  where id = p_id;
end $$;

-- ── Corrections suggested on existing questions ──
create table if not exists question_suggestions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  faculty_id uuid not null references faculty(id) on delete cascade,
  kind text not null check (kind in ('answer_key', 'typo', 'image', 'other')),
  proposed_option int check (proposed_option between 1 and 4),
  message text,
  status text not null default 'open' check (status in ('open', 'applied', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table question_suggestions enable row level security;
drop policy if exists "Admin manages suggestions" on question_suggestions;
create policy "Admin manages suggestions" on question_suggestions
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.faculty_suggest(p_token uuid, p_question_id uuid, p_kind text, p_proposed int, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare f faculty;
begin
  f := faculty_from_token(p_token);
  if p_kind = 'answer_key' and p_proposed is null then raise exception 'Choose the option you think is correct'; end if;
  if p_kind <> 'answer_key' and coalesce(trim(p_message), '') = '' then raise exception 'Please describe the problem'; end if;
  insert into question_suggestions (question_id, faculty_id, kind, proposed_option, message)
  values (p_question_id, f.id, p_kind, p_proposed, nullif(trim(p_message), ''));
end $$;

create or replace function public.faculty_my_suggestions(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f faculty;
begin
  f := faculty_from_token(p_token);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'kind', s.kind, 'proposed_option', s.proposed_option, 'message', s.message,
      'status', s.status, 'admin_note', s.admin_note, 'created_at', s.created_at,
      'qid', q.qid, 'question', left(q.question, 160)) order by s.created_at desc)
    from question_suggestions s join questions q on q.id = s.question_id
    where s.faculty_id = f.id), '[]'::jsonb);
end $$;

-- ── Practice papers made by faculty ──
alter table practice_papers add column if not exists created_by uuid references faculty(id) on delete set null;

grant execute on function public.faculty_add_question(uuid, jsonb) to anon, authenticated;
grant execute on function public.faculty_update_question(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.faculty_suggest(uuid, uuid, text, int, text) to anon, authenticated;
grant execute on function public.faculty_my_suggestions(uuid) to anon, authenticated;
