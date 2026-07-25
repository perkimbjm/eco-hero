import { useState } from 'react';
import { Trophy, Home, RotateCcw, Medal, Trash2, Swords, Gem, BookOpen } from 'lucide-react';
import type { GameStats, AchievementDef } from '@/game/types';
import { submitScore, submitAchievement } from '@/lib/supabase';

interface GameOverScreenProps {
  stats: GameStats;
  isVictory: boolean;
  levelName?: string;
  unlockedAchievements: AchievementDef[];
  onRestart: () => void;
  onHome: () => void;
}

export function GameOverScreen({
  stats,
  isVictory,
  levelName,
  unlockedAchievements,
  onRestart,
  onHome,
}: GameOverScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    const name = playerName.trim() || 'Pahlawan Anonim';
    setSubmitting(true);
    setError(null);
    try {
      await submitScore({
        player_name: name.slice(0, 20),
        score: stats.score,
        level_reached: stats.currentLevel,
        trash_collected: stats.trashCollected,
        facts_learned: stats.factsLearned,
        enemies_defeated: stats.enemiesDefeated,
      });
      // Submit achievements
      await Promise.all(
        unlockedAchievements.map((a) => submitAchievement(name.slice(0, 20), a.id).catch(() => {}))
      );
      setSubmitted(true);
    } catch {
      setError('Gagal menyimpan skor. Periksa koneksi dan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-4 py-8 ${
        isVictory
          ? 'bg-gradient-to-b from-green-500 via-emerald-400 to-sky-300'
          : 'bg-gradient-to-b from-slate-900 to-slate-700'
      }`}
    >
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mb-4">
          {isVictory ? (
            <div className="w-24 h-24 mx-auto rounded-full bg-yellow-400 flex items-center justify-center shadow-2xl animate-bounce-slow">
              <Trophy size={56} className="text-white" />
            </div>
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full bg-slate-600 flex items-center justify-center shadow-2xl">
              <Medal size={56} className="text-slate-300" />
            </div>
          )}
        </div>

        <h1 className="text-4xl font-extrabold mb-2 text-white drop-shadow">
          {isVictory ? 'MISI SELESAI!' : 'PERMAINAN BERAKHIR'}
        </h1>
        <p className={`text-lg mb-5 ${isVictory ? 'text-white/90' : 'text-slate-300'}`}>
          {isVictory
            ? 'Kamu berhasil menyelamatkan bumi dari polusi! Pohon Kehidupan berterima kasih.'
            : levelName
            ? `Jangan menyerah! Ulangi "${levelName}" dan selesaikan misinya!`
            : 'Jangan menyerah! Bumi butuh bantuanmu, coba lagi!'}
        </p>

        {/* Stats card */}
        <div className="bg-white rounded-2xl shadow-xl p-5 mb-3 text-left">
          <div className="grid grid-cols-2 gap-2.5">
            <StatRow label="Skor Total" value={stats.score.toLocaleString('id-ID')} highlight />
            <StatRow label="Level Tercapai" value={`${stats.currentLevel}`} />
            <StatRow label="Sampah Dikumpulkan" value={`${stats.trashCollected}`} icon={<Trash2 size={14} className="text-green-500" />} />
            <StatRow label="Polusi Dikalahkan" value={`${stats.enemiesDefeated}`} icon={<Swords size={14} className="text-purple-500" />} />
            <StatRow label="Bonus Rahasia" value={`${stats.secretsFound}`} icon={<Gem size={14} className="text-yellow-500" />} />
            <StatRow label="Fakta Dipelajari" value={`${stats.factsLearned}`} icon={<BookOpen size={14} className="text-blue-500" />} />
          </div>
        </div>

        {/* Achievements unlocked */}
        {unlockedAchievements.length > 0 && (
          <div className="bg-white/95 rounded-2xl shadow-xl p-4 mb-3">
            <div className="text-xs font-bold text-slate-500 mb-2">ACHIEVEMENT TERBUKA</div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {unlockedAchievements.map((a) => (
                <span
                  key={a.id}
                  className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full"
                >
                  <Trophy size={12} /> {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Submit score */}
        {!submitted ? (
          <div className="bg-white/95 rounded-2xl shadow-xl p-5 mb-3">
            <p className="text-slate-700 font-semibold text-sm mb-3 text-left">
              Simpan skor kamu di papan skor:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nama pahlawan..."
                maxLength={20}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-green-500 focus:outline-none text-slate-800"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold transition-all active:scale-95"
              >
                {submitting ? '...' : 'Simpan'}
              </button>
            </div>
            {error && <p className="text-red-600 text-sm mt-2 text-left">{error}</p>}
          </div>
        ) : (
          <div className="bg-white/95 rounded-2xl shadow-xl p-4 mb-3">
            <p className="text-green-700 font-bold flex items-center justify-center gap-2">
              <Trophy size={20} />
              Skor & achievement tersimpan!
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-lg shadow-lg transition-all"
          >
            <RotateCcw size={22} />
            {isVictory ? 'Main Lagi' : 'Ulangi Level'}
          </button>
          <button
            onClick={onHome}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-700 hover:bg-slate-800 active:scale-95 text-white font-bold text-lg shadow-lg transition-all"
          >
            <Home size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl p-3 flex items-center justify-between ${highlight ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-slate-100'}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <span className={`text-lg font-extrabold ${highlight ? 'text-yellow-600' : 'text-slate-700'} tabular-nums`}>
        {value}
      </span>
    </div>
  );
}
