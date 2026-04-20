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

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
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

create table if not exists public.staff_salary_payments (
  id uuid primary key default gen_random_uuid(),
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
  invoice_number text not null,
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
drop constraint if exists sales_invoice_number_key;

alter table public.sales
add column if not exists amount_received numeric(12, 2) not null default 0 check (amount_received >= 0);

alter table public.sales
add column if not exists remaining_amount numeric(12, 2)
generated always as (greatest((subtotal - discount + tax) - amount_received, 0)) stored;

alter table public.sales
add column if not exists customer_id uuid references public.customers(id) on delete set null;

create index if not exists idx_sales_customer_id on public.sales(customer_id);

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

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
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
alter table public.staff_profiles enable row level security;
alter table public.staff_salary_payments enable row level security;
alter table public.staff_salary_ledgers enable row level security;
alter table public.staff_salary_transactions enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sales_items enable row level security;
alter table public.sales_payments enable row level security;
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
