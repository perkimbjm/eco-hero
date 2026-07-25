-- Player progression: XP, Eco Coins, unlocked skins, and badges
CREATE TABLE player_progress (
  player_name TEXT PRIMARY KEY DEFAULT 'Pahlawan Anonim',
  total_xp INTEGER NOT NULL DEFAULT 0,
  eco_coins INTEGER NOT NULL DEFAULT 0,
  total_trash_collected INTEGER NOT NULL DEFAULT 0,
  total_enemies_defeated INTEGER NOT NULL DEFAULT 0,
  total_secrets_found INTEGER NOT NULL DEFAULT 0,
  total_animals_saved INTEGER NOT NULL DEFAULT 0,
  levels_completed INTEGER NOT NULL DEFAULT 0,
  beaches_completed INTEGER NOT NULL DEFAULT 0,
  rivers_completed INTEGER NOT NULL DEFAULT 0,
  equipped_skin TEXT NOT NULL DEFAULT 'default',
  unlocked_skins TEXT[] NOT NULL DEFAULT ARRAY['default']::TEXT[],
  unlocked_badges TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_player_progress" ON player_progress
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "insert_player_progress" ON player_progress
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "update_player_progress" ON player_progress
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_player_progress" ON player_progress
  FOR DELETE TO anon, authenticated USING (true);
