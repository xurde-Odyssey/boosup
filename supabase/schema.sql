create extension if not exists pgcrypto;

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

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
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

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  customer_name text not null,
  sales_date date not null default current_date,
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
add column if not exists amount_received numeric(12, 2) not null default 0 check (amount_received >= 0);

alter table public.sales
add column if not exists remaining_amount numeric(12, 2)
generated always as (greatest((subtotal - discount + tax) - amount_received, 0)) stored;

create table if not exists public.sales_items (
  id uuid primary key default gen_random_uuid(),
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
  sale_id uuid not null references public.sales(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
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

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
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
  expense_date date not null default current_date,
  expense_title text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Mobile')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.products enable row level security;
alter table public.vendors enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.sales enable row level security;
alter table public.sales_items enable row level security;
alter table public.sales_payments enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.purchase_expenses enable row level security;
alter table public.purchase_payments enable row level security;

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
  count(*) as total_staff,
  coalesce(sum(total_salary), 0)::numeric(12, 2) as total_salary_amount,
  coalesce(sum(advance_salary), 0)::numeric(12, 2) as total_advance_amount,
  coalesce(sum(remaining_salary), 0)::numeric(12, 2) as total_remaining_amount
from public.staff_profiles;

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

drop trigger if exists staff_profiles_set_updated_at on public.staff_profiles;
create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
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
