import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Heart, Trash2, Trophy, Volume2, VolumeX, Home, Sparkles,
  ArrowLeft, ArrowRight, ArrowUp, Zap, Leaf, Waves, Wind, Flame, Shield,
  Mountain, Maximize, Minimize,
} from 'lucide-react';
import Phaser from 'phaser';
import { createGame, setMobileInput, triggerSkill, resizeGame } from '@/game/phaserGame';
import type { GameStats, LevelResult, AchievementDef } from '@/game/types';
import type { EcoPowerState } from '@/game/skills';
import { isMuted, setMuted, unlockAudio } from '@/game/sound';
import { OrientationGate } from '@/components/OrientationGate';

/** Maps a skill's icon name to a lucide component for the HUD skill button. */
const SKILL_ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  leaf: Leaf,
  waves: Waves,
  wind: Wind,
  flame: Flame,
  zap: Zap,
  shield: Shield,
  mountain: Mountain,
};

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
  const rootRef = useRef<HTMLDivElement>(null);
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
  const [ecoPower, setEcoPower] = useState<EcoPowerState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        onEcoPowerChange: (state) => setEcoPower(state),
        onStoryRequest: () => {},
      },
    });

    gameRef.current = game;

    // Re-fit the canvas whenever the container's size settles (orientation
    // flip, fullscreen toggle, browser chrome show/hide). Without this the
    // rotated game can stick as a black frame.
    const container = containerRef.current;
    let resizeTimer: number | undefined;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (gameRef.current && container) resizeGame(gameRef.current, container);
      }, 120);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      window.clearTimeout(resizeTimer);
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

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.()?.catch(() => {});
    } else {
      document.exitFullscreen?.()?.catch(() => {});
    }
  }, []);

  const handleMobile = useCallback((key: 'left' | 'right' | 'jump', pressed: boolean) => {
    if (gameRef.current) setMobileInput(gameRef.current, key, pressed);
  }, []);

  const handleSkill = useCallback(() => {
    if (gameRef.current) triggerSkill(gameRef.current);
  }, []);

  const livesArray = Array.from({ length: Math.max(0, stats.lives) });

  const powerPct = ecoPower ? Math.round((ecoPower.power / ecoPower.max) * 100) : 0;
  const skillReady = !!ecoPower?.ready && !ecoPower?.used;
  const SkillIcon = ecoPower ? SKILL_ICONS[ecoPower.icon] ?? Zap : Zap;

  // Shrink the HUD on touch devices so the gameplay stays dominant.
  const hud = isTouch
    ? { chip: 13, btn: 15, heart: 12, text: 'text-[11px]', chipPad: 'px-1.5 py-0.5', btnPad: 'p-1.5', gap: 'gap-1', group: 'gap-1' }
    : { chip: 18, btn: 18, heart: 16, text: 'text-base', chipPad: 'px-3 py-1.5', btnPad: 'p-2', gap: 'gap-1.5', group: 'gap-3' };

  return (
    <OrientationGate>
    <div
      ref={rootRef}
      className="relative h-[100dvh] flex flex-col bg-slate-900 overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* HUD */}
      <div className={`relative z-20 w-full flex items-center justify-between px-2 pt-1 pb-1 sm:px-4 sm:pt-2 sm:pb-1.5 flex-shrink-0 ${hud.group}`}>
        <div className={`flex items-center ${hud.group}`}>
          <div className={`flex items-center bg-slate-800/90 rounded-md sm:rounded-lg ${hud.gap} ${hud.chipPad}`}>
            <Trophy size={hud.chip} className="text-yellow-400" />
            <span className={`text-white font-bold tabular-nums ${hud.text}`}>
              {stats.score.toLocaleString('id-ID')}
            </span>
          </div>
          {stats.combo >= 2 && (
            <div className={`flex items-center bg-gradient-to-r from-orange-600 to-red-600 rounded-md sm:rounded-lg animate-pulse ${hud.gap} ${hud.chipPad}`}>
              <Zap size={hud.chip} className="text-yellow-300" />
              <span className={`text-white font-bold tabular-nums ${hud.text}`}>x{stats.combo}</span>
            </div>
          )}
          <div className={`flex items-center bg-slate-800/90 rounded-md sm:rounded-lg ${hud.gap} ${hud.chipPad}`}>
            <Trash2 size={hud.chip} className="text-green-400" />
            <span className={`text-white font-bold tabular-nums ${hud.text}`}>
              {stats.trashCollected}
            </span>
          </div>
          {stats.secretsFound > 0 && (
            <div className={`hidden sm:flex items-center bg-slate-800/90 rounded-lg ${hud.gap} ${hud.chipPad}`}>
              <Sparkles size={hud.chip} className="text-yellow-300" />
              <span className={`text-white font-bold tabular-nums ${hud.text}`}>{stats.secretsFound}</span>
            </div>
          )}
        </div>

        <div className={`flex items-center ${hud.gap}`}>
          <div className={`flex items-center gap-0.5 bg-slate-800/90 rounded-md sm:rounded-lg ${hud.chipPad}`}>
            {livesArray.map((_, i) => (
              <Heart key={i} size={hud.heart} className="text-red-500 fill-red-500" />
            ))}
            {livesArray.length === 0 && (
              <span className="text-red-400 text-[11px] font-bold px-1">Habis</span>
            )}
          </div>
          <button
            onClick={toggleMute}
            className={`bg-slate-800/90 rounded-md sm:rounded-lg hover:bg-slate-700 transition-colors ${hud.btnPad}`}
            aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
          >
            {muted ? <VolumeX size={hud.btn} className="text-slate-400" /> : <Volume2 size={hud.btn} className="text-white" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className={`bg-slate-800/90 rounded-md sm:rounded-lg hover:bg-slate-700 transition-colors ${hud.btnPad}`}
            aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
          >
            {isFullscreen ? <Minimize size={hud.btn} className="text-white" /> : <Maximize size={hud.btn} className="text-white" />}
          </button>
          <button
            onClick={onQuit}
            className={`bg-slate-800/90 rounded-md sm:rounded-lg hover:bg-slate-700 transition-colors ${hud.btnPad}`}
            aria-label="Keluar"
          >
            <Home size={hud.btn} className="text-white" />
          </button>
        </div>
      </div>

      {/* Eco Power meter */}
      {ecoPower && !ecoPower.used && (
        <div className="relative z-20 w-full px-2 sm:px-4 pb-0.5 sm:pb-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 ${skillReady ? 'animate-pulse' : ''}`}
              style={{ background: `${ecoPower.cssColor}33`, color: ecoPower.cssColor }}
            >
              <SkillIcon size={15} />
            </div>
            <div className="relative flex-1 h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                style={{
                  width: `${powerPct}%`,
                  background: `linear-gradient(90deg, ${ecoPower.cssColor}99, ${ecoPower.cssColor})`,
                  boxShadow: skillReady ? `0 0 10px ${ecoPower.cssColor}` : 'none',
                }}
              />
              {skillReady && (
                <div
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{ boxShadow: `inset 0 0 8px ${ecoPower.cssColor}` }}
                />
              )}
            </div>
            <span
              className="text-[11px] font-bold tabular-nums flex-shrink-0 w-16 text-right"
              style={{ color: skillReady ? ecoPower.cssColor : '#94a3b8' }}
            >
              {skillReady ? 'SIAP! ⚡' : `${powerPct}%`}
            </span>
          </div>
        </div>
      )}

      {/* Eco Power Ready banner */}
      {skillReady && ecoPower && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-skill-banner pointer-events-none"
          style={{ background: ecoPower.cssColor, color: '#0f172a' }}
        >
          <SkillIcon size={16} />
          <span className="font-extrabold text-sm">Eco Power Siap — {ecoPower.skillName}!</span>
        </div>
      )}

      {/* Skill activation button — appears only when charged (above the jump button) */}
      {skillReady && ecoPower && (
        <button
          onClick={handleSkill}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
          aria-label={`Aktifkan ${ecoPower.skillName}`}
          className="absolute z-40 bottom-24 right-3 sm:bottom-28 sm:right-6 w-[70px] h-[70px] sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center text-white font-extrabold shadow-2xl active:scale-90 transition-transform touch-none animate-skill-ready"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${ecoPower.cssColor}, ${ecoPower.cssColor}cc)`,
            boxShadow: `0 0 24px ${ecoPower.cssColor}, 0 6px 16px rgba(0,0,0,0.4)`,
            border: '3px solid rgba(255,255,255,0.8)',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
        >
          <SkillIcon size={28} />
          <span className="text-[9px] mt-0.5 tracking-wide">
            {isTouch ? 'SKILL' : 'TEKAN X'}
          </span>
        </button>
      )}

      {/* Phaser canvas container — fills the full remaining area; the game is
          sized to this container's aspect so it never pillar-boxes */}
      <div className="flex-1 min-h-0 px-1 pb-1">
        <div
          ref={containerRef}
          className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl border border-slate-700"
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

      {/* Mobile controls — floating overlays so they never push the game off-screen */}
      {isTouch && (
        <>
          <div className="absolute bottom-3 left-3 z-30 flex gap-2">
            <TouchButton onPress={(p) => handleMobile('left', p)} ariaLabel="Kiri">
              <ArrowLeft size={24} />
            </TouchButton>
            <TouchButton onPress={(p) => handleMobile('right', p)} ariaLabel="Kanan">
              <ArrowRight size={24} />
            </TouchButton>
          </div>
          <div className="absolute bottom-3 right-3 z-30">
            <TouchButton onPress={(p) => handleMobile('jump', p)} ariaLabel="Lompat" variant="jump">
              <ArrowUp size={28} />
            </TouchButton>
          </div>
        </>
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
    // A long-press on touch would otherwise pop the browser's callout / context menu.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  return (
    <button
      {...handlers}
      draggable={false}
      aria-label={ariaLabel}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        textShadow: '0 1px 2px rgba(0,0,0,0.6)',
      }}
      className={`flex items-center justify-center text-white font-bold touch-none select-none backdrop-blur-sm border transition-transform active:scale-95 ${
        variant === 'jump'
          ? 'w-16 h-16 rounded-full bg-green-600/45 border-white/40 active:bg-green-500/70 shadow-lg'
          : 'w-14 h-14 rounded-2xl bg-slate-700/40 border-white/30 active:bg-slate-600/70'
      }`}
    >
      {children}
    </button>
  );
}
