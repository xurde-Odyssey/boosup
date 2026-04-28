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

notify pgrst, 'reload schema';
