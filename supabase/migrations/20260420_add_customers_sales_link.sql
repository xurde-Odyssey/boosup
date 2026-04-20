create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  email text,
  notes text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  organization_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_customers_name on public.customers(name);
create index if not exists idx_customers_status on public.customers(status);

alter table public.sales
add column if not exists customer_id uuid references public.customers(id) on delete set null;

create index if not exists idx_sales_customer_id on public.sales(customer_id);

alter table public.customers enable row level security;

drop policy if exists "anon can read customers" on public.customers;
drop policy if exists "authenticated can read customers" on public.customers;
create policy "authenticated can read customers"
on public.customers
for select
to authenticated
using (true);

drop policy if exists "anon can insert customers" on public.customers;
drop policy if exists "authenticated can insert customers" on public.customers;
create policy "authenticated can insert customers"
on public.customers
for insert
to authenticated
with check (true);

drop policy if exists "anon can update customers" on public.customers;
drop policy if exists "authenticated can update customers" on public.customers;
create policy "authenticated can update customers"
on public.customers
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete customers" on public.customers;
drop policy if exists "authenticated can delete customers" on public.customers;
create policy "authenticated can delete customers"
on public.customers
for delete
to authenticated
using (true);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

notify pgrst, 'reload schema';
