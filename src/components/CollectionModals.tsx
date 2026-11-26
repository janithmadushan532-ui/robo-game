import React, { useState } from 'react';
import {
  ArrowUpCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Layers,
  Lock,
  Play,
  Settings as SettingsIcon,
  ShoppingBag,
  Skull,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import { BOSS_LEVELS } from '../data/levels';
import { getUnitMcqs } from '../data/mcqDatabase';
import {
  getMonsterPowerDef,
  getOwnedInventoryPowers,
  getPowerLevel,
  getPowerUpgradeCost,
  getPurchasedPowerStartQuantity,
  MAX_BATTLE_POWER_SLOTS,
  MAX_LOADOUT_SELECTION,
  MAX_POWER_LEVEL,
  PLAYER_POWER_LIST,
  PLAYER_POWERS,
  SHOP_POWER_CATALOG,
  SHOP_POWER_ID_SET,
} from '../data/powers';
import { GRADE_10_SCIENCE_UNITS } from '../data/scienceUnits';
import { ActiveModal, GraphicsQuality, MonsterCategory, PowerId, SavedProgress } from '../types/game';
import { PowerIcon } from './PowerIcon';

interface CollectionModalsProps {
  activeModal: ActiveModal;
  progress: SavedProgress;
  onClose: () => void;
  onSwitchModal: (modal: ActiveModal) => void;
  onStartLevel: (level: number) => void;
  onSelectUnit: (unitId: number) => void;
  onPurchasePower: (powerId: PowerId, price: number) => void;
  onUpgradePower: (powerId: PowerId, cost: number) => void;
  onToggleLoadoutPower: (powerId: PowerId) => void;
  onAutoFillLoadout: () => void;
  onClearLoadout: () => void;
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
  onSwitchModal,
  onStartLevel,
  onSelectUnit,
  onPurchasePower,
  onUpgradePower,
  onToggleLoadoutPower,
  onAutoFillLoadout,
  onClearLoadout,
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
      sub: `Answer Pre-Battle Science MCQs or visit the Power Shop to permanently unlock all ${PLAYER_POWER_LIST.length} Powers`,
      icon: <Flame className="h-5 w-5 text-amber-400" />,
    },
    shop: {
      title: 'POWER SHOP · SPECIAL ARSENAL',
      sub: 'Earn Coins by completing matches — Purchase Special Powers once to permanently unlock them in every future match!',
      icon: <ShoppingBag className="h-5 w-5 text-amber-400" />,
    },
    loadout: {
      title: `PURCHASED POWER LOADOUT (MAX ${MAX_LOADOUT_SELECTION} SLOTS)`,
      sub: `Equip up to ${MAX_LOADOUT_SELECTION} Purchased Shop Powers alongside your 4 MCQ Rewards + Free Surge (${MAX_BATTLE_POWER_SLOTS} slots max). All owned powers stay permanently saved.`,
      icon: <Layers className="h-5 w-5 text-cyan-400" />,
    },
    monsters: {
      title: 'MONSTER & ROBOT BESTIARY',
      sub: `Giant, Fast, Armored, Flying, Fire, Ice, Shadow, Robot & Boss enemies across ${BOSS_LEVELS.length} Arenas`,
      icon: <Skull className="h-5 w-5 text-rose-400" />,
    },
    units: {
      title: 'GRADE 10 SCIENCE UNITS',
      sub: 'Sri Lankan Grade 10 Syllabus — Sequential MCQs come strictly from your selected Unit without repeating until all are used',
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
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/84 p-3 sm:p-6"
      style={{
        paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(12px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(12px, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-5 py-3.5">
          <div className="flex items-center gap-3">
            {meta.icon}
            <div>
              <h2 className="font-display text-lg font-black tracking-wider text-white">
                {meta.title}
              </h2>
              <p className="text-xs text-slate-400">{meta.sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-950/75 px-3 py-1.5 font-display text-xs font-black tabular-nums text-amber-300">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{progress.coins.toLocaleString()}</span>
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

          {activeModal === 'shop' && (
            <div className="flex flex-col gap-4">
              {/* Coin & Unlock Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 p-4">
                <div>
                  <div className="font-display text-xs font-extrabold tracking-wider text-amber-400">
                    PERMANENT SPECIAL POWER UNLOCKS
                  </div>
                  <p className="mt-0.5 text-xs text-slate-300">
                    Purchased powers stay unlocked forever and are automatically available in every future match alongside your 4 MCQ Powers + FREE Surge.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onSwitchModal('loadout')}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-cyan-950/70 px-3 py-1.5 font-display text-[11px] font-black text-cyan-200 transition hover:bg-cyan-900/70"
                  >
                    <Layers className="h-3.5 w-3.5 text-cyan-300" />
                    <span>LOADOUT ({progress.activeLoadout.length}/{MAX_LOADOUT_SELECTION})</span>
                  </button>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-right">
                    <div className="text-[10px] font-bold text-slate-400">UNLOCKED</div>
                    <div className="font-display text-sm font-black tabular-nums text-emerald-400">
                      {progress.purchasedPowers.length} / {SHOP_POWER_CATALOG.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-400/60 bg-slate-950/90 px-3 py-1.5 text-right">
                    <div className="text-[10px] font-bold text-amber-400">YOUR COINS</div>
                    <div className="font-display text-sm font-black tabular-nums text-white">
                      {progress.coins.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shop Power Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SHOP_POWER_CATALOG.map((item) => {
                  const pwr = PLAYER_POWERS[item.powerId];
                  const isOwned = progress.purchasedPowers.includes(item.powerId);
                  const canAfford = progress.coins >= item.price;
                  const pwrLevel = getPowerLevel(progress.powerUpgrades, item.powerId);
                  const upgradeCost = getPowerUpgradeCost(item.powerId, pwrLevel);
                  const canUpgrade = isOwned && pwrLevel < MAX_POWER_LEVEL && progress.coins >= upgradeCost;

                  return (
                    <div
                      key={item.powerId}
                      data-testid={`shop-item-${item.powerId}`}
                      className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                        isOwned
                          ? 'border-emerald-500/55 bg-slate-900/95'
                          : canAfford
                          ? 'border-amber-400/55 bg-slate-900/95 hover:border-amber-300'
                          : 'border-slate-800 bg-slate-950/85'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-950 shadow-lg"
                              style={{ backgroundColor: pwr.color }}
                            >
                              <PowerIcon type={pwr.icon} className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-display text-sm font-black text-white">
                                  {pwr.name}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 font-display text-[9px] font-black ${
                                    item.tier === 'LEGENDARY'
                                      ? 'bg-rose-600/80 text-white'
                                      : item.tier === 'ELITE'
                                      ? 'bg-purple-600/80 text-white'
                                      : 'bg-sky-600/80 text-white'
                                  }`}
                                >
                                  {item.tier}
                                </span>
                              </div>
                              <div className="font-sinhala text-xs font-semibold text-sky-300">
                                {pwr.sinhalaName}
                              </div>
                            </div>
                          </div>

                          {isOwned ? (
                            <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 font-display text-[10px] font-black text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> OWNED Lv.{pwrLevel}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 font-display text-[11px] font-black tabular-nums text-amber-300">
                              <Coins className="h-3 w-3" /> {item.price.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                          {pwr.description}
                        </p>

                        <div className="mt-2.5 flex flex-wrap gap-2 border-t border-slate-800 pt-2 text-[11px] font-bold">
                          <span className="text-rose-400">DMG: {pwr.damage}</span>
                          <span className="text-amber-400">EN: {pwr.energyCost}</span>
                          <span className="text-cyan-300">TIME: {pwr.activeDuration}s</span>
                          <span className="text-sky-400">CD: {pwr.cooldown}s</span>
                          <span className="text-emerald-400">{pwr.effectNote}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        {isOwned ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3 py-2 font-display text-[11px] font-black text-emerald-300">
                              <Check className="h-3.5 w-3.5" />
                              <span>PERMANENTLY UNLOCKED</span>
                            </div>
                            {pwrLevel < MAX_POWER_LEVEL && (
                              <button
                                type="button"
                                disabled={!canUpgrade}
                                onClick={() => onUpgradePower(item.powerId, upgradeCost)}
                                className={`flex items-center gap-1 rounded-lg px-3 py-2 font-display text-[11px] font-black transition ${
                                  canUpgrade
                                    ? 'bg-sky-600 text-white hover:bg-sky-500 active:scale-95'
                                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                                }`}
                              >
                                <ArrowUpCircle className="h-3.5 w-3.5" />
                                <span>UPG ({upgradeCost})</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            data-testid={`buy-power-${item.powerId}`}
                            disabled={!canAfford}
                            onClick={() => onPurchasePower(item.powerId, item.price)}
                            className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-display text-xs font-black transition ${
                              canAfford
                                ? 'bg-amber-500 text-slate-950 shadow-lg hover:bg-amber-400 active:scale-[0.98]'
                                : 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500'
                            }`}
                          >
                            {canAfford ? (
                              <>
                                <ShoppingBag className="h-4 w-4" />
                                <span>PURCHASE PERMANENTLY · {item.price.toLocaleString()} COINS</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5" />
                                <span>NEED {(item.price - progress.coins).toLocaleString()} MORE COINS</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeModal === 'loadout' && (() => {
            const equippedPurchased = progress.activeLoadout.filter((pid) =>
              progress.purchasedPowers.includes(pid),
            );
            const mcqCollected = getOwnedInventoryPowers([], progress.collectedPowers).filter(
              (pid) => !progress.purchasedPowers.includes(pid),
            );
            const isFull = equippedPurchased.length >= MAX_LOADOUT_SELECTION;
            return (
              <div className="flex flex-col gap-4">
                {/* Active Purchased Loadout Preview & Controls */}
                <div className="rounded-xl border border-cyan-500/40 bg-slate-900/95 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-display text-xs font-black tracking-wider text-cyan-300">
                        PURCHASED LOADOUT ({equippedPurchased.length} / {MAX_LOADOUT_SELECTION} EQUIPPED)
                      </div>
                      <p className="mt-0.5 text-xs text-slate-300">
                        Free MCQ Reward Powers (4 slots + Free Surge) appear separately from your Purchased Shop Powers (up to {MAX_LOADOUT_SELECTION} slots, {MAX_BATTLE_POWER_SLOTS} icons total). All {progress.purchasedPowers.length} purchased powers stay saved forever.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onAutoFillLoadout}
                        className="rounded-lg border border-cyan-400/60 bg-cyan-600/90 px-3 py-1.5 font-display text-[11px] font-black text-white transition hover:bg-cyan-500"
                      >
                        AUTO-FILL
                      </button>
                      <button
                        type="button"
                        onClick={onClearLoadout}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-display text-[11px] font-bold text-slate-300 transition hover:bg-slate-700"
                      >
                        CLEAR
                      </button>
                    </div>
                  </div>

                  {/* 5-Slot Purchased Bar Preview */}
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {Array.from({ length: MAX_LOADOUT_SELECTION }).map((_, slotIdx) => {
                      const pid = equippedPurchased[slotIdx];
                      const pwr = pid ? PLAYER_POWERS[pid] : null;
                      const qty = pid ? getPurchasedPowerStartQuantity(progress.powerUpgrades, pid) : 0;
                      return pwr ? (
                        <button
                          key={`loadout_slot_${slotIdx}_${pid}`}
                          type="button"
                          onClick={() => onToggleLoadoutPower(pid!)}
                          title={`Remove ${pwr.name} from Loadout`}
                          className="group relative flex h-14 flex-col items-center justify-center rounded-lg border bg-slate-950 transition hover:border-rose-400"
                          style={{ borderColor: pwr.color }}
                        >
                          <span className="absolute top-0.5 right-1 font-display text-[9px] font-black text-amber-300">
                            ×{qty}
                          </span>
                          <span style={{ color: pwr.color }}>
                            <PowerIcon type={pwr.icon} className="h-5 w-5" />
                          </span>
                          <span className="mt-0.5 font-display text-[8px] font-bold text-slate-300">
                            SHOP #{slotIdx + 1}
                          </span>
                        </button>
                      ) : (
                        <div
                          key={`loadout_empty_${slotIdx}`}
                          className="flex h-14 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/60 text-slate-600"
                        >
                          <span className="font-display text-[9px] font-bold">SHOP #{slotIdx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Purchased Shop Powers Inventory (Always Preserved) */}
                {progress.purchasedPowers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-slate-900/70 p-6 text-center">
                    <ShoppingBag className="h-7 w-7 text-amber-400" />
                    <div className="font-display text-sm font-black text-white">
                      NO PURCHASED POWERS YET
                    </div>
                    <p className="max-w-md text-xs text-slate-300">
                      Visit the Power Shop to permanently unlock Special, Elite, and Legendary powers with coins. They appear in a separate Purchased Bar during battle!
                    </p>
                    <button
                      type="button"
                      onClick={() => onSwitchModal('shop')}
                      className="mt-1 rounded-lg bg-amber-500 px-4 py-2 font-display text-xs font-black text-slate-950 hover:bg-amber-400"
                    >
                      OPEN POWER SHOP
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {progress.purchasedPowers.map((pid) => {
                      const pwr = PLAYER_POWERS[pid];
                      const loadoutIdx = equippedPurchased.indexOf(pid);
                      const isEquipped = loadoutIdx >= 0;
                      const disabledAdd = !isEquipped && isFull;
                      const qty = getPurchasedPowerStartQuantity(progress.powerUpgrades, pid);

                      return (
                        <div
                          key={`inv_${pid}`}
                          data-testid={`loadout-item-${pid}`}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                            isEquipped
                              ? 'border-cyan-400/75 bg-slate-900/95'
                              : 'border-slate-800 bg-slate-950/85'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-950"
                              style={{ backgroundColor: pwr.color }}
                            >
                              <PowerIcon type={pwr.icon} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="truncate font-display text-sm font-black text-white">
                                  {pwr.name}
                                </span>
                                <span className="rounded bg-amber-500/25 px-1.5 py-0.5 font-display text-[9px] font-black text-amber-300">
                                  SHOP · ×{qty}/MATCH
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400">
                                <span className="text-rose-400">DMG {pwr.damage}</span>
                                <span className="text-cyan-300">TIME {pwr.activeDuration}s</span>
                                <span className="text-sky-400">CD {pwr.cooldown}s</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            data-testid={`toggle-loadout-${pid}`}
                            disabled={disabledAdd}
                            onClick={() => onToggleLoadoutPower(pid)}
                            className={`shrink-0 rounded-lg px-3 py-2 font-display text-[11px] font-black transition ${
                              isEquipped
                                ? 'border border-cyan-400/70 bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                                : disabledAdd
                                ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                                : 'border border-slate-600 bg-slate-800 text-white hover:border-cyan-400 hover:bg-slate-700'
                            }`}
                          >
                            {isEquipped ? `EQUIPPED #${loadoutIdx + 1}` : disabledAdd ? `MAX ${MAX_LOADOUT_SELECTION}` : 'EQUIP'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* MCQ-Unlocked Powers Summary (Awarded per Match via Science MCQs) */}
                {mcqCollected.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
                    <div className="font-display text-[11px] font-black tracking-wider text-sky-300">
                      MCQ REWARD COLLECTION ({mcqCollected.length} UNLOCKED · EARNED PER MATCH BY ANSWERING MCQS)
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mcqCollected.map((pid) => {
                        const pwr = PLAYER_POWERS[pid];
                        return (
                          <span
                            key={`mcq_col_${pid}`}
                            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-200"
                          >
                            <span style={{ color: pwr.color }}>
                              <PowerIcon type={pwr.icon} className="h-3 w-3" />
                            </span>
                            <span>{pwr.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeModal === 'powers' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLAYER_POWER_LIST.map((pwr) => {
                const isFree = pwr.id === 'hero_surge';
                const isShopItem = SHOP_POWER_ID_SET.has(pwr.id);
                const isPurchased = progress.purchasedPowers.includes(pwr.id);
                const owned = isFree || isPurchased || progress.collectedPowers.includes(pwr.id);
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
                                  : isShopItem
                                  ? 'bg-purple-600/80 text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {pwr.id === 'ultimate'
                                ? '[U]'
                                : isFree
                                ? 'FREE'
                                : isShopItem
                                ? 'SHOP'
                                : 'MCQ'}
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
                        {isFree
                          ? 'ALWAYS READY'
                          : isPurchased
                          ? 'PERMANENT'
                          : owned
                          ? 'UNLOCKED'
                          : isShopItem
                          ? 'SHOP LOCKED'
                          : 'LOCKED'}
                      </span>
                    </div>

                    <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                      {pwr.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800 pt-2 text-[11px] font-bold">
                      <span className="text-rose-400">DMG: {pwr.damage}</span>
                      <span className="text-amber-400">EN: {pwr.energyCost}</span>
                      <span className="text-cyan-300">TIME: {pwr.activeDuration}s</span>
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
                const unitTotal = getUnitMcqs(u.id).length;
                const unitCursor = progress.unitQuestionCursors[u.id] ?? 0;
                const nextNum = unitTotal > 0 ? (unitCursor % unitTotal) + 1 : 1;
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
                      <div className="flex flex-wrap items-center gap-2">
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
                      <div className="mt-1.5 font-display text-[10px] font-bold tabular-nums text-sky-400">
                        MCQ PROGRESS: NEXT Q{nextNum} / {unitTotal}
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
