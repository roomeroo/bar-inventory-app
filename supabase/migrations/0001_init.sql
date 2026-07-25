-- bar-inventory-app schema
-- Run this whole file once in your Supabase project's SQL Editor (or via `supabase db push`).
-- See README.md for the full setup walkthrough, including the required Auth setting change.

create extension if not exists pgcrypto;

-- =========================================================
-- profiles: maps a real username to the auth.users row.
-- Accounts in this app use a hidden synthetic email
-- (username@gmail.com — see auth.service.ts for why) so users only
-- ever see/enter a username + password. This table stores the real
-- username.
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = id);

-- =========================================================
-- bar: the tenant boundary. Every signup gets exactly one bar,
-- auto-created by the trigger below — there's no multi-bar UI
-- in this app yet, but modeling it as its own entity now keeps
-- the door open without touching every other table later.
-- =========================================================
create table public.bar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index bar_user_id_name_key on public.bar(user_id, name);
create index bar_user_id_idx on public.bar(user_id);

alter table public.bar enable row level security;

create policy "bar_select_own" on public.bar for select using ((select auth.uid()) = user_id);
create policy "bar_insert_own" on public.bar for insert with check ((select auth.uid()) = user_id);
create policy "bar_update_own" on public.bar for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "bar_delete_own" on public.bar for delete using ((select auth.uid()) = user_id);

-- Auto-create the profile + the user's one bar whenever a new auth user
-- is created. Runs as security definer so it can insert regardless of
-- the (not-yet-existent) caller session's RLS. The unique constraint on
-- username is what actually enforces "username already taken" — if it
-- fires, this whole function raises and the auth.users insert (and the
-- signUp call) rolls back.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
begin
  insert into public.profiles (id, username) values (new.id, v_username);
  insert into public.bar (user_id, name) values (new.id, v_username || '''s bar');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The trigger runs regardless of grants; this just stops it from being
-- called directly via the REST API (e.g. /rest/v1/rpc/handle_new_user).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- =========================================================
-- category: scoped to a bar, referenced by article.
-- =========================================================
create table public.category (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bar(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index category_bar_id_name_key on public.category(bar_id, name);
create index category_bar_id_idx on public.category(bar_id);

alter table public.category enable row level security;

create policy "category_select_own" on public.category for select
  using (exists (select 1 from public.bar where bar.id = category.bar_id and bar.user_id = (select auth.uid())));
create policy "category_insert_own" on public.category for insert
  with check (exists (select 1 from public.bar where bar.id = category.bar_id and bar.user_id = (select auth.uid())));
create policy "category_update_own" on public.category for update
  using (exists (select 1 from public.bar where bar.id = category.bar_id and bar.user_id = (select auth.uid())))
  with check (exists (select 1 from public.bar where bar.id = category.bar_id and bar.user_id = (select auth.uid())));
create policy "category_delete_own" on public.category for delete
  using (exists (select 1 from public.bar where bar.id = category.bar_id and bar.user_id = (select auth.uid())));

-- =========================================================
-- article: the live inventory ("item" in the app's UI/code).
-- quantity is the last known count. min_stock is the fallback
-- low-stock floor for articles that have never been ordered yet.
-- expected_quantity / pending_order_amount track "what we should
-- have after the last order", cleared again once the next
-- inventory count resolves them. See README for the worked example.
-- =========================================================
create table public.article (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bar(id) on delete cascade,
  category_id uuid references public.category(id) on delete set null,
  name text not null,
  unit text not null default 'unit',
  min_stock numeric not null default 0,
  quantity numeric not null default 0,
  expected_quantity numeric,
  pending_order_amount numeric,
  -- User-controlled display order (lower = earlier), independent of name.
  -- Lets a bar arrange its catalog to match physical shelf/count order.
  -- New articles append to the end (see items.service.ts's create()).
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index article_bar_id_name_key on public.article(bar_id, name);
create index article_bar_id_idx on public.article(bar_id);
create index article_category_id_idx on public.article(category_id);
create index article_bar_id_sort_order_idx on public.article(bar_id, sort_order);

alter table public.article enable row level security;

create policy "article_select_own" on public.article for select
  using (exists (select 1 from public.bar where bar.id = article.bar_id and bar.user_id = (select auth.uid())));
create policy "article_insert_own" on public.article for insert
  with check (exists (select 1 from public.bar where bar.id = article.bar_id and bar.user_id = (select auth.uid())));
create policy "article_update_own" on public.article for update
  using (exists (select 1 from public.bar where bar.id = article.bar_id and bar.user_id = (select auth.uid())))
  with check (exists (select 1 from public.bar where bar.id = article.bar_id and bar.user_id = (select auth.uid())));
create policy "article_delete_own" on public.article for delete
  using (exists (select 1 from public.bar where bar.id = article.bar_id and bar.user_id = (select auth.uid())));

-- =========================================================
-- inventory_session + inventory_item: one session per completed
-- "Start inventory" count. inventory_item captures last_quantity
-- (what the article was), current_quantity (what was just counted),
-- order_quantity (what had been pending from the last order, 0 if
-- none) and is_low, all as they were at that moment — so History
-- can render the "ordered X to reach Y, found Z" badge later even
-- though the live article's expected_quantity gets cleared right
-- after saving the count.
-- =========================================================
create table public.inventory_session (
  id bigint generated by default as identity primary key,
  bar_id uuid not null references public.bar(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index inventory_session_bar_id_idx on public.inventory_session(bar_id);

alter table public.inventory_session enable row level security;

create policy "inventory_session_select_own" on public.inventory_session for select
  using (exists (select 1 from public.bar where bar.id = inventory_session.bar_id and bar.user_id = (select auth.uid())));
create policy "inventory_session_insert_own" on public.inventory_session for insert
  with check (exists (select 1 from public.bar where bar.id = inventory_session.bar_id and bar.user_id = (select auth.uid())));
create policy "inventory_session_update_own" on public.inventory_session for update
  using (exists (select 1 from public.bar where bar.id = inventory_session.bar_id and bar.user_id = (select auth.uid())))
  with check (exists (select 1 from public.bar where bar.id = inventory_session.bar_id and bar.user_id = (select auth.uid())));
create policy "inventory_session_delete_own" on public.inventory_session for delete
  using (exists (select 1 from public.bar where bar.id = inventory_session.bar_id and bar.user_id = (select auth.uid())));

create table public.inventory_item (
  id bigint generated by default as identity primary key,
  session_id bigint not null references public.inventory_session(id) on delete cascade,
  article_id uuid references public.article(id) on delete set null,
  article_name text not null,
  unit text not null,
  category_name text,
  min_stock numeric not null,
  last_quantity numeric not null,
  current_quantity numeric not null,
  order_quantity numeric not null default 0,
  is_low boolean not null default false,
  created_at timestamptz not null default now()
);

create index inventory_item_session_id_idx on public.inventory_item(session_id);
create index inventory_item_article_id_idx on public.inventory_item(article_id);

alter table public.inventory_item enable row level security;

create policy "inventory_item_select_own" on public.inventory_item for select
  using (exists (
    select 1 from public.inventory_session s
    join public.bar b on b.id = s.bar_id
    where s.id = inventory_item.session_id and b.user_id = (select auth.uid())
  ));
create policy "inventory_item_insert_own" on public.inventory_item for insert
  with check (exists (
    select 1 from public.inventory_session s
    join public.bar b on b.id = s.bar_id
    where s.id = inventory_item.session_id and b.user_id = (select auth.uid())
  ));
create policy "inventory_item_update_own" on public.inventory_item for update
  using (exists (
    select 1 from public.inventory_session s
    join public.bar b on b.id = s.bar_id
    where s.id = inventory_item.session_id and b.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.inventory_session s
    join public.bar b on b.id = s.bar_id
    where s.id = inventory_item.session_id and b.user_id = (select auth.uid())
  ));
create policy "inventory_item_delete_own" on public.inventory_item for delete
  using (exists (
    select 1 from public.inventory_session s
    join public.bar b on b.id = s.bar_id
    where s.id = inventory_item.session_id and b.user_id = (select auth.uid())
  ));

-- =========================================================
-- orders + order_items: a placed order, independent of any
-- inventory session. Confirming an order never changes
-- article.quantity — only a real inventory count does.
-- =========================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  bar_id uuid not null references public.bar(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index orders_bar_id_idx on public.orders(bar_id);

alter table public.orders enable row level security;

create policy "orders_select_own" on public.orders for select
  using (exists (select 1 from public.bar where bar.id = orders.bar_id and bar.user_id = (select auth.uid())));
create policy "orders_insert_own" on public.orders for insert
  with check (exists (select 1 from public.bar where bar.id = orders.bar_id and bar.user_id = (select auth.uid())));
create policy "orders_update_own" on public.orders for update
  using (exists (select 1 from public.bar where bar.id = orders.bar_id and bar.user_id = (select auth.uid())))
  with check (exists (select 1 from public.bar where bar.id = orders.bar_id and bar.user_id = (select auth.uid())));
create policy "orders_delete_own" on public.orders for delete
  using (exists (select 1 from public.bar where bar.id = orders.bar_id and bar.user_id = (select auth.uid())));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  article_id uuid references public.article(id) on delete set null,
  article_name text not null,
  unit text not null,
  quantity numeric not null,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_article_id_idx on public.order_items(article_id);

alter table public.order_items enable row level security;

create policy "order_items_select_own" on public.order_items for select
  using (exists (
    select 1 from public.orders o join public.bar b on b.id = o.bar_id
    where o.id = order_items.order_id and b.user_id = (select auth.uid())
  ));
create policy "order_items_insert_own" on public.order_items for insert
  with check (exists (
    select 1 from public.orders o join public.bar b on b.id = o.bar_id
    where o.id = order_items.order_id and b.user_id = (select auth.uid())
  ));
create policy "order_items_update_own" on public.order_items for update
  using (exists (
    select 1 from public.orders o join public.bar b on b.id = o.bar_id
    where o.id = order_items.order_id and b.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.orders o join public.bar b on b.id = o.bar_id
    where o.id = order_items.order_id and b.user_id = (select auth.uid())
  ));
create policy "order_items_delete_own" on public.order_items for delete
  using (exists (
    select 1 from public.orders o join public.bar b on b.id = o.bar_id
    where o.id = order_items.order_id and b.user_id = (select auth.uid())
  ));
