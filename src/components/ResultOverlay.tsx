import React from 'react';
import { ArrowRight, Award, Crown, Home, Play, RotateCcw, ShieldAlert, Trophy } from 'lucide-react';
import { BOSS_LEVELS } from '../data/levels';
import { PLAYER_POWERS } from '../data/powers';
import { BossLevelDef, GameScreen, LevelMcqSummary } from '../types/game';
import { PowerIcon } from './PowerIcon';

interface ResultOverlayProps {
  screen: GameScreen;
  levelDef: BossLevelDef;
  mcqSummary: LevelMcqSummary;
  onResume: () => void;
  onRetryLevel: () => void;
  onNextLevel: () => void;
  onMainMenu: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  screen,
  levelDef,
  mcqSummary,
  onResume,
  onRetryLevel,
  onNextLevel,
  onMainMenu,
}) => {
  const isFinalCampaignLevel = levelDef.level >= BOSS_LEVELS.length;

  if (screen === 'boss_intro') {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-12">
        <div className="rounded-xl border border-rose-500/60 bg-slate-950/92 px-8 py-4 text-center shadow-2xl">
          <div className="font-display text-xs font-bold tracking-[0.25em] text-amber-400">
            LEVEL {levelDef.level} · SECTOR {levelDef.sector} · {levelDef.arenaName.toUpperCase()}
            {levelDef.challengeLabel ? ` · ${levelDef.challengeLabel}` : ''}
            {levelDef.isSurvivalLevel
              ? ` · ${1 + (levelDef.survivalWaves?.length ?? 0)} WAVES`
              : ''}
            {levelDef.isBossLevel ? ' · MAJOR BOSS' : ''}
          </div>
          <div className="font-display mt-1 text-2xl sm:text-4xl font-black tracking-wider text-rose-400">
            VS {levelDef.bossName}
          </div>
          {levelDef.enemies && levelDef.enemies.length > 1 && (
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
              {levelDef.enemies.map((e, i) => (
                <span
                  key={i}
                  className="rounded border border-rose-500/40 bg-rose-950/75 px-2 py-0.5 font-display text-[11px] font-bold text-rose-200"
                >
                  {e.name} ({e.monsterCategory})
                </span>
              ))}
            </div>
          )}
          <div className="font-sinhala mt-1 text-sm font-bold text-slate-200">
            {levelDef.monsterCategory} · {levelDef.robotClass} · {levelDef.bossTitleSi} · {levelDef.arenaNameSi}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'paused') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-6 text-center shadow-2xl">
          <h2 className="font-display text-2xl font-black tracking-wider text-white">PAUSED</h2>
          <p className="font-sinhala mt-1 text-xs text-slate-400">
            Level {levelDef.level} — {levelDef.bossName} ({levelDef.robotClass})
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              onClick={onResume}
              className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 font-display text-sm font-bold text-white hover:bg-sky-500"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>RESUME FIGHT</span>
            </button>
            <button
              onClick={onRetryLevel}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 font-display text-sm font-bold text-slate-200 hover:border-amber-400"
            >
              <RotateCcw className="h-4 w-4" />
              <span>RESTART LEVEL</span>
            </button>
            <button
              onClick={onMainMenu}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 font-display text-sm font-bold text-slate-300 hover:border-rose-400"
            >
              <Home className="h-4 w-4" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'victory') {
    const rewardPower = levelDef.guaranteedPowerReward
      ? PLAYER_POWERS[levelDef.guaranteedPowerReward]
      : null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-500/60 bg-slate-950/96 p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              {isFinalCampaignLevel ? <Crown className="h-7 w-7 text-amber-400" /> : <Trophy className="h-7 w-7" />}
            </div>
            <div>
              <div className="font-display text-xs font-bold tracking-widest text-emerald-400">
                {isFinalCampaignLevel
                  ? `ALL ${BOSS_LEVELS.length} ARENAS CONQUERED · GRAND CHAMPION!`
                  : `LEVEL ${levelDef.level} COMPLETED!`}
              </div>
              <h2 className="font-display text-2xl font-black text-white">
                {levelDef.bossName} DEFEATED
              </h2>
            </div>
          </div>

          {/* MCQ & Battle Summary */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-3 text-center">
            <div>
              <div className="text-[10px] font-bold text-slate-400">MCQ CORRECT</div>
              <div className="font-display text-xl font-black tabular-nums text-emerald-400">
                {mcqSummary.correct} / {mcqSummary.total}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">MCQ WRONG</div>
              <div className="font-display text-xl font-black tabular-nums text-rose-400">
                {mcqSummary.wrong} / {mcqSummary.total}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">SCORE REWARD</div>
              <div className="font-display text-xl font-black tabular-nums text-amber-400">
                +{levelDef.rewardCoins + mcqSummary.correct * 40}
              </div>
            </div>
          </div>

          {/* Earned Powers */}
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/75 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-sky-300">
              <Award className="h-4 w-4" />
              <span>POWERS & REWARDS UNLOCKED</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mcqSummary.playerPowersEarned.map((pid, idx) => {
                const def = PLAYER_POWERS[pid];
                return (
                  <span
                    key={`${pid}_${idx}`}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-extrabold text-slate-950"
                    style={{ backgroundColor: def.color }}
                  >
                    <PowerIcon type={def.icon} className="h-3 w-3" />
                    <span>{def.name}</span>
                  </span>
                );
              })}
              {rewardPower && (
                <span
                  className="flex items-center gap-1 rounded border border-white/40 px-2 py-0.5 text-xs font-extrabold text-slate-950"
                  style={{ backgroundColor: rewardPower.color }}
                >
                  <PowerIcon type={rewardPower.icon} className="h-3 w-3" />
                  <span>BOSS REWARD: {rewardPower.name}</span>
                </span>
              )}
              {mcqSummary.playerPowersEarned.length === 0 && !rewardPower && (
                <span className="text-xs text-slate-400">Pure melee victory! Answer MCQs next level for bonus powers.</span>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {!isFinalCampaignLevel ? (
              <button
                onClick={onNextLevel}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-display text-sm font-black text-white shadow-lg transition hover:bg-emerald-500"
              >
                <span>NEXT LEVEL ({levelDef.level + 1})</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onRetryLevel}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-display text-sm font-black text-white shadow-lg transition hover:bg-amber-500"
              >
                <RotateCcw className="h-4 w-4" />
                <span>REMATCH LEVEL {levelDef.level}</span>
              </button>
            )}
            <button
              onClick={onMainMenu}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-display text-sm font-bold text-slate-200 hover:border-sky-400"
            >
              <Home className="h-4 w-4" />
              <span>MENU</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'defeat') {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/60 bg-slate-950/96 p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="font-display mt-3 text-2xl font-black text-rose-400">DEFEATED!</h2>
          <p className="font-sinhala mt-1 text-sm text-slate-300">
            {levelDef.bossName} ඔබව පරාජය කළේය. නිවැරදි විද්‍යා පිළිතුරු ලබා දී නැවත සටන් කරන්න!
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs">
            <div>
              <div className="text-slate-400">MCQ CORRECT</div>
              <div className="font-display text-base font-bold text-emerald-400">
                {mcqSummary.correct} / {mcqSummary.total}
              </div>
            </div>
            <div>
              <div className="text-slate-400">BOSS BOOSTS</div>
              <div className="font-display text-base font-bold text-rose-400">
                +{mcqSummary.wrong}
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2.5">
            <button
              onClick={onRetryLevel}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 font-display text-sm font-black text-white hover:bg-rose-500"
            >
              <RotateCcw className="h-4 w-4" />
              <span>RETRY LEVEL {levelDef.level}</span>
            </button>
            <button
              onClick={onMainMenu}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-display text-sm font-bold text-slate-200 hover:border-sky-400"
            >
              <Home className="h-4 w-4" />
              <span>MENU</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
