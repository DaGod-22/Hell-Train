-- ============================================================
-- HELL TRAIN — Supabase schema with secure RLS
-- Run this in the Supabase SQL editor to set up the backend.
-- ============================================================

create table if not exists public.scores (
  id bigserial primary key,
  player_id text not null,
  client_hash bigint not null,
  score integer not null check (score >= 0 and score <= 1000000000),
  time_s integer not null check (time_s >= 0 and time_s <= 86400),
  stage integer not null check (stage >= 1 and stage <= 999),
  realm text not null,
  kills integer not null default 0 check (kills >= 0 and kills <= 1000000),
  character text not null default 'conductor',
  difficulty text not null default 'normal',
  challenge text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes for fast leaderboard reads
-- ============================================================
create index if not exists scores_score_desc on public.scores (score desc);
create index if not exists scores_realm on public.scores (realm, score desc);
create index if not exists scores_difficulty on public.scores (difficulty, score desc);
create index if not exists scores_player on public.scores (player_id, created_at desc);

-- ============================================================
-- View: top score per player (used for "personal best" filters)
-- ============================================================
create or replace view public.player_best as
  select distinct on (player_id)
    player_id, score, time_s, stage, realm, kills, difficulty, created_at
  from public.scores
  order by player_id, score desc;

-- ============================================================
-- ROW LEVEL SECURITY
-- Block arbitrary direct writes from clients; only allow via
-- the Edge Function (service role) OR allow INSERTs from anon
-- with strict validation triggers.
-- ============================================================
alter table public.scores enable row level security;

drop policy if exists scores_read_public on public.scores;
create policy scores_read_public on public.scores
  for select using (true);

-- Inserts are blocked for anon; the recommended approach is to
-- use an Edge Function with service-role to insert. If you want
-- client-side inserts, uncomment the policy below AND add the
-- anti-cheat trigger.
drop policy if exists scores_insert_anon on public.scores;
-- create policy scores_insert_anon on public.scores
--   for insert with check (score <= 1000000 and time_s <= 86400);

-- ============================================================
-- ANTI-CHEAT: if allowing direct inserts, this trigger validates
-- shape, rejects duplicates within 30s by the same client_hash.
-- ============================================================
create or replace function public.validate_score() returns trigger as $$
begin
  if new.score is null or new.score < 0 then
    raise exception 'invalid score';
  end if;
  if new.player_id is null or length(new.player_id) > 64 then
    raise exception 'invalid player_id';
  end if;
  if exists (
    select 1 from public.scores
    where client_hash = new.client_hash
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'rate-limited (one submission per 30s)';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_scores_validate on public.scores;
create trigger trg_scores_validate
  before insert on public.scores
  for each row execute function public.validate_score();

-- ============================================================
-- Realtime publication
-- ============================================================
do $$
begin
  alter publication supabase_realtime add table public.scores;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Recommended Edge Function (server-side validation)
-- Create a Supabase Edge Function `submit-score` with:
--   - service-role key
--   - same validate_score logic
--   - additional rate limits per IP
-- The client should call this function instead of inserting directly.
-- ============================================================
