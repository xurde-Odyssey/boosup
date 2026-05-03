create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_snapshot text,
  rate_snapshot numeric(12, 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_organization_id on public.order_items(organization_id);

alter table public.order_items enable row level security;

drop policy if exists "authenticated can read order items" on public.order_items;
create policy "authenticated can read order items"
on public.order_items
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert order items" on public.order_items;
create policy "authenticated can insert order items"
on public.order_items
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update order items" on public.order_items;
create policy "authenticated can update order items"
on public.order_items
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete order items" on public.order_items;
create policy "authenticated can delete order items"
on public.order_items
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop trigger if exists order_items_assign_organization_id on public.order_items;
create trigger order_items_assign_organization_id
before insert or update on public.order_items
for each row
execute function public.assign_current_organization_id();

drop trigger if exists order_items_set_updated_at on public.order_items;
create trigger order_items_set_updated_at
before update on public.order_items
for each row
execute function public.set_updated_at();
