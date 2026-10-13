-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, BEFORE deploying the app
-- version that ships with it — that version has no built-in admin
-- password any more, so without this you can't get into /admin.
--
-- Admin login now goes through Supabase Auth (email + password), the same
-- auth system faculty already use. Being signed in is not enough: the
-- account must also have a row in `admins`. That row is what the app
-- checks, so a faculty member who signs in with Google never becomes admin.
--
-- Steps:
--   1. Supabase dashboard → Authentication → Users → Add user → Create new
--      user. Use the admin email and a NEW strong password (not Admin@2025,
--      which was public in this repo). Tick "Auto Confirm User".
--   2. Run this whole file.
--   3. Run the insert at the bottom with that email.
-- ============================================================

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

alter table admins enable row level security;

-- A signed-in user can see only their own row, which is all the app needs
-- to answer "am I an admin?". There are deliberately no insert/update/delete
-- policies: admins are added here in the SQL Editor, never from the app.
drop policy if exists "Admins can read own row" on admins;
create policy "Admins can read own row" on admins
  for select using (auth.uid() = user_id);

-- For future RLS policies ("writable by admin" can become
-- `using (public.is_admin())` instead of `using (true)`).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Step 3 — replace the email with the one you created in step 1:
-- insert into admins (user_id, email)
-- select id, email from auth.users where email = 'admin@neetcbt.in'
-- on conflict (user_id) do nothing;
