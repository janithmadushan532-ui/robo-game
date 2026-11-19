/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BattleHud } from './components/BattleHud';
import { CollectionModals } from './components/CollectionModals';
import { MainMenu } from './components/MainMenu';
import { McqDraftOverlay } from './components/McqDraftOverlay';
import { ResultOverlay } from './components/ResultOverlay';
import { BOSS_LEVELS, getLevelDef } from './data/levels';
import { pickMcqsForUnit } from './data/mcqDatabase';
import { createEmptyPowerCooldowns, getMonsterPowerDef, PLAYER_POWER_LIST } from './data/powers';
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
  powerCooldowns: createEmptyPowerCooldowns(),
  comboCount: 0,
  lastDamageEvent: null,
  battleTime: 0,
};

// All 28 active combat powers eligible for Pre-Battle MCQ Slots 1-4 (Ultimate stays bound to [U] Fury)
const DRAFTABLE_PLAYER_POWERS = PLAYER_POWER_LIST.filter((p) => p.id !== 'ultimate');

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

  const [hud, setHud] = useState<BattleHudSnapshot>(INITIAL_HUD);

  // Refs so Three.js & async callbacks always read fresh state immediately
  const currentLevelRef = useRef(currentLevelNum);
  currentLevelRef.current = currentLevelNum;
  const mcqSummaryRef = useRef(mcqSummary);
  mcqSummaryRef.current = mcqSummary;
  const collectedPowersRef = useRef(progress.collectedPowers);
  collectedPowersRef.current = progress.collectedPowers;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // Sync audio settings
  useEffect(() => {
    soundEngine.setSettings(progress.settings.soundEnabled, progress.settings.musicEnabled);
  }, [progress.settings.soundEnabled, progress.settings.musicEnabled]);

  // Persist progress changes
  useEffect(() => {
    saveProgress(progress);
    setCanContinue(hasSavedProgress());
  }, [progress]);

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
          if (winner === 'player') {
            const lvlDef = getLevelDef(currentLevelRef.current);
            const sum = mcqSummaryRef.current;
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
                totalWins: prev.totalWins + 1,
                totalScore: prev.totalScore + lvlDef.rewardCoins + sum.correct * 40,
              };
            });
            setScreen('victory');
          } else {
            setScreen('defeat');
          }
        },
      },
      progress.settings.graphicsQuality,
    );

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
      soundEngine.unlockAndStartMusic();
      soundEngine.playUiClick();

      const { questions, updatedUsedIds } = pickMcqsForUnit(
        progress.selectedUnitId,
        progress.usedQuestionIds,
        4,
      );

      setProgress((prev) => ({
        ...prev,
        usedQuestionIds: updatedUsedIds,
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
    [progress.selectedUnitId, progress.usedQuestionIds],
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

        // Pick a DISTINCT active power for this slot that has not been awarded in previous slots or given to enemy
        const unownedDistinct = DRAFTABLE_PLAYER_POWERS.filter(
          (p) =>
            !collectedPowersRef.current.includes(p.id) &&
            !playerEarnedSet.has(p.id) &&
            !monsterEarnedSet.has(p.id),
        );
        const unAwardedDistinct = DRAFTABLE_PLAYER_POWERS.filter(
          (p) => !playerEarnedSet.has(p.id) && !monsterEarnedSet.has(p.id),
        );
        const fallbackDistinct = DRAFTABLE_PLAYER_POWERS.filter(
          (p) => !playerEarnedSet.has(p.id),
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

        setProgress((prev) => ({
          ...prev,
          collectedPowers: prev.collectedPowers.includes(chosenPower)
            ? prev.collectedPowers
            : [...prev.collectedPowers, chosenPower],
          totalCorrectMcq: prev.totalCorrectMcq + 1,
        }));

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
        engine.configureMatchLoadout(
          sum.slotPowers,
          sum.monsterPowersEarned,
          collectedPowersRef.current,
        );
        engine.setMode('boss_intro');
      }
      setScreen('boss_intro');
    }
  }, [mcqIndex, levelQuestions.length]);

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
    <div className="relative h-screen w-screen overflow-hidden bg-[#07090f]">
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
          collectedPowers={progress.collectedPowers}
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
        onStartLevel={(lvl) => startLevelFlow(lvl)}
        onSelectUnit={(unitId) => {
          soundEngine.playUiClick();
          setProgress((prev) => ({ ...prev, selectedUnitId: unitId }));
        }}
        onUpdateSettings={handleUpdateSettings}
        onResetProgress={() => {
          const fresh = resetProgress();
          collectedPowersRef.current = fresh.collectedPowers;
          setProgress(fresh);
          setCurrentLevelNum(1);
          engineRef.current?.loadLevelScene(1, 'menu');
        }}
      />
    </div>
  );
}
