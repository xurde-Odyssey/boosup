create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
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

alter table public.customer_payments enable row level security;
alter table public.customer_payment_allocations enable row level security;

drop policy if exists "authenticated can read customer payments" on public.customer_payments;
create policy "authenticated can read customer payments"
on public.customer_payments
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert customer payments" on public.customer_payments;
create policy "authenticated can insert customer payments"
on public.customer_payments
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update customer payments" on public.customer_payments;
create policy "authenticated can update customer payments"
on public.customer_payments
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete customer payments" on public.customer_payments;
create policy "authenticated can delete customer payments"
on public.customer_payments
for delete
to authenticated
using (true);

drop policy if exists "authenticated can read customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can read customer payment allocations"
on public.customer_payment_allocations
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can insert customer payment allocations"
on public.customer_payment_allocations
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can update customer payment allocations"
on public.customer_payment_allocations
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete customer payment allocations" on public.customer_payment_allocations;
create policy "authenticated can delete customer payment allocations"
on public.customer_payment_allocations
for delete
to authenticated
using (true);

drop trigger if exists customer_payments_set_updated_at on public.customer_payments;
create trigger customer_payments_set_updated_at
before update on public.customer_payments
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
    select id, grand_total, amount_received, remaining_amount
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
      else 'PARTIAL'
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
