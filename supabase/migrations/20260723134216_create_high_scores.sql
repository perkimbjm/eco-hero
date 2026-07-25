/*
# Create high_scores table for Eco Hero game

## Overview
This migration creates a table to store high scores for the Eco Hero
educational waste-management platformer game. Since the game has no
sign-in screen, this is a single-tenant (public/shared) schema.

## New Tables
- `high_scores`
  - `id` (uuid, primary key, auto-generated)
  - `player_name` (text, not null) - the name the player enters
  - `score` (integer, not null) - final score achieved
  - `level_reached` (integer, not null) - furthest level the player reached
  - `trash_collected` (integer, not null, default 0) - total trash items collected
  - `facts_learned` (integer, not null, default 0) - educational facts viewed
  - `created_at` (timestamptz, default now())

## Security
- Enable Row Level Security on `high_scores`.
- Allow anon + authenticated to read all scores (public leaderboard).
- Allow anon + authenticated to insert new scores.
- No update or delete policies — scores are immutable once submitted.
*/

CREATE TABLE IF NOT EXISTS high_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  score integer NOT NULL,
  level_reached integer NOT NULL,
  trash_collected integer NOT NULL DEFAULT 0,
  facts_learned integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_high_scores" ON high_scores;
CREATE POLICY "anon_select_high_scores"
ON high_scores FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_high_scores" ON high_scores;
CREATE POLICY "anon_insert_high_scores"
ON high_scores FOR INSERT
TO anon, authenticated WITH CHECK (true);

-- Index for leaderboard queries (top scores by score desc)
CREATE INDEX IF NOT EXISTS idx_high_scores_score_desc
ON high_scores (score DESC);
