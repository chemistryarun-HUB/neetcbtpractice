-- ============================================================
-- Doubt Desk (student doubt helper) — test version.
-- Run this whole file ONCE in the Supabase SQL Editor.
--
-- What it adds:
--   students.doubt_desk     per-student switch; the "Doubt poochho" button
--                           shows only for students where this is true.
--   student_sessions        a server-side login token for students, so the
--                           doubt-helper server function knows who is asking
--                           (student login is otherwise checked in the browser).
--   doubts, doubt_messages  every doubt and every reply (helper or faculty).
--
-- None of the new tables are readable with the public app key: students reach
-- them only through the doubt-helper function (which checks the token), and
-- the admin through the normal admin login (is_admin()).
-- ============================================================

alter table students add column if not exists doubt_desk boolean not null default false;

-- ── Student session tokens ──
create table if not exists student_sessions (
  token uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
alter table student_sessions enable row level security;   -- no policies: functions only

-- Called by the login page right after a successful student login. Checks the
-- same roll number + password the login page checks and returns a token.
create or replace function public.student_session_start(p_roll text, p_password text)
returns uuid language plpgsql security definer set search_path = public as $$
declare s students; t uuid;
begin
  select * into s from students where roll_number = trim(p_roll);
  if s.id is null or s.password_hash is distinct from p_password then
    raise exception 'Incorrect roll number or password';
  end if;
  delete from student_sessions where expires_at < now();
  insert into student_sessions (student_id) values (s.id) returning token into t;
  return t;
end $$;
revoke all on function public.student_session_start(text, text) from public;
grant execute on function public.student_session_start(text, text) to anon, authenticated;

-- ── Doubts ──
create table if not exists doubts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  question_id uuid references questions(id) on delete set null,
  qid text,
  attempt_id uuid,
  unit_id integer,
  level integer,
  chapter text,
  chosen_key text,                       -- option1..option4 the student marked, null if skipped
  shown_order text[],                    -- option keys in the order the student saw them
  status text not null default 'ai' check (status in ('ai', 'waiting', 'answered')),
  escalated_at timestamptz,
  answered_at timestamptz,
  helpful boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists doubts_student_idx on doubts (student_id, created_at desc);
create index if not exists doubts_status_idx on doubts (status, updated_at desc);

create table if not exists doubt_messages (
  id uuid primary key default gen_random_uuid(),
  doubt_id uuid not null references doubts(id) on delete cascade,
  role text not null check (role in ('student', 'helper', 'faculty')),
  content text not null,
  confident boolean,                     -- helper only: false = sent to Sir
  author text,                           -- faculty only: who replied
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index if not exists doubt_messages_doubt_idx on doubt_messages (doubt_id, created_at);

alter table doubts enable row level security;
alter table doubt_messages enable row level security;
drop policy if exists "Admin manages doubts" on doubts;
create policy "Admin manages doubts" on doubts
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admin manages doubt messages" on doubt_messages;
create policy "Admin manages doubt messages" on doubt_messages
  for all using (public.is_admin()) with check (public.is_admin());

-- ── Turn it on for ONE test student (Atharv Singh, Arun's test account) ──
update students set doubt_desk = true where roll_number = '1220272806001';
