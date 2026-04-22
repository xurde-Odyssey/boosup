create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null,
  title text not null,
  description text,
  amount numeric(12, 2),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_activity_logs_created_at
  on public.activity_logs(created_at desc);

create index if not exists idx_activity_logs_module_created_at
  on public.activity_logs(module, created_at desc);

alter table public.activity_logs enable row level security;

drop policy if exists "authenticated can read activity logs" on public.activity_logs;
create policy "authenticated can read activity logs"
on public.activity_logs
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert activity logs" on public.activity_logs;
create policy "authenticated can insert activity logs"
on public.activity_logs
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can delete activity logs" on public.activity_logs;
create policy "authenticated can delete activity logs"
on public.activity_logs
for delete
to authenticated
using (true);
