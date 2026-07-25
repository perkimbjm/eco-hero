import { useState } from 'react';
import { Trash2, Play, Trophy, Volume2, VolumeX, Leaf, BookOpen, Star, Shield, Gem, Lock, RotateCcw, Gift, Sparkles } from 'lucide-react';
import { LEVELS, ACHIEVEMENTS } from '@/game/levels';
import { THEME_COLORS } from '@/game/constants';
import { isMuted, setMuted, unlockAudio } from '@/game/sound';
import { StarRating } from '@/components/StarRating';
import { isLevelUnlocked, getLevelStars, totalStars, type LevelProgress } from '@/game/levelProgress';
import type { ThemeKey } from '@/game/types';

interface StartScreenProps {
  progress: LevelProgress;
  initialTab?: 'home' | 'levels' | 'achievements' | 'secret';
  onStart: () => void;
  onSelectLevel: (index: number) => void;
  onShowLeaderboard: () => void;
  onShowProgress: () => void;
}

export function StartScreen({
  progress,
  initialTab = 'home',
  onStart,
  onSelectLevel,
  onShowLeaderboard,
  onShowProgress,
}: StartScreenProps) {
  const [muted, setMutedState] = useState(isMuted());
  const [tab, setTab] = useState<'home' | 'levels' | 'achievements' | 'secret'>(initialTab);

  const handleStart = () => {
    unlockAudio();
    onStart();
  };

  const handleSelectLevel = (index: number) => {
    unlockAudio();
    onSelectLevel(index);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const starsEarned = totalStars(progress);
  const starsPossible = LEVELS.length * 3;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sky-400 via-sky-300 to-green-200 flex flex-col">
      {/* Decorative floating clouds */}
      <div className="absolute top-10 left-10 w-20 h-10 bg-white/70 rounded-full blur-sm animate-float-slow pointer-events-none" />
      <div className="absolute top-20 right-20 w-16 h-8 bg-white/60 rounded-full blur-sm animate-float-medium pointer-events-none" />
      <div className="absolute top-40 left-1/3 w-24 h-12 bg-white/50 rounded-full blur-sm animate-float-slow pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-20 h-10 bg-white/60 rounded-full blur-sm animate-float-medium pointer-events-none" />

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="absolute top-4 right-4 p-3 rounded-xl bg-white/30 backdrop-blur hover:bg-white/50 transition-colors text-white z-20"
        aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
      >
        {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
      </button>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto w-full">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center shadow-lg animate-bounce-slow">
              <Leaf className="text-white" size={36} />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-yellow-500 flex items-center justify-center shadow-lg">
              <Trash2 className="text-white" size={36} />
            </div>
          </div>
          <h1 className="text-6xl md:text-7xl font-extrabold text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] tracking-tight">
            ECO HERO
          </h1>
          <p className="text-xl md:text-2xl text-white/95 font-semibold mt-2 drop-shadow">
            Petualangan Pahlawan Sampah
          </p>
          <span className="text-white/95 font-semibold drop-shadow">powered by peduli-sampah.id</span>
        </div>

        {/* Tab content */}
        {tab === 'home' && (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-center max-w-lg">
              <p className="text-slate-800 text-base leading-relaxed">
                Bumi sedang kotor akibat manusia tidak peduli terhadap sampah.
                Pohon Kehidupan memberimu kekuatan untuk membersihkan dunia dan
                mengembalikan keseimbangan alam. Lompat, kumpulkan sampah,
                kalahkan polusi, dan selamatkan bumi!
              </p>
            </div>

            {/* Star tally */}
            <div className="flex items-center gap-2 bg-white/25 backdrop-blur px-4 py-2 rounded-full text-white font-bold shadow">
              <Star size={18} className="text-yellow-300 fill-yellow-300" />
              {starsEarned} / {starsPossible} Bintang
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-lg shadow-lg transition-all"
              >
                <Play size={24} />
                Mulai Bermain
              </button>
              <button
                onClick={() => setTab('levels')}
                className="flex items-center gap-2 px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-lg shadow-lg transition-all"
              >
                <BookOpen size={22} />
                Pilih Level
              </button>
              <button
                onClick={onShowLeaderboard}
                className="flex items-center gap-2 px-6 py-4 rounded-xl bg-yellow-500 hover:bg-yellow-600 active:scale-95 text-white font-bold text-lg shadow-lg transition-all"
              >
                <Trophy size={22} />
                Papan Skor
              </button>
              <button
                onClick={onShowProgress}
                className="flex items-center gap-2 px-6 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-lg shadow-lg transition-all"
              >
                <Star size={22} />
                Progres
              </button>
              <button
                onClick={() => setTab('secret')}
                className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 ${
                  progress.secretUnlocked
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white'
                    : 'bg-white/20 text-white/80'
                }`}
              >
                {progress.secretUnlocked ? <Gift size={22} /> : <Lock size={22} />}
                Konten Rahasia
              </button>
            </div>

            {/* Controls hint */}
            <div className="flex flex-wrap justify-center gap-2 text-sm text-white/90 mt-2">
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
                <kbd className="font-mono font-bold">←→</kbd> Gerak
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
                <kbd className="font-mono font-bold">↑/Spasi</kbd> Lompat
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
                <Sparkle/> Loncati polusi
              </span>
            </div>
          </div>
        )}

        {tab === 'levels' && (
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-extrabold text-white drop-shadow">Pilih Level</h2>
              <span className="flex items-center gap-1.5 bg-white/25 backdrop-blur px-3 py-1.5 rounded-full text-white font-bold text-sm">
                <Star size={14} className="text-yellow-300 fill-yellow-300" />
                {starsEarned}/{starsPossible}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {LEVELS.map((level, index) => {
                const colors = THEME_COLORS[level.theme as ThemeKey];
                const unlocked = isLevelUnlocked(progress, index);
                const stars = getLevelStars(progress, index);
                const cleared = progress.levels[index]?.completed ?? false;
                return (
                  <button
                    key={level.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && handleSelectLevel(index)}
                    className={`text-left rounded-xl overflow-hidden border-2 shadow-lg transition-all ${
                      unlocked
                        ? 'border-white/40 bg-white/20 backdrop-blur hover:scale-[1.02] active:scale-[0.99] cursor-pointer'
                        : 'border-white/20 bg-slate-900/40 backdrop-blur cursor-not-allowed'
                    }`}
                  >
                    <div
                      className="h-24 flex items-end p-3 relative"
                      style={{
                        background: unlocked
                          ? `linear-gradient(to bottom, ${colors.skyTop}, ${colors.skyBottom})`
                          : 'linear-gradient(to bottom, #334155, #1e293b)',
                      }}
                    >
                      {unlocked && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-12 rounded-t-full"
                          style={{ background: colors.hillFront }}
                        />
                      )}
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-white/90">Level {level.id}</div>
                        <div className="text-lg font-extrabold text-white drop-shadow">
                          {unlocked ? level.name : 'Terkunci'}
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 z-10">
                        {!unlocked ? (
                          <div className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
                            <Lock size={18} className="text-white/90" />
                          </div>
                        ) : cleared ? (
                          <div className="bg-black/30 rounded-full px-2 py-1">
                            <StarRating value={stars} size={14} />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-green-500/80 flex items-center justify-center">
                            <Play size={16} className="text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3 bg-white/90">
                      {unlocked ? (
                        <>
                          <p className="text-sm text-slate-800">{level.subtitle}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3 text-xs text-white/70">
                              <span className="flex items-center gap-1">
                                <Trash2 size={12} /> {level.trash.length}
                              </span>
                              <span className="flex items-center gap-1">
                                <Shield size={12} /> {level.enemies.length}
                              </span>
                              <span className="flex items-center gap-1">
                                <Gem size={12} /> {level.secrets.length}
                              </span>
                            </div>
                            <span className="flex items-center gap-1 text-xs font-bold text-white/90">
                              {cleared ? <RotateCcw size={13} /> : <Play size={13} />}
                              {cleared ? 'Ulangi' : 'Main'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-white/60">
                          Selesaikan level sebelumnya untuk membuka.
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setTab('home')}
              className="mt-4 px-6 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-all"
            >
              Kembali
            </button>
          </div>
        )}

        {tab === 'secret' && (
          <div className="w-full max-w-lg animate-fade-in">
            {progress.secretUnlocked ? (
              <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl shadow-2xl p-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/25 flex items-center justify-center mb-3">
                  <Gift size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-white drop-shadow mb-1">
                  Galeri Rahasia Eco Hero
                </h2>
                <p className="text-white/95 text-sm mb-4">
                  Kamu membukanya dengan meraih bintang 3. Inilah rahasia para pahlawan bumi sejati:
                </p>
                <div className="space-y-2 text-left">
                  <SecretFact text="Satu orang bisa mengurangi 1,5 kg sampah plastik per minggu hanya dengan membawa tas dan botol sendiri." />
                  <SecretFact text="Kompos dari sisa dapur bisa memangkas 30% sampah rumah tangga sekaligus menyuburkan tanaman." />
                  <SecretFact text="Memilah sampah dari sumbernya membuat daur ulang jauh lebih efektif, persis seperti melawan Raja Sampah TPA!" />
                </div>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/25 px-4 py-2 rounded-full text-white font-bold">
                  <Sparkles size={18} />
                  Kamu Eco Hero sejati!
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/50 backdrop-blur rounded-2xl shadow-xl p-6 text-center border-2 border-white/20">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                  <Lock size={40} className="text-white/80" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-1">Konten Rahasia Terkunci</h2>
                <p className="text-white/80 text-sm">
                  Raih <span className="font-bold text-yellow-300">bintang 3</span> di level mana pun
                  untuk membuka Galeri Rahasia.
                </p>
                <div className="mt-3 flex items-center justify-center gap-1 text-yellow-300/70">
                  <Star size={20} className="fill-current" />
                  <Star size={20} className="fill-current" />
                  <Star size={20} className="fill-current" />
                </div>
                <p className="text-white/60 text-xs mt-3">
                  Syarat bintang 3: selesaikan level, kumpulkan 80% sampah, tanpa kehilangan nyawa,
                  dan kalahkan semua musuh polusi.
                </p>
              </div>
            )}
            <button
              onClick={() => setTab('home')}
              className="mt-4 px-6 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-all"
            >
              Kembali
            </button>
          </div>
        )}

        {tab === 'achievements' && (
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACHIEVEMENTS.map((ach) => (
                <div
                  key={ach.id}
                  className="flex items-center gap-3 bg-white/20 backdrop-blur rounded-xl p-3 border border-white/20"
                >
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <Star size={20} className="text-yellow-300" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-sm">{ach.name}</div>
                    <div className="text-white/70 text-xs">{ach.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setTab('home')}
              className="mt-4 px-6 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold transition-all"
            >
              Kembali
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SecretFact({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 bg-white/20 rounded-xl p-3">
      <Leaf size={18} className="text-white flex-shrink-0 mt-0.5" />
      <p className="text-white text-sm leading-snug">{text}</p>
    </div>
  );
}

function Sparkle() {
  return <span className="text-yellow-200 text-xs">✦</span>;
}
