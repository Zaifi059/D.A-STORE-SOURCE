-- Phase 1: catalog extensions for sizes, colors, sale prices and variant stock.
-- Additive only. Applied to the live project on 2026-11-27. Existing rows are untouched.

alter table public.products
  add column if not exists sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_new boolean not null default false,
  add column if not exists brand text;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (char_length(size) between 1 and 20),
  color text not null check (char_length(color) between 1 and 30),
  sku text unique,
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  stock_count integer not null default 0 check (stock_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

alter table public.product_variants enable row level security;

drop policy if exists "variants: public read active" on public.product_variants;
create policy "variants: public read active" on public.product_variants
  for select to anon, authenticated
  using (is_active or public.get_my_role() in ('cashier','admin'));

drop policy if exists "variants: admin all" on public.product_variants;
create policy "variants: admin all" on public.product_variants
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id),
  add column if not exists size text,
  add column if not exists color text;

alter table public.inventory_logs
  add column if not exists variant_id uuid references public.product_variants(id);

-- Admin-only stock adjustment for one size/color. Keeps the product total in sync.
create or replace function public.adjust_variant_stock(p_variant_id uuid, p_change integer, p_reason text default 'manual_adjustment')
returns public.product_variants
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.product_variants;
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Only admins can adjust stock' using errcode = '42501';
  end if;
  if p_change is null or p_change = 0 then
    raise exception 'Change must be a non-zero number' using errcode = '22023';
  end if;

  select * into v from public.product_variants where id = p_variant_id for update;
  if not found then
    raise exception 'Variant not found' using errcode = 'P0002';
  end if;
  if v.stock_count + p_change < 0 then
    raise exception 'Stock cannot go below 0 (current: %)', v.stock_count using errcode = '23514';
  end if;

  update public.product_variants
     set stock_count = stock_count + p_change, updated_at = now()
   where id = p_variant_id
   returning * into v;

  update public.products set stock_count = stock_count + p_change where id = v.product_id;

  insert into public.inventory_logs (product_id, variant_id, change_amount, reason, created_by)
  values (v.product_id, v.id, p_change, coalesce(nullif(trim(p_reason), ''), 'manual_adjustment'), auth.uid());

  return v;
end $$;

-- process_order: accepts an optional variant_id per item.
-- Products without variants behave as before. Products with variants must be sold by variant.
create or replace function public.process_order(p_channel text, p_payment_method text, p_customer_info jsonb, p_items jsonb)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    text;
  v_order   public.orders;
  v_product public.products;
  v_variant public.product_variants;
  v_item    record;
  v_unit    numeric(12,2);
  v_total   numeric(12,2) := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is null then
    raise exception 'Profile not found' using errcode = '28000';
  end if;

  if p_channel not in ('online','pos') then
    raise exception 'Invalid channel: %', p_channel using errcode = '22023';
  end if;

  if p_channel = 'pos' and v_role not in ('cashier','admin') then
    raise exception 'Only cashiers or admins can create POS orders' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'p_items must be a non-empty array' using errcode = '22023';
  end if;

  if p_customer_info is not null and jsonb_typeof(p_customer_info) <> 'object' then
    raise exception 'p_customer_info must be a JSON object' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where e->>'product_id' is null or coalesce((e->>'quantity')::int, 0) <= 0
  ) then
    raise exception 'Each item needs a product_id and a quantity > 0' using errcode = '22023';
  end if;

  insert into public.orders (user_id, cashier_id, channel, payment_method, status, customer_info)
  values (
    case when p_channel = 'online' then v_uid end,
    case when p_channel = 'pos'    then v_uid end,
    p_channel,
    p_payment_method,
    case when p_channel = 'pos' then 'completed' else 'pending' end,
    coalesce(p_customer_info, '{}'::jsonb)
  )
  returning * into v_order;

  for v_item in
    select (e->>'product_id')::uuid as product_id,
           nullif(e->>'variant_id', '')::uuid as variant_id,
           sum((e->>'quantity')::int)::int as quantity
    from jsonb_array_elements(p_items) e
    group by 1, 2
    order by 1, 2
  loop
    select * into v_product from public.products where id = v_item.product_id for update;

    if not found or not v_product.is_active then
      raise exception 'Product % is unavailable', v_item.product_id using errcode = 'P0002';
    end if;

    if v_item.variant_id is null then
      if exists (select 1 from public.product_variants where product_id = v_product.id and is_active) then
        raise exception 'Choose a size and color for "%"', v_product.name using errcode = '22023';
      end if;

      if v_product.stock_count < v_item.quantity then
        raise exception 'Insufficient stock for "%" (requested %, available %)',
          v_product.name, v_item.quantity, v_product.stock_count using errcode = '23514';
      end if;

      v_unit := coalesce(v_product.sale_price, v_product.price);

      update public.products set stock_count = stock_count - v_item.quantity where id = v_product.id;

      insert into public.order_items (order_id, product_id, quantity, unit_price)
      values (v_order.id, v_product.id, v_item.quantity, v_unit);

      insert into public.inventory_logs (product_id, change_amount, reason, order_id, created_by)
      values (v_product.id, -v_item.quantity, p_channel || '_sale', v_order.id, v_uid);
    else
      select * into v_variant
      from public.product_variants
      where id = v_item.variant_id and product_id = v_product.id
      for update;

      if not found or not v_variant.is_active then
        raise exception 'Selected size/color for "%" is unavailable', v_product.name using errcode = 'P0002';
      end if;

      if v_variant.stock_count < v_item.quantity then
        raise exception 'Insufficient stock for "%" %/% (requested %, available %)',
          v_product.name, v_variant.size, v_variant.color, v_item.quantity, v_variant.stock_count
          using errcode = '23514';
      end if;

      v_unit := coalesce(v_variant.price_override, v_product.sale_price, v_product.price);

      update public.product_variants
         set stock_count = stock_count - v_item.quantity, updated_at = now()
       where id = v_variant.id;

      update public.products set stock_count = stock_count - v_item.quantity where id = v_product.id;

      insert into public.order_items (order_id, product_id, variant_id, size, color, quantity, unit_price)
      values (v_order.id, v_product.id, v_variant.id, v_variant.size, v_variant.color, v_item.quantity, v_unit);

      insert into public.inventory_logs (product_id, variant_id, change_amount, reason, order_id, created_by)
      values (v_product.id, v_variant.id, -v_item.quantity, p_channel || '_sale', v_order.id, v_uid);
    end if;

    v_total := v_total + v_unit * v_item.quantity;
  end loop;

  update public.orders set total_amount = v_total where id = v_order.id returning * into v_order;

  return v_order;
end $$;
