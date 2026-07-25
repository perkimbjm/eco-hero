import { useRef, useEffect, useState, useCallback } from 'react';
import { Heart, Trash2, Trophy, Volume2, VolumeX, Home, Sparkles, ArrowLeft, ArrowRight, ArrowUp, Zap } from 'lucide-react';
import Phaser from 'phaser';
import { createGame, setMobileInput } from '@/game/phaserGame';
import type { GameStats, LevelResult, AchievementDef } from '@/game/types';
import { isMuted, setMuted, unlockAudio } from '@/game/sound';
import { OrientationGate } from '@/components/OrientationGate';

interface GameCanvasProps {
  levelIndex: number;
  carriedStats: Partial<GameStats>;
  skinId?: string;
  onStatsChange: (stats: GameStats) => void;
  onLevelComplete: (result: LevelResult) => void;
  onGameOver: (stats: GameStats) => void;
  onAchievement: (achievement: AchievementDef) => void;
  onQuit: () => void;
}

export function GameCanvas({
  levelIndex,
  carriedStats,
  skinId,
  onStatsChange,
  onLevelComplete,
  onGameOver,
  onAchievement,
  onQuit,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [stats, setStats] = useState<GameStats>({
    score: carriedStats.score ?? 0,
    lives: carriedStats.lives ?? 3,
    currentLevel: levelIndex + 1,
    trashCollected: carriedStats.trashCollected ?? 0,
    factsLearned: carriedStats.factsLearned ?? 0,
    enemiesDefeated: carriedStats.enemiesDefeated ?? 0,
    flyingEnemiesDefeated: carriedStats.flyingEnemiesDefeated ?? 0,
    secretsFound: carriedStats.secretsFound ?? 0,
    xpGained: carriedStats.xpGained ?? 0,
    coinsGained: carriedStats.coinsGained ?? 0,
    combo: 0,
    timeSeconds: 0,
  });
  const [muted, setMutedState] = useState(isMuted());
  const [achievementPopup, setAchievementPopup] = useState<AchievementDef | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(
      'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
    );
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    unlockAudio();

    const game = createGame({
      levelIndex,
      parent: containerRef.current,
      carriedStats,
      skinId,
      callbacks: {
        onStatsChange: (s) => {
          setStats(s);
          onStatsChange(s);
        },
        onLevelComplete: (result) => onLevelComplete(result),
        onGameOver: (s) => onGameOver(s),
        onAchievement: (ach) => {
          setAchievementPopup(ach);
          onAchievement(ach);
          setTimeout(() => setAchievementPopup(null), 3000);
        },
        onStoryRequest: () => {},
      },
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }, [muted]);

  const handleMobile = useCallback((key: 'left' | 'right' | 'jump', pressed: boolean) => {
    if (gameRef.current) setMobileInput(gameRef.current, key, pressed);
  }, []);

  const livesArray = Array.from({ length: Math.max(0, stats.lives) });

  return (
    <OrientationGate>
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* HUD */}
      <div className="w-full max-w-[800px] mx-auto flex items-center justify-between gap-2 px-3 pt-3 pb-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg">
            <Trophy size={18} className="text-yellow-400" />
            <span className="text-white font-bold text-sm sm:text-base tabular-nums">
              {stats.score.toLocaleString('id-ID')}
            </span>
          </div>
          {stats.combo >= 2 && (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1.5 rounded-lg animate-pulse">
              <Zap size={18} className="text-yellow-300" />
              <span className="text-white font-bold text-sm sm:text-base tabular-nums">
                x{stats.combo}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg">
            <Trash2 size={18} className="text-green-400" />
            <span className="text-white font-bold text-sm sm:text-base tabular-nums">
              {stats.trashCollected}
            </span>
          </div>
          {stats.secretsFound > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg">
              <Sparkles size={18} className="text-yellow-300" />
              <span className="text-white font-bold text-sm tabular-nums">{stats.secretsFound}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-0.5 bg-slate-800 px-2 py-1.5 rounded-lg">
            {livesArray.map((_, i) => (
              <Heart key={i} size={16} className="text-red-500 fill-red-500" />
            ))}
            {livesArray.length === 0 && (
              <span className="text-red-400 text-xs font-bold px-1">Habis</span>
            )}
          </div>
          <button
            onClick={toggleMute}
            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
          >
            {muted ? <VolumeX size={18} className="text-slate-400" /> : <Volume2 size={18} className="text-white" />}
          </button>
          <button
            onClick={onQuit}
            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Keluar"
          >
            <Home size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Phaser canvas container */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-2">
        <div
          ref={containerRef}
          className="relative w-full max-w-[800px] rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700"
          style={{ aspectRatio: '800 / 480', maxHeight: '100%' }}
        />
      </div>

      {/* Achievement popup */}
      {achievementPopup && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-achievement-pop">
          <Sparkles size={24} className="flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold opacity-90">Achievement Terbuka!</div>
            <div className="font-bold text-base">{achievementPopup.name}</div>
            <div className="text-xs opacity-90">{achievementPopup.description}</div>
          </div>
        </div>
      )}

      {/* Mobile controls */}
      {isTouch && (
        <div className="flex items-center justify-between w-full max-w-[800px] mx-auto px-3 pb-3 pt-2 select-none">
          <div className="flex gap-2">
            <TouchButton onPress={(p) => handleMobile('left', p)} ariaLabel="Kiri">
              <ArrowLeft size={28} />
            </TouchButton>
            <TouchButton onPress={(p) => handleMobile('right', p)} ariaLabel="Kanan">
              <ArrowRight size={28} />
            </TouchButton>
          </div>
          <TouchButton onPress={(p) => handleMobile('jump', p)} ariaLabel="Lompat" variant="jump">
            <ArrowUp size={32} />
          </TouchButton>
        </div>
      )}
    </div>
    </OrientationGate>
  );
}

function TouchButton({
  children,
  onPress,
  ariaLabel,
  variant = 'normal',
}: {
  children: React.ReactNode;
  onPress: (pressed: boolean) => void;
  ariaLabel: string;
  variant?: 'normal' | 'jump';
}) {
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onPress(true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      onPress(false);
    },
    onPointerCancel: () => onPress(false),
    onPointerLeave: () => onPress(false),
  };

  return (
    <button
      {...handlers}
      aria-label={ariaLabel}
      className={`flex items-center justify-center text-white font-bold touch-none transition-transform active:scale-95 ${
        variant === 'jump'
          ? 'w-20 h-20 rounded-full bg-green-600 active:bg-green-500 shadow-lg'
          : 'w-16 h-16 rounded-2xl bg-slate-700 active:bg-slate-600'
      }`}
    >
      {children}
    </button>
  );
}
