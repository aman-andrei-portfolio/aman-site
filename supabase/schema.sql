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
-- Cât spațiu ocupă fișierele din „livrari” (folosit de server ca să nu se depășească 1 GB).
create or replace function public.livrari_used_bytes() returns bigint
language sql security definer set search_path = '' stable as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)::bigint from storage.objects where bucket_id = 'livrari';
$$;
revoke all on function public.livrari_used_bytes() from public, anon, authenticated;
grant execute on function public.livrari_used_bytes() to service_role;
select public.livrari_used_bytes() as used;
-- Site-uri create de clienți în editor (ciorne). Accesul se face doar prin serverul site-ului.
create table if not exists public.sites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  template    text not null check (template in ('barber', 'cafe', 'salon', 'portfolio')),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sites_user_id_idx on public.sites (user_id);
alter table public.sites enable row level security;
revoke all on public.sites from anon, authenticated;
alter table public.orders add column if not exists site_id uuid references public.sites (id) on delete set null;
create or replace function public.sites_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists sites_touch on public.sites;
create trigger sites_touch before update on public.sites for each row execute function public.sites_touch();
-- Chat-ul dintre tine și client, câte unul pentru fiecare comandă. Acces doar prin serverul site-ului.
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  sender          text not null check (sender in ('client', 'admin')),
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now(),
  read_by_client  timestamptz,
  read_by_admin   timestamptz
);
create index if not exists messages_order_idx on public.messages (order_id, created_at);
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;

-- Comenzi ascunse din panou (arhivă); clientul le vede în continuare.
alter table public.orders add column if not exists archived_at timestamptz;

-- Întrebările (conversații fără comandă) au suma 0.
alter table public.orders drop constraint if exists orders_amount_check;
alter table public.orders add constraint orders_amount_check check (amount >= 0);
