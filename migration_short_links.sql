-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Adds a first-party short-link redirect for parent report URLs.
--
-- THE PROBLEM: a report's real URL is a long Supabase Storage path whose
-- filename embeds the student's name (e.g. ".../janvi-patel-classification-
-- of-elements-...pdf") — fine to send to that student's own parent, but ugly
-- in a WhatsApp message and awkward to shorten. A public shortener (TinyURL
-- etc.) would work, but it means that third party's own servers permanently
-- log which shortened link points at a report with a named minor's PDF —
-- outside anyone's control here. This keeps the whole thing on the app's own
-- domain instead: no third party ever sees the mapping.
--
-- `code` is short and random (see src/lib/shortLinks.js), `target_url` is the
-- real storage link. The app's /r/:code route (unauthenticated — a parent has
-- no NEETCBT login) looks up the code and redirects. One row per report sent;
-- since uploadStudentReport() already mints a fresh storage path on every
-- call, there's nothing to deduplicate against.
--
-- Same permissive shape as every other table here: this app uses its own
-- custom auth, not Supabase auth.uid(), so access control lives in the
-- application layer rather than in RLS.
-- ============================================================

create table if not exists short_links (
  code       text primary key,
  target_url text not null,
  created_at timestamptz not null default now()
);

alter table short_links enable row level security;

drop policy if exists "Short links readable by all" on short_links;
create policy "Short links readable by all" on short_links
  for select using (true);

drop policy if exists "Short links insertable by all" on short_links;
create policy "Short links insertable by all" on short_links
  for insert with check (true);
