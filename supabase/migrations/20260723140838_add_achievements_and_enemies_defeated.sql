/*
# Add achievements table for Eco Hero game

## Overview
This migration adds an `achievements` table to store which achievements
each player has unlocked, and an `enemies_defeated` column to the existing
`high_scores` table to track pollution monsters defeated.

## New Tables
- `achievements`
  - `id` (uuid, primary key, auto-generated)
  - `player_name` (text, not null) - the player who unlocked the achievement
  - `achievement_id` (text, not null) - the achievement key (e.g. "first_trash", "all_trash")
  - `unlocked_at` (timestamptz, default now())

## Modified Tables
- `high_scores`
  - ADD COLUMN `enemies_defeated` (integer, not null, default 0) - total pollution monsters stomped

## Security
- Enable RLS on `achievements`.
- Allow anon + authenticated to read all achievements (public).
- Allow anon + authenticated to insert achievement records.
- No update or delete — achievements are immutable once unlocked.

## Notes
1. The `enemies_defeated` column addition is idempotent via DO block.
2. A composite unique index prevents duplicate achievement unlocks for the same player+achievement.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'high_scores' AND column_name = 'enemies_defeated'
  ) THEN
    ALTER TABLE high_scores ADD COLUMN enemies_defeated integer NOT NULL DEFAULT 0;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  achievement_id text NOT NULL,
  unlocked_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_achievements" ON achievements;
CREATE POLICY "anon_select_achievements"
ON achievements FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_achievements" ON achievements;
CREATE POLICY "anon_insert_achievements"
ON achievements FOR INSERT
TO anon, authenticated WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_player_achievement
ON achievements (player_name, achievement_id);
