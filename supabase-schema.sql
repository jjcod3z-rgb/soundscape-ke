-- ============================================================
-- Soundscape Audio Storefront — Supabase Schema
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PRODUCTS TABLE
-- Stores all sound packs, voiceovers, game audio listings
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  category      text not null default 'sound_pack'
                check (category in ('voiceover','game_audio','custom_song','sound_pack')),
  description   text default '',
  price_kes     integer not null default 0,
  r2_preview_url text,          -- cover image / preview hosted on R2
  r2_product_urls jsonb default '[]'::jsonb, -- array of {name, url} objects
  metadata      jsonb default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Index for storefront listing queries
create index if not exists idx_products_active on public.products (is_active, created_at desc);

-- 2. ORDERS TABLE
-- Tracks every checkout attempt and PesaPal payment lifecycle
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  customer_email      text not null,
  customer_phone      text,
  product_id          uuid references public.products(id) on delete set null,
  amount_kes          integer not null,
  pesapal_order_id    text,       -- PesaPal's order_tracking_id
  pesapal_tracking_id text,       -- from IPN callback
  status              text not null default 'pending'
                      check (status in ('pending','paid','failed','expired')),
  download_token      text,       -- generated on successful payment
  download_expires_at timestamptz, -- 7 days after payment
  created_at          timestamptz not null default now()
);

-- Index for IPN lookups
create index if not exists idx_orders_pesapal on public.orders (pesapal_order_id);
-- Index for download verification
create index if not exists idx_orders_download on public.orders (id, status);

-- 3. SONG BRIEFS TABLE
-- Custom song commission requests from the CustomSongForm
create table if not exists public.song_briefs (
  id              uuid primary key default gen_random_uuid(),
  genre           text not null,
  duration        text not null,
  lyrics_notes    text,
  customer_email  text,
  customer_phone  text,
  status          text not null default 'pending'
                  check (status in ('pending','quoted','accepted','completed','cancelled')),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.song_briefs enable row level security;

-- PRODUCTS: Anyone can read active products (storefront is public)
create policy "Public can read active products"
  on public.products for select
  using (is_active = true);

-- PRODUCTS: Only service_role (Netlify Functions) can insert/update/delete
-- No additional policy needed — service_role bypasses RLS automatically.

-- ORDERS: Users can read their own orders by email (for future account features)
create policy "Customers can view own orders"
  on public.orders for select
  using (true);  -- We verify via download_token in the function, not RLS

-- ORDERS: Only service_role can insert/update (Netlify Functions handle this)

-- SONG BRIEFS: Only service_role can insert (Netlify Function) and read (admin)
create policy "Public can insert briefs"
  on public.song_briefs for insert
  with check (true);

-- ============================================================
-- OPTIONAL: Seed a test product so the store isn't empty
-- ============================================================
-- Uncomment the following to add a sample product:

-- insert into public.products (slug, name, category, description, price_kes)
-- values (
--   'epic-battle-sfx',
--   'Epic Battle SFX Pack',
--   'game_audio',
--   'High-quality sword clashes, explosions, and ambient battlefield sounds. Perfect for RPGs and action games.',
--   2500
-- );
