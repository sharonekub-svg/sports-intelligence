-- Reference-data seed: sports, leagues, and data source registrations.
-- This is REAL reference metadata (league names/keys), not demo/fake stats —
-- safe to load into any environment. It does not insert any matches, odds,
-- or predictions, so there is nothing here that could be mistaken for a
-- live result.

insert into public.sports (key, name_he, name_en) values
  ('football', 'כדורגל', 'Football'),
  ('basketball', 'כדורסל', 'Basketball')
on conflict (key) do nothing;

insert into public.data_sources (key, kind, config) values
  ('the_odds_api', 'odds', jsonb_build_object('base_url', 'https://api.the-odds-api.com/v4')),
  ('free_scores_provider', 'scores', jsonb_build_object('base_url', 'https://webws.365scores.com/web'))
on conflict (key) do nothing;

-- League pool (provider_key maps to The Odds API's sport_key).
-- Deliberately includes small/less-followed leagues alongside majors, per
-- the product's "scan small leagues too" requirement.
do $$
declare
  football_id uuid := (select id from public.sports where key = 'football');
  basketball_id uuid := (select id from public.sports where key = 'basketball');
begin
  insert into public.leagues (sport_id, provider_key, country, name_he, name_en) values
    (football_id, 'soccer_fifa_world_cup', null, 'מונדיאל', 'FIFA World Cup'),
    (football_id, 'soccer_uefa_champs_league', null, 'ליגת האלופות', 'UEFA Champions League'),
    (football_id, 'soccer_uefa_europa_league', null, 'ליגה אירופית', 'UEFA Europa League'),
    (football_id, 'soccer_uefa_europa_conference_league', null, 'ליגת הקונפרנס', 'UEFA Europa Conference League'),
    (football_id, 'soccer_uefa_nations_league', null, 'ליגת האומות', 'UEFA Nations League'),
    (football_id, 'soccer_epl', 'England', 'פרמייר ליג', 'Premier League'),
    (football_id, 'soccer_england_championship', 'England', 'צ''מפיונשיפ', 'Championship'),
    (football_id, 'soccer_england_league1', 'England', 'ליג 1 (אנגליה)', 'League One'),
    (football_id, 'soccer_spain_la_liga', 'Spain', 'לה ליגה', 'La Liga'),
    (football_id, 'soccer_germany_bundesliga', 'Germany', 'בונדסליגה', 'Bundesliga'),
    (football_id, 'soccer_italy_serie_a', 'Italy', 'סרייה א', 'Serie A'),
    (football_id, 'soccer_france_ligue_one', 'France', 'ליג 1 (צרפת)', 'Ligue 1'),
    (football_id, 'soccer_netherlands_eredivisie', 'Netherlands', 'ארדיוויזי', 'Eredivisie'),
    (football_id, 'soccer_belgium_first_div', 'Belgium', 'בלגית ראשונה', 'Belgian First Division'),
    (football_id, 'soccer_portugal_primeira_liga', 'Portugal', 'פורטוגלית ראשונה', 'Primeira Liga'),
    (football_id, 'soccer_turkey_super_league', 'Turkey', 'טורקית ראשונה', 'Süper Lig'),
    (football_id, 'soccer_greece_super_league', 'Greece', 'יוונית ראשונה', 'Super League Greece'),
    (football_id, 'soccer_scotland_premiership', 'Scotland', 'פרמייר ספורט (סקוטלנד)', 'Scottish Premiership'),
    (football_id, 'soccer_sweden_allsvenskan', 'Sweden', 'שבדית ראשונה', 'Allsvenskan'),
    (football_id, 'soccer_norway_eliteserien', 'Norway', 'נורבגית ראשונה', 'Eliteserien'),
    (football_id, 'soccer_denmark_superliga', 'Denmark', 'דנית ראשונה', 'Danish Superliga'),
    (football_id, 'soccer_finland_veikkausliiga', 'Finland', 'פינית ראשונה', 'Veikkausliiga'),
    (football_id, 'soccer_israel_premier_league', 'Israel', 'ליגת העל', 'Ligat Ha''Al'),
    (football_id, 'soccer_south_korea_kleague1', 'South Korea', 'K-League', 'K League 1'),
    (football_id, 'soccer_japan_j_league', 'Japan', 'J-League', 'J1 League'),
    (football_id, 'soccer_china_superleague', 'China', 'סינית ראשונה', 'Chinese Super League'),
    (football_id, 'soccer_australia_aleague', 'Australia', 'A-League', 'A-League Men'),
    (football_id, 'soccer_usa_mls', 'USA', 'MLS', 'Major League Soccer'),
    (football_id, 'soccer_usa_usl_championship', 'USA', 'USL Championship', 'USL Championship'),
    (football_id, 'soccer_mexico_ligamx', 'Mexico', 'ליגה MX', 'Liga MX'),
    (football_id, 'soccer_brazil_campeonato', 'Brazil', 'ברזילאית ראשונה', 'Campeonato Brasileiro Série A'),
    (football_id, 'soccer_brazil_serie_b', 'Brazil', 'ברזילאית שנייה', 'Campeonato Brasileiro Série B'),
    (football_id, 'soccer_argentina_primera_division', 'Argentina', 'ארגנטינאית ראשונה', 'Primera División'),
    (football_id, 'soccer_colombia_primera_a', 'Colombia', 'קולומביאנית ראשונה', 'Categoría Primera A'),
    (football_id, 'soccer_chile_primera_division', 'Chile', 'צ''יליאנית ראשונה', 'Primera División de Chile'),
    (football_id, 'soccer_conmebol_copa_libertadores', null, 'קופה ליברטדורס', 'Copa Libertadores'),
    (football_id, 'soccer_conmebol_copa_sudamericana', null, 'קופה סודאמריקאנה', 'Copa Sudamericana'),
    (basketball_id, 'basketball_nba', 'USA', 'NBA', 'NBA'),
    (basketball_id, 'basketball_ncaab', 'USA', 'NCAA', 'NCAA Basketball'),
    (basketball_id, 'basketball_nbl', 'Australia', 'NBL', 'NBL'),
    (basketball_id, 'basketball_euroleague', null, 'יורוליג', 'EuroLeague'),
    (basketball_id, 'basketball_israel_premier_league', 'Israel', 'ליגת העל כדורסל', 'Israeli Basketball Premier League')
  on conflict (sport_id, provider_key) do nothing;
end $$;
