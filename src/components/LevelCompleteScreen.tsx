import { useState, useEffect } from 'react';
import { Leaf, Trash2, Swords, BookOpen, Lightbulb, ArrowRight, CheckCircle2, XCircle, Star, Sparkles, Coins, TrendingUp, Zap, Crown, Gift } from 'lucide-react';
import type { LevelResult } from '@/game/types';
import { THEME_COLORS } from '@/game/constants';
import type { ThemeKey } from '@/game/types';
import { StarRating } from '@/components/StarRating';
import { STAR_TRASH_3, STAR_TRASH_2, STAR_LIVES_2, type StarBreakdown } from '@/game/levelProgress';

interface LevelCompleteScreenProps {
  result: LevelResult;
  levelName: string;
  theme: ThemeKey;
  isFinalLevel: boolean;
  stars: StarBreakdown | null;
  secretJustUnlocked?: boolean;
  continueLabel?: string;
  onContinue: () => void;
}

export function LevelCompleteScreen({
  result,
  levelName,
  theme,
  isFinalLevel,
  stars,
  secretJustUnlocked = false,
  continueLabel,
  onContinue,
}: LevelCompleteScreenProps) {
  const [phase, setPhase] = useState(0);
  const colors = THEME_COLORS[theme];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1300),
      setTimeout(() => setPhase(4), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const allTrash = result.trashCollectedInLevel === result.trashInLevel;
  const allSecrets = result.secretsFoundInLevel === result.secretsInLevel;
  const allEnemies = result.enemiesDefeatedInLevel === result.enemiesInLevel;
  const allFlying = result.flyingEnemiesInLevel > 0 && result.flyingEnemiesDefeatedInLevel === result.flyingEnemiesInLevel;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-6 overflow-hidden"
      style={{
        background: `linear-gradient(to bottom, ${colors.skyTop}, ${colors.skyBottom})`,
      }}
    >
      {/* Floating leaves celebration */}
      {phase >= 1 &&
        Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-green-400 animate-leaf-fall pointer-events-none"
            style={{
              left: `${(i * 8 + 5) % 100}%`,
              top: '-30px',
              animationDelay: `${i * 0.15}s`,
              fontSize: '20px',
            }}
          >
            🍃
          </div>
        ))}

      <div className="relative z-10 w-full max-w-md">
        {/* Level complete banner */}
        <div
          className={`text-center mb-4 transition-all duration-500 ${
            phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-2 shadow-lg">
            <Leaf size={16} />
            Level Selesai!
          </div>
          <h2 className="text-3xl font-extrabold text-white drop-shadow">{levelName}</h2>
        </div>

        {/* Star rating */}
        {stars && (
          <div
            className={`bg-white/95 rounded-2xl shadow-xl p-4 mb-3 transition-all duration-500 ${
              phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <StarRating value={stars.stars} size={44} animate className="mb-1" />
            <p className="text-center text-sm font-bold text-slate-600 mb-3">
              {stars.stars === 3
                ? 'SEMPURNA! Bintang 3 diraih!'
                : stars.stars === 2
                ? 'Kerja bagus! Bintang 2.'
                : 'Level selesai! Coba raih lebih banyak bintang.'}
            </p>
            <div className="space-y-1.5">
              <CriteriaRow
                met={true}
                label="Menyelesaikan level"
              />
              <CriteriaRow
                met={stars.trashOk3}
                label={`Kumpulkan ${Math.round(STAR_TRASH_3 * 100)}% sampah`}
                detail={`${Math.round(stars.trashPct * 100)}%`}
              />
              <CriteriaRow
                met={stars.noLifeLost}
                label="Tidak kehilangan nyawa"
              />
              <CriteriaRow
                met={stars.allEnemies}
                label="Kalahkan semua musuh polusi"
              />
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 text-center">
              Bintang 2: {Math.round(STAR_TRASH_2 * 100)}% sampah &amp; sisa nyawa ≥ {STAR_LIVES_2}
            </div>
          </div>
        )}

        {/* Secret content unlocked (first 3-star) */}
        {secretJustUnlocked && (
          <div
            className={`bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl shadow-xl p-4 mb-3 text-center animate-achievement-pop ${
              phase >= 1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-white font-extrabold text-lg">
              <Gift size={22} />
              Konten Rahasia Terbuka!
            </div>
            <p className="text-white/95 text-sm mt-1">
              Bintang 3 pertamamu membuka Galeri Rahasia di menu utama. Selamat, Eco Hero!
            </p>
          </div>
        )}

        {/* Environment transformation outro */}
        <div
          className={`bg-white/95 rounded-2xl shadow-xl p-5 mb-3 transition-all duration-500 ${
            phase >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="flex items-start gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <Leaf size={18} className="text-green-600" />
            </div>
            <p className="text-slate-700 text-sm leading-relaxed">{result.outro}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat
              icon={<Trash2 size={16} className="text-green-500" />}
              value={`${result.trashCollectedInLevel}/${result.trashInLevel}`}
              label="Sampah"
              perfect={allTrash}
            />
            <MiniStat
              icon={<Swords size={16} className="text-purple-500" />}
              value={`${result.enemiesDefeatedInLevel}/${result.enemiesInLevel}`}
              label="Polusi"
              perfect={allEnemies}
            />
            <MiniStat
              icon={<Sparkles size={16} className="text-yellow-500" />}
              value={`${result.secretsFoundInLevel}/${result.secretsInLevel}`}
              label="Rahasia"
              perfect={allSecrets}
            />
            {result.flyingEnemiesInLevel > 0 && (
              <MiniStat
                icon={<Zap size={16} className="text-pink-500" />}
                value={`${result.flyingEnemiesDefeatedInLevel}/${result.flyingEnemiesInLevel}`}
                label="Udara"
                perfect={allFlying}
              />
            )}
            {result.maxCombo > 1 && (
              <MiniStat
                icon={<Zap size={16} className="text-orange-500" />}
                value={`x${result.maxCombo}`}
                label="Kombo"
                perfect={result.maxCombo >= 5}
              />
            )}
            {result.timeBonus > 0 && (
              <MiniStat
                icon={<Zap size={16} className="text-cyan-500" />}
                value={`${result.timeSeconds}s`}
                label="Waktu Bonus"
                perfect
              />
            )}
          </div>

          {/* Perfect badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {allTrash && (
              <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                <CheckCircle2 size={12} /> Semua Sampah!
              </span>
            )}
            {allSecrets && (
              <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">
                <CheckCircle2 size={12} /> Semua Rahasia!
              </span>
            )}
            {allEnemies && (
              <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                <CheckCircle2 size={12} /> Semua Polusi!
              </span>
            )}
            {result.hasBoss && result.bossDefeated && (
              <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                <Crown size={12} /> {result.bossName} Dikalahkan!
              </span>
            )}
          </div>

          {/* Score */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-3 flex items-center justify-between border border-yellow-200">
            <span className="flex items-center gap-1.5 text-slate-600 font-semibold text-sm">
              <Star size={18} className="text-yellow-500" />
              Skor Total
            </span>
            <span className="text-2xl font-extrabold text-yellow-600 tabular-nums">
              {result.stats.score.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Fact card */}
        <div
          className={`bg-white rounded-2xl shadow-xl p-5 mb-4 transition-all duration-500 ${
            phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen size={20} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{result.fact.title}</h3>
          </div>
          <p className="text-slate-700 leading-relaxed text-sm mb-3">{result.fact.text}</p>
          <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-3">
            <div className="flex items-start gap-2">
              <Lightbulb size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-900 text-sm font-medium">{result.fact.tip}</p>
            </div>
          </div>
        </div>

        {/* XP & Coins earned */}
        <div
          className={`bg-white/95 rounded-2xl shadow-xl p-4 mb-3 transition-all duration-500 ${
            phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-blue-500" />
            <span className="text-slate-700 font-bold text-sm">Hadiah Diperoleh</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3 flex items-center gap-2 border border-blue-200">
              <Sparkles size={20} className="text-blue-500" />
              <div>
                <div className="text-blue-600 font-extrabold text-lg tabular-nums">+{result.xpGained}</div>
                <div className="text-xs text-slate-500">XP</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 flex items-center gap-2 border border-amber-200">
              <Coins size={20} className="text-amber-500" />
              <div>
                <div className="text-amber-600 font-extrabold text-lg tabular-nums">+{result.coinsGained}</div>
                <div className="text-xs text-slate-500">Eco Coin</div>
              </div>
            </div>
          </div>
          {result.rankUp && result.newRankName && (
            <div className="mt-3 bg-gradient-to-r from-green-500 to-emerald-400 rounded-xl p-3 text-center animate-achievement-pop">
              <div className="flex items-center justify-center gap-2 text-white font-bold">
                <Star size={18} />
                Naik Pangkat! Sekarang: {result.newRankName}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold text-lg shadow-lg transition-all"
        >
          {continueLabel ?? (isFinalLevel ? 'Lihat Hasil Akhir' : 'Level Berikutnya')}
          <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}

function CriteriaRow({ met, label, detail }: { met: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
      ) : (
        <XCircle size={16} className="text-slate-300 flex-shrink-0" />
      )}
      <span className={met ? 'text-slate-700 font-medium' : 'text-slate-400'}>{label}</span>
      {detail && (
        <span className={`ml-auto text-xs font-bold tabular-nums ${met ? 'text-green-600' : 'text-slate-400'}`}>
          {detail}
        </span>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
  perfect,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  perfect?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-2.5 text-center ${
        perfect ? 'bg-green-50 border-2 border-green-300' : 'bg-slate-100'
      }`}
    >
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <div className="text-base font-extrabold text-slate-700 tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 font-medium">{label}</div>
    </div>
  );
}
