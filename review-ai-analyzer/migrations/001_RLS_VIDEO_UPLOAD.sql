-- Allow anyone (even unauthenticated users) to upload to 'videos' bucket
create policy "Public insert for videos"
on storage.objects
for insert
to public
with check (bucket_id = 'videos');

-- Allow anyone to read from 'videos' bucket
create policy "Public read for videos"
on storage.objects
for select
to public
using (bucket_id = 'videos');
