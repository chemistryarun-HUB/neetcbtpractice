-- ============================================================
-- Run this ONCE in the Supabase SQL Editor, then reload the app.
-- Creates the storage bucket the parent progress reports are uploaded to.
--
-- WHY A BUCKET AT ALL: WhatsApp's click-to-chat links (wa.me) can only carry
-- text — they cannot attach a file. Sending a real attachment programmatically
-- needs the paid WhatsApp Business API. So the report is uploaded here and the
-- WhatsApp message carries a link to it, which is what makes "one click" work
-- from the admin's side.
--
-- PRIVACY — READ THIS: the bucket is PUBLIC, so anyone holding a report's URL
-- can open it, indefinitely, without logging in. That is a deliberate choice
-- (a parent must be able to reopen the report months later, and an expiring
-- link that dies silently is worse than no link). The protection is that each
-- file path contains a random UUID, so URLs cannot be guessed or enumerated —
-- but a link forwarded out of a WhatsApp chat stays live. Do not put anything
-- in these reports you wouldn't accept being forwarded.
--
-- To revoke a single report later, delete its object from the bucket; to
-- revoke everything, flip the bucket to private:
--   update storage.buckets set public = false where id = 'student-reports';
-- ============================================================

insert into storage.buckets (id, name, public)
values ('student-reports', 'student-reports', true)
on conflict (id) do update set public = true;

-- Same permissive shape as the rest of this project's policies: the app uses
-- custom auth rather than Supabase auth.uid(), so access control lives in the
-- application layer, not in RLS.
drop policy if exists "Student reports readable by all" on storage.objects;
create policy "Student reports readable by all" on storage.objects
  for select using (bucket_id = 'student-reports');

drop policy if exists "Student reports uploadable" on storage.objects;
create policy "Student reports uploadable" on storage.objects
  for insert with check (bucket_id = 'student-reports');

drop policy if exists "Student reports deletable" on storage.objects;
create policy "Student reports deletable" on storage.objects
  for delete using (bucket_id = 'student-reports');
