-- Row-Level Security for every table.
--
-- Baseline: revoke the broad default grant Supabase gives `anon` on new
-- tables, then explicitly re-grant + add a `select`-for-all policy on the
-- tables that are genuinely public product data (leagues, matches, odds,
-- predictions_public, ...).
--
-- Tables with NO policy at all after this file (subscriptions, stripe_events,
-- data_sources, ingestion_runs, system_logs, predictions, backtests) are
-- reachable ONLY by the service-role key (which bypasses RLS) — this is
-- deliberate "secure by omission", not an oversight. Application code reads
-- those via lib/supabase/admin.ts after an explicit requirePro()/requireAdmin()
-- check, never via a client-facing policy.

revoke all on all tables in schema public from anon;

-- ─────────────────────────────────────────────────────────────────────────
-- Public reference & product data — readable by anyone, written by service
-- role / admin only (no insert/update/delete policy for anon/authenticated).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.sports enable row level security;
grant select on public.sports to anon, authenticated;
create policy "sports public read" on public.sports for select using (true);

alter table public.leagues enable row level security;
grant select on public.leagues to anon, authenticated;
create policy "leagues public read" on public.leagues for select using (true);

alter table public.teams enable row level security;
grant select on public.teams to anon, authenticated;
create policy "teams public read" on public.teams for select using (true);

alter table public.players enable row level security;
grant select on public.players to anon, authenticated;
create policy "players public read" on public.players for select using (true);

alter table public.matches enable row level security;
grant select on public.matches to anon, authenticated;
create policy "matches public read" on public.matches for select using (true);

alter table public.match_statistics enable row level security;
grant select on public.match_statistics to anon, authenticated;
create policy "match_statistics public read" on public.match_statistics for select using (true);

alter table public.team_ratings enable row level security;
grant select on public.team_ratings to anon, authenticated;
create policy "team_ratings public read" on public.team_ratings for select using (true);

alter table public.league_ratings enable row level security;
grant select on public.league_ratings to anon, authenticated;
create policy "league_ratings public read" on public.league_ratings for select using (true);

alter table public.odds enable row level security;
grant select on public.odds to anon, authenticated;
create policy "odds public read" on public.odds for select using (true);

alter table public.odds_snapshots enable row level security;
grant select on public.odds_snapshots to anon, authenticated;
create policy "odds_snapshots public read" on public.odds_snapshots for select using (true);

alter table public.model_versions enable row level security;
grant select on public.model_versions to anon, authenticated;
create policy "model_versions public read" on public.model_versions for select using (true);

-- predictions_public is a view over the fully-locked `predictions` table
-- (see below) — it needs its own grant since views are separate relations.
grant select on public.predictions_public to anon, authenticated;

-- Live settlement facts (did prediction X hit) are product transparency,
-- not proprietary model internals — the proprietary parts (edge, opportunity
-- score, confidence) live only on `predictions`, which stays fully locked.
alter table public.prediction_results enable row level security;
grant select on public.prediction_results to anon, authenticated;
create policy "prediction_results public read" on public.prediction_results for select using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- User-owned data — self-row access only.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- No client insert/delete policy: profiles are created by the
-- handle_new_user() trigger (see 20260101000200_functions.sql) and never
-- deleted directly by a client.

alter table public.saved_matches enable row level security;
grant select, insert, delete on public.saved_matches to authenticated;
create policy "saved_matches self select" on public.saved_matches
  for select using (auth.uid() = user_id);
create policy "saved_matches self insert" on public.saved_matches
  for insert with check (auth.uid() = user_id);
create policy "saved_matches self delete" on public.saved_matches
  for delete using (auth.uid() = user_id);

alter table public.user_preferences enable row level security;
grant select, insert, update on public.user_preferences to authenticated;
create policy "user_preferences self select" on public.user_preferences
  for select using (auth.uid() = user_id);
create policy "user_preferences self insert" on public.user_preferences
  for insert with check (auth.uid() = user_id);
create policy "user_preferences self update" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Service-role-only tables: no client access whatsoever.
-- RLS is enabled and NO policy is created for anon or authenticated, so —
-- per Postgres semantics — every role except the table owner and roles
-- with BYPASSRLS (service_role, in Supabase) sees zero rows and can write
-- nothing, regardless of any table-level grant. This is intentional and
-- matches the "payment-authoritative tables" pattern used elsewhere.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.data_sources enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.system_logs enable row level security;

-- Proprietary model internals: read only via service-role after an
-- explicit requirePro() check in application code (see lib/auth/requirePro.ts).
-- Free/anon access goes through predictions_public instead.
alter table public.predictions enable row level security;

-- Backtests are an analysis/admin tool, not live product data — served to
-- the UI only via service-role reads gated by requirePro()/requireAdmin().
alter table public.backtests enable row level security;
