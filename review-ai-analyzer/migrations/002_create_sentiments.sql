create table if not exists public.sentiments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text,
  analysis_title text,
  analysis_stats jsonb,
  full_transcription text,
  sentiment_details jsonb,
  created_at timestamptz not null default now()
);

alter table public.sentiments enable row level security;

create policy "Users can read own sentiments"
on public.sentiments
for select
using (auth.uid() = user_id);

create policy "Users can insert own sentiments"
on public.sentiments
for insert
with check (auth.uid() = user_id);

create policy "Users can delete own sentiments"
on public.sentiments
for delete
using (auth.uid() = user_id);

