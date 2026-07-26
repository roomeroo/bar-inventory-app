-- Rework: from an inventory tracker to a "what do we need to order" board.
-- Run this after 0001_init.sql, once, in your Supabase project's SQL Editor
-- (or via `supabase db push`).

-- =========================================================
-- Inventory counting is gone entirely — there's no more "start
-- inventory" flow, so the tables backing it (and their history)
-- are dropped rather than kept around unused.
-- =========================================================
drop table if exists public.inventory_item;
drop table if exists public.inventory_session;

-- =========================================================
-- article: drop the whole stock-tracking model (quantity, min_stock,
-- expected_quantity, pending_order_amount) and replace it with a single
-- needed_quantity — how many units someone has flagged as needed to
-- order. It persists until the order is confirmed (or cleared by hand)
-- and has no relation to how much stock is actually on the shelf.
-- =========================================================
alter table public.article
  drop column if exists min_stock,
  drop column if exists quantity,
  drop column if exists expected_quantity,
  drop column if exists pending_order_amount,
  add column if not exists needed_quantity numeric not null default 0;

-- =========================================================
-- category: user-controlled display order for the manage board's
-- columns, same idea as article.sort_order.
-- =========================================================
alter table public.category
  add column if not exists sort_order integer not null default 0;

create index if not exists category_bar_id_sort_order_idx on public.category(bar_id, sort_order);
