-- Enables Supabase Realtime (postgres_changes) on the tables the app
-- subscribes to, so a change made from one device/tab (or another
-- person managing the same bar) shows up live everywhere else without a
-- manual reload. Row Level Security still applies to what a client can
-- receive — this only controls which tables broadcast changes at all.
-- Wrapped in existence checks so this migration is safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'article'
  ) then
    alter publication supabase_realtime add table public.article;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'category'
  ) then
    alter publication supabase_realtime add table public.category;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
