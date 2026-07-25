import { useState, useEffect, useCallback } from 'react';
import {
  Home, Sprout, Swords, Shield, Crown, Award, Trash2, Waves, Droplet, Gem, Shirt, Coins, Star, Lock, Check, Sparkles, RefreshCw,
} from 'lucide-react';
import {
  ECO_RANKS, getRankForXp, getRankProgress, SKINS, BADGES,
  type PlayerProgressData,
} from '@/game/progression';
import { getSkill } from '@/game/skills';
import {
  fetchPlayerProgress, createPlayerProgress, purchaseSkin, equipSkin,
  type PlayerProgressRow,
} from '@/lib/supabase';

interface ProgressScreenProps {
  playerName: string;
  onHome: () => void;
  /** Notifies the app so the next level starts with the newly equipped skin. */
  onSkinChange?: (skinId: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  sprout: Sprout, swords: Swords, shield: Shield, crown: Crown, award: Award,
  trash: Trash2, waves: Waves, droplet: Droplet, gem: Gem, shirt: Shirt,
};

export function ProgressScreen({ playerName, onHome, onSkinChange }: ProgressScreenProps) {
  const [progress, setProgress] = useState<PlayerProgressRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await fetchPlayerProgress(playerName);
      if (!data) data = await createPlayerProgress(playerName);
      setProgress(data);
    } catch {
      setError('Gagal memuat progres. Periksa koneksi.');
    } finally {
      setLoading(false);
    }
  }, [playerName]);

  useEffect(() => { load(); }, [load]);

  const toData = (r: PlayerProgressRow): PlayerProgressData => ({
    totalXp: r.total_xp, ecoCoins: r.eco_coins,
    totalTrashCollected: r.total_trash_collected, totalEnemiesDefeated: r.total_enemies_defeated,
    totalSecretsFound: r.total_secrets_found, totalAnimalsSaved: r.total_animals_saved,
    levelsCompleted: r.levels_completed, beachesCompleted: r.beaches_completed,
    riversCompleted: r.rivers_completed, unlockedSkins: r.unlocked_skins,
    unlockedBadges: r.unlocked_badges, equippedSkin: r.equipped_skin,
  });

  const handleBuy = async (skinId: string, price: number) => {
    if (!progress) return;
    const res = await purchaseSkin(playerName, skinId, price);
    if (res.success && res.progress) {
      setProgress(res.progress);
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleEquip = async (skinId: string) => {
    if (!progress) return;
    const res = await equipSkin(playerName, skinId);
    if (res.success && res.progress) {
      setProgress(res.progress);
      onSkinChange?.(res.progress.equipped_skin);
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <RefreshCw size={32} className="text-green-400 animate-spin" />
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
        <p className="text-red-400">{error ?? 'Data tidak ditemukan'}</p>
        <button onClick={load} className="px-6 py-3 bg-green-600 rounded-xl text-white font-bold">Coba Lagi</button>
      </div>
    );
  }

  const data = toData(progress);
  const rankInfo = getRankProgress(data.totalXp);
  const currentRank = getRankForXp(data.totalXp);
  const Icon = ICON_MAP[currentRank.icon] ?? Sprout;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: currentRank.color }}>
            <Icon size={22} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">{playerName}</div>
            <div className="text-xs" style={{ color: currentRank.color }}>{currentRank.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30">
            <Coins size={16} className="text-amber-400" />
            <span className="text-amber-300 font-bold text-sm tabular-nums">{data.ecoCoins}</span>
          </div>
          <button onClick={onHome} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors" aria-label="Beranda">
            <Home size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* XP / Rank Progress */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400" />
              <span className="text-white font-bold">Pangkat Eco Hero</span>
            </div>
            <span className="text-slate-400 text-sm tabular-nums">{data.totalXp} XP</span>
          </div>
          {/* Rank ladder */}
          <div className="flex items-center justify-between mb-4 gap-1">
            {ECO_RANKS.map((r) => {
              const RIcon = ICON_MAP[r.icon] ?? Sprout;
              const reached = data.totalXp >= r.minXp;
              const isCurrent = r.id === currentRank.id;
              return (
                <div key={r.id} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCurrent ? 'ring-2 ring-white scale-110' : ''
                    }`}
                    style={{ background: reached ? r.color : '#334155', opacity: reached ? 1 : 0.5 }}
                  >
                    <RIcon size={18} className="text-white" />
                  </div>
                  <span className={`text-[10px] text-center leading-tight ${reached ? 'text-white' : 'text-slate-500'}`}>
                    {r.name}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          {rankInfo.next ? (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{currentRank.name}</span>
                <span>{rankInfo.next.name}</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${rankInfo.pct}%`, background: `linear-gradient(to right, ${currentRank.color}, ${rankInfo.next.color})` }}
                />
              </div>
              <div className="text-center text-xs text-slate-400 mt-1">
                {rankInfo.xpIntoRank} / {rankInfo.xpForNext} XP ke {rankInfo.next.name}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm font-bold py-2" style={{ color: currentRank.color }}>
              Pangkat Maksimal Tercapai!
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={<Trash2 size={18} className="text-green-400" />} value={data.totalTrashCollected} label="Sampah" />
          <StatCard icon={<Swords size={18} className="text-purple-400" />} value={data.totalEnemiesDefeated} label="Polusi" />
          <StatCard icon={<Gem size={18} className="text-yellow-400" />} value={data.totalSecretsFound} label="Rahasia" />
        </div>

        {/* Skin Shop */}
        <div>
          <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            <Shirt size={20} className="text-blue-400" /> Toko Skin
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SKINS.map((skin) => {
              const owned = data.unlockedSkins.includes(skin.id);
              const equipped = data.equippedSkin === skin.id;
              const canAfford = data.ecoCoins >= skin.price;
              return (
                <div
                  key={skin.id}
                  className={`rounded-2xl p-3 border-2 transition-all ${
                    equipped ? 'border-green-500 bg-green-500/10' : owned ? 'border-slate-600 bg-slate-800' : 'border-slate-700 bg-slate-800/50'
                  }`}
                >
                  {/* Skin preview */}
                  <div className="aspect-square rounded-xl mb-2 flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, #${skin.colors.body.toString(16).padStart(6, '0')}33, #${skin.colors.cap.toString(16).padStart(6, '0')}33)` }}>
                    <div className="w-12 h-12 rounded-full" style={{ background: `#${skin.colors.body.toString(16).padStart(6, '0')}` }} />
                    <div className="absolute top-1 w-8 h-4 rounded-t-full" style={{ background: `#${skin.colors.cap.toString(16).padStart(6, '0')}` }} />
                    {!owned && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <Lock size={20} className="text-slate-400" />
                      </div>
                    )}
                    {equipped && (
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-white font-bold text-xs mb-1">{skin.name}</div>
                  <div
                    className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded mb-1"
                    style={{ background: `${getSkill(skin.skill).cssColor}22`, color: getSkill(skin.skill).cssColor }}
                  >
                    <Sparkles size={9} /> {getSkill(skin.skill).name}
                  </div>
                  <p className="text-slate-400 text-[10px] leading-tight mb-2 h-8 overflow-hidden">{skin.description}</p>
                  {owned ? (
                    <button
                      onClick={() => !equipped && handleEquip(skin.id)}
                      disabled={equipped}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                        equipped ? 'bg-green-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
                      }`}
                    >
                      {equipped ? 'Dipakai' : 'Pakai'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(skin.id, skin.price)}
                      disabled={!canAfford}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                        canAfford ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins size={12} /> {skin.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <div>
          <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            <Award size={20} className="text-yellow-400" /> Badge
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {BADGES.map((badge) => {
              const unlocked = data.unlockedBadges.includes(badge.id);
              const BIcon = ICON_MAP[badge.icon] ?? Star;
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl p-3 border-2 flex items-center gap-3 transition-all ${
                    unlocked ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-slate-700 bg-slate-800/50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      unlocked ? 'bg-yellow-500/30' : 'bg-slate-700'
                    }`}
                  >
                    {unlocked ? <BIcon size={20} className="text-yellow-300" /> : <Lock size={16} className="text-slate-500" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-xs ${unlocked ? 'text-white' : 'text-slate-500'}`}>{badge.name}</div>
                    <div className={`text-[10px] leading-tight ${unlocked ? 'text-slate-400' : 'text-slate-600'}`}>{badge.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 text-white px-5 py-3 rounded-xl shadow-2xl animate-achievement-pop">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <div className="text-white font-extrabold text-lg tabular-nums">{value}</div>
      <div className="text-slate-500 text-xs">{label}</div>
    </div>
  );
}
