-- ============================================================
-- Faculty login with a Faculty ID + password (replaces Google login).
-- Run this whole file ONCE in the Supabase SQL Editor, BEFORE deploying the
-- app version that ships with it.
--
-- Faculty are created by the admin on Admin → Faculty. The app generates:
--   Faculty ID  F + subject letter + YYMM + last two digits of the phone
--               (FC261045 = Chemistry, Oct 2026, phone ending 45; letters P C M B Z)
--   Password    digits 5–8 of the phone number; the faculty member must set
--               their own on first login, exactly like a student.
--
-- Unlike the students table, the password is stored hashed (bcrypt via
-- pgcrypto) and the faculty table is not readable by the public app key at
-- all: logging in, reading your own profile and changing your password all go
-- through the functions below, which check a session token.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

alter table faculty alter column email drop not null;
alter table faculty alter column subject drop default;
alter table faculty
  add column if not exists faculty_code text unique,
  add column if not exists password_hash text,
  add column if not exists must_change_password boolean not null default true,
  add column if not exists aadhaar text,
  add column if not exists subjects text[] not null default '{}',
  add column if not exists exams text[] not null default '{}',
  add column if not exists is_active boolean not null default true,
  add column if not exists last_login_at timestamptz;

-- Old Google-era policies. "Admin can view all faculty … using (true)" let
-- anyone with the public key read (and write) every row — fine while the
-- table held no secrets, not now that it holds password hashes.
drop policy if exists "Faculty can view own profile" on faculty;
drop policy if exists "Faculty can update own profile" on faculty;
drop policy if exists "Admin can view all faculty" on faculty;
drop policy if exists "Admin manages faculty" on faculty;
alter table faculty enable row level security;
create policy "Admin manages faculty" on faculty
  for all using (public.is_admin()) with check (public.is_admin());

-- One row per signed-in device. The token is what the browser keeps; it never
-- holds the password.
create table if not exists faculty_sessions (
  token uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculty(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
alter table faculty_sessions enable row level security;   -- no policies: functions only

-- Everything about a faculty row that is safe to hand to the browser.
create or replace function public.faculty_public(f faculty)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', f.id, 'faculty_code', f.faculty_code, 'name', f.name, 'phone', f.phone,
    'email', f.email, 'subjects', f.subjects, 'exams', f.exams,
    'subject', f.subject, 'city', f.city, 'state', f.state,
    'experience', f.experience, 'qualification', f.qualification,
    'must_change_password', f.must_change_password, 'is_active', f.is_active)
$$;

-- ── Login ──
create or replace function public.faculty_login(p_code text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare f faculty; t uuid;
begin
  select * into f from faculty where upper(faculty_code) = upper(trim(p_code));
  if f.id is null or f.password_hash is null
     or f.password_hash <> crypt(p_password, f.password_hash) then
    raise exception 'Incorrect Faculty ID or password';
  end if;
  if not f.is_active then
    raise exception 'This faculty account is disabled. Please contact the admin.';
  end if;
  delete from faculty_sessions where expires_at < now();
  insert into faculty_sessions (faculty_id) values (f.id) returning token into t;
  update faculty set last_login_at = now() where id = f.id;
  return jsonb_build_object('token', t, 'faculty', faculty_public(f));
end $$;

-- Resolves a session token to its (active) faculty row, or raises.
create or replace function public.faculty_from_token(p_token uuid)
returns faculty language plpgsql security definer set search_path = public as $$
declare f faculty;
begin
  select fa.* into f from faculty_sessions s join faculty fa on fa.id = s.faculty_id
   where s.token = p_token and s.expires_at > now();
  if f.id is null then raise exception 'Session expired. Please log in again.'; end if;
  if not f.is_active then raise exception 'This faculty account is disabled.'; end if;
  return f;
end $$;
revoke execute on function public.faculty_from_token(uuid) from public, anon, authenticated;

create or replace function public.faculty_me(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin return faculty_public(faculty_from_token(p_token)); end $$;

create or replace function public.faculty_logout(p_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from faculty_sessions where token = p_token;
$$;

create or replace function public.faculty_change_password(p_token uuid, p_new text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare f faculty;
begin
  f := faculty_from_token(p_token);
  if length(coalesce(p_new, '')) < 6 then raise exception 'Password must be at least 6 characters'; end if;
  update faculty set password_hash = crypt(p_new, gen_salt('bf')), must_change_password = false
   where id = f.id returning * into f;
  -- Sign out every other device that was using the old password.
  delete from faculty_sessions where faculty_id = f.id and token <> p_token;
  return faculty_public(f);
end $$;

create or replace function public.faculty_update_profile(p_token uuid, p_profile jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f faculty;
begin
  f := faculty_from_token(p_token);
  update faculty set
    name          = coalesce(nullif(trim(p_profile->>'name'), ''), name),
    email         = nullif(trim(p_profile->>'email'), ''),
    city          = nullif(trim(p_profile->>'city'), ''),
    state         = nullif(trim(p_profile->>'state'), ''),
    experience    = nullif(trim(p_profile->>'experience'), ''),
    qualification = nullif(trim(p_profile->>'qualification'), '')
   where id = f.id returning * into f;
  return faculty_public(f);
end $$;

-- ── Admin side ──
-- Next free Faculty ID for a base like FC261045: the base itself, then
-- FC261045A, FC261045B … if two faculty share subject, month and the last
-- two phone digits.
create or replace function public.admin_next_faculty_code(p_base text)
returns text language plpgsql security definer set search_path = public as $$
declare c text; i int := 0;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  c := upper(p_base);
  while exists (select 1 from faculty where upper(faculty_code) = c) loop
    i := i + 1;
    if i > 26 then raise exception 'No free Faculty ID for %', p_base; end if;
    c := upper(p_base) || chr(64 + i);
  end loop;
  return c;
end $$;

-- Sets (or resets) a faculty member's password and makes them choose a new
-- one at next login. Also signs them out everywhere.
create or replace function public.admin_set_faculty_password(p_faculty_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update faculty set password_hash = crypt(p_password, gen_salt('bf')), must_change_password = true
   where id = p_faculty_id;
  delete from faculty_sessions where faculty_id = p_faculty_id;
end $$;

grant execute on function public.faculty_login(text, text) to anon, authenticated;
grant execute on function public.faculty_me(uuid) to anon, authenticated;
grant execute on function public.faculty_logout(uuid) to anon, authenticated;
grant execute on function public.faculty_change_password(uuid, text) to anon, authenticated;
grant execute on function public.faculty_update_profile(uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_next_faculty_code(text) to authenticated;
grant execute on function public.admin_set_faculty_password(uuid, text) to authenticated;
