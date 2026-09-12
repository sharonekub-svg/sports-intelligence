-- Sports Intelligence — initial schema
-- Extensions, enums-as-check-constraints, tables, indexes, foreign keys.
-- RLS is enabled and policies are added in the next migration
-- (20260101000100_rls.sql) — tables here are created with RLS OFF so this
-- file can be reasoned about purely in terms of structure.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- Reference data
-- ─────────────────────────────────────────────────────────────────────────

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_he text not null,
  name_en text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  provider_key text not null,
  country text,
  name_he text not null,
  name_en text not null,
  tier smallint,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sport_id, provider_key)
);
create index leagues_sport_active_idx on public.leagues (sport_id, active);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete restrict,
  name_he text not null,
  name_en text not null,
  short_name text,
  external_ref jsonb not null default '{}'::jsonb,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teams_league_idx on public.teams (league_id);
create index teams_external_ref_idx on public.teams using gin (external_ref);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name_he text not null,
  name_en text not null,
  position text,
  external_ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index players_team_idx on public.players (team_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Ingestion
-- ─────────────────────────────────────────────────────────────────────────

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete restrict,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'final', 'postponed', 'cancelled')),
  home_score smallint,
  away_score smallint,
  venue text,
  external_ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, home_team_id, away_team_id, scheduled_at)
);
create index matches_scheduled_at_idx on public.matches (scheduled_at);
create index matches_league_status_idx on public.matches (league_id, status);
create index matches_status_idx on public.matches (status);

create table public.match_statistics (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  stat_type text not null,
  home_value numeric,
  away_value numeric,
  period text not null default 'full',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index match_statistics_match_stat_idx on public.match_statistics (match_id, stat_type);

-- ─────────────────────────────────────────────────────────────────────────
-- Prediction engine — reference/state tables that must exist before
-- matches/predictions can point at a model version.
-- ─────────────────────────────────────────────────────────────────────────

create table public.model_versions (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  name text not null,
  version text not null,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'shadow'
    check (status in ('active', 'shadow', 'retired')),
  brier_score numeric,
  log_loss numeric,
  ece numeric,
  sample_size integer,
  trained_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, version)
);
create index model_versions_sport_status_idx on public.model_versions (sport_id, status);

create table public.team_ratings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  model_version_id uuid not null references public.model_versions(id) on delete cascade,
  rating_type text not null
    check (rating_type in ('elo', 'attack', 'defence', 'net_efficiency')),
  value numeric not null,
  sample_size integer not null default 0,
  shrinkage_weight numeric,
  as_of timestamptz not null,
  created_at timestamptz not null default now(),
  unique (team_id, model_version_id, rating_type, as_of)
);
create index team_ratings_team_as_of_idx on public.team_ratings (team_id, as_of desc);

create table public.league_ratings (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  model_version_id uuid not null references public.model_versions(id) on delete cascade,
  mean_rating numeric,
  rating_variance numeric,
  strength_index numeric,
  as_of timestamptz not null,
  created_at timestamptz not null default now(),
  unique (league_id, model_version_id, as_of)
);
create index league_ratings_league_as_of_idx on public.league_ratings (league_id, as_of desc);

-- ─────────────────────────────────────────────────────────────────────────
-- Odds
-- ─────────────────────────────────────────────────────────────────────────

create table public.odds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  bookmaker text not null,
  market text not null
    check (market in ('1x2', 'moneyline', 'totals', 'spread', 'btts')),
  outcome text not null,
  price numeric not null check (price > 1),
  point numeric,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, bookmaker, market, outcome)
);
create index odds_match_market_idx on public.odds (match_id, market);

create table public.odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  bookmaker text not null,
  market text not null
    check (market in ('1x2', 'moneyline', 'totals', 'spread', 'btts')),
  outcome text not null,
  price numeric not null check (price > 1),
  point numeric,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
-- Dedupe key as a plain expression index rather than a GENERATED column:
-- date_trunc('minute', timestamptz) is only STABLE (depends on session
-- TimeZone), not IMMUTABLE, so Postgres refuses it in a generated column
-- (42P17) but allows it in an index. Normalizing through 'utc' first makes
-- the truncation itself deterministic regardless of session timezone.
create unique index odds_snapshots_dedupe_idx on public.odds_snapshots (
  match_id, bookmaker, market, outcome,
  (date_trunc('minute', fetched_at at time zone 'utc'))
);
create index odds_snapshots_match_fetched_idx on public.odds_snapshots (match_id, fetched_at);

-- ─────────────────────────────────────────────────────────────────────────
-- Predictions
-- ─────────────────────────────────────────────────────────────────────────

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  model_version_id uuid not null references public.model_versions(id) on delete restrict,
  market text not null
    check (market in ('1x2', 'moneyline', 'totals', 'spread', 'btts')),
  outcome text not null,
  p_model numeric not null check (p_model between 0 and 1),
  p_market_novig numeric check (p_market_novig between 0 and 1),
  devig_method text check (devig_method in ('shin', 'power', 'proportional')),
  edge numeric,
  edge_se numeric,
  opportunity_score numeric,
  confidence_score numeric,
  data_quality_score numeric,
  wilson_ci_low numeric,
  wilson_ci_high numeric,
  is_actionable boolean not null default true,
  missingness text check (missingness in ('mcar', 'mar', 'mnar')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, model_version_id, market, outcome)
);
create index predictions_opportunity_idx on public.predictions (opportunity_score desc);
create index predictions_match_idx on public.predictions (match_id);
create index predictions_generated_at_idx on public.predictions (generated_at);

-- Free/anon-safe view: no edge/opportunity/confidence internals.
-- Deliberately NOT security_invoker: the base `predictions` table is
-- fully locked to service-role (see RLS migration), so this view must run
-- with its owner's privileges (the default for a plain view) to expose
-- these few public columns for every row, regardless of the caller's own
-- RLS access to `predictions`. Column list, not row filtering, is the
-- privacy boundary here — Pro internals are served only via server code
-- that has already called requirePro() and reads the base table directly
-- with the service-role client.
create view public.predictions_public as
  select id, match_id, market, outcome, p_model, generated_at
  from public.predictions;

create table public.prediction_results (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'correct', 'incorrect', 'push', 'cancelled', 'unknown')),
  result_status text check (result_status in ('final', 'cancelled', 'unknown')),
  settled_at timestamptz,
  row_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prediction_results_prediction_idx on public.prediction_results (prediction_id);
create index prediction_results_status_idx on public.prediction_results (status);

create table public.backtests (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.model_versions(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  sport_id uuid not null references public.sports(id) on delete cascade,
  window_start timestamptz not null,
  window_end timestamptz not null,
  embargo_days smallint not null default 3,
  sample_size integer not null,
  brier_score numeric,
  log_loss numeric,
  ece numeric,
  mean_edge numeric,
  median_edge numeric,
  fdr_adjusted_p_value numeric,
  is_significant boolean not null default false,
  run_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
create index backtests_model_league_window_idx on public.backtests (model_version_id, league_id, window_start);

-- ─────────────────────────────────────────────────────────────────────────
-- User & billing
-- ─────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'he',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

create table public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  type text not null,
  processed_at timestamptz not null default now()
);

create table public.saved_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (user_id, match_id)
);
create index saved_matches_user_idx on public.saved_matches (user_id);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  preferred_sports uuid[] not null default '{}',
  preferred_leagues uuid[] not null default '{}',
  notification_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Admin & ops
-- ─────────────────────────────────────────────────────────────────────────

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  kind text not null check (kind in ('odds', 'scores', 'both')),
  status text not null default 'healthy' check (status in ('healthy', 'degraded', 'down')),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  data_source_id uuid references public.data_sources(id) on delete set null,
  status text not null default 'running'
    check (status in ('running', 'success', 'failed', 'partial')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_processed integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  error_message text,
  error_stack text
);
create index ingestion_runs_job_started_idx on public.ingestion_runs (job_name, started_at desc);
create index ingestion_runs_status_idx on public.ingestion_runs (status);

create table public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  source text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index system_logs_level_created_idx on public.system_logs (level, created_at desc);
create index system_logs_context_idx on public.system_logs using gin (context);

-- Note: the client's required "users" table is intentionally NOT created as
-- a duplicate public.users — Supabase's built-in auth.users plus
-- public.profiles (above) covers it. Creating a second users table here
-- would only invite a sync-drift bug.
