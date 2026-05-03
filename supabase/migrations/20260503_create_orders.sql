create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  items_summary text not null,
  order_date date not null default current_date,
  status text not null default 'NEW' check (status in ('NEW', 'PREPARING', 'DELIVERED', 'CANCELLED', 'CONVERTED')),
  notes text,
  converted_sale_id uuid references public.sales(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_order_date on public.orders(order_date desc);
create index if not exists idx_orders_organization_id on public.orders(organization_id);

alter table public.orders enable row level security;

drop policy if exists "authenticated can read orders" on public.orders;
create policy "authenticated can read orders"
on public.orders
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert orders" on public.orders;
create policy "authenticated can insert orders"
on public.orders
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update orders" on public.orders;
create policy "authenticated can update orders"
on public.orders
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete orders" on public.orders;
create policy "authenticated can delete orders"
on public.orders
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop trigger if exists orders_assign_organization_id on public.orders;
create trigger orders_assign_organization_id
before insert or update on public.orders
for each row
execute function public.assign_current_organization_id();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();
