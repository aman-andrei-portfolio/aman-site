-- Baza de date pentru zona de client.
-- Rulează o singură dată în Supabase: SQL Editor → New query → lipește tot → Run.

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users (id) on delete set null,
  email             text,
  customer_name     text,
  package           text not null,
  title             text not null,
  amount            integer not null check (amount > 0),     -- în bani / cenți
  currency          text not null check (currency in ('ron', 'eur')),
  lang              text not null default 'ro',
  -- requested = cerere trimisă din site, aștept plata prin transfer
  status            text not null default 'requested'
                    check (status in ('requested', 'paid', 'in_progress', 'review', 'delivered', 'cancelled', 'refunded')),
  code              text unique,                             -- codul comenzii, ex. AM-K7P2Q (îl trimite clientul pe Instagram)
  instagram         text,                                    -- username-ul de Instagram al clientului
  brief             text,                                    -- ce dorește clientul, scris de el
  note              text,                                    -- mesaj de la tine pentru client (opțional)
  delivery_url      text,                                    -- link către fișierele livrate (opțional)
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  -- când marchezi comanda ca plătită (sau mai departe), data plății se completează singură
  if new.status in ('paid', 'in_progress', 'review', 'delivered') and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Securitate: fiecare client își poate CITI doar comenzile lui.
-- Nimeni nu poate crea, modifica sau șterge comenzi din browser;
-- asta face doar serverul site-ului (cu cheia service_role) și tu din panoul Supabase.
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;

drop policy if exists "client citeste comenzile proprii" on public.orders;
create policy "client citeste comenzile proprii" on public.orders
  for select to authenticated
  using ((select auth.uid()) = user_id);
