create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'OWNER' check (role in ('OWNER', 'ADMIN', 'STAFF', 'VIEWER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create index if not exists idx_organization_users_user_id
  on public.organization_users(user_id);

create index if not exists idx_organization_users_org_user
  on public.organization_users(organization_id, user_id);

create or replace function public.get_current_user_organization_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select ou.organization_id
  from public.organization_users ou
  where ou.user_id = auth.uid()
    and ou.status = 'ACTIVE'
  order by
    case ou.role
      when 'OWNER' then 1
      when 'ADMIN' then 2
      when 'STAFF' then 3
      else 4
    end,
    ou.created_at asc
  limit 1
$$;

create or replace function public.user_belongs_to_organization(p_organization_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_users ou
    where ou.organization_id = p_organization_id
      and ou.user_id = auth.uid()
      and ou.status = 'ACTIVE'
  )
$$;

alter table public.products
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.vendors
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.company_settings
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.activity_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.staff_profiles
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.staff_salary_payments
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.staff_salary_ledgers
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.staff_salary_transactions
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.customers
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.sales
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.sales_items
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.sales_payments
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.customer_payments
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.customer_payment_allocations
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.purchases
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.purchase_items
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.purchase_expenses
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.purchase_payments
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.supplier_payments
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.supplier_payment_allocations
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_products_organization_id on public.products(organization_id);
create index if not exists idx_vendors_organization_id on public.vendors(organization_id);
create index if not exists idx_company_settings_organization_id on public.company_settings(organization_id);
create index if not exists idx_activity_logs_organization_id on public.activity_logs(organization_id);
create index if not exists idx_staff_profiles_organization_id on public.staff_profiles(organization_id);
create index if not exists idx_staff_salary_payments_organization_id on public.staff_salary_payments(organization_id);
create index if not exists idx_staff_salary_ledgers_organization_id on public.staff_salary_ledgers(organization_id);
create index if not exists idx_staff_salary_transactions_organization_id on public.staff_salary_transactions(organization_id);
create index if not exists idx_customers_organization_id on public.customers(organization_id);
create index if not exists idx_sales_organization_id on public.sales(organization_id);
create index if not exists idx_sales_items_organization_id on public.sales_items(organization_id);
create index if not exists idx_sales_payments_organization_id on public.sales_payments(organization_id);
create index if not exists idx_customer_payments_organization_id on public.customer_payments(organization_id);
create index if not exists idx_customer_payment_allocations_organization_id on public.customer_payment_allocations(organization_id);
create index if not exists idx_purchases_organization_id on public.purchases(organization_id);
create index if not exists idx_purchase_items_organization_id on public.purchase_items(organization_id);
create index if not exists idx_purchase_expenses_organization_id on public.purchase_expenses(organization_id);
create index if not exists idx_purchase_payments_organization_id on public.purchase_payments(organization_id);
create index if not exists idx_supplier_payments_organization_id on public.supplier_payments(organization_id);
create index if not exists idx_supplier_payment_allocations_organization_id on public.supplier_payment_allocations(organization_id);

notify pgrst, 'reload schema';
