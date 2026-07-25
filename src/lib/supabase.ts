import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface HighScore {
  id: string;
  player_name: string;
  score: number;
  level_reached: number;
  trash_collected: number;
  facts_learned: number;
  enemies_defeated: number;
  created_at: string;
}

export interface AchievementRecord {
  id: string;
  player_name: string;
  achievement_id: string;
  unlocked_at: string;
}

export async function fetchTopScores(limit = 20): Promise<HighScore[]> {
  const { data, error } = await supabase
    .from('high_scores')
    .select('id, player_name, score, level_reached, trash_collected, facts_learned, enemies_defeated, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function submitScore(entry: {
  player_name: string;
  score: number;
  level_reached: number;
  trash_collected: number;
  facts_learned: number;
  enemies_defeated: number;
}): Promise<HighScore | null> {
  const { data, error } = await supabase
    .from('high_scores')
    .insert(entry)
    .select('id, player_name, score, level_reached, trash_collected, facts_learned, enemies_defeated, created_at')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function submitAchievement(playerName: string, achievementId: string): Promise<void> {
  const { error } = await supabase
    .from('achievements')
    .insert({ player_name: playerName, achievement_id: achievementId })
    .select()
    .maybeSingle();

  // Ignore unique constraint violations (duplicate achievement)
  if (error && error.code !== '23505') throw error;
}

export async function fetchPlayerAchievements(playerName: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('achievement_id')
    .eq('player_name', playerName);

  if (error) throw error;
  return (data ?? []).map((r) => r.achievement_id);
}

// ── Player Progression ──────────────────────────────────────

export interface PlayerProgressRow {
  player_name: string;
  total_xp: number;
  eco_coins: number;
  total_trash_collected: number;
  total_enemies_defeated: number;
  total_secrets_found: number;
  total_animals_saved: number;
  levels_completed: number;
  beaches_completed: number;
  rivers_completed: number;
  equipped_skin: string;
  unlocked_skins: string[];
  unlocked_badges: string[];
  created_at: string;
  updated_at: string;
}

export async function fetchPlayerProgress(playerName: string): Promise<PlayerProgressRow | null> {
  const { data, error } = await supabase
    .from('player_progress')
    .select('*')
    .eq('player_name', playerName)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createPlayerProgress(playerName: string): Promise<PlayerProgressRow | null> {
  const { data, error } = await supabase
    .from('player_progress')
    .insert({ player_name: playerName })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updatePlayerProgress(
  playerName: string,
  updates: Partial<Omit<PlayerProgressRow, 'player_name' | 'created_at' | 'updated_at'>>
): Promise<PlayerProgressRow | null> {
  const { data, error } = await supabase
    .from('player_progress')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('player_name', playerName)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function purchaseSkin(
  playerName: string,
  skinId: string,
  price: number
): Promise<{ success: boolean; message: string; progress?: PlayerProgressRow }> {
  const current = await fetchPlayerProgress(playerName);
  if (!current) return { success: false, message: 'Data pemain tidak ditemukan' };

  if (current.unlocked_skins.includes(skinId)) {
    return { success: false, message: 'Skin sudah dimiliki' };
  }
  if (current.eco_coins < price) {
    return { success: false, message: 'Eco Coin tidak cukup' };
  }

  const updated = await updatePlayerProgress(playerName, {
    eco_coins: current.eco_coins - price,
    unlocked_skins: [...current.unlocked_skins, skinId],
  });

  return { success: true, message: 'Skin berhasil dibuka!', progress: updated ?? undefined };
}

export async function equipSkin(
  playerName: string,
  skinId: string
): Promise<{ success: boolean; message: string; progress?: PlayerProgressRow }> {
  const current = await fetchPlayerProgress(playerName);
  if (!current) return { success: false, message: 'Data pemain tidak ditemukan' };
  if (!current.unlocked_skins.includes(skinId)) {
    return { success: false, message: 'Skin belum dimiliki' };
  }

  const updated = await updatePlayerProgress(playerName, { equipped_skin: skinId });
  return { success: true, message: 'Skin dipakai!', progress: updated ?? undefined };
}
