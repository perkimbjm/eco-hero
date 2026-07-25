import { useState, useEffect } from 'react';
import { Trophy, Home, RefreshCw, Trash2, Swords, Gem } from 'lucide-react';
import { fetchTopScores, type HighScore } from '@/lib/supabase';

interface LeaderboardScreenProps {
  onHome: () => void;
}

export function LeaderboardScreen({ onHome }: LeaderboardScreenProps) {
  const [scores, setScores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTopScores(20);
        if (!cancelled) setScores(data);
      } catch {
        if (!cancelled) setError('Gagal memuat papan skor.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTopScores(20);
      setScores(data);
    } catch {
      setError('Gagal memuat papan skor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center shadow-lg">
              <Trophy size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Papan Skor</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={loading}
              className="p-2.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              aria-label="Muat ulang"
            >
              <RefreshCw size={18} className={`text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onHome}
              className="p-2.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              aria-label="Beranda"
            >
              <Home size={18} className="text-white" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-xl p-4 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-4 animate-pulse h-16" />
            ))}
          </div>
        ) : scores.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <Trophy size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Belum ada skor tersimpan.</p>
            <p className="text-slate-500 text-sm mt-1">Mainkan game dan jadi pahlawan pertama!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {scores.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                  i === 0
                    ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/40'
                    : i === 1
                    ? 'bg-gradient-to-r from-slate-400/20 to-slate-500/10 border border-slate-400/30'
                    : i === 2
                    ? 'bg-gradient-to-r from-orange-700/20 to-orange-800/10 border border-orange-700/30'
                    : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-sm flex-shrink-0 ${
                    i === 0
                      ? 'bg-yellow-500 text-white'
                      : i === 1
                      ? 'bg-slate-400 text-slate-900'
                      : i === 2
                      ? 'bg-orange-700 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold truncate">{s.player_name}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Trash2 size={12} className="text-green-400" />
                      {s.trash_collected}
                    </span>
                    <span className="flex items-center gap-1">
                      <Swords size={12} className="text-purple-400" />
                      {s.enemies_defeated}
                    </span>
                    <span className="flex items-center gap-1">
                      <Gem size={12} className="text-yellow-400" />
                      {s.facts_learned}
                    </span>
                    <span>Lv {s.level_reached}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-yellow-400 font-extrabold text-lg tabular-nums">
                    {s.score.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && scores.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Swords size={14} />
            <span>{scores.length} pahlawan di papan skor</span>
          </div>
        )}
      </div>
    </div>
  );
}
