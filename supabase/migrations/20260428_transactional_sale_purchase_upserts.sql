create or replace function public.upsert_sale_transaction(
  p_id uuid,
  p_invoice_number text,
  p_customer_id uuid,
  p_customer_name text,
  p_sales_date date,
  p_payment_status text,
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_amount_received numeric,
  p_notes text,
  p_items jsonb,
  p_payment_increment numeric default 0,
  p_payment_date date default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_action text;
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

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one sales item';
  end if;

  v_action := case when p_id is null then 'created' else 'updated' end;

  if p_id is null then
    insert into public.sales (
      invoice_number,
      customer_id,
      customer_name,
      sales_date,
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
      p_sales_date,
      p_payment_status,
      p_subtotal,
      p_discount,
      p_tax,
      p_amount_received,
      nullif(p_notes, '')
    )
    returning id into v_sale_id;
  else
    update public.sales
    set
      invoice_number = p_invoice_number,
      customer_id = p_customer_id,
      customer_name = p_customer_name,
      sales_date = p_sales_date,
      payment_status = p_payment_status,
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
    jsonb_build_object(
      'payment_status', p_payment_status,
      'amount_received', p_amount_received
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
  p_payment_date date default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_purchase_id uuid;
  v_action text;
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
    jsonb_build_object(
      'payment_status', p_payment_status,
      'paid_amount', p_paid_amount
    )
  );

  return v_purchase_id;
end;
$$;
