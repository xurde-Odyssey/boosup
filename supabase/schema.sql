create extension if not exists pgcrypto;

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
security definer
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
security definer
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  code text not null unique,
  name text not null unique,
  category text not null default 'General',
  sales_rate numeric(12, 2) not null default 0 check (sales_rate >= 0),
  purchase_rate numeric(12, 2) not null default 0 check (purchase_rate >= 0),
  unit text not null default 'Piece',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DRAFT', 'INACTIVE')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  vendor_code text not null unique,
  name text not null unique,
  contact_person text,
  phone text,
  address text,
  payment_terms text not null default 'Cash',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ON HOLD', 'INACTIVE')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  business_name text not null default '',
  address text,
  phone text,
  email text,
  website text,
  logo_path text,
  favicon_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  module text not null,
  action text not null,
  title text not null,
  description text,
  amount numeric(12, 2),
  entity_type text,
  entity_id uuid,
  actor_user_id uuid,
  actor_email text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.activity_logs
  add column if not exists actor_user_id uuid;

alter table public.activity_logs
  add column if not exists actor_email text;

alter table public.activity_logs
  add column if not exists reason text;

create index if not exists idx_activity_logs_created_at
  on public.activity_logs(created_at desc);

create index if not exists idx_activity_logs_module_created_at
  on public.activity_logs(module, created_at desc);

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  staff_code text not null unique,
  name text not null,
  address text,
  phone text,
  total_salary numeric(12, 2) not null default 0 check (total_salary >= 0),
  advance_salary numeric(12, 2) not null default 0 check (advance_salary >= 0),
  remaining_salary numeric(12, 2) generated always as (greatest(total_salary - advance_salary, 0)) stored,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff_salary_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  salary_month_bs text not null,
  payment_date date not null default current_date,
  payment_type text not null default 'ADVANCE',
  working_days integer not null default 30 check (working_days > 0),
  leave_days integer not null default 0 check (leave_days >= 0),
  monthly_salary numeric(12, 2) not null default 0 check (monthly_salary >= 0),
  advance_payment numeric(12, 2) not null default 0 check (advance_payment >= 0),
  monthly_payment numeric(12, 2) generated always as (
    case
      when working_days > 0 then round(
        (monthly_salary * greatest(working_days - leave_days, 0)::numeric) / working_days::numeric,
        2
      )
      else monthly_salary
    end
  ) stored,
  remaining_payment numeric(12, 2) generated always as (
    greatest(
      case
        when working_days > 0 then round(
          (monthly_salary * greatest(working_days - leave_days, 0)::numeric) / working_days::numeric,
          2
        )
        else monthly_salary
      end - advance_payment,
      0
    )
  ) stored,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.staff_salary_ledgers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  base_salary numeric(12, 2) not null default 0 check (base_salary >= 0),
  working_days integer not null default 30 check (working_days > 0),
  leave_days integer not null default 0 check (leave_days >= 0),
  total_advance numeric(12, 2) not null default 0 check (total_advance >= 0),
  salary_paid numeric(12, 2) not null default 0 check (salary_paid >= 0),
  total_paid numeric(12, 2) not null default 0 check (total_paid >= 0),
  remaining numeric(12, 2) not null default 0 check (remaining >= 0),
  carry_forward numeric(12, 2) not null default 0 check (carry_forward >= 0),
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (staff_id, month, year)
);

create table if not exists public.staff_salary_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  ledger_id uuid not null references public.staff_salary_ledgers(id) on delete cascade,
  transaction_date date not null default current_date,
  type text not null default 'ADVANCE' check (type in ('ADVANCE', 'SALARY')),
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_staff_salary_ledgers_staff_period
  on public.staff_salary_ledgers(staff_id, year, month);

create index if not exists idx_staff_salary_transactions_staff_date
  on public.staff_salary_transactions(staff_id, transaction_date);

create index if not exists idx_staff_salary_transactions_ledger_id
  on public.staff_salary_transactions(ledger_id);

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

alter table public.staff_salary_payments
  add column if not exists payment_type text not null default 'ADVANCE';

alter table public.staff_salary_payments
  drop constraint if exists staff_salary_payments_payment_type_check;

alter table public.staff_salary_payments
  add constraint staff_salary_payments_payment_type_check
  check (payment_type in ('ADVANCE', 'SALARY'));

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  invoice_number text not null,
  record_status text not null default 'ACTIVE' check (record_status in ('ACTIVE', 'ARCHIVED')),
  adjusted_from_id uuid references public.sales(id) on delete set null,
  superseded_by_id uuid references public.sales(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid,
  archive_reason text,
  customer_name text not null,
  customer_phone text,
  sales_date date not null default current_date,
  due_date date not null default current_date,
  payment_status text not null default 'PENDING' check (payment_status in ('PAID', 'PENDING', 'PARTIAL', 'OVERDUE')),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  amount_received numeric(12, 2) not null default 0 check (amount_received >= 0),
  grand_total numeric(12, 2) generated always as (greatest(subtotal - discount + tax, 0)) stored,
  remaining_amount numeric(12, 2) generated always as (greatest((subtotal - discount + tax) - amount_received, 0)) stored,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.sales
drop constraint if exists sales_invoice_number_key;

alter table public.sales
add column if not exists amount_received numeric(12, 2) not null default 0 check (amount_received >= 0);

alter table public.sales
add column if not exists remaining_amount numeric(12, 2)
generated always as (greatest((subtotal - discount + tax) - amount_received, 0)) stored;

alter table public.sales
add column if not exists customer_id uuid references public.customers(id) on delete set null;

alter table public.sales
add column if not exists customer_phone text;

alter table public.sales
add column if not exists due_date date;

update public.sales
set due_date = coalesce(due_date, sales_date);

alter table public.sales
alter column due_date set not null;

alter table public.sales
alter column due_date set default current_date;

alter table public.sales
drop constraint if exists sales_record_status_check;

alter table public.sales
add column if not exists record_status text not null default 'ACTIVE';

alter table public.sales
add column if not exists adjusted_from_id uuid references public.sales(id) on delete set null;

alter table public.sales
add column if not exists superseded_by_id uuid references public.sales(id) on delete set null;

alter table public.sales
add column if not exists archived_at timestamptz;

alter table public.sales
add column if not exists archived_by uuid;

alter table public.sales
add column if not exists archive_reason text;

alter table public.sales
add constraint sales_record_status_check
check (record_status in ('ACTIVE', 'SUPERSEDED', 'CANCELLED', 'ARCHIVED'));

update public.sales
set
  record_status = 'ARCHIVED',
  archived_at = coalesce(archived_at, updated_at, created_at, timezone('utc', now())),
  archive_reason = coalesce(
    nullif(archive_reason, ''),
    case
      when record_status = 'SUPERSEDED' then 'Migrated from legacy superseded invoice'
      when record_status = 'CANCELLED' then 'Migrated from legacy cancelled invoice'
      else 'Archived from legacy inactive invoice'
    end
  )
where record_status in ('SUPERSEDED', 'CANCELLED');

alter table public.sales
drop constraint if exists sales_record_status_check;

alter table public.sales
add constraint sales_record_status_check
check (record_status in ('ACTIVE', 'ARCHIVED'));

create index if not exists idx_sales_customer_id on public.sales(customer_id);
create index if not exists idx_sales_record_status on public.sales(record_status);
create index if not exists idx_sales_adjusted_from_id on public.sales(adjusted_from_id);
create index if not exists idx_sales_superseded_by_id on public.sales(superseded_by_id);
create index if not exists idx_sales_archived_at on public.sales(archived_at desc);

create table if not exists public.sales_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  rate numeric(12, 2) not null default 0 check (rate >= 0),
  taxable boolean not null default false,
  tax_amount numeric(12, 2) generated always as (
    case when taxable then quantity * rate * 0.13 else 0 end
  ) stored,
  amount numeric(12, 2) generated always as (quantity * rate) stored,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.sales_items
add column if not exists taxable boolean not null default false;

create table if not exists public.sales_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  sale_id uuid not null references public.sales(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Mobile')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  customer_payment_id uuid not null references public.customer_payments(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.sales_payments
add column if not exists customer_payment_id uuid references public.customer_payments(id) on delete set null;

create index if not exists idx_customer_payments_customer_id
  on public.customer_payments(customer_id);

create index if not exists idx_customer_payments_customer_id_payment_date
  on public.customer_payments(customer_id, payment_date desc);

create index if not exists idx_customer_payment_allocations_payment_id
  on public.customer_payment_allocations(customer_payment_id);

create index if not exists idx_customer_payment_allocations_sale_id
  on public.customer_payment_allocations(sale_id);

create index if not exists idx_sales_payments_customer_payment_id
  on public.sales_payments(customer_payment_id);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  purchase_number text not null unique,
  record_status text not null default 'ACTIVE' check (record_status in ('ACTIVE', 'SUPERSEDED', 'CANCELLED')),
  adjusted_from_id uuid references public.purchases(id) on delete set null,
  superseded_by_id uuid references public.purchases(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete restrict,
  vendor_name text,
  purchase_date date not null default current_date,
  payment_status text not null default 'PENDING' check (payment_status in ('PAID', 'PENDING', 'PARTIAL', 'OVERDUE')),
  payment_type text not null default 'Credit' check (payment_type in ('Cash', 'Credit')),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Mobile')),
  misc_expense_amount numeric(12, 2) not null default 0 check (misc_expense_amount >= 0),
  misc_expense_note text,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  credit_amount numeric(12, 2) generated always as (greatest(total_amount - paid_amount, 0)) stored,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.purchases
add column if not exists payment_status text not null default 'PENDING'
check (payment_status in ('PAID', 'PENDING', 'PARTIAL', 'OVERDUE'));

alter table public.purchases
alter column vendor_id drop not null;

alter table public.purchases
add column if not exists vendor_name text;

alter table public.purchases
add column if not exists payment_method text not null default 'Cash'
check (payment_method in ('Cash', 'Mobile'));

alter table public.purchases
add column if not exists misc_expense_amount numeric(12, 2) not null default 0
check (misc_expense_amount >= 0);

alter table public.purchases
add column if not exists misc_expense_note text;

alter table public.purchases
add column if not exists record_status text not null default 'ACTIVE'
check (record_status in ('ACTIVE', 'SUPERSEDED', 'CANCELLED'));

alter table public.purchases
add column if not exists adjusted_from_id uuid references public.purchases(id) on delete set null;

alter table public.purchases
add column if not exists superseded_by_id uuid references public.purchases(id) on delete set null;

create index if not exists idx_purchases_record_status on public.purchases(record_status);
create index if not exists idx_purchases_adjusted_from_id on public.purchases(adjusted_from_id);
create index if not exists idx_purchases_superseded_by_id on public.purchases(superseded_by_id);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  rate numeric(12, 2) not null default 0 check (rate >= 0),
  amount numeric(12, 2) generated always as (quantity * rate) stored,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchase_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  expense_date date not null default current_date,
  expense_title text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Mobile')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Mobile')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.supplier_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  supplier_payment_id uuid not null references public.supplier_payments(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_purchases_vendor_id
  on public.purchases(vendor_id);

create index if not exists idx_purchases_vendor_id_id
  on public.purchases(vendor_id, id);

create index if not exists idx_purchase_payments_purchase_id
  on public.purchase_payments(purchase_id);

create index if not exists idx_supplier_payments_vendor_id
  on public.supplier_payments(vendor_id);

create index if not exists idx_supplier_payments_vendor_id_payment_date
  on public.supplier_payments(vendor_id, payment_date desc);

create index if not exists idx_supplier_payment_allocations_supplier_payment_id
  on public.supplier_payment_allocations(supplier_payment_id);

create index if not exists idx_supplier_payment_allocations_purchase_id
  on public.supplier_payment_allocations(purchase_id);

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
create index if not exists idx_orders_organization_id on public.orders(organization_id);
create index if not exists idx_order_items_organization_id on public.order_items(organization_id);
create index if not exists idx_customer_payments_organization_id on public.customer_payments(organization_id);
create index if not exists idx_customer_payment_allocations_organization_id on public.customer_payment_allocations(organization_id);
create index if not exists idx_purchases_organization_id on public.purchases(organization_id);
create index if not exists idx_purchase_items_organization_id on public.purchase_items(organization_id);
create index if not exists idx_purchase_expenses_organization_id on public.purchase_expenses(organization_id);
create index if not exists idx_purchase_payments_organization_id on public.purchase_payments(organization_id);
create index if not exists idx_supplier_payments_organization_id on public.supplier_payments(organization_id);
create index if not exists idx_supplier_payment_allocations_organization_id on public.supplier_payment_allocations(organization_id);

create or replace function public.get_vendor_purchase_summary(p_vendor_id uuid)
returns table (
  total_purchase_amount numeric(12,2),
  total_paid numeric(12,2),
  total_outstanding numeric(12,2),
  total_bills integer
)
language sql
stable
as $$
  with vendor_purchases as (
    select
      p.id,
      p.total_amount
    from public.purchases p
    where p.vendor_id = p_vendor_id
  ),
  payments_by_purchase as (
    select
      pp.purchase_id,
      sum(pp.amount) as paid_amount
    from public.purchase_payments pp
    join vendor_purchases vp
      on vp.id = pp.purchase_id
    group by pp.purchase_id
  )
  select
    coalesce(sum(vp.total_amount), 0)::numeric(12,2) as total_purchase_amount,
    coalesce(sum(coalesce(pbp.paid_amount, 0)), 0)::numeric(12,2) as total_paid,
    coalesce(
      sum(greatest(vp.total_amount - coalesce(pbp.paid_amount, 0), 0)),
      0
    )::numeric(12,2) as total_outstanding,
    count(vp.id)::integer as total_bills
  from vendor_purchases vp
  left join payments_by_purchase pbp
    on pbp.purchase_id = vp.id;
$$;

alter table public.products enable row level security;
alter table public.vendors enable row level security;
alter table public.company_settings enable row level security;
alter table public.activity_logs enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.staff_salary_payments enable row level security;
alter table public.staff_salary_ledgers enable row level security;
alter table public.staff_salary_transactions enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sales_items enable row level security;
alter table public.sales_payments enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customer_payments enable row level security;
alter table public.customer_payment_allocations enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.purchase_expenses enable row level security;
alter table public.purchase_payments enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.supplier_payment_allocations enable row level security;

drop policy if exists "anon can read products" on public.products;
drop policy if exists "authenticated can read products" on public.products;
create policy "authenticated can read products"
on public.products
for select
to authenticated
using (true);

drop policy if exists "anon can insert products" on public.products;
drop policy if exists "authenticated can insert products" on public.products;
create policy "authenticated can insert products"
on public.products
for insert
to authenticated
with check (true);

drop policy if exists "anon can update products" on public.products;
drop policy if exists "authenticated can update products" on public.products;
create policy "authenticated can update products"
on public.products
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete products" on public.products;
drop policy if exists "authenticated can delete products" on public.products;
create policy "authenticated can delete products"
on public.products
for delete
to authenticated
using (true);

drop policy if exists "anon can read vendors" on public.vendors;
drop policy if exists "authenticated can read vendors" on public.vendors;
create policy "authenticated can read vendors"
on public.vendors
for select
to authenticated
using (true);

drop policy if exists "anon can insert vendors" on public.vendors;
drop policy if exists "authenticated can insert vendors" on public.vendors;
create policy "authenticated can insert vendors"
on public.vendors
for insert
to authenticated
with check (true);

drop policy if exists "anon can update vendors" on public.vendors;
drop policy if exists "authenticated can update vendors" on public.vendors;
create policy "authenticated can update vendors"
on public.vendors
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete vendors" on public.vendors;
drop policy if exists "authenticated can delete vendors" on public.vendors;
create policy "authenticated can delete vendors"
on public.vendors
for delete
to authenticated
using (true);

drop policy if exists "anon can read company settings" on public.company_settings;
drop policy if exists "authenticated can read company settings" on public.company_settings;
create policy "authenticated can read company settings"
on public.company_settings
for select
to authenticated
using (true);

drop policy if exists "anon can insert company settings" on public.company_settings;
drop policy if exists "authenticated can insert company settings" on public.company_settings;
create policy "authenticated can insert company settings"
on public.company_settings
for insert
to authenticated
with check (true);

drop policy if exists "anon can update company settings" on public.company_settings;
drop policy if exists "authenticated can update company settings" on public.company_settings;
create policy "authenticated can update company settings"
on public.company_settings
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete company settings" on public.company_settings;
drop policy if exists "authenticated can delete company settings" on public.company_settings;
create policy "authenticated can delete company settings"
on public.company_settings
for delete
to authenticated
using (true);

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

drop policy if exists "anon can read staff profiles" on public.staff_profiles;
drop policy if exists "authenticated can read staff profiles" on public.staff_profiles;
create policy "authenticated can read staff profiles"
on public.staff_profiles
for select
to authenticated
using (true);

drop policy if exists "anon can insert staff profiles" on public.staff_profiles;
drop policy if exists "authenticated can insert staff profiles" on public.staff_profiles;
create policy "authenticated can insert staff profiles"
on public.staff_profiles
for insert
to authenticated
with check (true);

drop policy if exists "anon can update staff profiles" on public.staff_profiles;
drop policy if exists "authenticated can update staff profiles" on public.staff_profiles;
create policy "authenticated can update staff profiles"
on public.staff_profiles
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete staff profiles" on public.staff_profiles;
drop policy if exists "authenticated can delete staff profiles" on public.staff_profiles;
create policy "authenticated can delete staff profiles"
on public.staff_profiles
for delete
to authenticated
using (true);

drop policy if exists "anon can read staff salary payments" on public.staff_salary_payments;
drop policy if exists "authenticated can read staff salary payments" on public.staff_salary_payments;
create policy "authenticated can read staff salary payments"
on public.staff_salary_payments
for select
to authenticated
using (true);

drop policy if exists "anon can insert staff salary payments" on public.staff_salary_payments;
drop policy if exists "authenticated can insert staff salary payments" on public.staff_salary_payments;
create policy "authenticated can insert staff salary payments"
on public.staff_salary_payments
for insert
to authenticated
with check (true);

drop policy if exists "anon can update staff salary payments" on public.staff_salary_payments;
drop policy if exists "authenticated can update staff salary payments" on public.staff_salary_payments;
create policy "authenticated can update staff salary payments"
on public.staff_salary_payments
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete staff salary payments" on public.staff_salary_payments;
drop policy if exists "authenticated can delete staff salary payments" on public.staff_salary_payments;
create policy "authenticated can delete staff salary payments"
on public.staff_salary_payments
for delete
to authenticated
using (true);

drop policy if exists "anon can read staff salary ledgers" on public.staff_salary_ledgers;
drop policy if exists "authenticated can read staff salary ledgers" on public.staff_salary_ledgers;
create policy "authenticated can read staff salary ledgers"
on public.staff_salary_ledgers
for select
to authenticated
using (true);

drop policy if exists "anon can insert staff salary ledgers" on public.staff_salary_ledgers;
drop policy if exists "authenticated can insert staff salary ledgers" on public.staff_salary_ledgers;
create policy "authenticated can insert staff salary ledgers"
on public.staff_salary_ledgers
for insert
to authenticated
with check (true);

drop policy if exists "anon can update staff salary ledgers" on public.staff_salary_ledgers;
drop policy if exists "authenticated can update staff salary ledgers" on public.staff_salary_ledgers;
create policy "authenticated can update staff salary ledgers"
on public.staff_salary_ledgers
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete staff salary ledgers" on public.staff_salary_ledgers;
drop policy if exists "authenticated can delete staff salary ledgers" on public.staff_salary_ledgers;
create policy "authenticated can delete staff salary ledgers"
on public.staff_salary_ledgers
for delete
to authenticated
using (true);

drop policy if exists "anon can read staff salary transactions" on public.staff_salary_transactions;
drop policy if exists "authenticated can read staff salary transactions" on public.staff_salary_transactions;
create policy "authenticated can read staff salary transactions"
on public.staff_salary_transactions
for select
to authenticated
using (true);

drop policy if exists "anon can insert staff salary transactions" on public.staff_salary_transactions;
drop policy if exists "authenticated can insert staff salary transactions" on public.staff_salary_transactions;
create policy "authenticated can insert staff salary transactions"
on public.staff_salary_transactions
for insert
to authenticated
with check (true);

drop policy if exists "anon can update staff salary transactions" on public.staff_salary_transactions;
drop policy if exists "authenticated can update staff salary transactions" on public.staff_salary_transactions;
create policy "authenticated can update staff salary transactions"
on public.staff_salary_transactions
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete staff salary transactions" on public.staff_salary_transactions;
drop policy if exists "authenticated can delete staff salary transactions" on public.staff_salary_transactions;
create policy "authenticated can delete staff salary transactions"
on public.staff_salary_transactions
for delete
to authenticated
using (true);

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

drop policy if exists "anon can read sales" on public.sales;
drop policy if exists "authenticated can read sales" on public.sales;
create policy "authenticated can read sales"
on public.sales
for select
to authenticated
using (true);

drop policy if exists "anon can insert sales" on public.sales;
drop policy if exists "authenticated can insert sales" on public.sales;
create policy "authenticated can insert sales"
on public.sales
for insert
to authenticated
with check (true);

drop policy if exists "anon can update sales" on public.sales;
drop policy if exists "authenticated can update sales" on public.sales;
create policy "authenticated can update sales"
on public.sales
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete sales" on public.sales;
drop policy if exists "authenticated can delete sales" on public.sales;
create policy "authenticated can delete sales"
on public.sales
for delete
to authenticated
using (true);

drop policy if exists "anon can read sales items" on public.sales_items;
drop policy if exists "authenticated can read sales items" on public.sales_items;
create policy "authenticated can read sales items"
on public.sales_items
for select
to authenticated
using (true);

drop policy if exists "anon can insert sales items" on public.sales_items;
drop policy if exists "authenticated can insert sales items" on public.sales_items;
create policy "authenticated can insert sales items"
on public.sales_items
for insert
to authenticated
with check (true);

drop policy if exists "anon can update sales items" on public.sales_items;
drop policy if exists "authenticated can update sales items" on public.sales_items;
create policy "authenticated can update sales items"
on public.sales_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete sales items" on public.sales_items;
drop policy if exists "authenticated can delete sales items" on public.sales_items;
create policy "authenticated can delete sales items"
on public.sales_items
for delete
to authenticated
using (true);

drop policy if exists "anon can read sales payments" on public.sales_payments;
drop policy if exists "authenticated can read sales payments" on public.sales_payments;
create policy "authenticated can read sales payments"
on public.sales_payments
for select
to authenticated
using (true);

drop policy if exists "anon can insert sales payments" on public.sales_payments;
drop policy if exists "authenticated can insert sales payments" on public.sales_payments;
create policy "authenticated can insert sales payments"
on public.sales_payments
for insert
to authenticated
with check (true);

drop policy if exists "anon can update sales payments" on public.sales_payments;
drop policy if exists "authenticated can update sales payments" on public.sales_payments;
create policy "authenticated can update sales payments"
on public.sales_payments
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete sales payments" on public.sales_payments;
drop policy if exists "authenticated can delete sales payments" on public.sales_payments;
create policy "authenticated can delete sales payments"
on public.sales_payments
for delete
to authenticated
using (true);

drop policy if exists "anon can read customer payments" on public.customer_payments;
drop policy if exists "authenticated can read customer payments" on public.customer_payments;
create policy "authenticated can read customer payments"
on public.customer_payments
for select
to authenticated
using (true);

drop policy if exists "anon can insert customer payments" on public.customer_payments;
drop policy if exists "authenticated can insert customer payments" on public.customer_payments;
create policy "authenticated can insert customer payments"
on public.customer_payments
for insert
to authenticated
with check (true);

drop policy if exists "anon can update customer payments" on public.customer_payments;
drop policy if exists "authenticated can update customer payments" on public.customer_payments;
create policy "authenticated can update customer payments"
on public.customer_payments
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete customer payments" on public.customer_payments;
drop policy if exists "authenticated can delete customer payments" on public.customer_payments;
create policy "authenticated can delete customer payments"
on public.customer_payments
for delete
to authenticated
using (true);

drop policy if exists "anon can read customer payment allocations" on public.customer_payment_allocations;
drop policy if exists "authenticated can read customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can read customer payment allocations"
on public.customer_payment_allocations
for select
to authenticated
using (true);

drop policy if exists "anon can insert customer payment allocations" on public.customer_payment_allocations;
drop policy if exists "authenticated can insert customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can insert customer payment allocations"
on public.customer_payment_allocations
for insert
to authenticated
with check (true);

drop policy if exists "anon can update customer payment allocations" on public.customer_payment_allocations;
drop policy if exists "authenticated can update customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can update customer payment allocations"
on public.customer_payment_allocations
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete customer payment allocations" on public.customer_payment_allocations;
drop policy if exists "authenticated can delete customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can delete customer payment allocations"
on public.customer_payment_allocations
for delete
to authenticated
using (true);

drop policy if exists "anon can read purchases" on public.purchases;
drop policy if exists "authenticated can read purchases" on public.purchases;
create policy "authenticated can read purchases"
on public.purchases
for select
to authenticated
using (true);

drop policy if exists "anon can insert purchases" on public.purchases;
drop policy if exists "authenticated can insert purchases" on public.purchases;
create policy "authenticated can insert purchases"
on public.purchases
for insert
to authenticated
with check (true);

drop policy if exists "anon can update purchases" on public.purchases;
drop policy if exists "authenticated can update purchases" on public.purchases;
create policy "authenticated can update purchases"
on public.purchases
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete purchases" on public.purchases;
drop policy if exists "authenticated can delete purchases" on public.purchases;
create policy "authenticated can delete purchases"
on public.purchases
for delete
to authenticated
using (true);

drop policy if exists "anon can read purchase items" on public.purchase_items;
drop policy if exists "authenticated can read purchase items" on public.purchase_items;
create policy "authenticated can read purchase items"
on public.purchase_items
for select
to authenticated
using (true);

drop policy if exists "anon can insert purchase items" on public.purchase_items;
drop policy if exists "authenticated can insert purchase items" on public.purchase_items;
create policy "authenticated can insert purchase items"
on public.purchase_items
for insert
to authenticated
with check (true);

drop policy if exists "anon can update purchase items" on public.purchase_items;
drop policy if exists "authenticated can update purchase items" on public.purchase_items;
create policy "authenticated can update purchase items"
on public.purchase_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete purchase items" on public.purchase_items;
drop policy if exists "authenticated can delete purchase items" on public.purchase_items;
create policy "authenticated can delete purchase items"
on public.purchase_items
for delete
to authenticated
using (true);

drop policy if exists "anon can read purchase payments" on public.purchase_payments;
drop policy if exists "authenticated can read purchase payments" on public.purchase_payments;
create policy "authenticated can read purchase payments"
on public.purchase_payments
for select
to authenticated
using (true);

drop policy if exists "anon can insert purchase payments" on public.purchase_payments;
drop policy if exists "authenticated can insert purchase payments" on public.purchase_payments;
create policy "authenticated can insert purchase payments"
on public.purchase_payments
for insert
to authenticated
with check (true);

drop policy if exists "anon can update purchase payments" on public.purchase_payments;
drop policy if exists "authenticated can update purchase payments" on public.purchase_payments;
create policy "authenticated can update purchase payments"
on public.purchase_payments
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete purchase payments" on public.purchase_payments;
drop policy if exists "authenticated can delete purchase payments" on public.purchase_payments;
create policy "authenticated can delete purchase payments"
on public.purchase_payments
for delete
to authenticated
using (true);

drop policy if exists "anon can read supplier payments" on public.supplier_payments;
drop policy if exists "authenticated can read supplier payments" on public.supplier_payments;
create policy "authenticated can read supplier payments"
on public.supplier_payments
for select
to authenticated
using (true);

drop policy if exists "anon can insert supplier payments" on public.supplier_payments;
drop policy if exists "authenticated can insert supplier payments" on public.supplier_payments;
create policy "authenticated can insert supplier payments"
on public.supplier_payments
for insert
to authenticated
with check (true);

drop policy if exists "anon can update supplier payments" on public.supplier_payments;
drop policy if exists "authenticated can update supplier payments" on public.supplier_payments;
create policy "authenticated can update supplier payments"
on public.supplier_payments
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete supplier payments" on public.supplier_payments;
drop policy if exists "authenticated can delete supplier payments" on public.supplier_payments;
create policy "authenticated can delete supplier payments"
on public.supplier_payments
for delete
to authenticated
using (true);

drop policy if exists "anon can read supplier payment allocations" on public.supplier_payment_allocations;
drop policy if exists "authenticated can read supplier payment allocations" on public.supplier_payment_allocations;
create policy "authenticated can read supplier payment allocations"
on public.supplier_payment_allocations
for select
to authenticated
using (true);

drop policy if exists "anon can insert supplier payment allocations" on public.supplier_payment_allocations;
drop policy if exists "authenticated can insert supplier payment allocations" on public.supplier_payment_allocations;
create policy "authenticated can insert supplier payment allocations"
on public.supplier_payment_allocations
for insert
to authenticated
with check (true);

drop policy if exists "anon can update supplier payment allocations" on public.supplier_payment_allocations;
drop policy if exists "authenticated can update supplier payment allocations" on public.supplier_payment_allocations;
create policy "authenticated can update supplier payment allocations"
on public.supplier_payment_allocations
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete supplier payment allocations" on public.supplier_payment_allocations;
drop policy if exists "authenticated can delete supplier payment allocations" on public.supplier_payment_allocations;
create policy "authenticated can delete supplier payment allocations"
on public.supplier_payment_allocations
for delete
to authenticated
using (true);

drop policy if exists "anon can read purchase expenses" on public.purchase_expenses;
drop policy if exists "authenticated can read purchase expenses" on public.purchase_expenses;
create policy "authenticated can read purchase expenses"
on public.purchase_expenses
for select
to authenticated
using (true);

drop policy if exists "anon can insert purchase expenses" on public.purchase_expenses;
drop policy if exists "authenticated can insert purchase expenses" on public.purchase_expenses;
create policy "authenticated can insert purchase expenses"
on public.purchase_expenses
for insert
to authenticated
with check (true);

drop policy if exists "anon can update purchase expenses" on public.purchase_expenses;
drop policy if exists "authenticated can update purchase expenses" on public.purchase_expenses;
create policy "authenticated can update purchase expenses"
on public.purchase_expenses
for update
to authenticated
using (true)
with check (true);

drop policy if exists "anon can delete purchase expenses" on public.purchase_expenses;
drop policy if exists "authenticated can delete purchase expenses" on public.purchase_expenses;
create policy "authenticated can delete purchase expenses"
on public.purchase_expenses
for delete
to authenticated
using (true);

do $$
declare
  v_default_organization_id uuid;
  v_owner_user_id uuid;
begin
  insert into public.organizations (name, slug)
  values ('Default Organization', 'default-organization')
  on conflict (slug) do update
    set name = excluded.name
  returning id into v_default_organization_id;

  if v_default_organization_id is null then
    select id
    into v_default_organization_id
    from public.organizations
    where slug = 'default-organization'
    limit 1;
  end if;

  select id
  into v_owner_user_id
  from auth.users
  order by created_at asc
  limit 1;

  if v_owner_user_id is not null then
    insert into public.organization_users (
      organization_id,
      user_id,
      role,
      status
    )
    values (
      v_default_organization_id,
      v_owner_user_id,
      'OWNER',
      'ACTIVE'
    )
    on conflict (organization_id, user_id) do nothing;
  end if;

  update public.products set organization_id = v_default_organization_id where organization_id is null;
  update public.vendors set organization_id = v_default_organization_id where organization_id is null;
  update public.company_settings set organization_id = v_default_organization_id where organization_id is null;
  update public.activity_logs set organization_id = v_default_organization_id where organization_id is null;
  update public.staff_profiles set organization_id = v_default_organization_id where organization_id is null;
  update public.staff_salary_payments set organization_id = v_default_organization_id where organization_id is null;
  update public.staff_salary_ledgers set organization_id = v_default_organization_id where organization_id is null;
  update public.staff_salary_transactions set organization_id = v_default_organization_id where organization_id is null;
  update public.customers set organization_id = v_default_organization_id where organization_id is null;
  update public.sales set organization_id = v_default_organization_id where organization_id is null;
  update public.sales_items set organization_id = v_default_organization_id where organization_id is null;
  update public.sales_payments set organization_id = v_default_organization_id where organization_id is null;
  update public.customer_payments set organization_id = v_default_organization_id where organization_id is null;
  update public.customer_payment_allocations set organization_id = v_default_organization_id where organization_id is null;
  update public.purchases set organization_id = v_default_organization_id where organization_id is null;
  update public.purchase_items set organization_id = v_default_organization_id where organization_id is null;
  update public.purchase_expenses set organization_id = v_default_organization_id where organization_id is null;
  update public.purchase_payments set organization_id = v_default_organization_id where organization_id is null;
  update public.supplier_payments set organization_id = v_default_organization_id where organization_id is null;
  update public.supplier_payment_allocations set organization_id = v_default_organization_id where organization_id is null;
end
$$;

create or replace function public.assign_current_organization_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.organization_id is null then
    new.organization_id := public.get_current_user_organization_id();
  end if;

  if tg_op = 'UPDATE' and old.organization_id is distinct from new.organization_id then
    raise exception 'organization_id cannot be changed';
  end if;

  if new.organization_id is null then
    raise exception 'organization_id is required';
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists organization_users_set_updated_at on public.organization_users;
create trigger organization_users_set_updated_at
before update on public.organization_users
for each row
execute function public.set_updated_at();

drop trigger if exists products_assign_organization_id on public.products;
create trigger products_assign_organization_id
before insert or update on public.products
for each row
execute function public.assign_current_organization_id();

drop trigger if exists vendors_assign_organization_id on public.vendors;
create trigger vendors_assign_organization_id
before insert or update on public.vendors
for each row
execute function public.assign_current_organization_id();

drop trigger if exists company_settings_assign_organization_id on public.company_settings;
create trigger company_settings_assign_organization_id
before insert or update on public.company_settings
for each row
execute function public.assign_current_organization_id();

drop trigger if exists activity_logs_assign_organization_id on public.activity_logs;
create trigger activity_logs_assign_organization_id
before insert or update on public.activity_logs
for each row
execute function public.assign_current_organization_id();

drop trigger if exists staff_profiles_assign_organization_id on public.staff_profiles;
create trigger staff_profiles_assign_organization_id
before insert or update on public.staff_profiles
for each row
execute function public.assign_current_organization_id();

drop trigger if exists staff_salary_payments_assign_organization_id on public.staff_salary_payments;
create trigger staff_salary_payments_assign_organization_id
before insert or update on public.staff_salary_payments
for each row
execute function public.assign_current_organization_id();

drop trigger if exists staff_salary_ledgers_assign_organization_id on public.staff_salary_ledgers;
create trigger staff_salary_ledgers_assign_organization_id
before insert or update on public.staff_salary_ledgers
for each row
execute function public.assign_current_organization_id();

drop trigger if exists staff_salary_transactions_assign_organization_id on public.staff_salary_transactions;
create trigger staff_salary_transactions_assign_organization_id
before insert or update on public.staff_salary_transactions
for each row
execute function public.assign_current_organization_id();

drop trigger if exists customers_assign_organization_id on public.customers;
create trigger customers_assign_organization_id
before insert or update on public.customers
for each row
execute function public.assign_current_organization_id();

drop trigger if exists sales_assign_organization_id on public.sales;
create trigger sales_assign_organization_id
before insert or update on public.sales
for each row
execute function public.assign_current_organization_id();

drop trigger if exists sales_items_assign_organization_id on public.sales_items;
create trigger sales_items_assign_organization_id
before insert or update on public.sales_items
for each row
execute function public.assign_current_organization_id();

drop trigger if exists sales_payments_assign_organization_id on public.sales_payments;
create trigger sales_payments_assign_organization_id
before insert or update on public.sales_payments
for each row
execute function public.assign_current_organization_id();

drop trigger if exists orders_assign_organization_id on public.orders;
create trigger orders_assign_organization_id
before insert or update on public.orders
for each row
execute function public.assign_current_organization_id();

drop trigger if exists order_items_assign_organization_id on public.order_items;
create trigger order_items_assign_organization_id
before insert or update on public.order_items
for each row
execute function public.assign_current_organization_id();

drop trigger if exists customer_payments_assign_organization_id on public.customer_payments;
create trigger customer_payments_assign_organization_id
before insert or update on public.customer_payments
for each row
execute function public.assign_current_organization_id();

drop trigger if exists customer_payment_allocations_assign_organization_id on public.customer_payment_allocations;
create trigger customer_payment_allocations_assign_organization_id
before insert or update on public.customer_payment_allocations
for each row
execute function public.assign_current_organization_id();

drop trigger if exists purchases_assign_organization_id on public.purchases;
create trigger purchases_assign_organization_id
before insert or update on public.purchases
for each row
execute function public.assign_current_organization_id();

drop trigger if exists purchase_items_assign_organization_id on public.purchase_items;
create trigger purchase_items_assign_organization_id
before insert or update on public.purchase_items
for each row
execute function public.assign_current_organization_id();

drop trigger if exists purchase_expenses_assign_organization_id on public.purchase_expenses;
create trigger purchase_expenses_assign_organization_id
before insert or update on public.purchase_expenses
for each row
execute function public.assign_current_organization_id();

drop trigger if exists purchase_payments_assign_organization_id on public.purchase_payments;
create trigger purchase_payments_assign_organization_id
before insert or update on public.purchase_payments
for each row
execute function public.assign_current_organization_id();

drop trigger if exists supplier_payments_assign_organization_id on public.supplier_payments;
create trigger supplier_payments_assign_organization_id
before insert or update on public.supplier_payments
for each row
execute function public.assign_current_organization_id();

drop trigger if exists supplier_payment_allocations_assign_organization_id on public.supplier_payment_allocations;
create trigger supplier_payment_allocations_assign_organization_id
before insert or update on public.supplier_payment_allocations
for each row
execute function public.assign_current_organization_id();

alter table public.organizations enable row level security;
alter table public.organization_users enable row level security;

drop policy if exists "authenticated can read organizations" on public.organizations;
create policy "authenticated can read organizations"
on public.organizations
for select
to authenticated
using (public.user_belongs_to_organization(id));

drop policy if exists "authenticated can update organizations" on public.organizations;
create policy "authenticated can update organizations"
on public.organizations
for update
to authenticated
using (public.user_belongs_to_organization(id))
with check (public.user_belongs_to_organization(id));

drop policy if exists "authenticated can read organization users" on public.organization_users;
create policy "authenticated can read organization users"
on public.organization_users
for select
to authenticated
using (public.user_belongs_to_organization(organization_id));

drop policy if exists "authenticated can manage organization users" on public.organization_users;
create policy "authenticated can manage organization users"
on public.organization_users
for all
to authenticated
using (public.user_belongs_to_organization(organization_id))
with check (public.user_belongs_to_organization(organization_id));

drop policy if exists "authenticated can read products" on public.products;
create policy "authenticated can read products"
on public.products
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert products" on public.products;
create policy "authenticated can insert products"
on public.products
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update products" on public.products;
create policy "authenticated can update products"
on public.products
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete products" on public.products;
create policy "authenticated can delete products"
on public.products
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read vendors" on public.vendors;
create policy "authenticated can read vendors"
on public.vendors
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert vendors" on public.vendors;
create policy "authenticated can insert vendors"
on public.vendors
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update vendors" on public.vendors;
create policy "authenticated can update vendors"
on public.vendors
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete vendors" on public.vendors;
create policy "authenticated can delete vendors"
on public.vendors
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read company settings" on public.company_settings;
create policy "authenticated can read company settings"
on public.company_settings
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert company settings" on public.company_settings;
create policy "authenticated can insert company settings"
on public.company_settings
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update company settings" on public.company_settings;
create policy "authenticated can update company settings"
on public.company_settings
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete company settings" on public.company_settings;
create policy "authenticated can delete company settings"
on public.company_settings
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read activity logs" on public.activity_logs;
create policy "authenticated can read activity logs"
on public.activity_logs
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert activity logs" on public.activity_logs;
create policy "authenticated can insert activity logs"
on public.activity_logs
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete activity logs" on public.activity_logs;
create policy "authenticated can delete activity logs"
on public.activity_logs
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read staff profiles" on public.staff_profiles;
create policy "authenticated can read staff profiles"
on public.staff_profiles
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert staff profiles" on public.staff_profiles;
create policy "authenticated can insert staff profiles"
on public.staff_profiles
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update staff profiles" on public.staff_profiles;
create policy "authenticated can update staff profiles"
on public.staff_profiles
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete staff profiles" on public.staff_profiles;
create policy "authenticated can delete staff profiles"
on public.staff_profiles
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read staff salary payments" on public.staff_salary_payments;
create policy "authenticated can read staff salary payments"
on public.staff_salary_payments
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert staff salary payments" on public.staff_salary_payments;
create policy "authenticated can insert staff salary payments"
on public.staff_salary_payments
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update staff salary payments" on public.staff_salary_payments;
create policy "authenticated can update staff salary payments"
on public.staff_salary_payments
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete staff salary payments" on public.staff_salary_payments;
create policy "authenticated can delete staff salary payments"
on public.staff_salary_payments
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read staff salary ledgers" on public.staff_salary_ledgers;
create policy "authenticated can read staff salary ledgers"
on public.staff_salary_ledgers
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert staff salary ledgers" on public.staff_salary_ledgers;
create policy "authenticated can insert staff salary ledgers"
on public.staff_salary_ledgers
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update staff salary ledgers" on public.staff_salary_ledgers;
create policy "authenticated can update staff salary ledgers"
on public.staff_salary_ledgers
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete staff salary ledgers" on public.staff_salary_ledgers;
create policy "authenticated can delete staff salary ledgers"
on public.staff_salary_ledgers
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read staff salary transactions" on public.staff_salary_transactions;
create policy "authenticated can read staff salary transactions"
on public.staff_salary_transactions
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert staff salary transactions" on public.staff_salary_transactions;
create policy "authenticated can insert staff salary transactions"
on public.staff_salary_transactions
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update staff salary transactions" on public.staff_salary_transactions;
create policy "authenticated can update staff salary transactions"
on public.staff_salary_transactions
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete staff salary transactions" on public.staff_salary_transactions;
create policy "authenticated can delete staff salary transactions"
on public.staff_salary_transactions
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read customers" on public.customers;
create policy "authenticated can read customers"
on public.customers
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert customers" on public.customers;
create policy "authenticated can insert customers"
on public.customers
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update customers" on public.customers;
create policy "authenticated can update customers"
on public.customers
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete customers" on public.customers;
create policy "authenticated can delete customers"
on public.customers
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read sales" on public.sales;
create policy "authenticated can read sales"
on public.sales
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert sales" on public.sales;
create policy "authenticated can insert sales"
on public.sales
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update sales" on public.sales;
create policy "authenticated can update sales"
on public.sales
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete sales" on public.sales;
create policy "authenticated can delete sales"
on public.sales
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read sales items" on public.sales_items;
create policy "authenticated can read sales items"
on public.sales_items
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert sales items" on public.sales_items;
create policy "authenticated can insert sales items"
on public.sales_items
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update sales items" on public.sales_items;
create policy "authenticated can update sales items"
on public.sales_items
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete sales items" on public.sales_items;
create policy "authenticated can delete sales items"
on public.sales_items
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read sales payments" on public.sales_payments;
create policy "authenticated can read sales payments"
on public.sales_payments
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert sales payments" on public.sales_payments;
create policy "authenticated can insert sales payments"
on public.sales_payments
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update sales payments" on public.sales_payments;
create policy "authenticated can update sales payments"
on public.sales_payments
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete sales payments" on public.sales_payments;
create policy "authenticated can delete sales payments"
on public.sales_payments
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

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

drop policy if exists "authenticated can read customer payments" on public.customer_payments;
create policy "authenticated can read customer payments"
on public.customer_payments
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert customer payments" on public.customer_payments;
create policy "authenticated can insert customer payments"
on public.customer_payments
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update customer payments" on public.customer_payments;
create policy "authenticated can update customer payments"
on public.customer_payments
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete customer payments" on public.customer_payments;
create policy "authenticated can delete customer payments"
on public.customer_payments
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can read customer payment allocations"
on public.customer_payment_allocations
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can insert customer payment allocations"
on public.customer_payment_allocations
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can update customer payment allocations"
on public.customer_payment_allocations
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can delete customer payment allocations"
on public.customer_payment_allocations
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read purchases" on public.purchases;
create policy "authenticated can read purchases"
on public.purchases
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert purchases" on public.purchases;
create policy "authenticated can insert purchases"
on public.purchases
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update purchases" on public.purchases;
create policy "authenticated can update purchases"
on public.purchases
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete purchases" on public.purchases;
create policy "authenticated can delete purchases"
on public.purchases
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read purchase items" on public.purchase_items;
create policy "authenticated can read purchase items"
on public.purchase_items
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert purchase items" on public.purchase_items;
create policy "authenticated can insert purchase items"
on public.purchase_items
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update purchase items" on public.purchase_items;
create policy "authenticated can update purchase items"
on public.purchase_items
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete purchase items" on public.purchase_items;
create policy "authenticated can delete purchase items"
on public.purchase_items
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read purchase expenses" on public.purchase_expenses;
create policy "authenticated can read purchase expenses"
on public.purchase_expenses
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert purchase expenses" on public.purchase_expenses;
create policy "authenticated can insert purchase expenses"
on public.purchase_expenses
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update purchase expenses" on public.purchase_expenses;
create policy "authenticated can update purchase expenses"
on public.purchase_expenses
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete purchase expenses" on public.purchase_expenses;
create policy "authenticated can delete purchase expenses"
on public.purchase_expenses
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read purchase payments" on public.purchase_payments;
create policy "authenticated can read purchase payments"
on public.purchase_payments
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert purchase payments" on public.purchase_payments;
create policy "authenticated can insert purchase payments"
on public.purchase_payments
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update purchase payments" on public.purchase_payments;
create policy "authenticated can update purchase payments"
on public.purchase_payments
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete purchase payments" on public.purchase_payments;
create policy "authenticated can delete purchase payments"
on public.purchase_payments
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read supplier payments" on public.supplier_payments;
create policy "authenticated can read supplier payments"
on public.supplier_payments
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert supplier payments" on public.supplier_payments;
create policy "authenticated can insert supplier payments"
on public.supplier_payments
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update supplier payments" on public.supplier_payments;
create policy "authenticated can update supplier payments"
on public.supplier_payments
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete supplier payments" on public.supplier_payments;
create policy "authenticated can delete supplier payments"
on public.supplier_payments
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can read supplier payment allocations" on public.supplier_payment_allocations;
create policy "authenticated can read supplier payment allocations"
on public.supplier_payment_allocations
for select
to authenticated
using (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can insert supplier payment allocations" on public.supplier_payment_allocations;
create policy "authenticated can insert supplier payment allocations"
on public.supplier_payment_allocations
for insert
to authenticated
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can update supplier payment allocations" on public.supplier_payment_allocations;
create policy "authenticated can update supplier payment allocations"
on public.supplier_payment_allocations
for update
to authenticated
using (organization_id = public.get_current_user_organization_id())
with check (organization_id = public.get_current_user_organization_id());

drop policy if exists "authenticated can delete supplier payment allocations" on public.supplier_payment_allocations;
create policy "authenticated can delete supplier payment allocations"
on public.supplier_payment_allocations
for delete
to authenticated
using (organization_id = public.get_current_user_organization_id());

create or replace view public.sales_summary as
select
  count(*) as total_sales_entries,
  coalesce(sum(grand_total), 0)::numeric(12, 2) as total_sales_amount
from public.sales;

create or replace view public.purchase_summary as
select
  count(*) as total_purchase_entries,
  coalesce(sum(total_amount), 0)::numeric(12, 2) as total_purchase_amount,
  coalesce(sum(credit_amount), 0)::numeric(12, 2) as total_credit_amount
from public.purchases;

create or replace view public.staff_salary_summary as
select
  (select count(*) from public.staff_profiles)::bigint as total_staff,
  (
    select coalesce(sum(total_salary), 0)::numeric(12, 2)
    from public.staff_profiles
    where status = 'ACTIVE'
  ) as total_salary_amount,
  (
    select coalesce(sum(total_advance), 0)::numeric(12, 2)
    from public.staff_salary_ledgers
    where status = 'OPEN'
  ) as total_advance_amount,
  (
    select coalesce(sum(remaining), 0)::numeric(12, 2)
    from public.staff_salary_ledgers
    where status = 'OPEN'
  ) as total_remaining_amount;

create or replace view public.staff_payment_summary as
select
  count(*) as total_salary_entries,
  coalesce(sum(case when type = 'SALARY' then amount else 0 end), 0)::numeric(12, 2) as total_monthly_payment,
  coalesce(sum(case when type = 'ADVANCE' then amount else 0 end), 0)::numeric(12, 2) as total_advance_payment,
  coalesce(sum(ledger.remaining), 0)::numeric(12, 2) as total_remaining_payment
from public.staff_salary_transactions transaction
left join public.staff_salary_ledgers ledger
  on ledger.id = transaction.ledger_id;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists vendors_set_updated_at on public.vendors;
create trigger vendors_set_updated_at
before update on public.vendors
for each row
execute function public.set_updated_at();

drop trigger if exists company_settings_set_updated_at on public.company_settings;
create trigger company_settings_set_updated_at
before update on public.company_settings
for each row
execute function public.set_updated_at();

drop trigger if exists staff_profiles_set_updated_at on public.staff_profiles;
create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists staff_salary_payments_set_updated_at on public.staff_salary_payments;
create trigger staff_salary_payments_set_updated_at
before update on public.staff_salary_payments
for each row
execute function public.set_updated_at();

drop trigger if exists staff_salary_ledgers_set_updated_at on public.staff_salary_ledgers;
create trigger staff_salary_ledgers_set_updated_at
before update on public.staff_salary_ledgers
for each row
execute function public.set_updated_at();

drop trigger if exists staff_salary_transactions_set_updated_at on public.staff_salary_transactions;
create trigger staff_salary_transactions_set_updated_at
before update on public.staff_salary_transactions
for each row
execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row
execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists order_items_set_updated_at on public.order_items;
create trigger order_items_set_updated_at
before update on public.order_items
for each row
execute function public.set_updated_at();

drop trigger if exists customer_payments_set_updated_at on public.customer_payments;
create trigger customer_payments_set_updated_at
before update on public.customer_payments
for each row
execute function public.set_updated_at();

drop trigger if exists purchases_set_updated_at on public.purchases;
create trigger purchases_set_updated_at
before update on public.purchases
for each row
execute function public.set_updated_at();

drop trigger if exists purchase_expenses_set_updated_at on public.purchase_expenses;
create trigger purchase_expenses_set_updated_at
before update on public.purchase_expenses
for each row
execute function public.set_updated_at();

drop trigger if exists supplier_payments_set_updated_at on public.supplier_payments;
create trigger supplier_payments_set_updated_at
before update on public.supplier_payments
for each row
execute function public.set_updated_at();

create or replace function public.record_customer_payment_with_allocations(
  p_customer_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text default 'Cash',
  p_note text default null
)
returns table (
  customer_payment_id uuid,
  allocated_invoice_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  sale_record record;
  remaining_payment numeric(12, 2);
  allocated_amount numeric(12, 2);
  next_amount_received numeric(12, 2);
  next_payment_status text;
  total_due numeric(12, 2);
  saved_customer_payment_id uuid;
  allocation_count integer := 0;
  payment_note text;
begin
  if p_customer_id is null then
    raise exception 'Customer profile is required';
  end if;

  if p_payment_date is null then
    raise exception 'Valid payment date is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0';
  end if;

  if coalesce(p_payment_method, 'Cash') not in ('Cash', 'Mobile') then
    raise exception 'Invalid customer payment method';
  end if;

  if not exists (select 1 from public.customers where id = p_customer_id) then
    raise exception 'Customer profile was not found';
  end if;

  select coalesce(sum(remaining_amount), 0)::numeric(12, 2)
  into total_due
  from public.sales
  where customer_id = p_customer_id
    and remaining_amount > 0;

  if total_due <= 0 then
    raise exception 'No unpaid sales invoices available for this customer';
  end if;

  if p_amount > total_due then
    raise exception 'Payment exceeds this customer''s total due balance.';
  end if;

  insert into public.customer_payments (
    customer_id,
    payment_date,
    amount,
    payment_method,
    note
  )
  values (
    p_customer_id,
    p_payment_date,
    p_amount,
    coalesce(p_payment_method, 'Cash'),
    nullif(p_note, '')
  )
  returning id into saved_customer_payment_id;

  remaining_payment := p_amount;
  payment_note := concat_ws(
    ' | ',
    nullif(p_note, ''),
    'Customer payment allocation',
    'Method: ' || coalesce(p_payment_method, 'Cash')
  );

  for sale_record in
    select id, grand_total, amount_received, remaining_amount, due_date
    from public.sales
    where customer_id = p_customer_id
      and remaining_amount > 0
    order by sales_date asc, created_at asc
    for update
  loop
    exit when remaining_payment <= 0;

    allocated_amount := least(remaining_payment, sale_record.remaining_amount);
    next_amount_received := least(
      sale_record.grand_total,
      sale_record.amount_received + allocated_amount
    );
    next_payment_status := case
      when next_amount_received >= sale_record.grand_total then 'PAID'
      when next_amount_received > 0 then 'PARTIAL'
      when sale_record.due_date < current_date then 'OVERDUE'
      else 'PENDING'
    end;

    update public.sales
    set
      amount_received = next_amount_received,
      payment_status = next_payment_status
    where id = sale_record.id;

    insert into public.customer_payment_allocations (
      customer_payment_id,
      sale_id,
      amount
    )
    values (
      saved_customer_payment_id,
      sale_record.id,
      allocated_amount
    );

    insert into public.sales_payments (
      sale_id,
      payment_date,
      amount,
      notes,
      customer_payment_id
    )
    values (
      sale_record.id,
      p_payment_date,
      allocated_amount,
      payment_note,
      saved_customer_payment_id
    );

    allocation_count := allocation_count + 1;
    remaining_payment := remaining_payment - allocated_amount;
  end loop;

  if remaining_payment > 0 then
    raise exception 'Unable to allocate this payment to customer invoices';
  end if;

  return query select saved_customer_payment_id, allocation_count;
end;
$$;

create or replace function public.record_supplier_payment_with_allocations(
  p_vendor_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text default 'Cash',
  p_note text default null
)
returns table (
  supplier_payment_id uuid,
  allocated_bill_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  purchase_record record;
  remaining_payment numeric(12, 2);
  allocated_amount numeric(12, 2);
  next_paid_amount numeric(12, 2);
  next_remaining_amount numeric(12, 2);
  next_payment_status text;
  next_payment_type text;
  total_outstanding numeric(12, 2);
  saved_supplier_payment_id uuid;
  allocation_count integer := 0;
  payment_note text;
begin
  if p_vendor_id is null then
    raise exception 'Supplier is required';
  end if;

  if p_payment_date is null then
    raise exception 'Valid payment date is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter a valid supplier payment amount';
  end if;

  if coalesce(p_payment_method, 'Cash') not in ('Cash', 'Mobile') then
    raise exception 'Invalid supplier payment method';
  end if;

  if not exists (select 1 from public.vendors where id = p_vendor_id) then
    raise exception 'Supplier was not found';
  end if;

  select coalesce(
    sum(greatest(coalesce(credit_amount, total_amount - paid_amount), 0)),
    0
  )::numeric(12, 2)
  into total_outstanding
  from public.purchases
  where vendor_id = p_vendor_id
    and greatest(coalesce(credit_amount, total_amount - paid_amount), 0) > 0;

  if total_outstanding <= 0 then
    raise exception 'No unpaid purchase bills available for this supplier';
  end if;

  if p_amount > total_outstanding then
    raise exception 'Payment exceeds this supplier''s total payable balance.';
  end if;

  insert into public.supplier_payments (
    vendor_id,
    payment_date,
    amount,
    payment_method,
    note
  )
  values (
    p_vendor_id,
    p_payment_date,
    p_amount,
    coalesce(p_payment_method, 'Cash'),
    nullif(p_note, '')
  )
  returning id into saved_supplier_payment_id;

  remaining_payment := p_amount;
  payment_note := concat_ws(
    ' | ',
    nullif(p_note, ''),
    'Supplier payment allocation',
    'Method: ' || coalesce(p_payment_method, 'Cash')
  );

  for purchase_record in
    select id, total_amount, paid_amount, credit_amount, payment_status
    from public.purchases
    where vendor_id = p_vendor_id
      and greatest(coalesce(credit_amount, total_amount - paid_amount), 0) > 0
    order by purchase_date asc, created_at asc
    for update
  loop
    exit when remaining_payment <= 0;

    allocated_amount := least(
      remaining_payment,
      greatest(coalesce(purchase_record.credit_amount, purchase_record.total_amount - purchase_record.paid_amount), 0)
    );
    next_paid_amount := least(
      coalesce(purchase_record.paid_amount, 0) + allocated_amount,
      coalesce(purchase_record.total_amount, 0)
    );
    next_remaining_amount := greatest(coalesce(purchase_record.total_amount, 0) - next_paid_amount, 0);
    next_payment_status := case
      when next_remaining_amount <= 0 then 'PAID'
      when next_paid_amount > 0 then
        case
          when purchase_record.payment_status = 'OVERDUE' then 'OVERDUE'
          else 'PARTIAL'
        end
      else
        case
          when purchase_record.payment_status = 'OVERDUE' then 'OVERDUE'
          else 'PENDING'
        end
    end;
    next_payment_type := case
      when next_remaining_amount <= 0 then 'Cash'
      else 'Credit'
    end;

    update public.purchases
    set
      paid_amount = next_paid_amount,
      payment_status = next_payment_status,
      payment_type = next_payment_type,
      payment_method = coalesce(p_payment_method, 'Cash')
    where id = purchase_record.id;

    insert into public.supplier_payment_allocations (
      supplier_payment_id,
      purchase_id,
      amount
    )
    values (
      saved_supplier_payment_id,
      purchase_record.id,
      allocated_amount
    );

    insert into public.purchase_payments (
      purchase_id,
      payment_date,
      amount,
      payment_method,
      notes
    )
    values (
      purchase_record.id,
      p_payment_date,
      allocated_amount,
      coalesce(p_payment_method, 'Cash'),
      payment_note
    );

    allocation_count := allocation_count + 1;
    remaining_payment := remaining_payment - allocated_amount;
  end loop;

  if remaining_payment > 0 then
    raise exception 'Unable to allocate this payment to supplier bills';
  end if;

  insert into public.activity_logs (
    module,
    action,
    title,
    description,
    amount,
    entity_type,
    entity_id,
    actor_user_id,
    actor_email,
    metadata
  )
  values (
    'suppliers',
    'payment',
    'Supplier payment recorded',
    allocation_count::text || ' bill' || case when allocation_count = 1 then '' else 's' end || ' allocated',
    p_amount,
    'vendor',
    p_vendor_id,
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    jsonb_build_object(
      'payment_method', coalesce(p_payment_method, 'Cash'),
      'payment_date', p_payment_date,
      'supplier_payment_id', saved_supplier_payment_id
    )
  );

  return query select saved_supplier_payment_id, allocation_count;
end;
$$;

create or replace function public.recalculate_staff_salary_ledgers(
  p_staff_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ledger_record record;
  carry_in numeric(12, 2) := 0;
  payable_amount numeric(12, 2);
  total_advance_amount numeric(12, 2);
  salary_paid_amount numeric(12, 2);
  total_paid_amount numeric(12, 2);
  remaining_amount numeric(12, 2);
  carry_forward_amount numeric(12, 2);
begin
  if p_staff_id is null then
    return;
  end if;

  delete from public.staff_salary_ledgers ledger
  where ledger.staff_id = p_staff_id
    and not exists (
      select 1
      from public.staff_salary_transactions transaction
      where transaction.ledger_id = ledger.id
    );

  for ledger_record in
    select id, base_salary
    from public.staff_salary_ledgers
    where staff_id = p_staff_id
    order by year asc, month asc
    for update
  loop
    select
      coalesce(sum(case when type = 'ADVANCE' then amount else 0 end), 0)::numeric(12, 2),
      coalesce(sum(case when type = 'SALARY' then amount else 0 end), 0)::numeric(12, 2)
    into total_advance_amount, salary_paid_amount
    from public.staff_salary_transactions
    where ledger_id = ledger_record.id;

    payable_amount := greatest(coalesce(ledger_record.base_salary, 0) - carry_in, 0);
    total_paid_amount := total_advance_amount + salary_paid_amount;
    remaining_amount := greatest(payable_amount - total_paid_amount, 0);
    carry_forward_amount := greatest(total_paid_amount - payable_amount, 0);

    update public.staff_salary_ledgers
    set
      total_advance = total_advance_amount,
      salary_paid = salary_paid_amount,
      total_paid = total_paid_amount,
      remaining = remaining_amount,
      carry_forward = carry_forward_amount,
      status = case when remaining_amount <= 0 then 'CLOSED' else 'OPEN' end
    where id = ledger_record.id;

    carry_in := carry_forward_amount;
  end loop;
end;
$$;

create or replace function public.upsert_staff_salary_transaction(
  p_id uuid,
  p_staff_id uuid,
  p_month integer,
  p_year integer,
  p_payment_date date,
  p_working_days integer,
  p_leave_days integer,
  p_base_salary numeric,
  p_amount numeric,
  p_payment_type text default 'ADVANCE',
  p_note text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing_transaction record;
  previous_transaction jsonb;
  target_ledger_id uuid;
  saved_transaction_id uuid;
  normalized_leave_days integer;
  action_name text;
begin
  if p_staff_id is null then
    raise exception 'Select staff member';
  end if;

  if p_month is null or p_month < 1 or p_month > 12 or p_year is null or p_year < 2000 then
    raise exception 'Month and year are required';
  end if;

  if p_payment_date is null then
    raise exception 'Valid payment date is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if coalesce(p_payment_type, 'ADVANCE') not in ('ADVANCE', 'SALARY') then
    raise exception 'Invalid salary transaction type';
  end if;

  if not exists (select 1 from public.staff_profiles where id = p_staff_id) then
    raise exception 'Selected staff member was not found';
  end if;

  normalized_leave_days := least(greatest(coalesce(p_leave_days, 0), 0), greatest(coalesce(p_working_days, 1), 1));

  if p_id is not null then
    if nullif(btrim(coalesce(p_reason, '')), '') is null then
      raise exception 'Update reason is required';
    end if;

    select id, staff_id
    into existing_transaction
    from public.staff_salary_transactions
    where id = p_id
    for update;

    if existing_transaction.id is null then
      raise exception 'Staff salary transaction was not found';
    end if;

    select to_jsonb(transaction)
    into previous_transaction
    from public.staff_salary_transactions transaction
    where transaction.id = p_id;
  end if;

  select id
  into target_ledger_id
  from public.staff_salary_ledgers
  where staff_id = p_staff_id
    and month = p_month
    and year = p_year
  for update;

  if target_ledger_id is null then
    insert into public.staff_salary_ledgers (
      staff_id,
      month,
      year,
      base_salary,
      working_days,
      leave_days,
      total_advance,
      salary_paid,
      total_paid,
      remaining,
      carry_forward,
      status
    )
    values (
      p_staff_id,
      p_month,
      p_year,
      greatest(coalesce(p_base_salary, 0), 0),
      greatest(coalesce(p_working_days, 1), 1),
      normalized_leave_days,
      0,
      0,
      0,
      greatest(coalesce(p_base_salary, 0), 0),
      0,
      'OPEN'
    )
    returning id into target_ledger_id;
  else
    update public.staff_salary_ledgers
    set
      base_salary = greatest(coalesce(p_base_salary, 0), 0),
      working_days = greatest(coalesce(p_working_days, 1), 1),
      leave_days = normalized_leave_days
    where id = target_ledger_id;
  end if;

  if p_id is null then
    insert into public.staff_salary_transactions (
      staff_id,
      ledger_id,
      transaction_date,
      type,
      amount,
      note
    )
    values (
      p_staff_id,
      target_ledger_id,
      p_payment_date,
      coalesce(p_payment_type, 'ADVANCE'),
      p_amount,
      nullif(p_note, '')
    )
    returning id into saved_transaction_id;
    action_name := 'created';
  else
    update public.staff_salary_transactions
    set
      staff_id = p_staff_id,
      ledger_id = target_ledger_id,
      transaction_date = p_payment_date,
      type = coalesce(p_payment_type, 'ADVANCE'),
      amount = p_amount,
      note = nullif(p_note, '')
    where id = p_id
    returning id into saved_transaction_id;
    action_name := 'updated';
  end if;

  if existing_transaction.staff_id is not null and existing_transaction.staff_id <> p_staff_id then
    perform public.recalculate_staff_salary_ledgers(existing_transaction.staff_id);
  end if;

  perform public.recalculate_staff_salary_ledgers(p_staff_id);

  insert into public.activity_logs (
    module,
    action,
    title,
    description,
    amount,
    entity_type,
    entity_id,
    actor_user_id,
    actor_email,
    reason,
    metadata
  )
  values (
    'staff',
    action_name,
    'Staff salary transaction ' || action_name,
    coalesce(p_payment_type, 'ADVANCE'),
    p_amount,
    'staff_salary_transaction',
    saved_transaction_id,
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    case when action_name = 'updated' then nullif(p_reason, '') else null end,
    jsonb_build_object(
      'staff_id', p_staff_id,
      'month', p_month,
      'year', p_year,
      'before', previous_transaction,
      'after', jsonb_build_object(
        'staff_id', p_staff_id,
        'ledger_id', target_ledger_id,
        'transaction_date', p_payment_date,
        'type', coalesce(p_payment_type, 'ADVANCE'),
        'amount', p_amount,
        'note', nullif(p_note, '')
      )
    )
  );

  return saved_transaction_id;
end;
$$;

create or replace function public.delete_staff_salary_transaction(
  p_transaction_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing_transaction record;
  previous_transaction jsonb;
begin
  if p_transaction_id is null then
    raise exception 'Staff salary transaction is required';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Delete reason is required';
  end if;

  select id, staff_id
  into existing_transaction
  from public.staff_salary_transactions
  where id = p_transaction_id
  for update;

  if existing_transaction.id is null then
    raise exception 'Staff salary transaction was not found';
  end if;

  select to_jsonb(transaction)
  into previous_transaction
  from public.staff_salary_transactions transaction
  where transaction.id = p_transaction_id;

  delete from public.staff_salary_transactions
  where id = p_transaction_id;

  perform public.recalculate_staff_salary_ledgers(existing_transaction.staff_id);

  insert into public.activity_logs (
    module,
    action,
    title,
    description,
    entity_type,
    entity_id,
    actor_user_id,
    actor_email,
    reason,
    metadata
  )
  values (
    'staff',
    'deleted',
    'Staff salary transaction deleted',
    'Salary ledger recalculated',
    'staff_salary_transaction',
    p_transaction_id,
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    nullif(p_reason, ''),
    jsonb_build_object('before', previous_transaction)
  );

  return p_transaction_id;
end;
$$;

create or replace function public.upsert_sale_transaction(
  p_id uuid,
  p_invoice_number text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_sales_date date,
  p_due_date date,
  p_payment_status text,
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_amount_received numeric,
  p_notes text,
  p_items jsonb,
  p_payment_increment numeric default 0,
  p_payment_date date default null,
  p_change_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_action text;
  v_previous_sale jsonb;
  v_resolved_payment_status text;
begin
  if p_invoice_number is null or btrim(p_invoice_number) = '' then
    raise exception 'Bill number is required';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Customer name is required';
  end if;

  if p_sales_date is null then
    raise exception 'Valid sales date is required';
  end if;

  if p_due_date is null then
    raise exception 'Valid due date is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one sales item';
  end if;

  v_resolved_payment_status := case
    when greatest(coalesce(p_subtotal, 0) - coalesce(p_discount, 0) + coalesce(p_tax, 0), 0) <= 0 then 'PENDING'
    when coalesce(p_amount_received, 0) >= greatest(coalesce(p_subtotal, 0) - coalesce(p_discount, 0) + coalesce(p_tax, 0), 0) then 'PAID'
    when coalesce(p_amount_received, 0) > 0 then 'PARTIAL'
    when p_due_date < current_date then 'OVERDUE'
    else 'PENDING'
  end;

  v_action := case when p_id is null then 'created' else 'updated' end;

  if p_id is null then
    insert into public.sales (
      invoice_number,
      customer_id,
      customer_name,
      customer_phone,
      sales_date,
      due_date,
      payment_status,
      subtotal,
      discount,
      tax,
      amount_received,
      notes
    )
    values (
      p_invoice_number,
      p_customer_id,
      p_customer_name,
      nullif(p_customer_phone, ''),
      p_sales_date,
      p_due_date,
      v_resolved_payment_status,
      p_subtotal,
      p_discount,
      p_tax,
      p_amount_received,
      nullif(p_notes, '')
    )
    returning id into v_sale_id;
  else
    if nullif(btrim(coalesce(p_change_reason, '')), '') is null then
      raise exception 'Update reason is required';
    end if;

    select to_jsonb(sale)
    into v_previous_sale
    from public.sales sale
    where sale.id = p_id
    for update;

    update public.sales
    set
      invoice_number = p_invoice_number,
      customer_id = p_customer_id,
      customer_name = p_customer_name,
      customer_phone = nullif(p_customer_phone, ''),
      sales_date = p_sales_date,
      due_date = p_due_date,
      payment_status = v_resolved_payment_status,
      subtotal = p_subtotal,
      discount = p_discount,
      tax = p_tax,
      amount_received = p_amount_received,
      notes = nullif(p_notes, '')
    where id = p_id
    returning id into v_sale_id;

    if v_sale_id is null then
      raise exception 'Sale was not found';
    end if;

    delete from public.sales_items
    where sale_id = v_sale_id;
  end if;

  insert into public.sales_items (
    sale_id,
    product_id,
    product_name,
    quantity,
    rate,
    taxable
  )
  select
    v_sale_id,
    nullif(item ->> 'product_id', '')::uuid,
    coalesce(nullif(item ->> 'product_name', ''), 'Saved sales item'),
    greatest(coalesce((item ->> 'quantity')::numeric, 1), 1),
    greatest(coalesce((item ->> 'rate')::numeric, 0), 0),
    coalesce((item ->> 'taxable')::boolean, false)
  from jsonb_array_elements(p_items) as item;

  if coalesce(p_payment_increment, 0) > 0 then
    insert into public.sales_payments (
      sale_id,
      payment_date,
      amount
    )
    values (
      v_sale_id,
      coalesce(p_payment_date, p_sales_date),
      p_payment_increment
    );
  end if;

  insert into public.activity_logs (
    module,
    action,
    title,
    description,
    amount,
    entity_type,
    entity_id,
    actor_user_id,
    actor_email,
    reason,
    metadata
  )
  values (
    'sales',
    v_action,
    'Sale ' || v_action,
    p_invoice_number || ' - ' || p_customer_name,
    greatest(coalesce(p_subtotal, 0) - coalesce(p_discount, 0) + coalesce(p_tax, 0), 0),
    'sale',
    v_sale_id,
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    case when v_action = 'updated' then nullif(p_change_reason, '') else null end,
    jsonb_build_object(
      'payment_status', v_resolved_payment_status,
      'amount_received', p_amount_received,
      'before', v_previous_sale,
      'after', jsonb_build_object(
        'invoice_number', p_invoice_number,
        'customer_id', p_customer_id,
        'customer_name', p_customer_name,
        'customer_phone', nullif(p_customer_phone, ''),
        'sales_date', p_sales_date,
        'due_date', p_due_date,
        'payment_status', v_resolved_payment_status,
        'subtotal', p_subtotal,
        'discount', p_discount,
        'tax', p_tax,
        'amount_received', p_amount_received,
        'notes', nullif(p_notes, '')
      )
    )
  );

  return v_sale_id;
end;
$$;

create or replace function public.upsert_purchase_transaction(
  p_id uuid,
  p_purchase_number text,
  p_vendor_id uuid,
  p_vendor_name text,
  p_purchase_date date,
  p_payment_status text,
  p_payment_type text,
  p_payment_method text,
  p_total_amount numeric,
  p_paid_amount numeric,
  p_notes text,
  p_items jsonb,
  p_payment_now numeric default 0,
  p_payment_date date default null,
  p_change_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_action text;
  v_previous_purchase jsonb;
begin
  if p_purchase_date is null then
    raise exception 'Valid purchase date is required';
  end if;

  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Purchase amount must be greater than 0';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one purchase item';
  end if;

  if p_vendor_id is null and (p_vendor_name is null or btrim(p_vendor_name) = '') then
    raise exception 'Select or type a supplier';
  end if;

  v_action := case when p_id is null then 'created' else 'updated' end;

  if p_id is null then
    insert into public.purchases (
      purchase_number,
      vendor_id,
      vendor_name,
      purchase_date,
      payment_status,
      payment_type,
      payment_method,
      total_amount,
      paid_amount,
      notes
    )
    values (
      p_purchase_number,
      p_vendor_id,
      case when p_vendor_id is null then nullif(p_vendor_name, '') else null end,
      p_purchase_date,
      p_payment_status,
      p_payment_type,
      p_payment_method,
      p_total_amount,
      p_paid_amount,
      nullif(p_notes, '')
    )
    returning id into v_purchase_id;
  else
    if nullif(btrim(coalesce(p_change_reason, '')), '') is null then
      raise exception 'Update reason is required';
    end if;

    select to_jsonb(purchase)
    into v_previous_purchase
    from public.purchases purchase
    where purchase.id = p_id
    for update;

    update public.purchases
    set
      purchase_number = p_purchase_number,
      vendor_id = p_vendor_id,
      vendor_name = case when p_vendor_id is null then nullif(p_vendor_name, '') else null end,
      purchase_date = p_purchase_date,
      payment_status = p_payment_status,
      payment_type = p_payment_type,
      payment_method = p_payment_method,
      total_amount = p_total_amount,
      paid_amount = p_paid_amount,
      notes = nullif(p_notes, '')
    where id = p_id
    returning id into v_purchase_id;

    if v_purchase_id is null then
      raise exception 'Purchase was not found';
    end if;

    delete from public.purchase_items
    where purchase_id = v_purchase_id;
  end if;

  insert into public.purchase_items (
    purchase_id,
    product_id,
    product_name,
    quantity,
    rate
  )
  select
    v_purchase_id,
    nullif(item ->> 'product_id', '')::uuid,
    coalesce(nullif(item ->> 'product_name', ''), 'Saved purchase item'),
    greatest(coalesce((item ->> 'quantity')::numeric, 1), 1),
    greatest(coalesce((item ->> 'rate')::numeric, 0), 0)
  from jsonb_array_elements(p_items) as item;

  if coalesce(p_payment_now, 0) > 0 then
    insert into public.purchase_payments (
      purchase_id,
      payment_date,
      amount,
      payment_method,
      notes
    )
    values (
      v_purchase_id,
      coalesce(p_payment_date, p_purchase_date),
      p_payment_now,
      p_payment_method,
      nullif(p_notes, '')
    );
  end if;

  insert into public.activity_logs (
    module,
    action,
    title,
    description,
    amount,
    entity_type,
    entity_id,
    actor_user_id,
    actor_email,
    reason,
    metadata
  )
  values (
    'purchases',
    v_action,
    'Purchase ' || v_action,
    coalesce(p_purchase_number, ''),
    p_total_amount,
    'purchase',
    v_purchase_id,
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    case when v_action = 'updated' then nullif(p_change_reason, '') else null end,
    jsonb_build_object(
      'payment_status', p_payment_status,
      'paid_amount', p_paid_amount,
      'before', v_previous_purchase,
      'after', jsonb_build_object(
        'purchase_number', p_purchase_number,
        'vendor_id', p_vendor_id,
        'vendor_name', case when p_vendor_id is null then nullif(p_vendor_name, '') else null end,
        'purchase_date', p_purchase_date,
        'payment_status', p_payment_status,
        'payment_type', p_payment_type,
        'payment_method', p_payment_method,
        'total_amount', p_total_amount,
        'paid_amount', p_paid_amount,
        'notes', nullif(p_notes, '')
      )
    )
  );

  return v_purchase_id;
end;
$$;

create or replace function public.adjust_sale_transaction(
  p_adjusted_from_id uuid,
  p_invoice_number text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_sales_date date,
  p_payment_status text,
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_amount_received numeric,
  p_notes text,
  p_items jsonb,
  p_payment_increment numeric default 0,
  p_payment_date date default null,
  p_change_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Legacy sales adjustment flow is disabled. Use Archive & Recreate instead.';
end;
$$;

create or replace function public.adjust_purchase_transaction(
  p_adjusted_from_id uuid,
  p_purchase_number text,
  p_vendor_id uuid,
  p_vendor_name text,
  p_purchase_date date,
  p_payment_status text,
  p_payment_type text,
  p_payment_method text,
  p_total_amount numeric,
  p_paid_amount numeric,
  p_notes text,
  p_items jsonb,
  p_payment_now numeric default 0,
  p_payment_date date default null,
  p_change_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_purchase public.purchases%rowtype;
  v_purchase_id uuid;
begin
  if p_adjusted_from_id is null then
    raise exception 'Original purchase is required';
  end if;

  if nullif(btrim(coalesce(p_change_reason, '')), '') is null then
    raise exception 'Adjustment reason is required';
  end if;

  select *
  into source_purchase
  from public.purchases
  where id = p_adjusted_from_id
  for update;

  if source_purchase.id is null then
    raise exception 'Original purchase was not found';
  end if;

  if source_purchase.record_status <> 'ACTIVE' then
    raise exception 'Only active purchases can be adjusted';
  end if;

  if source_purchase.payment_status <> 'PAID' then
    raise exception 'Only settled purchases can be adjusted';
  end if;

  if p_purchase_date is null then
    raise exception 'Valid purchase date is required';
  end if;

  if p_total_amount is null or p_total_amount <= 0 then
    raise exception 'Purchase amount must be greater than 0';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one purchase item';
  end if;

  if p_vendor_id is null and (p_vendor_name is null or btrim(p_vendor_name) = '') then
    raise exception 'Select or type a supplier';
  end if;

  insert into public.purchases (
    purchase_number,
    record_status,
    adjusted_from_id,
    vendor_id,
    vendor_name,
    purchase_date,
    payment_status,
    payment_type,
    payment_method,
    total_amount,
    paid_amount,
    notes
  )
  values (
    p_purchase_number,
    'ACTIVE',
    source_purchase.id,
    p_vendor_id,
    case when p_vendor_id is null then nullif(p_vendor_name, '') else null end,
    p_purchase_date,
    p_payment_status,
    p_payment_type,
    p_payment_method,
    p_total_amount,
    p_paid_amount,
    nullif(p_notes, '')
  )
  returning id into v_purchase_id;

  insert into public.purchase_items (
    purchase_id,
    product_id,
    product_name,
    quantity,
    rate
  )
  select
    v_purchase_id,
    nullif(item ->> 'product_id', '')::uuid,
    coalesce(nullif(item ->> 'product_name', ''), 'Saved purchase item'),
    greatest(coalesce((item ->> 'quantity')::numeric, 1), 1),
    greatest(coalesce((item ->> 'rate')::numeric, 0), 0)
  from jsonb_array_elements(p_items) as item;

  update public.purchase_payments
  set purchase_id = v_purchase_id
  where purchase_id = source_purchase.id;

  update public.supplier_payment_allocations
  set purchase_id = v_purchase_id
  where purchase_id = source_purchase.id;

  if coalesce(p_payment_now, 0) > 0 then
    insert into public.purchase_payments (
      purchase_id,
      payment_date,
      amount,
      payment_method,
      notes
    )
    values (
      v_purchase_id,
      coalesce(p_payment_date, p_purchase_date),
      p_payment_now,
      p_payment_method,
      nullif(p_notes, '')
    );
  end if;

  update public.purchases
  set
    record_status = 'SUPERSEDED',
    superseded_by_id = v_purchase_id,
    updated_at = timezone('utc', now())
  where id = source_purchase.id;

  insert into public.activity_logs (
    module,
    action,
    title,
    description,
    amount,
    entity_type,
    entity_id,
    actor_user_id,
    actor_email,
    reason,
    metadata
  )
  values (
    'purchases',
    'adjusted',
    'Purchase adjusted',
    coalesce(p_purchase_number, '') || ' replaced ' || coalesce(source_purchase.purchase_number, ''),
    p_total_amount,
    'purchase',
    v_purchase_id,
    auth.uid(),
    nullif(auth.jwt() ->> 'email', ''),
    nullif(p_change_reason, ''),
    jsonb_build_object(
      'adjusted_from_id', source_purchase.id,
      'before', to_jsonb(source_purchase),
      'after', jsonb_build_object(
        'purchase_number', p_purchase_number,
        'vendor_id', p_vendor_id,
        'vendor_name', case when p_vendor_id is null then nullif(p_vendor_name, '') else null end,
        'purchase_date', p_purchase_date,
        'payment_status', p_payment_status,
        'payment_type', p_payment_type,
        'payment_method', p_payment_method,
        'total_amount', p_total_amount,
        'paid_amount', p_paid_amount,
        'notes', nullif(p_notes, '')
      )
    )
  );

  return v_purchase_id;
end;
$$;
