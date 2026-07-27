-- zaay.fun — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Public read on discovery tables; all writes go through server routes using
-- the service-role key, so RLS denies anon writes by default.

-- ---------------------------------------------------------------------------
-- tokens: one row per launched bonding-curve token
-- ---------------------------------------------------------------------------
create table if not exists public.tokens (
  address           text primary key,          -- token contract address (lowercased)
  name              text not null,
  symbol            text not null,
  image_url         text,
  creator_username  text not null,             -- prmpted.com username (no @)
  creator_wallet    text,                      -- set once the creator claims
  prmpted_url       text not null,
  post_author       text,
  post_title        text,
  post_content      text,
  post_media        jsonb default '[]'::jsonb, -- [{type,url}]
  launcher_wallet   text,
  tx_hash           text,
  created_at        timestamptz not null default now()
);

create index if not exists tokens_creator_username_idx
  on public.tokens (lower(creator_username));
create index if not exists tokens_created_at_idx
  on public.tokens (created_at desc);

-- ---------------------------------------------------------------------------
-- prmpted_posts: cache of scraped prmpted.com posts (keyed by URL)
-- ---------------------------------------------------------------------------
create table if not exists public.prmpted_posts (
  url         text primary key,
  username    text,
  author      text,
  title       text,
  content     text,
  media       jsonb default '[]'::jsonb,
  source      text default 'og',             -- 'og' | 'api' | 'manual'
  fetched_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- username_claims: prmpted username -> wallet, with code verification
-- ---------------------------------------------------------------------------
create table if not exists public.username_claims (
  username          text primary key,          -- lowercased
  wallet            text,
  verification_code text,
  code_sent_to      text,                      -- where the code was surfaced
  status            text not null default 'pending', -- 'pending' | 'verified'
  release_tx_hash   text,                      -- FeeEscrow.claimFor tx
  created_at        timestamptz not null default now(),
  verified_at       timestamptz
);

-- ---------------------------------------------------------------------------
-- trades: append-only trade log (indexed from Trade events or written client-side)
-- ---------------------------------------------------------------------------
create table if not exists public.trades (
  id            bigint generated always as identity primary key,
  token_address text not null references public.tokens(address) on delete cascade,
  trader        text not null,
  side          text not null,                 -- 'buy' | 'sell'
  mon_amount    numeric not null,              -- MON (human units)
  token_amount  numeric not null,
  price         numeric,                       -- MON per token after the trade
  creator_fee   numeric,
  platform_fee  numeric,
  tx_hash       text,
  created_at    timestamptz not null default now()
);

create index if not exists trades_token_idx
  on public.trades (token_address, created_at desc);

-- ---------------------------------------------------------------------------
-- holders: current balance per (token, wallet). Upserted from trades/events.
-- ---------------------------------------------------------------------------
create table if not exists public.holders (
  token_address text not null references public.tokens(address) on delete cascade,
  wallet        text not null,
  balance       numeric not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (token_address, wallet)
);

create index if not exists holders_token_idx
  on public.holders (token_address, balance desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.tokens          enable row level security;
alter table public.prmpted_posts   enable row level security;
alter table public.username_claims enable row level security;
alter table public.trades          enable row level security;
alter table public.holders         enable row level security;

-- Public read for discovery tables (anon key).
create policy "public read tokens"  on public.tokens  for select using (true);
create policy "public read trades"  on public.trades  for select using (true);
create policy "public read holders" on public.holders for select using (true);
create policy "public read posts"   on public.prmpted_posts for select using (true);

-- username_claims: no anon read (contains verification codes). Server-only.
-- (No SELECT policy => anon cannot read. Service role bypasses RLS.)

-- Writes: no anon INSERT/UPDATE policies => only the service role (server routes)
-- can write. This keeps trade/holder/token integrity server-controlled.
