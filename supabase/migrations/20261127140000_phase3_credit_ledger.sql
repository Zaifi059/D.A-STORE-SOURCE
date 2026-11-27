-- Phase 3: customer credit ledger, payments, allocations, reversals. Additive only.
-- Applied to the live project on 2026-11-27.

create table if not exists public.business_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.business_settings enable row level security;
drop policy if exists "settings: staff read" on public.business_settings;
create policy "settings: staff read" on public.business_settings
  for select to authenticated using (public.get_my_role() in ('cashier','admin'));
drop policy if exists "settings: admin write" on public.business_settings;
create policy "settings: admin write" on public.business_settings
  for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
insert into public.business_settings (key, value) values ('credit_terms_days', '30'::jsonb) on conflict (key) do nothing;

alter table public.orders
  add column if not exists amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  add column if not exists credit_override_reason text;

alter table public.orders drop column if exists balance_due;
alter table public.orders
  add column balance_due numeric(12,2) generated always as (greatest(total_amount - amount_paid, 0)) stored;

create sequence if not exists public.payment_number_seq;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique default ('P-' || lpad(nextval('public.payment_number_seq')::text, 6, '0')),
  customer_id uuid not null references public.customers(id),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash','bank_transfer')),
  reference_number text,
  notes text,
  request_id uuid not null unique,
  status text not null default 'active' check (status in ('active','reversed')),
  reversal_reason text,
  received_by uuid default auth.uid(),
  received_at timestamptz not null default now()
);

create unique index if not exists payments_reference_uidx
  on public.payments (customer_id, lower(reference_number))
  where reference_number is not null and status = 'active';

create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  order_id uuid not null references public.orders(id),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists payment_allocations_order_idx on public.payment_allocations (order_id);
create index if not exists payment_allocations_payment_idx on public.payment_allocations (payment_id);

create table if not exists public.customer_ledger (
  id uuid primary key default gen_random_uuid(),
  seq bigserial not null,
  customer_id uuid not null references public.customers(id),
  entry_type text not null check (entry_type in ('opening_balance','pos_sale','payment','payment_reversal')),
  order_id uuid references public.orders(id),
  payment_id uuid references public.payments(id),
  reversal_of uuid references public.customer_ledger(id),
  description text not null,
  debit numeric(12,2) not null default 0 check (debit >= 0),
  credit numeric(12,2) not null default 0 check (credit >= 0),
  check (debit = 0 or credit = 0),
  check (debit + credit > 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists customer_ledger_customer_idx on public.customer_ledger (customer_id, seq);

create or replace function public.reject_ledger_change() returns trigger
language plpgsql as $$
begin
  raise exception 'Ledger entries cannot be changed or deleted. Post a reversal instead.' using errcode = '42501';
end $$;

drop trigger if exists customer_ledger_immutable on public.customer_ledger;
create trigger customer_ledger_immutable before update or delete on public.customer_ledger
  for each row execute function public.reject_ledger_change();

drop trigger if exists payment_allocations_immutable on public.payment_allocations;
create trigger payment_allocations_immutable before update or delete on public.payment_allocations
  for each row execute function public.reject_ledger_change();

create or replace function public.guard_payment_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Payments cannot be deleted. Reverse them instead.' using errcode = '42501';
  end if;
  if old.status = 'reversed' then
    raise exception 'This payment has already been reversed.' using errcode = '42501';
  end if;
  if (to_jsonb(new) - 'status' - 'reversal_reason') is distinct from (to_jsonb(old) - 'status' - 'reversal_reason') then
    raise exception 'Payments are immutable except for reversal.' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists payments_guard on public.payments;
create trigger payments_guard before update or delete on public.payments
  for each row execute function public.guard_payment_change();

alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.customer_ledger enable row level security;

drop policy if exists "payments: staff read" on public.payments;
create policy "payments: staff read" on public.payments for select to authenticated
  using (public.get_my_role() in ('cashier','admin'));
drop policy if exists "allocations: staff read" on public.payment_allocations;
create policy "allocations: staff read" on public.payment_allocations for select to authenticated
  using (public.get_my_role() in ('cashier','admin'));
drop policy if exists "ledger: staff read" on public.customer_ledger;
create policy "ledger: staff read" on public.customer_ledger for select to authenticated
  using (public.get_my_role() in ('cashier','admin'));

create or replace function public.post_opening_balance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.opening_balance <> 0 then
    insert into public.customer_ledger (customer_id, entry_type, description, debit, credit)
    values (new.id, 'opening_balance', 'Opening balance',
            greatest(new.opening_balance, 0), greatest(-new.opening_balance, 0));
  end if;
  return new;
end $$;

drop trigger if exists customers_opening_balance on public.customers;
create trigger customers_opening_balance after insert on public.customers
  for each row execute function public.post_opening_balance();

create or replace function public.customer_outstanding(p_customer_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(debit), 0) - coalesce(sum(credit), 0)
  from public.customer_ledger where customer_id = p_customer_id;
$$;

create or replace function public._apply_payment(
  p_customer_id uuid, p_amount numeric, p_method text, p_reference text, p_notes text,
  p_request_id uuid, p_order_id uuid
) returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_pay       public.payments;
  o           public.orders;
  v_remaining numeric(12,2) := p_amount;
  v_alloc     numeric(12,2);
begin
  select * into v_pay from public.payments where request_id = p_request_id;
  if found then
    if v_pay.customer_id <> p_customer_id then
      raise exception 'This payment request was already used for another customer.' using errcode = '23505';
    end if;
    return v_pay;
  end if;

  insert into public.payments (customer_id, amount, payment_method, reference_number, notes, request_id)
  values (p_customer_id, p_amount, p_method, nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), p_request_id)
  returning * into v_pay;

  if p_order_id is not null then
    select * into o from public.orders where id = p_order_id and customer_id = p_customer_id for update;
    if not found then
      raise exception 'Order not found for this customer' using errcode = 'P0002';
    end if;
    v_alloc := least(v_remaining, o.balance_due);
    if v_alloc > 0 then
      insert into public.payment_allocations (payment_id, order_id, amount) values (v_pay.id, o.id, v_alloc);
      update public.orders set amount_paid = amount_paid + v_alloc where id = o.id;
      v_remaining := v_remaining - v_alloc;
    end if;
  else
    for o in
      select * from public.orders
      where customer_id = p_customer_id and balance_due > 0
      order by created_at, id
      for update
    loop
      exit when v_remaining <= 0;
      v_alloc := least(v_remaining, o.balance_due);
      insert into public.payment_allocations (payment_id, order_id, amount) values (v_pay.id, o.id, v_alloc);
      update public.orders set amount_paid = amount_paid + v_alloc where id = o.id;
      v_remaining := v_remaining - v_alloc;
    end loop;
  end if;

  insert into public.customer_ledger (customer_id, entry_type, payment_id, description, credit)
  values (p_customer_id, 'payment', v_pay.id,
          'Payment ' || v_pay.payment_number || ' (' || p_method || ')', p_amount);

  return v_pay;
end $$;

revoke execute on function public._apply_payment(uuid, numeric, text, text, text, uuid, uuid) from public, anon, authenticated;

create or replace function public.record_customer_payment(
  p_customer_id uuid, p_amount numeric, p_payment_method text, p_request_id uuid,
  p_reference text default null, p_notes text default null
) returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_active boolean;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('cashier','admin') then
    raise exception 'Only cashiers or admins can record payments' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'A payment request id is required to prevent duplicates' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero' using errcode = '22023';
  end if;
  if p_payment_method not in ('cash','bank_transfer') then
    raise exception 'Unsupported payment method: %', p_payment_method using errcode = '22023';
  end if;
  select status = 'active' into v_active from public.customers where id = p_customer_id;
  if v_active is null or not v_active then
    raise exception 'Customer not found or archived' using errcode = 'P0002';
  end if;

  return public._apply_payment(p_customer_id, p_amount, p_payment_method, p_reference, p_notes, p_request_id, null);
end $$;

create or replace function public.reverse_payment(p_payment_id uuid, p_reason text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_pay   public.payments;
  v_orig  uuid;
  a       record;
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Only admins can reverse payments' using errcode = '42501';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 then
    raise exception 'A reason is required to reverse a payment' using errcode = '22023';
  end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_pay.status = 'reversed' then
    raise exception 'This payment has already been reversed.' using errcode = '23505';
  end if;

  for a in select order_id, amount from public.payment_allocations where payment_id = v_pay.id loop
    update public.orders set amount_paid = amount_paid - a.amount where id = a.order_id;
  end loop;

  select id into v_orig from public.customer_ledger where payment_id = v_pay.id and entry_type = 'payment';

  insert into public.customer_ledger (customer_id, entry_type, payment_id, reversal_of, description, debit)
  values (v_pay.customer_id, 'payment_reversal', v_pay.id, v_orig,
          'Reversal of ' || v_pay.payment_number || ': ' || trim(p_reason), v_pay.amount);

  update public.payments set status = 'reversed', reversal_reason = trim(p_reason)
   where id = v_pay.id returning * into v_pay;

  return v_pay;
end $$;

create or replace function public.get_customer_summary(p_customer_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_cust public.customers;
  v_days integer;
  v_outstanding numeric(12,2);
  v_overdue numeric(12,2);
  v_purchases numeric(12,2);
  v_payments numeric(12,2);
begin
  if public.get_my_role() not in ('cashier','admin') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into v_cust from public.customers where id = p_customer_id;
  if not found then raise exception 'Customer not found' using errcode = 'P0002'; end if;

  select coalesce((value #>> '{}')::int, 30) into v_days from public.business_settings where key = 'credit_terms_days';
  v_days := coalesce(v_days, 30);

  v_outstanding := public.customer_outstanding(p_customer_id);
  select coalesce(sum(balance_due), 0) into v_overdue from public.orders
    where customer_id = p_customer_id and balance_due > 0 and created_at < now() - make_interval(days => v_days);
  select coalesce(sum(debit), 0) into v_purchases from public.customer_ledger
    where customer_id = p_customer_id and entry_type = 'pos_sale';
  select coalesce(sum(credit), 0) into v_payments from public.customer_ledger
    where customer_id = p_customer_id and entry_type = 'payment';

  return jsonb_build_object(
    'outstanding', v_outstanding,
    'credit_limit', v_cust.credit_limit,
    'available_credit', greatest(v_cust.credit_limit - v_outstanding, 0),
    'overdue', v_overdue,
    'total_purchases', v_purchases,
    'total_payments', v_payments,
    'credit_terms_days', v_days
  );
end $$;

drop function if exists public.create_pos_sale(jsonb, uuid, numeric, text, numeric);

create or replace function public.create_pos_sale(
  p_items jsonb,
  p_customer_id uuid,
  p_discount numeric,
  p_payment_method text,
  p_amount_received numeric,
  p_override_reason text default null
)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_role      text;
  v_cust      public.customers;
  v_info      jsonb;
  v_order     public.orders;
  v_subtotal  numeric(12,2);
  v_disc      numeric(12,2) := coalesce(p_discount, 0);
  v_final     numeric(12,2);
  v_received  numeric(12,2);
  v_short     numeric(12,2);
  v_change    numeric(12,2);
  v_outst     numeric(12,2);
  v_override  boolean := false;
  v_reason    text := nullif(trim(p_override_reason), '');
  v_pay       public.payments;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('cashier','admin') then
    raise exception 'Only cashiers or admins can make POS sales' using errcode = '42501';
  end if;
  if p_payment_method not in ('cash','bank_transfer') then
    raise exception 'Unsupported POS payment method: %', p_payment_method using errcode = '22023';
  end if;

  if p_customer_id is not null then
    select * into v_cust from public.customers where id = p_customer_id and status = 'active';
    if not found then
      raise exception 'Customer not found or archived' using errcode = 'P0002';
    end if;
    v_info := jsonb_build_object(
      'name', v_cust.full_name, 'phone', v_cust.phone, 'email', v_cust.email,
      'address', v_cust.address, 'city', v_cust.city, 'customer_code', v_cust.customer_code);
  else
    v_info := jsonb_build_object('name', 'Walk-in customer');
  end if;

  v_order := public.process_order('pos', p_payment_method, v_info, p_items);
  v_subtotal := v_order.total_amount;

  if v_disc < 0 or v_disc > v_subtotal then
    raise exception 'Discount must be between 0 and the subtotal (%)', v_subtotal using errcode = '22023';
  end if;
  v_final := v_subtotal - v_disc;

  v_received := coalesce(p_amount_received, 0);
  if v_received < 0 then
    raise exception 'Amount received cannot be negative' using errcode = '22023';
  end if;
  if p_payment_method = 'bank_transfer' and v_received > v_final then
    raise exception 'Bank transfer cannot exceed the payable total (%)', v_final using errcode = '22023';
  end if;

  v_short  := greatest(v_final - v_received, 0);
  v_change := greatest(v_received - v_final, 0);

  if v_short > 0 then
    if p_customer_id is null then
      raise exception 'Partial payment needs a customer account. Collect the full amount for walk-in sales.' using errcode = '22023';
    end if;
    if v_cust.credit_limit <= 0 then
      raise exception 'Credit is not enabled for this customer. Collect the full amount.' using errcode = '22023';
    end if;

    v_outst := public.customer_outstanding(p_customer_id);
    if v_outst + v_short > v_cust.credit_limit then
      if v_role <> 'admin' or v_reason is null or char_length(v_reason) < 3 then
        raise exception 'Credit limit exceeded. Available credit is %. Only an admin can override with a reason.',
          greatest(v_cust.credit_limit - v_outst, 0) using errcode = '42501';
      end if;
      v_override := true;
    end if;
  end if;

  update public.orders
     set customer_id = p_customer_id,
         subtotal_amount = v_subtotal,
         discount_amount = v_disc,
         total_amount = v_final,
         amount_received = least(v_received, v_final),
         change_due = v_change,
         credit_override_reason = case when v_override then v_reason end
   where id = v_order.id
   returning * into v_order;

  if p_customer_id is not null then
    insert into public.customer_ledger (customer_id, entry_type, order_id, description, debit)
    values (
      p_customer_id, 'pos_sale', v_order.id,
      'POS sale ' || v_order.order_number::text
        || case when v_override then ' (credit limit override: ' || v_reason || ')' else '' end,
      v_final
    );

    if least(v_received, v_final) > 0 then
      v_pay := public._apply_payment(
        p_customer_id, least(v_received, v_final), p_payment_method, null,
        'POS sale ' || v_order.order_number::text, gen_random_uuid(), v_order.id);
    end if;
  end if;

  select * into v_order from public.orders where id = v_order.id;
  return v_order;
end $$;

revoke execute on function public.create_pos_sale(jsonb, uuid, numeric, text, numeric, text) from anon;
revoke execute on function public.record_customer_payment(uuid, numeric, text, uuid, text, text) from anon;
revoke execute on function public.reverse_payment(uuid, text) from anon;
revoke execute on function public.get_customer_summary(uuid) from anon;
