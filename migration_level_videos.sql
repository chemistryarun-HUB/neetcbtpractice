-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Adds level-wise YouTube lecture videos (Admin → Lectures).
-- ============================================================

create table if not exists level_videos (
  id uuid primary key default uuid_generate_v4(),
  unit_id integer not null,
  level integer not null,
  title text not null,
  youtube_id text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  unique(unit_id, level, youtube_id)
);

alter table level_videos enable row level security;

create policy "Level videos readable by all" on level_videos
  for select using (true);
create policy "Level videos writable by admin" on level_videos
  for insert with check (true);
create policy "Level videos updatable by admin" on level_videos
  for update using (true);
create policy "Level videos deletable by admin" on level_videos
  for delete using (true);

create index if not exists idx_level_videos_unit_level
  on level_videos(unit_id, level, sort_order);
