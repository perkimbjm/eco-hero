import { useState, useCallback, useRef, useEffect } from 'react';
import { StartScreen, type StartTab } from '@/components/StartScreen';
import { StoryScreen } from '@/components/StoryScreen';
import { GameCanvas } from '@/components/GameCanvas';
import { LevelCompleteScreen } from '@/components/LevelCompleteScreen';
import { GameOverScreen } from '@/components/GameOverScreen';
import { LeaderboardScreen } from '@/components/LeaderboardScreen';
import { ProgressScreen } from '@/components/ProgressScreen';
import { LEVELS } from '@/game/levels';
import { useHistoryNavigation } from '@/hooks/useHistoryNavigation';
import { fetchPlayerProgress, createPlayerProgress, updatePlayerProgress } from '@/lib/gameData';
import { checkNewBadges, getRankForXp } from '@/game/progression';
import {
  loadProgress,
  computeStars,
  recordLevelResult,
  type LevelProgress,
  type StarBreakdown,
} from '@/game/levelProgress';
import type {
  GameStats,
  LevelResult,
  AchievementDef,
  GameScreenName,
  ThemeKey,
} from '@/game/types';

const INITIAL_STATS: GameStats = {
  score: 0,
  lives: 3,
  currentLevel: 1,
  trashCollected: 0,
  factsLearned: 0,
  enemiesDefeated: 0,
  flyingEnemiesDefeated: 0,
  secretsFound: 0,
  xpGained: 0,
  coinsGained: 0,
  combo: 0,
  timeSeconds: 0,
};

/** Lives are granted fresh each level; a game over just retries that level. */
const LIVES_PER_LEVEL = 3;

type PlayMode = 'campaign' | 'replay';

/**
 * One entry on the browser history stack. `startTab` is part of the view so the
 * level map and secret-content pages are Back-able like any other screen.
 */
interface AppView {
  screen: GameScreenName;
  startTab: StartTab;
}

const HOME_VIEW: AppView = { screen: 'start', startTab: 'home' };

/**
 * How a transition affects history: `push` gives Back somewhere to return to,
 * `replace` swaps the current screen (used when the previous one can no longer
 * be resumed — gameplay that has already ended, a story beat already read).
 */
type NavMode = 'push' | 'replace';

/** Builds the stats a level begins with: carried progress, but full lives. */
function entryStatsFor(index: number, base: Partial<GameStats>): Partial<GameStats> {
  return {
    ...base,
    lives: LIVES_PER_LEVEL,
    currentLevel: index + 1,
    combo: 0,
    timeSeconds: 0,
  };
}

function App() {
  // Leaving a level in progress throws the run away, so Back is intercepted
  // there and answered with a confirmation instead of navigating straight away.
  const [quitPromptOpen, setQuitPromptOpen] = useState(false);

  const {
    view,
    push: pushView,
    replace: replaceView,
    back: backView,
    reset: resetView,
  } = useHistoryNavigation<AppView>(HOME_VIEW, {
    interceptBack: (current) => current.screen === 'playing',
    onInterceptBack: () => setQuitPromptOpen(true),
  });
  const { screen, startTab } = view;

  const [levelIndex, setLevelIndex] = useState(0);
  const [mode, setMode] = useState<PlayMode>('campaign');
  const [carriedStats, setCarriedStats] = useState<Partial<GameStats>>({});
  // Snapshot of the stats a level started with, so a retry replays it cleanly.
  const [levelEntryStats, setLevelEntryStats] = useState<Partial<GameStats>>({});
  const [finalStats, setFinalStats] = useState<GameStats>(INITIAL_STATS);
  const [isVictory, setIsVictory] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('park');
  const unlockedAchievements = useRef<AchievementDef[]>([]);
  const [playerName] = useState('Pahlawan Anonim');
  const [equippedSkin, setEquippedSkin] = useState('default');
  const [levelCompleteData, setLevelCompleteData] = useState<LevelResult | null>(null);

  // Star / unlock progression (localStorage, offline-first).
  const [progress, setProgress] = useState<LevelProgress>(() => loadProgress());
  const [starBreakdown, setStarBreakdown] = useState<StarBreakdown | null>(null);
  const [secretJustUnlocked, setSecretJustUnlocked] = useState(false);

  /**
   * Returning to the menu resets run-scoped state and re-reads stars from
   * storage. This lives in an effect because Back can land here too, not just
   * the in-app Home buttons.
   */
  useEffect(() => {
    if (screen !== 'start') return;
    unlockedAchievements.current = [];
    setProgress(loadProgress());
  }, [screen]);

  // Load equipped skin from the local database on mount
  useEffect(() => {
    (async () => {
      try {
        let saved = await fetchPlayerProgress(playerName);
        if (!saved) saved = await createPlayerProgress(playerName);
        if (saved) setEquippedSkin(saved.equipped_skin || 'default');
      } catch { /* ignore */ }
    })();
  }, [playerName]);

  const beginLevel = useCallback(
    (
      index: number,
      playMode: PlayMode,
      base: Partial<GameStats>,
      viaStory: boolean,
      nav: NavMode
    ) => {
      const entry = entryStatsFor(index, base);
      setLevelIndex(index);
      setMode(playMode);
      setLevelEntryStats(entry);
      setCarriedStats(entry);
      setGameKey((k) => k + 1);

      const next: AppView = { screen: viaStory ? 'story' : 'playing', startTab };
      if (nav === 'push') pushView(next);
      else replaceView(next);
    },
    [startTab, pushView, replaceView]
  );

  // "Mulai Bermain" — a fresh campaign run from the very first level.
  const handleStart = useCallback(() => {
    unlockedAchievements.current = [];
    beginLevel(0, 'campaign', {}, true, 'push');
  }, [beginLevel]);

  // Same fresh run, but launched from the victory screen — which Back should
  // not be able to return to, so it replaces rather than stacks.
  const handleRestartCampaign = useCallback(() => {
    unlockedAchievements.current = [];
    beginLevel(0, 'campaign', {}, true, 'replace');
  }, [beginLevel]);

  // Picking a level from the map: replay it standalone (returns to the map).
  const handleSelectLevel = useCallback(
    (index: number) => {
      unlockedAchievements.current = [];
      beginLevel(index, 'replay', {}, false, 'push');
    },
    [beginLevel]
  );

  // The story beat has been read; Back from gameplay should skip past it.
  const handleStoryContinue = useCallback(() => {
    setGameKey((k) => k + 1);
    replaceView({ screen: 'playing', startTab });
  }, [replaceView, startTab]);

  const handleStatsChange = useCallback((stats: GameStats) => {
    setCarriedStats(stats);
  }, []);

  const handleLevelComplete = useCallback(async (result: LevelResult) => {
    // Grade the run and persist stars / unlocks locally first.
    const breakdown = computeStars(result);
    const outcome = recordLevelResult(levelIndex, LEVELS.length, breakdown, result.stats.score);
    setProgress(outcome.progress);
    setStarBreakdown(breakdown);
    setSecretJustUnlocked(outcome.newlyUnlockedSecret);

    setLevelResult(result);
    setCarriedStats(result.stats);
    setCurrentTheme(LEVELS[levelIndex].theme);
    setLevelCompleteData(result);
    // The run is over, so Back must not drop the player into a finished level.
    replaceView({ screen: 'levelcomplete', startTab });

    // Save XP, coins, and stats to the local database (best-effort).
    try {
      let saved = await fetchPlayerProgress(playerName);
      if (!saved) saved = await createPlayerProgress(playerName);
      if (!saved) return;

      const prevXp = saved.total_xp;
      const newXp = prevXp + result.xpGained;
      const prevRank = getRankForXp(prevXp);
      const newRank = getRankForXp(newXp);
      const rankUp = newRank.id !== prevRank.id;

      const level = LEVELS[levelIndex];
      const beachInc = level.theme === 'beach' ? 1 : 0;
      const riverInc = level.theme === 'river' ? 1 : 0;

      const updated = await updatePlayerProgress(playerName, {
        total_xp: newXp,
        eco_coins: saved.eco_coins + result.coinsGained,
        total_trash_collected: saved.total_trash_collected + result.trashCollectedInLevel,
        total_enemies_defeated: saved.total_enemies_defeated + result.enemiesDefeatedInLevel,
        total_secrets_found: saved.total_secrets_found + result.secretsFoundInLevel,
        levels_completed: saved.levels_completed + 1,
        beaches_completed: saved.beaches_completed + beachInc,
        rivers_completed: saved.rivers_completed + riverInc,
      });

      if (updated) {
        const dataForBadges = {
          totalXp: updated.total_xp,
          ecoCoins: updated.eco_coins,
          totalTrashCollected: updated.total_trash_collected,
          totalEnemiesDefeated: updated.total_enemies_defeated,
          totalSecretsFound: updated.total_secrets_found,
          totalAnimalsSaved: updated.total_animals_saved,
          levelsCompleted: updated.levels_completed,
          beachesCompleted: updated.beaches_completed,
          riversCompleted: updated.rivers_completed,
          unlockedSkins: updated.unlocked_skins,
          unlockedBadges: updated.unlocked_badges,
          equippedSkin: updated.equipped_skin,
        };
        const newBadges = checkNewBadges(dataForBadges);
        if (newBadges.length > 0) {
          await updatePlayerProgress(playerName, {
            unlocked_badges: [...updated.unlocked_badges, ...newBadges.map((b) => b.id)],
          });
        }
      }

      if (rankUp) {
        setLevelCompleteData({ ...result, rankUp: true, newRankName: newRank.name });
      }
    } catch {
      /* keep the un-ranked result already set */
    }
  }, [levelIndex, playerName, replaceView, startTab]);

  const handleLevelContinue = useCallback(() => {
    // A replay drops the player back onto the level map they launched from,
    // which is precisely the entry below this one.
    if (mode === 'replay') {
      backView();
      return;
    }
    const nextIndex = levelIndex + 1;
    if (nextIndex >= LEVELS.length) {
      setFinalStats(levelResult?.stats ?? (carriedStats as GameStats));
      setIsVictory(true);
      replaceView({ screen: 'victory', startTab });
    } else {
      beginLevel(nextIndex, 'campaign', levelResult?.stats ?? carriedStats, true, 'replace');
    }
  }, [mode, levelIndex, levelResult, carriedStats, beginLevel, backView, replaceView, startTab]);

  const handleGameOver = useCallback(
    (stats: GameStats) => {
      setFinalStats(stats);
      setIsVictory(false);
      replaceView({ screen: 'gameover', startTab });
    },
    [replaceView, startTab]
  );

  const handleAchievement = useCallback((ach: AchievementDef) => {
    unlockedAchievements.current = [...unlockedAchievements.current, ach];
  }, []);

  // Game over retries the CURRENT level from its entry snapshot (fresh lives).
  const handleRetryLevel = useCallback(() => {
    unlockedAchievements.current = [];
    beginLevel(levelIndex, mode, levelEntryStats, false, 'replace');
  }, [beginLevel, levelIndex, mode, levelEntryStats]);

  // Unwinds history to the menu, so Back from there leaves the site as usual.
  const handleHome = useCallback(() => {
    resetView();
  }, [resetView]);

  // Both routes out of a running level — the HUD's Home button and the device's
  // Back button — funnel through the same prompt.
  const handleRequestQuit = useCallback(() => setQuitPromptOpen(true), []);
  const handleQuitCancel = useCallback(() => setQuitPromptOpen(false), []);
  const handleQuitConfirm = useCallback(() => {
    setQuitPromptOpen(false);
    // Programmatic, so `interceptBack` lets it through.
    backView();
  }, [backView]);

  // A level that ends on its own (cleared, or out of lives) must not leave a
  // stale prompt behind for the next one.
  useEffect(() => {
    if (screen !== 'playing') setQuitPromptOpen(false);
  }, [screen]);

  const handleTabChange = useCallback(
    (tab: StartTab) => {
      // 'home' is the root, so getting there is a step back rather than forward.
      if (tab === 'home') backView();
      else pushView({ screen: 'start', startTab: tab });
    },
    [backView, pushView]
  );

  switch (screen) {
    case 'story':
      return <StoryScreen levelId={levelIndex + 1} onContinue={handleStoryContinue} />;
    case 'playing':
      return (
        <GameCanvas
          key={gameKey}
          levelIndex={levelIndex}
          carriedStats={carriedStats}
          skinId={equippedSkin}
          onStatsChange={handleStatsChange}
          onLevelComplete={handleLevelComplete}
          onGameOver={handleGameOver}
          onAchievement={handleAchievement}
          onRequestQuit={handleRequestQuit}
          quitPromptOpen={quitPromptOpen}
          onQuitCancel={handleQuitCancel}
          onQuitConfirm={handleQuitConfirm}
        />
      );
    case 'levelcomplete':
      if (!levelResult) return null;
      return (
        <LevelCompleteScreen
          result={levelCompleteData ?? levelResult}
          levelName={LEVELS[levelIndex].name}
          theme={currentTheme}
          isFinalLevel={mode === 'campaign' && levelIndex >= LEVELS.length - 1}
          stars={starBreakdown}
          secretJustUnlocked={secretJustUnlocked}
          continueLabel={mode === 'replay' ? 'Kembali ke Peta Level' : undefined}
          onContinue={handleLevelContinue}
        />
      );
    case 'gameover':
    case 'victory':
      return (
        <GameOverScreen
          stats={finalStats}
          isVictory={isVictory}
          levelName={LEVELS[levelIndex]?.name ?? ''}
          unlockedAchievements={unlockedAchievements.current}
          onRestart={isVictory ? handleRestartCampaign : handleRetryLevel}
          onHome={handleHome}
        />
      );
    case 'leaderboard':
      return <LeaderboardScreen onHome={handleHome} />;
    case 'progress':
      return (
        <ProgressScreen
          playerName={playerName}
          onSkinChange={setEquippedSkin}
          onHome={handleHome}
        />
      );
    case 'start':
    default:
      return (
        <StartScreen
          progress={progress}
          tab={startTab}
          onTabChange={handleTabChange}
          onStart={handleStart}
          onSelectLevel={handleSelectLevel}
          onShowLeaderboard={() => pushView({ screen: 'leaderboard', startTab })}
          onShowProgress={() => pushView({ screen: 'progress', startTab })}
        />
      );
  }
}

export default App;
