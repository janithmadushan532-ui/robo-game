import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  Play,
  Settings as SettingsIcon,
  Skull,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import { BOSS_LEVELS } from '../data/levels';
import { getMonsterPowerDef, PLAYER_POWER_LIST } from '../data/powers';
import { GRADE_10_SCIENCE_UNITS } from '../data/scienceUnits';
import { ActiveModal, GraphicsQuality, MonsterCategory, SavedProgress } from '../types/game';
import { PowerIcon } from './PowerIcon';

interface CollectionModalsProps {
  activeModal: ActiveModal;
  progress: SavedProgress;
  onClose: () => void;
  onStartLevel: (level: number) => void;
  onSelectUnit: (unitId: number) => void;
  onUpdateSettings: (patch: Partial<SavedProgress['settings']>) => void;
  onResetProgress: () => void;
}

const CATEGORY_COLORS: Record<MonsterCategory, string> = {
  Giant: 'bg-amber-500/20 text-amber-300',
  Fast: 'bg-cyan-500/20 text-cyan-300',
  Armored: 'bg-slate-500/25 text-slate-200',
  Flying: 'bg-sky-500/20 text-sky-300',
  Fire: 'bg-orange-500/20 text-orange-300',
  Ice: 'bg-blue-500/20 text-blue-300',
  Shadow: 'bg-purple-500/20 text-purple-300',
  Robot: 'bg-emerald-500/20 text-emerald-300',
  Boss: 'bg-rose-600/30 text-rose-300',
};

const SECTOR_BADGE: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11, string> = {
  1: 'bg-sky-500/20 text-sky-300',
  2: 'bg-emerald-500/20 text-emerald-300',
  3: 'bg-purple-500/20 text-purple-300',
  4: 'bg-amber-500/20 text-amber-300',
  5: 'bg-rose-500/25 text-rose-300',
  6: 'bg-cyan-500/25 text-cyan-300',
  7: 'bg-fuchsia-500/25 text-fuchsia-300',
  8: 'bg-orange-500/25 text-orange-300',
  9: 'bg-indigo-500/25 text-indigo-300',
  10: 'bg-teal-500/25 text-teal-300',
  11: 'bg-red-600/30 text-red-200',
};

export const CollectionModals: React.FC<CollectionModalsProps> = ({
  activeModal,
  progress,
  onClose,
  onStartLevel,
  onSelectUnit,
  onUpdateSettings,
  onResetProgress,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [sectorFilter, setSectorFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11>('all');

  if (activeModal === 'none') return null;

  const titles: Record<Exclude<ActiveModal, 'none'>, { title: string; sub: string; icon: React.ReactNode }> = {
    levels: {
      title: `LEVEL SELECTION (SECTORS I–XI · ${BOSS_LEVELS.length} ARENAS)`,
      sub: `Progress across ${BOSS_LEVELS.length} Arenas, Multi-Enemy Challenges, Survival Waves & Multi-Phase Bosses`,
      icon: <Swords className="h-5 w-5 text-sky-400" />,
    },
    powers: {
      title: 'POWER COLLECTION',
      sub: `Answer Pre-Battle Science MCQs correctly to unlock & master all ${PLAYER_POWER_LIST.length} Combat Powers`,
      icon: <Flame className="h-5 w-5 text-amber-400" />,
    },
    monsters: {
      title: 'MONSTER & ROBOT BESTIARY',
      sub: `Giant, Fast, Armored, Flying, Fire, Ice, Shadow, Robot & Boss enemies across ${BOSS_LEVELS.length} Arenas`,
      icon: <Skull className="h-5 w-5 text-rose-400" />,
    },
    units: {
      title: 'GRADE 10 SCIENCE UNITS',
      sub: 'Sri Lankan Grade 10 Syllabus — All MCQs come strictly from your selected Unit',
      icon: <BookOpen className="h-5 w-5 text-emerald-400" />,
    },
    settings: {
      title: 'SETTINGS & GRAPHICS',
      sub: 'Configure Audio, Graphics Quality, Mobile Controls & Save Data',
      icon: <SettingsIcon className="h-5 w-5 text-sky-400" />,
    },
  };

  const meta = titles[activeModal];
  const filteredLevels =
    sectorFilter === 'all' ? BOSS_LEVELS : BOSS_LEVELS.filter((l) => l.sector === sectorFilter);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/84 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-3">
            {meta.icon}
            <div>
              <h2 className="font-display text-lg font-black tracking-wider text-white">
                {meta.title}
              </h2>
              <p className="text-xs text-slate-400">{meta.sub}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setConfirmReset(false);
              onClose();
            }}
            aria-label="Close Modal"
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:border-rose-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sector Filter Tabs (I–V) for Levels & Monsters */}
        {(activeModal === 'levels' || activeModal === 'monsters') && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 bg-slate-900/60 px-5 py-2.5">
            <button
              onClick={() => setSectorFilter('all')}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 'all'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ALL ({BOSS_LEVELS.length})
            </button>
            <button
              onClick={() => setSectorFilter(1)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 1
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S1: TITANS (1–10)
            </button>
            <button
              onClick={() => setSectorFilter(2)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S2: ROBOTS (11–18)
            </button>
            <button
              onClick={() => setSectorFilter(3)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 3
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S3: SHADOWS (19–30)
            </button>
            <button
              onClick={() => setSectorFilter(4)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 4
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S4: SKY MECH (31–40)
            </button>
            <button
              onClick={() => setSectorFilter(5)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 5
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S5: OMEGA (41–50)
            </button>
            <button
              onClick={() => setSectorFilter(6)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 6
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S6: TWINS (51–62)
            </button>
            <button
              onClick={() => setSectorFilter(7)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 7
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S7: TRIAD (63–75)
            </button>
            <button
              onClick={() => setSectorFilter(8)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 8
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S8: BEASTS (76–89)
            </button>
            <button
              onClick={() => setSectorFilter(9)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 9
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S9: GAUNTLET (90–103)
            </button>
            <button
              onClick={() => setSectorFilter(10)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 10
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S10: CATACLYSM (104–117)
            </button>
            <button
              onClick={() => setSectorFilter(11)}
              className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-extrabold transition ${
                sectorFilter === 11
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              S11: APEX FINAL (118–130)
            </button>
          </div>
        )}

        {/* Body */}
        <div className="game-scroll flex-1 overflow-y-auto p-4 sm:p-5">
          {activeModal === 'levels' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredLevels.map((lvl) => {
                const prevBoss = lvl.level > 1 ? BOSS_LEVELS.find((b) => b.level === lvl.level - 1) : null;
                const unlocked =
                  lvl.level === 1 ||
                  lvl.level <= progress.highestUnlockedLevel ||
                  (prevBoss ? progress.defeatedBossIds.includes(prevBoss.id) : false);
                const defeated = progress.defeatedBossIds.includes(lvl.id);
                return (
                  <div
                    key={lvl.id}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                      unlocked
                        ? lvl.isBossLevel
                          ? 'border-rose-500/55 bg-slate-900/95 hover:border-rose-400'
                          : 'border-slate-700 bg-slate-900/95 hover:border-sky-400'
                        : 'border-slate-800/80 bg-slate-950/60 opacity-65'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-display text-xs font-extrabold tracking-widest text-amber-400">
                            LEVEL {lvl.level}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black ${SECTOR_BADGE[lvl.sector]}`}
                          >
                            SECTOR {lvl.sector}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${CATEGORY_COLORS[lvl.monsterCategory]}`}
                          >
                            {lvl.monsterCategory}
                          </span>
                          {lvl.challengeLabel && (
                            <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                              {lvl.challengeLabel}
                            </span>
                          )}
                          {lvl.isBossLevel && (
                            <span className="flex items-center gap-0.5 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                              <Crown className="h-2.5 w-2.5" /> BOSS
                            </span>
                          )}
                        </div>
                        {defeated ? (
                          <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> DEFEATED
                          </span>
                        ) : !unlocked ? (
                          <span className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-400">
                            <Lock className="h-3 w-3" /> LOCKED
                          </span>
                        ) : (
                          <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                            READY
                          </span>
                        )}
                      </div>
                      <h3 className="font-display mt-1 text-lg font-black text-white">
                        {lvl.bossName}
                      </h3>
                      <div className="text-[11px] font-bold text-rose-300">
                        {lvl.robotClass}
                        {lvl.enemies && lvl.enemies.length > 1
                          ? ` (${lvl.enemies.map((e) => e.name).join(' + ')})`
                          : ''}
                      </div>
                      <div className="font-sinhala text-xs font-semibold text-slate-300">
                        {lvl.bossTitleSi} · {lvl.arenaNameSi}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
                        <span>HP: {lvl.maxHp}</span>
                        <span>ATK: {lvl.attackPower}</span>
                        <span>Arena: {lvl.arenaName}</span>
                      </div>
                    </div>

                    <button
                      disabled={!unlocked}
                      onClick={() => onStartLevel(lvl.level)}
                      className={`mt-3 flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-display text-xs font-black transition ${
                        unlocked
                          ? lvl.isBossLevel
                            ? 'bg-rose-600 text-white hover:bg-rose-500'
                            : 'bg-sky-600 text-white hover:bg-sky-500'
                          : 'cursor-not-allowed bg-slate-800 text-slate-500'
                      }`}
                    >
                      {unlocked ? (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>{lvl.isBossLevel ? 'FIGHT BOSS' : 'ENTER ARENA'}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          <span>DEFEAT LEVEL {lvl.level - 1} FIRST</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeModal === 'powers' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLAYER_POWER_LIST.map((pwr) => {
                const isFree = pwr.id === 'hero_surge';
                const owned = isFree || progress.collectedPowers.includes(pwr.id);
                return (
                  <div
                    key={pwr.id}
                    className={`rounded-xl border p-4 ${
                      owned
                        ? 'border-slate-700 bg-slate-900/95'
                        : 'border-slate-800 bg-slate-950/60 opacity-65'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-950 shadow-inner"
                          style={{ backgroundColor: pwr.color }}
                        >
                          <PowerIcon type={pwr.icon} className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-black text-white">
                              {pwr.name}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 font-display text-[10px] font-bold ${
                                isFree
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {pwr.id === 'ultimate' ? '[U]' : isFree ? 'FREE' : 'MCQ'}
                            </span>
                          </div>
                          <div className="font-sinhala text-xs font-semibold text-sky-300">
                            {pwr.sinhalaName}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                          owned
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isFree ? 'ALWAYS READY' : owned ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                    </div>

                    <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                      {pwr.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-2 text-[11px] font-bold">
                      <span className="text-rose-400">DMG: {pwr.damage}</span>
                      <span className="text-amber-400">EN: {pwr.energyCost}</span>
                      <span className="text-sky-400">CD: {pwr.cooldown}s</span>
                      <span className="text-emerald-400">{pwr.effectNote}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeModal === 'monsters' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredLevels.map((boss) => {
                const defeated = progress.defeatedBossIds.includes(boss.id);
                return (
                  <div
                    key={boss.id}
                    className={`rounded-xl border p-4 ${
                      defeated
                        ? 'border-rose-500/40 bg-slate-900/95'
                        : 'border-slate-800 bg-slate-950/65 opacity-85'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-display text-xs font-bold text-amber-400">
                          LV.{boss.level} · {boss.robotClass.toUpperCase()}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${CATEGORY_COLORS[boss.monsterCategory]}`}
                        >
                          {boss.monsterCategory}
                        </span>
                        {boss.challengeLabel && (
                          <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                            {boss.challengeLabel}
                          </span>
                        )}
                      </div>
                      {defeated ? (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
                          DEFEATED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          <Lock className="h-3 w-3" /> UNDEFEATED
                        </span>
                      )}
                    </div>

                    <h3 className="font-display mt-1 text-lg font-black text-white">
                      {boss.bossName}
                    </h3>
                    <div className="font-sinhala text-xs font-bold text-rose-300">
                      {boss.bossTitleSi} · {boss.arenaName}
                    </div>
                    {boss.enemies && boss.enemies.length > 1 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {boss.enemies.map((e, i) => (
                          <span
                            key={`${boss.id}_e_${i}`}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-sky-300"
                          >
                            {e.name} ({e.monsterCategory} · {e.maxHp} HP)
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="font-sinhala mt-2 text-xs leading-relaxed text-slate-300">
                      {boss.loreSi}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                      <span>HP {boss.maxHp}</span>
                      <span>ATK {boss.attackPower}</span>
                      <span>SPD {boss.speed.toFixed(1)}</span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {boss.signaturePowers.map((mp) => {
                        const mDef = getMonsterPowerDef(mp);
                        return (
                          <span
                            key={mp}
                            className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: mDef.color }}
                          >
                            <PowerIcon type={mDef.icon} className="h-3 w-3" />
                            <span>{mDef.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeModal === 'units' && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {GRADE_10_SCIENCE_UNITS.map((u) => {
                const isSelected = progress.selectedUnitId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => onSelectUnit(u.id)}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-950/60'
                        : 'border-slate-800 bg-slate-900/90 hover:border-sky-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded px-2 py-0.5 font-display text-[10px] font-black text-slate-950"
                          style={{ backgroundColor: u.themeColor }}
                        >
                          {u.code}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          {u.englishTitle}
                        </span>
                      </div>
                      <div className="font-sinhala mt-1.5 text-sm font-bold text-white">
                        {u.sinhalaTitle}
                      </div>
                      <div className="font-sinhala mt-1 text-xs text-slate-400">
                        {u.summarySi}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {activeModal === 'settings' && (
            <div className="mx-auto flex max-w-xl flex-col gap-4">
              {/* Sound Effects */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                <div>
                  <div className="font-display text-sm font-bold text-white">SOUND EFFECTS (SFX)</div>
                  <div className="text-xs text-slate-400">Combat hits, powers, and MCQ chimes</div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({ soundEnabled: !progress.settings.soundEnabled })
                  }
                  className={`rounded-lg px-4 py-2 font-display text-xs font-black ${
                    progress.settings.soundEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {progress.settings.soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Background Music */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                <div>
                  <div className="font-display text-sm font-bold text-white">ARENA MUSIC</div>
                  <div className="text-xs text-slate-400">Procedural synth battle soundtrack</div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({ musicEnabled: !progress.settings.musicEnabled })
                  }
                  className={`rounded-lg px-4 py-2 font-display text-xs font-black ${
                    progress.settings.musicEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {progress.settings.musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Graphics Quality */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                <div>
                  <div className="font-display text-sm font-bold text-white">GRAPHICS QUALITY</div>
                  <div className="text-xs text-slate-400">Adjust shadow maps & resolution scaling</div>
                </div>
                <div className="flex gap-1.5">
                  {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => onUpdateSettings({ graphicsQuality: q })}
                      className={`rounded-lg px-3 py-2 font-display text-xs font-black uppercase ${
                        progress.settings.graphicsQuality === q
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Touch Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                <div>
                  <div className="font-display text-sm font-bold text-white">MOBILE TOUCH PAD</div>
                  <div className="text-xs text-slate-400">Virtual joystick & arcade buttons</div>
                </div>
                <div className="flex gap-1.5">
                  {(['auto', 'always', 'off'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => onUpdateSettings({ showTouchControls: m })}
                      className={`rounded-lg px-3 py-2 font-display text-xs font-black uppercase ${
                        progress.settings.showTouchControls === m
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Save Data */}
              <div className="flex items-center justify-between rounded-xl border border-rose-900/60 bg-rose-950/30 p-4">
                <div>
                  <div className="font-display text-sm font-bold text-rose-300">RESET PROGRESS</div>
                  <div className="text-xs text-slate-400">
                    Clear unlocked levels, defeated bosses & collected powers
                  </div>
                </div>
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/60 bg-rose-950 px-3 py-2 font-display text-xs font-bold text-rose-300 hover:bg-rose-900"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>RESET</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onResetProgress();
                        setConfirmReset(false);
                      }}
                      className="rounded-lg bg-rose-600 px-3 py-2 font-display text-xs font-black text-white"
                    >
                      CONFIRM
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="rounded-lg bg-slate-800 px-3 py-2 font-display text-xs font-bold text-slate-300"
                    >
                      CANCEL
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
