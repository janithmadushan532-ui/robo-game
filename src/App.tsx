/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { BattleHud } from './components/BattleHud';
import { CollectionModals } from './components/CollectionModals';
import { MainMenu } from './components/MainMenu';
import { McqDraftOverlay } from './components/McqDraftOverlay';
import { ResultOverlay } from './components/ResultOverlay';
import { BOSS_LEVELS, getLevelDef } from './data/levels';
import { pickMcqsForUnitSequential } from './data/mcqDatabase';
import {
  computeBattleExtraPowers,
  createEmptyPowerCooldowns,
  getMonsterPowerDef,
  MAX_LOADOUT_SELECTION,
  MAX_POWER_LEVEL,
  PLAYER_POWER_LIST,
  SHOP_POWER_ID_SET,
} from './data/powers';
import { GRADE_10_SCIENCE_UNITS } from './data/scienceUnits';
import { ArenaEngine } from './game/ArenaEngine';
import { soundEngine } from './game/audio';
import {
  ActiveModal,
  BattleHudSnapshot,
  GameScreen,
  GraphicsQuality,
  LevelMcqSummary,
  McqQuestion,
  MonsterPowerId,
  PowerId,
  SavedProgress,
} from './types/game';
import {
  hasSavedProgress,
  loadProgress,
  resetProgress,
  saveProgress,
} from './utils/storage';

const INITIAL_HUD: BattleHudSnapshot = {
  playerHp: 190,
  playerMaxHp: 190,
  playerEnergy: 100,
  playerMaxEnergy: 100,
  playerUltimateCharge: 25,
  playerShieldActive: false,
  playerShieldRemaining: 0,
  playerSpeedBoostActive: false,
  playerSpeedBoostRemaining: 0,
  playerRageActive: false,
  playerRageRemaining: 0,
  timeSlowActive: false,
  timeSlowRemaining: 0,
  playerState: 'idle',
  bossHp: 210,
  bossMaxHp: 210,
  bossState: 'idle',
  bossTelegraphLabel: null,
  bossStunned: false,
  bossSlowed: false,
  bossShieldActive: false,
  survivalWave: 1,
  survivalTotalWaves: 1,
  phaseBanner: null,
  enemies: [],
  powerActiveTimers: createEmptyPowerCooldowns(),
  powerCooldowns: createEmptyPowerCooldowns(),
  powerQuantities: createEmptyPowerCooldowns(),
  comboCount: 0,
  lastDamageEvent: null,
  battleTime: 0,
};

// Active combat powers eligible for Pre-Battle MCQ Slots 1-4 (Ultimate, Free Surge, and exclusive Shop powers stay outside MCQ rewards)
const DRAFTABLE_PLAYER_POWERS = PLAYER_POWER_LIST.filter(
  (p) => p.id !== 'ultimate' && p.id !== 'hero_surge' && !SHOP_POWER_ID_SET.has(p.id),
);

const detectTouchMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    Boolean(window.matchMedia?.('(pointer: coarse)').matches) ||
    ('ontouchstart' in window && Math.min(window.innerWidth, window.innerHeight) < 900)
  );
};

const tryEnterImmersiveMode = () => {
  try {
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    if (!document.fullscreenElement) {
      if (typeof docEl.requestFullscreen === 'function') {
        docEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      } else if (typeof docEl.webkitRequestFullscreen === 'function') {
        docEl.webkitRequestFullscreen();
      }
    }
  } catch {
    // AppMaker Android WebView handles native fullscreen outside browser fullscreen API
  }
  tryLockLandscape();
};

const tryLockLandscape = () => {
  try {
    const orientation = screen?.orientation as
      | (ScreenOrientation & { lock?: (mode: string) => Promise<void> })
      | undefined;
    if (orientation && typeof orientation.lock === 'function') {
      orientation.lock('landscape').catch(() => {
        // Fallback portrait rotation overlay handles devices/browsers that disallow silent orientation lock
      });
    }
  } catch {
    // Ignore unsupported orientation lock APIs
  }
};

const ENEMY_COMBAT_POWERS: MonsterPowerId[] = [
  'm_fire',
  'm_ice',
  'm_lightning',
  'm_heavy_punch',
  'm_energy_blast',
  'm_special',
  'm_ultimate',
  'laser_blast',
  'rocket_attack',
  'thunder',
  'fire',
  'ice',
  'plasma_cannon',
  'ground_shockwave',
  'meteor_strike',
  'speed_boost',
  'shield',
  'healing_power',
  'ultimate_energy_blast',
  'thunder_storm',
  'mega_laser',
  'dragon_fire',
  'ice_explosion',
  'shadow_strike',
  'giant_energy_wave',
  'meteor_rain',
  'super_shield',
  'rage_mode',
  'time_slow',
  'teleport_attack',
];

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ArenaEngine | null>(null);

  const [progress, setProgress] = useState<SavedProgress>(() => loadProgress());
  const [canContinue, setCanContinue] = useState<boolean>(() => hasSavedProgress());
  const [screen, setScreen] = useState<GameScreen>('main_menu');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [currentLevelNum, setCurrentLevelNum] = useState<number>(() =>
    Math.min(BOSS_LEVELS.length, loadProgress().highestUnlockedLevel),
  );

  // Per-level Pre-Battle MCQ Draft state (4 questions -> 4 independent power slots)
  const [levelQuestions, setLevelQuestions] = useState<McqQuestion[]>([]);
  const [mcqIndex, setMcqIndex] = useState(0);
  const [mcqSummary, setMcqSummary] = useState<LevelMcqSummary>({
    total: 4,
    correct: 0,
    wrong: 0,
    slotPowers: [null, null, null, null],
    playerPowersEarned: [],
    monsterPowersEarned: [],
  });
  const [lastAwardedPlayerPower, setLastAwardedPlayerPower] = useState<PowerId | null>(null);
  const [lastAwardedMonsterPower, setLastAwardedMonsterPower] = useState<MonsterPowerId | null>(null);

  const [lastMatchCoinsEarned, setLastMatchCoinsEarned] = useState(0);

  const [hud, setHud] = useState<BattleHudSnapshot>(INITIAL_HUD);
  const [isTouchMobile, setIsTouchMobile] = useState<boolean>(() => detectTouchMobile());
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false,
  );

  // Refs so Three.js & async callbacks always read fresh state immediately
  const currentLevelRef = useRef(currentLevelNum);
  currentLevelRef.current = currentLevelNum;
  const mcqSummaryRef = useRef(mcqSummary);
  mcqSummaryRef.current = mcqSummary;
  const collectedPowersRef = useRef(progress.collectedPowers);
  collectedPowersRef.current = progress.collectedPowers;
  const purchasedPowersRef = useRef(progress.purchasedPowers);
  purchasedPowersRef.current = progress.purchasedPowers;
  const activeLoadoutRef = useRef(progress.activeLoadout);
  activeLoadoutRef.current = progress.activeLoadout;
  const unitQuestionCursorsRef = useRef(progress.unitQuestionCursors);
  unitQuestionCursorsRef.current = progress.unitQuestionCursors;
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const pausedByRotationRef = useRef(false);

  const battleExtraPowers = computeBattleExtraPowers(
    progress.activeLoadout,
    progress.purchasedPowers,
    mcqSummary.slotPowers,
  );

  // Sync audio settings
  useEffect(() => {
    soundEngine.setSettings(progress.settings.soundEnabled, progress.settings.musicEnabled);
  }, [progress.settings.soundEnabled, progress.settings.musicEnabled]);

  // Sync active battle loadout extras and power upgrades into ArenaEngine
  useEffect(() => {
    engineRef.current?.setPurchasedPowers(battleExtraPowers);
    engineRef.current?.setPowerUpgrades(progress.powerUpgrades);
  }, [battleExtraPowers, progress.powerUpgrades]);

  // Persist progress changes
  useEffect(() => {
    saveProgress(progress);
    setCanContinue(hasSavedProgress());
  }, [progress]);

  // Enforce/track mobile landscape orientation across resize and orientationchange events
  useEffect(() => {
    let timeoutId: number | undefined;
    const syncViewport = () => {
      setIsTouchMobile(detectTouchMobile());
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    const handleOrientationChange = () => {
      syncViewport();
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(syncViewport, 80);
    };

    syncViewport();
    tryLockLandscape();
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.visualViewport?.addEventListener('resize', syncViewport);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.visualViewport?.removeEventListener('resize', syncViewport);
    };
  }, []);

  // Auto-pause battle if mobile phone turns portrait, and resume cleanly when rotated back to landscape
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isTouchMobile && isPortrait) {
      if (screenRef.current === 'battle') {
        pausedByRotationRef.current = true;
        engine.setMode('paused');
      }
    } else if (pausedByRotationRef.current) {
      pausedByRotationRef.current = false;
      if (screenRef.current === 'battle') {
        engine.setMode('battle');
      }
    }
  }, [isTouchMobile, isPortrait]);

  // Initialize Three.js ArenaEngine ONCE in isolated mount ref
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new ArenaEngine(
      mount,
      {
        onHudUpdate: (snapshot) => setHud(snapshot),
        onIntroFinished: () => {
          setScreen('battle');
        },
        onBattleEnd: (winner) => {
          const lvlDef = getLevelDef(currentLevelRef.current);
          const sum = mcqSummaryRef.current;
          if (winner === 'player') {
            const coinsEarned = lvlDef.rewardCoins + sum.correct * 40;
            setLastMatchCoinsEarned(coinsEarned);
            setProgress((prev) => {
              const nextUnlocked = Math.min(
                BOSS_LEVELS.length,
                Math.max(prev.highestUnlockedLevel, lvlDef.level + 1),
              );
              const defeated = prev.defeatedBossIds.includes(lvlDef.id)
                ? prev.defeatedBossIds
                : [...prev.defeatedBossIds, lvlDef.id];
              const powers = new Set<PowerId>(prev.collectedPowers);
              if (lvlDef.guaranteedPowerReward) {
                powers.add(lvlDef.guaranteedPowerReward);
              }
              collectedPowersRef.current = Array.from(powers);
              return {
                ...prev,
                highestUnlockedLevel: nextUnlocked,
                defeatedBossIds: defeated,
                collectedPowers: collectedPowersRef.current,
                coins: prev.coins + coinsEarned,
                totalWins: prev.totalWins + 1,
                totalScore: prev.totalScore + coinsEarned,
              };
            });
            setScreen('victory');
          } else {
            const coinsEarned = Math.max(
              25,
              Math.round(lvlDef.rewardCoins * 0.25) + sum.correct * 20,
            );
            setLastMatchCoinsEarned(coinsEarned);
            setProgress((prev) => ({
              ...prev,
              coins: prev.coins + coinsEarned,
              totalScore: prev.totalScore + coinsEarned,
            }));
            setScreen('defeat');
          }
        },
      },
      progress.settings.graphicsQuality,
    );

    engine.setPurchasedPowers(
      computeBattleExtraPowers(
        progress.activeLoadout,
        progress.purchasedPowers,
        mcqSummary.slotPowers,
      ),
    );
    engine.setPowerUpgrades(progress.powerUpgrades);
    engineRef.current = engine;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (screenRef.current === 'battle') {
          engine.setMode('paused');
          setScreen('paused');
        } else if (screenRef.current === 'paused') {
          engine.setMode('battle');
          setScreen('battle');
        }
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLevelFlow = useCallback(
    (levelNum: number) => {
      const clampedLevel = Math.max(1, Math.min(BOSS_LEVELS.length, levelNum));
      tryEnterImmersiveMode();
      soundEngine.unlockAndStartMusic();
      soundEngine.playUiClick();

      const { questions, updatedCursors } = pickMcqsForUnitSequential(
        progress.selectedUnitId,
        unitQuestionCursorsRef.current,
        4,
      );
      unitQuestionCursorsRef.current = updatedCursors;

      setProgress((prev) => ({
        ...prev,
        unitQuestionCursors: updatedCursors,
      }));

      const emptySummary: LevelMcqSummary = {
        total: questions.length,
        correct: 0,
        wrong: 0,
        slotPowers: Array.from({ length: questions.length }, () => null),
        playerPowersEarned: [],
        monsterPowersEarned: [],
      };
      mcqSummaryRef.current = emptySummary;

      setLastMatchCoinsEarned(0);
      setCurrentLevelNum(clampedLevel);
      setLevelQuestions(questions);
      setMcqIndex(0);
      setMcqSummary(emptySummary);
      setLastAwardedPlayerPower(null);
      setLastAwardedMonsterPower(null);
      setActiveModal('none');
      setScreen('mcq_draft');

      engineRef.current?.loadLevelScene(clampedLevel, 'mcq_draft');
    },
    [progress.selectedUnitId],
  );

  const handleMcqAnswer = useCallback(
    (optionIndex: number) => {
      const q = levelQuestions[mcqIndex];
      if (!q) return;

      const curSummary = mcqSummaryRef.current;
      // Guard against duplicate submissions for the same question index
      if (curSummary.correct + curSummary.wrong > mcqIndex) return;

      const isCorrect = optionIndex === q.correctIndex;
      const playerEarnedSet = new Set<string>(curSummary.playerPowersEarned);
      const monsterEarnedSet = new Set<string>(curSummary.monsterPowersEarned);

      if (isCorrect) {
        soundEngine.playMcqCorrect();

        // Pick a DISTINCT active power for this slot that has not been awarded in previous slots, purchased, or given to enemy
        const unownedDistinct = DRAFTABLE_PLAYER_POWERS.filter(
          (p) =>
            !collectedPowersRef.current.includes(p.id) &&
            !purchasedPowersRef.current.includes(p.id) &&
            !playerEarnedSet.has(p.id) &&
            !monsterEarnedSet.has(p.id),
        );
        const unAwardedDistinct = DRAFTABLE_PLAYER_POWERS.filter(
          (p) =>
            !purchasedPowersRef.current.includes(p.id) &&
            !playerEarnedSet.has(p.id) &&
            !monsterEarnedSet.has(p.id),
        );
        const fallbackDistinct = DRAFTABLE_PLAYER_POWERS.filter(
          (p) => !purchasedPowersRef.current.includes(p.id) && !playerEarnedSet.has(p.id),
        );

        const candidates =
          unownedDistinct.length > 0
            ? unownedDistinct
            : unAwardedDistinct.length > 0
            ? unAwardedDistinct
            : fallbackDistinct.length > 0
            ? fallbackDistinct
            : DRAFTABLE_PLAYER_POWERS;

        const chosenDef = candidates[Math.floor(Math.random() * candidates.length)];
        const chosenPower = chosenDef.id;

        engineRef.current?.triggerMcqFeedbackEffect(true, chosenDef.hexColor);
        setLastAwardedPlayerPower(chosenPower);
        setLastAwardedMonsterPower(null);

        if (!collectedPowersRef.current.includes(chosenPower)) {
          collectedPowersRef.current = [...collectedPowersRef.current, chosenPower];
        }

        setProgress((prev) => {
          const nextCollected = prev.collectedPowers.includes(chosenPower)
            ? prev.collectedPowers
            : [...prev.collectedPowers, chosenPower];
          return {
            ...prev,
            collectedPowers: nextCollected,
            totalCorrectMcq: prev.totalCorrectMcq + 1,
          };
        });

        const nextSlotPowers = [...curSummary.slotPowers];
        nextSlotPowers[mcqIndex] = chosenPower;

        const nextSummary: LevelMcqSummary = {
          ...curSummary,
          correct: curSummary.correct + 1,
          slotPowers: nextSlotPowers,
          playerPowersEarned: [...curSummary.playerPowersEarned, chosenPower],
        };
        mcqSummaryRef.current = nextSummary;
        setMcqSummary(nextSummary);
      } else {
        soundEngine.playMcqWrong();

        const lvlDef = getLevelDef(currentLevelNum);
        const rawPool: MonsterPowerId[] = [...lvlDef.signaturePowers, ...ENEMY_COMBAT_POWERS];
        const distinctPool = rawPool.filter(
          (mp) => !playerEarnedSet.has(mp) && !monsterEarnedSet.has(mp),
        );
        const nonPlayerPool = rawPool.filter((mp) => !playerEarnedSet.has(mp));
        const pool =
          distinctPool.length > 0
            ? distinctPool
            : nonPlayerPool.length > 0
            ? nonPlayerPool
            : rawPool;

        const chosenMonsterPower = pool[Math.floor(Math.random() * pool.length)];
        const mDef = getMonsterPowerDef(chosenMonsterPower);

        engineRef.current?.triggerMcqFeedbackEffect(false, mDef.hexColor);
        setLastAwardedMonsterPower(chosenMonsterPower);
        setLastAwardedPlayerPower(null);

        setProgress((prev) => ({
          ...prev,
          totalWrongMcq: prev.totalWrongMcq + 1,
        }));

        // Incorrect answer -> slot remains null (no power awarded to player)
        const nextSlotPowers = [...curSummary.slotPowers];
        nextSlotPowers[mcqIndex] = null;

        const nextSummary: LevelMcqSummary = {
          ...curSummary,
          wrong: curSummary.wrong + 1,
          slotPowers: nextSlotPowers,
          monsterPowersEarned: [...curSummary.monsterPowersEarned, chosenMonsterPower],
        };
        mcqSummaryRef.current = nextSummary;
        setMcqSummary(nextSummary);
      }
    },
    [levelQuestions, mcqIndex, currentLevelNum],
  );

  const handleAdvanceMcq = useCallback(() => {
    if (mcqIndex + 1 < levelQuestions.length) {
      setMcqIndex((prev) => prev + 1);
    } else {
      // Only allow battle to start once all 4 MCQs are answered
      const sum = mcqSummaryRef.current;
      if (sum.correct + sum.wrong < levelQuestions.length) return;

      const engine = engineRef.current;
      if (engine) {
        const matchExtras = computeBattleExtraPowers(
          activeLoadoutRef.current,
          purchasedPowersRef.current,
          sum.slotPowers,
        );
        engine.configureMatchLoadout(
          sum.slotPowers,
          sum.monsterPowersEarned,
          matchExtras,
        );
        engine.setMode('boss_intro');
      }
      setScreen('boss_intro');
    }
  }, [mcqIndex, levelQuestions.length]);

  const handlePurchasePower = useCallback((powerId: PowerId, price: number) => {
    setProgress((prev) => {
      if (prev.purchasedPowers.includes(powerId) || prev.coins < price) {
        return prev;
      }
      soundEngine.playMcqCorrect();
      const nextPurchased = [...prev.purchasedPowers, powerId];
      const nextCollected = prev.collectedPowers.includes(powerId)
        ? prev.collectedPowers
        : [...prev.collectedPowers, powerId];
      const nextLoadout =
        !prev.activeLoadout.includes(powerId) &&
        prev.activeLoadout.length < MAX_LOADOUT_SELECTION
          ? [...prev.activeLoadout, powerId]
          : prev.activeLoadout;
      purchasedPowersRef.current = nextPurchased;
      collectedPowersRef.current = nextCollected;
      activeLoadoutRef.current = nextLoadout;
      return {
        ...prev,
        coins: prev.coins - price,
        purchasedPowers: nextPurchased,
        collectedPowers: nextCollected,
        activeLoadout: nextLoadout,
      };
    });
  }, []);

  const handleToggleLoadoutPower = useCallback((powerId: PowerId) => {
    soundEngine.playUiClick();
    setProgress((prev) => {
      if (!prev.purchasedPowers.includes(powerId)) {
        return prev;
      }
      const exists = prev.activeLoadout.includes(powerId);
      if (exists) {
        const nextLoadout = prev.activeLoadout.filter((id) => id !== powerId);
        activeLoadoutRef.current = nextLoadout;
        return { ...prev, activeLoadout: nextLoadout };
      }
      if (prev.activeLoadout.length >= MAX_LOADOUT_SELECTION) {
        return prev;
      }
      const nextLoadout = [...prev.activeLoadout, powerId];
      activeLoadoutRef.current = nextLoadout;
      return { ...prev, activeLoadout: nextLoadout };
    });
  }, []);

  const handleAutoFillLoadout = useCallback(() => {
    soundEngine.playUiClick();
    setProgress((prev) => {
      const nextLoadout = [...prev.activeLoadout].filter((id) =>
        prev.purchasedPowers.includes(id),
      );
      for (const pid of prev.purchasedPowers) {
        if (nextLoadout.length >= MAX_LOADOUT_SELECTION) break;
        if (!nextLoadout.includes(pid)) {
          nextLoadout.push(pid);
        }
      }
      activeLoadoutRef.current = nextLoadout;
      return { ...prev, activeLoadout: nextLoadout };
    });
  }, []);

  const handleClearLoadout = useCallback(() => {
    soundEngine.playUiClick();
    activeLoadoutRef.current = [];
    setProgress((prev) => ({ ...prev, activeLoadout: [] }));
  }, []);

  const handleUpgradePower = useCallback((powerId: PowerId, cost: number) => {
    setProgress((prev) => {
      const currentLevel = prev.powerUpgrades[powerId] ?? 1;
      if (currentLevel >= MAX_POWER_LEVEL || prev.coins < cost) {
        return prev;
      }
      soundEngine.playMcqCorrect();
      return {
        ...prev,
        coins: prev.coins - cost,
        powerUpgrades: {
          ...prev.powerUpgrades,
          [powerId]: currentLevel + 1,
        },
      };
    });
  }, []);

  const handleToggleSound = () => {
    soundEngine.unlockAndStartMusic();
    setProgress((prev) => {
      const nextSound = !prev.settings.soundEnabled;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          soundEnabled: nextSound,
          musicEnabled: nextSound,
        },
      };
    });
  };

  const handleCycleGraphics = () => {
    soundEngine.playUiClick();
    const order: GraphicsQuality[] = ['low', 'medium', 'high'];
    const idx = order.indexOf(progress.settings.graphicsQuality);
    const next = order[(idx + 1) % order.length];
    engineRef.current?.setGraphicsQuality(next);
    setProgress((prev) => ({
      ...prev,
      settings: { ...prev.settings, graphicsQuality: next },
    }));
  };

  const handleUpdateSettings = (patch: Partial<SavedProgress['settings']>) => {
    soundEngine.playUiClick();
    if (patch.graphicsQuality) {
      engineRef.current?.setGraphicsQuality(patch.graphicsQuality);
    }
    setProgress((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  };

  const handleMainMenu = () => {
    soundEngine.playUiClick();
    setScreen('main_menu');
    engineRef.current?.loadLevelScene(progress.highestUnlockedLevel, 'menu');
  };

  const selectedUnit =
    GRADE_10_SCIENCE_UNITS.find((u) => u.id === progress.selectedUnitId) ??
    GRADE_10_SCIENCE_UNITS[0];
  const levelDef = getLevelDef(currentLevelNum);

  return (
    <div className="fixed inset-0 h-dvh w-screen select-none overflow-hidden bg-[#07090f]">
      {/* Isolated WebGL Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Main Menu */}
      {screen === 'main_menu' && (
        <MainMenu
          progress={progress}
          selectedUnit={selectedUnit}
          canContinue={canContinue}
          onPlayNew={() => startLevelFlow(1)}
          onContinue={() => startLevelFlow(progress.highestUnlockedLevel)}
          onOpenModal={(m) => {
            tryEnterImmersiveMode();
            soundEngine.unlockAndStartMusic();
            soundEngine.playUiClick();
            setActiveModal(m);
          }}
          onToggleSound={handleToggleSound}
          onCycleGraphics={handleCycleGraphics}
        />
      )}

      {/* Pre-Battle 4-Question Sinhala MCQ Power Selection Phase */}
      {screen === 'mcq_draft' && (
        <McqDraftOverlay
          levelDef={levelDef}
          unit={selectedUnit}
          questions={levelQuestions}
          currentIndex={mcqIndex}
          slotPowers={mcqSummary.slotPowers}
          earnedPlayerPowers={mcqSummary.playerPowersEarned}
          earnedMonsterPowers={mcqSummary.monsterPowersEarned}
          lastAwardedPlayerPower={lastAwardedPlayerPower}
          lastAwardedMonsterPower={lastAwardedMonsterPower}
          onSelectAnswer={handleMcqAnswer}
          onAdvanceNext={handleAdvanceMcq}
        />
      )}

      {/* Active 3D Battle HUD */}
      {screen === 'battle' && (
        <BattleHud
          hud={hud}
          levelDef={levelDef}
          matchSlotPowers={mcqSummary.slotPowers}
          purchasedPowers={battleExtraPowers}
          bossBonusPowers={mcqSummary.monsterPowersEarned}
          soundEnabled={progress.settings.soundEnabled}
          showTouchMode={progress.settings.showTouchControls}
          onToggleSound={handleToggleSound}
          onPause={() => {
            engineRef.current?.setMode('paused');
            setScreen('paused');
          }}
          onJoystickMove={(x, y) => engineRef.current?.setJoystick(x, y)}
          onAction={(act) => engineRef.current?.triggerPlayerAction(act)}
          onBlockHold={(held) => engineRef.current?.setBlockHeld(held)}
          onUsePower={(pid) => engineRef.current?.triggerPlayerPower(pid)}
        />
      )}

      {/* Boss Intro / Pause / Victory / Defeat Overlays */}
      {(screen === 'boss_intro' ||
        screen === 'paused' ||
        screen === 'victory' ||
        screen === 'defeat') && (
        <ResultOverlay
          screen={screen}
          levelDef={levelDef}
          mcqSummary={mcqSummary}
          coinsEarned={lastMatchCoinsEarned}
          totalCoins={progress.coins}
          onResume={() => {
            engineRef.current?.setMode('battle');
            setScreen('battle');
          }}
          onRetryLevel={() => startLevelFlow(currentLevelNum)}
          onNextLevel={() => startLevelFlow(Math.min(BOSS_LEVELS.length, currentLevelNum + 1))}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Collection & Settings Modals */}
      <CollectionModals
        activeModal={activeModal}
        progress={progress}
        onClose={() => setActiveModal('none')}
        onSwitchModal={(m) => {
          soundEngine.playUiClick();
          setActiveModal(m);
        }}
        onStartLevel={(lvl) => startLevelFlow(lvl)}
        onSelectUnit={(unitId) => {
          soundEngine.playUiClick();
          setProgress((prev) => ({ ...prev, selectedUnitId: unitId }));
        }}
        onPurchasePower={handlePurchasePower}
        onUpgradePower={handleUpgradePower}
        onToggleLoadoutPower={handleToggleLoadoutPower}
        onAutoFillLoadout={handleAutoFillLoadout}
        onClearLoadout={handleClearLoadout}
        onUpdateSettings={handleUpdateSettings}
        onResetProgress={() => {
          const fresh = resetProgress();
          collectedPowersRef.current = fresh.collectedPowers;
          purchasedPowersRef.current = fresh.purchasedPowers;
          activeLoadoutRef.current = fresh.activeLoadout;
          unitQuestionCursorsRef.current = fresh.unitQuestionCursors;
          setProgress(fresh);
          setCurrentLevelNum(1);
          engineRef.current?.setPurchasedPowers(fresh.activeLoadout);
          engineRef.current?.setPowerUpgrades(fresh.powerUpgrades);
          engineRef.current?.loadLevelScene(1, 'menu');
        }}
      />
      {/* Mobile Portrait Orientation Gate */}
      {isTouchMobile && isPortrait && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 px-6 text-center">
          <div className="flex max-w-sm flex-col items-center rounded-2xl border border-sky-400/40 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-400/50 bg-sky-500/15 text-sky-300">
              <RotateCw className="h-9 w-9" />
            </div>
            <h2 className="font-display text-lg font-black tracking-wider text-white">
              LANDSCAPE MODE REQUIRED
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
              Please rotate your phone to landscape mode to play.
            </p>
            <button
              type="button"
              onClick={() => {
                tryEnterImmersiveMode();
              }}
              className="mt-5 rounded-xl border border-sky-300/60 bg-sky-500 px-5 py-2.5 font-display text-xs font-black tracking-wider text-slate-950 shadow-lg active:scale-95"
            >
              LOCK LANDSCAPE MODE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
