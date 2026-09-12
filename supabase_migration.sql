-- Add user_id column to links table
alter table public.links add column user_id text;
create index links_user_id_idx on public.links(user_id);
