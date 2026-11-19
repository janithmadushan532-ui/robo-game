import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Lock,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  XCircle,
} from 'lucide-react';
import { getMonsterPowerDef, PLAYER_POWERS } from '../data/powers';
import { BossLevelDef, McqQuestion, MonsterPowerId, PowerId, ScienceUnit } from '../types/game';
import { PowerIcon } from './PowerIcon';

interface McqDraftOverlayProps {
  levelDef: BossLevelDef;
  unit: ScienceUnit;
  questions: McqQuestion[];
  currentIndex: number;
  slotPowers: (PowerId | null)[];
  earnedPlayerPowers: PowerId[];
  earnedMonsterPowers: MonsterPowerId[];
  lastAwardedPlayerPower: PowerId | null;
  lastAwardedMonsterPower: MonsterPowerId | null;
  onSelectAnswer: (optionIndex: number) => void;
  onAdvanceNext: () => void;
}

export const McqDraftOverlay: React.FC<McqDraftOverlayProps> = ({
  levelDef,
  unit,
  questions,
  currentIndex,
  slotPowers,
  earnedPlayerPowers,
  earnedMonsterPowers,
  lastAwardedPlayerPower,
  lastAwardedMonsterPower,
  onSelectAnswer,
  onAdvanceNext,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(4);

  const q = questions[currentIndex];
  const isFinalQuestion = currentIndex + 1 >= questions.length;

  useEffect(() => {
    setSelectedIdx(null);
    setCountdown(isFinalQuestion ? 5 : 4);
  }, [currentIndex, q?.id, isFinalQuestion]);

  // Auto-advance timer after answering
  useEffect(() => {
    if (selectedIdx === null) return;
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onAdvanceNext();
          return 0;
        }
        return prev - 1;
      });
    }, 950);
    return () => window.clearInterval(timer);
  }, [selectedIdx, onAdvanceNext]);

  if (!q) return null;

  const isAnswered = selectedIdx !== null;
  const isCorrect = selectedIdx === q.correctIndex;

  const awardedPlayerDef =
    isCorrect && lastAwardedPlayerPower ? PLAYER_POWERS[lastAwardedPlayerPower] : null;
  const awardedMonsterDef =
    !isCorrect && lastAwardedMonsterPower ? getMonsterPowerDef(lastAwardedMonsterPower) : null;

  const handleChoose = (idx: number) => {
    if (isAnswered) return;
    setSelectedIdx(idx);
    onSelectAnswer(idx);
  };

  return (
    <div className="game-scroll absolute inset-0 flex flex-col justify-between gap-2 overflow-y-auto p-2 sm:p-4">
      {/* Top Status Strip */}
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/80 bg-slate-950/94 px-3 py-2 shadow-xl sm:px-4">
        <div>
          <div className="text-[11px] font-bold tracking-wider text-sky-400 uppercase">
            PRE-BATTLE POWER DRAFT · LEVEL {levelDef.level} · {levelDef.bossName} ({levelDef.monsterCategory})
          </div>
          <div className="font-sinhala text-xs sm:text-sm font-bold text-slate-100">
            {unit.code} · {unit.sinhalaTitle}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-950/75 px-2.5 py-1 text-xs font-bold text-sky-300">
            <Flame className="h-3.5 w-3.5" />
            <span>HERO SLOTS: {earnedPlayerPowers.length} / {questions.length}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-950/75 px-2.5 py-1 text-xs font-bold text-rose-300">
            <Skull className="h-3.5 w-3.5" />
            <span>ENEMY: +{earnedMonsterPowers.length}</span>
          </div>
          <div className="rounded-md bg-slate-800 px-2.5 py-1 font-display text-xs font-extrabold text-amber-400">
            Q{currentIndex + 1} / {questions.length}
          </div>
        </div>
      </div>

      {/* Pre-Battle 4-Slot Hero Arsenal Bar */}
      <div className="mx-auto grid w-full max-w-4xl grid-cols-4 gap-2">
        {Array.from({ length: questions.length }, (_, idx) => {
          const pid = slotPowers[idx];
          const pDef = pid ? PLAYER_POWERS[pid] : null;
          const isCurrent = idx === currentIndex;
          const isPastOrCurrentAnswered = idx < currentIndex || (isCurrent && isAnswered);
          const isMissed = isPastOrCurrentAnswered && !pDef;

          return (
            <motion.div
              key={idx}
              initial={false}
              animate={
                pDef
                  ? { scale: [1, 1.06, 1], borderColor: pDef.color }
                  : { scale: 1 }
              }
              transition={{ duration: 0.35 }}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 shadow-lg transition ${
                pDef
                  ? 'bg-slate-950/95 text-white'
                  : isMissed
                  ? 'border-rose-500/50 bg-rose-950/75 text-rose-300'
                  : isCurrent
                  ? 'border-sky-400 bg-slate-900/95 text-sky-200'
                  : 'border-slate-800 bg-slate-950/80 text-slate-500'
              }`}
              style={pDef ? { borderColor: pDef.color } : undefined}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-950"
                style={{
                  backgroundColor: pDef
                    ? pDef.color
                    : isMissed
                    ? '#4c0519'
                    : isCurrent
                    ? '#0c4a6e'
                    : '#1e293b',
                  color: pDef ? '#020617' : isMissed ? '#fda4af' : '#94a3b8',
                }}
              >
                {pDef ? (
                  <PowerIcon type={pDef.icon} className="h-4 w-4" />
                ) : isMissed ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[9px] font-black tracking-wider opacity-80">
                  SLOT [{idx + 1}]
                </div>
                <div className="truncate font-display text-[11px] font-extrabold">
                  {pDef
                    ? pDef.shortTag
                    : isMissed
                    ? 'NO POWER'
                    : isCurrent
                    ? 'ACTIVE'
                    : `Q${idx + 1} POWER`}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Center Sinhala MCQ Card */}
      <div className="game-scroll mx-auto my-auto w-full max-w-3xl shrink-0 rounded-2xl border border-sky-500/40 bg-slate-950/94 p-3.5 shadow-2xl sm:p-5">
        <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-slate-400">
          <span className="font-sinhala text-sky-300">
            සෑම නිවැරදි පිළිතුරකටම වෙනස් බලයක් හිමිවේ · වැරදි පිළිතුරකට බලය හිමි නොවේ!
          </span>
          <span className="font-display tabular-nums">
            {currentIndex + 1}/{questions.length}
          </span>
        </div>

        <h2 className="font-sinhala mb-4 text-base sm:text-xl font-bold leading-relaxed text-white">
          {q.questionSi}
        </h2>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {q.optionsSi.map((opt, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx];
            let btnClass =
              'border-slate-700 bg-slate-900/95 text-slate-100 hover:border-sky-400 hover:bg-slate-800';
            if (isAnswered) {
              if (idx === q.correctIndex) {
                btnClass = 'border-emerald-400 bg-emerald-950/90 text-emerald-100';
              } else if (idx === selectedIdx) {
                btnClass = 'border-rose-500 bg-rose-950/90 text-rose-100';
              } else {
                btnClass = 'border-slate-800 bg-slate-900/50 text-slate-500';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleChoose(idx)}
                className={`flex items-start gap-3 rounded-xl border p-3 sm:p-3.5 text-left transition active:scale-[0.99] ${btnClass}`}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 font-display text-xs font-bold text-sky-300">
                  {letter}
                </span>
                <span className="font-sinhala text-sm sm:text-base font-semibold leading-snug">
                  {opt}
                </span>
              </button>
            );
          })}
        </div>

        {/* Exciting Power Reward / Enemy Transfer Animation & Explanation */}
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28 }}
            className={`mt-4 rounded-xl border p-3.5 sm:p-4 ${
              isCorrect
                ? 'border-emerald-500/70 bg-emerald-950/85'
                : 'border-rose-500/70 bg-rose-950/85'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-400" />
                )}
                <span className="font-sinhala text-sm sm:text-base font-extrabold text-white">
                  {isCorrect
                    ? `නිවැරදියි! Slot [${currentIndex + 1}] සඳහා නව බලයක් ප්‍රදානය කෙරුණා!`
                    : 'වැරදියි! ඔබට මෙම බලය අහිමි විය — සතුරා බලවත් විය!'}
                </span>
              </div>
              <span
                className={`rounded px-2 py-0.5 font-display text-[10px] font-black tracking-wider ${
                  isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white'
                }`}
              >
                {isCorrect ? `SLOT [${currentIndex + 1}] EQUIPPED` : 'NO PLAYER POWER'}
              </span>
            </div>

            {/* Animated Power Unlock Burst for Hero */}
            {awardedPlayerDef && (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-emerald-400/40 bg-slate-950/85 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0.25, rotate: -45 }}
                    animate={{ scale: [0.25, 1.18, 1], rotate: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-slate-950 shadow-lg"
                    style={{ backgroundColor: awardedPlayerDef.color }}
                  >
                    <PowerIcon type={awardedPlayerDef.icon} className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-black text-white">
                        {awardedPlayerDef.name}
                      </span>
                      <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-display text-[10px] font-bold text-sky-300">
                        BATTLE SLOT [{currentIndex + 1}]
                      </span>
                    </div>
                    <div className="font-sinhala text-xs font-semibold text-emerald-300">
                      {awardedPlayerDef.sinhalaName} · {awardedPlayerDef.effectNote}
                    </div>
                  </div>
                </div>

                {/* Animated Energy Stream traveling to Hero */}
                <div className="flex items-center gap-2 rounded-md border border-sky-500/35 bg-sky-950/60 px-2.5 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                  <div className="relative h-2 w-20 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: '-100%' }}
                      transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
                      className="h-full w-10 rounded-full"
                      style={{ backgroundColor: awardedPlayerDef.color }}
                    />
                  </div>
                  <span className="font-display text-[10px] font-black text-sky-300">
                    → HERO
                  </span>
                </div>
              </div>
            )}

            {/* Enemy Power Transfer Warning when Wrong */}
            {awardedMonsterDef && (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-rose-500/50 bg-slate-950/85 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0.4, rotate: 30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
                    style={{ backgroundColor: awardedMonsterDef.color }}
                  >
                    <PowerIcon type={awardedMonsterDef.icon} className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-black text-rose-300">
                        {awardedMonsterDef.name}
                      </span>
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                        {awardedMonsterDef.damage} DMG
                      </span>
                    </div>
                    <div className="font-sinhala text-xs font-semibold text-rose-200">
                      {awardedMonsterDef.sinhalaName} · {awardedMonsterDef.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-md border border-rose-500/45 bg-rose-950/70 px-2.5 py-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <div className="relative h-2 w-20 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
                      className="h-full w-10 rounded-full"
                      style={{ backgroundColor: awardedMonsterDef.color }}
                    />
                  </div>
                  <span className="font-display text-[10px] font-black text-rose-300">
                    → {levelDef.bossName}
                  </span>
                </div>
              </div>
            )}

            <p className="font-sinhala mt-2.5 text-xs sm:text-sm leading-relaxed text-slate-200">
              <strong className="text-amber-300">විද්‍යාත්මක පැහැදිලි කිරීම: </strong>
              {q.explanationSi}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">
                {isFinalQuestion
                  ? `All 4 MCQs complete (${earnedPlayerPowers.length} powers ready) · Launching in ${countdown}s...`
                  : `Next question in ${countdown}s...`}
              </span>
              <button
                onClick={onAdvanceNext}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-black text-white shadow-lg transition ${
                  isFinalQuestion
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-sky-600 hover:bg-sky-500'
                }`}
              >
                {isFinalQuestion && <Swords className="h-3.5 w-3.5" />}
                <span className="font-sinhala">
                  {isFinalQuestion ? 'සටන අරඹන්න (START BATTLE)' : 'ඊළඟ ප්‍රශ්නය'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="h-1" />
    </div>
  );
};
