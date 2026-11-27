-- Phase 2: customers, POS sales with discount and payment, admin variant handling.
-- Additive only. Applied to the live project on 2026-11-27. Existing rows are untouched.

create sequence if not exists public.customer_code_seq;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique default ('C-' || lpad(nextval('public.customer_code_seq')::text, 6, '0')),
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text not null check (char_length(phone) between 7 and 20),
  phone_key text generated always as (regexp_replace(phone, '\D', '', 'g')) stored,
  whatsapp text,
  email text check (email is null or char_length(email) <= 200),
  address text,
  city text,
  customer_type text not null default 'retail' check (customer_type in ('retail','wholesale')),
  credit_limit numeric(12,2) not null default 0 check (credit_limit >= 0),
  opening_balance numeric(12,2) not null default 0,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  status text not null default 'active' check (status in ('active','archived')),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_phone_key_uidx on public.customers (phone_key);
create index if not exists customers_name_idx on public.customers (lower(full_name));

alter table public.customers enable row level security;

drop policy if exists "customers: staff read" on public.customers;
create policy "customers: staff read" on public.customers
  for select to authenticated using (public.get_my_role() in ('cashier','admin'));

drop policy if exists "customers: staff insert" on public.customers;
create policy "customers: staff insert" on public.customers
  for insert to authenticated with check (public.get_my_role() in ('cashier','admin'));

drop policy if exists "customers: staff update" on public.customers;
create policy "customers: staff update" on public.customers
  for update to authenticated
  using (public.get_my_role() in ('cashier','admin'))
  with check (public.get_my_role() in ('cashier','admin'));

-- No delete policy: customers are archived (status = 'archived'), never deleted, so history is kept.

alter table public.orders
  add column if not exists customer_id uuid references public.customers(id),
  add column if not exists subtotal_amount numeric(12,2),
  add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  add column if not exists amount_received numeric(12,2),
  add column if not exists change_due numeric(12,2) not null default 0 check (change_due >= 0);

-- One POS sale: customer optional (walk-in), discount, full payment only (partial/credit arrives in Phase 3).
-- process_order does the stock work; any error below rolls the whole sale back.
create or replace function public.create_pos_sale(
  p_items jsonb,
  p_customer_id uuid,
  p_discount numeric,
  p_payment_method text,
  p_amount_received numeric
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role     text;
  v_cust     public.customers;
  v_info     jsonb;
  v_order    public.orders;
  v_subtotal numeric(12,2);
  v_disc     numeric(12,2) := coalesce(p_discount, 0);
  v_final    numeric(12,2);
  v_received numeric(12,2);
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

  if p_payment_method = 'bank_transfer' then
    v_received := v_final;
  else
    v_received := coalesce(p_amount_received, 0);
    if v_received < v_final then
      raise exception 'Amount received (%) is less than the payable total (%). Partial payment needs credit, which is not enabled yet.',
        v_received, v_final using errcode = '22023';
    end if;
  end if;

  update public.orders
     set customer_id = p_customer_id,
         subtotal_amount = v_subtotal,
         discount_amount = v_disc,
         total_amount = v_final,
         amount_received = v_received,
         change_due = v_received - v_final
   where id = v_order.id
   returning * into v_order;

  return v_order;
end $$;

revoke execute on function public.create_pos_sale(jsonb, uuid, numeric, text, numeric) from anon;
