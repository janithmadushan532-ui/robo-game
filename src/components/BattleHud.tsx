import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Clock,
  Gauge,
  Lock,
  Pause,
  Shield,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  getMonsterPowerDef,
  MAX_BATTLE_POWER_SLOTS,
  PLAYER_POWERS,
} from '../data/powers';
import {
  BattleHudSnapshot,
  BossLevelDef,
  MonsterPowerId,
  PowerIconType,
  PowerId,
} from '../types/game';
import { PowerIcon } from './PowerIcon';

interface BattleHudProps {
  hud: BattleHudSnapshot;
  levelDef: BossLevelDef;
  matchSlotPowers: (PowerId | null)[];
  purchasedPowers: PowerId[];
  bossBonusPowers: MonsterPowerId[];
  soundEnabled: boolean;
  showTouchMode: 'auto' | 'always' | 'off';
  onToggleSound: () => void;
  onPause: () => void;
  onJoystickMove: (x: number, y: number) => void;
  onAction: (action: 'attack' | 'normal' | 'kick' | 'heavy' | 'jump' | 'dodge') => void;
  onBlockHold: (held: boolean) => void;
  onUsePower: (powerId: PowerId) => void;
}

const FREE_POWER_ID: PowerId = 'hero_surge';

export const BattleHud: React.FC<BattleHudProps> = ({
  hud,
  levelDef,
  matchSlotPowers,
  purchasedPowers,
  bossBonusPowers,
  soundEnabled,
  showTouchMode,
  onToggleSound,
  onPause,
  onJoystickMove,
  onAction,
  onBlockHold,
  onUsePower,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [tapTooltip, setTapTooltip] = useState<{
    name: string;
    color: string;
    icon: PowerIconType;
    detail: string;
  } | null>(null);
  const [rechargedMap, setRechargedMap] = useState<Partial<Record<PowerId, number>>>({});
  const tooltipTimerRef = useRef<number | null>(null);
  const prevCooldownsRef = useRef<Partial<Record<PowerId, number>>>({});
  const rechargeClearTimersRef = useRef<Partial<Record<PowerId, number>>>({});
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  const joyActivePointer = useRef<number | null>(null);
  const onJoystickMoveRef = useRef(onJoystickMove);
  onJoystickMoveRef.current = onJoystickMove;

  const showBriefTooltip = (
    name: string,
    color: string,
    icon: PowerIconType,
    detail: string,
  ) => {
    if (tooltipTimerRef.current !== null) {
      window.clearTimeout(tooltipTimerRef.current);
    }
    setTapTooltip({ name, color, icon, detail });
    tooltipTimerRef.current = window.setTimeout(() => {
      setTapTooltip(null);
      tooltipTimerRef.current = null;
    }, 1200);
  };

  useEffect(() => {
    const prev = prevCooldownsRef.current;
    const newlyRecharged: PowerId[] = [];
    for (const pid of Object.keys(hud.powerCooldowns) as PowerId[]) {
      const wasCd = prev[pid] ?? 0;
      const nowCd = hud.powerCooldowns[pid] ?? 0;
      const nowActive = hud.powerActiveTimers[pid] ?? 0;
      if (wasCd > 0 && nowCd <= 0 && nowActive <= 0) {
        newlyRecharged.push(pid);
      }
      prev[pid] = nowCd;
    }

    if (newlyRecharged.length > 0) {
      const stamp = Date.now();
      setRechargedMap((cur) => {
        const next = { ...cur };
        for (const pid of newlyRecharged) next[pid] = stamp;
        return next;
      });
      for (const pid of newlyRecharged) {
        const existingTimer = rechargeClearTimersRef.current[pid];
        if (existingTimer !== undefined) {
          window.clearTimeout(existingTimer);
        }
        rechargeClearTimersRef.current[pid] = window.setTimeout(() => {
          setRechargedMap((cur) => {
            if (!cur[pid]) return cur;
            const next = { ...cur };
            delete next[pid];
            return next;
          });
          delete rechargeClearTimersRef.current[pid];
        }, 700);
      }
    }
  }, [hud.powerCooldowns, hud.powerActiveTimers]);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current !== null) {
        window.clearTimeout(tooltipTimerRef.current);
      }
      for (const t of Object.values(rechargeClearTimersRef.current)) {
        if (t !== undefined) window.clearTimeout(t);
      }
    };
  }, []);

  useEffect(() => {
    const coarse =
      window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
    setIsTouchDevice(Boolean(coarse));
  }, []);

  // Multi-touch safety: release joystick cleanly if pointer ends anywhere on window or HUD unmounts
  useEffect(() => {
    const handleWindowPointerEnd = (e: PointerEvent) => {
      if (joyActivePointer.current !== null && joyActivePointer.current === e.pointerId) {
        joyActivePointer.current = null;
        if (joyKnobRef.current) {
          joyKnobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
        }
        onJoystickMoveRef.current(0, 0);
      }
    };

    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
      joyActivePointer.current = null;
      onJoystickMoveRef.current(0, 0);
    };
  }, []);

  const renderTouchControls =
    showTouchMode === 'always' || (showTouchMode === 'auto' && isTouchDevice);

  const playerHpPct = Math.max(0, Math.min(100, (hud.playerHp / hud.playerMaxHp) * 100));
  const bossHpPct = Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100));
  const energyPct = Math.max(
    0,
    Math.min(100, (hud.playerEnergy / hud.playerMaxEnergy) * 100),
  );

  const setKnobVisual = (dx: number, dy: number) => {
    if (joyKnobRef.current) {
      joyKnobRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = joyBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(24, rect.width * 0.38);
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobVisual(dx, dy);

    const normX = dx / maxR;
    const normY = dy / maxR;
    const mag = Math.hypot(normX, normY);
    if (mag < 0.06) {
      onJoystickMoveRef.current(0, 0);
      return;
    }
    const boostedMag = Math.min(1, mag * 1.18);
    const scale = boostedMag / mag;
    onJoystickMoveRef.current(normX * scale, normY * scale);
  };

  const resetJoystick = (pointerId?: number) => {
    if (
      pointerId !== undefined &&
      joyActivePointer.current !== null &&
      joyActivePointer.current !== pointerId
    ) {
      return;
    }
    joyActivePointer.current = null;
    setKnobVisual(0, 0);
    onJoystickMoveRef.current(0, 0);
  };

  // Strict 10-slot cap: 4 MCQ Slots + 1 FREE Power 5 + up to 5 equipped Loadout/Shop Powers
  const mcqSlots: (PowerId | null)[] = [
    matchSlotPowers[0] ?? null,
    matchSlotPowers[1] ?? null,
    matchSlotPowers[2] ?? null,
    matchSlotPowers[3] ?? null,
  ];
  const maxExtraSlots = Math.max(0, MAX_BATTLE_POWER_SLOTS - 5);
  const extraPowers = purchasedPowers.slice(0, maxExtraSlots);
  const freeDef = PLAYER_POWERS[FREE_POWER_ID];
  const freeActive = hud.powerActiveTimers[FREE_POWER_ID] ?? 0;
  const freeCd = hud.powerCooldowns[FREE_POWER_ID] ?? 0;
  const freeReady = freeActive <= 0 && freeCd <= 0;

  const handlePowerTap = (pid: PowerId, isTouch: boolean) => {
    const def = PLAYER_POWERS[pid];
    const active = hud.powerActiveTimers[pid] ?? 0;
    const cd = hud.powerCooldowns[pid] ?? 0;
    const qty = hud.powerQuantities?.[pid] ?? 0;
    const isFree = pid === FREE_POWER_ID;
    const isUlt = pid === 'ultimate';
    const hasEnergy = isFree || isUlt || hud.playerEnergy >= def.energyCost;

    if (active > 0) {
      showBriefTooltip(def.name, def.color, def.icon, `${active.toFixed(1)}s`);
      return;
    }
    if (!isFree && !isUlt && qty <= 0) {
      showBriefTooltip(def.name, def.color, def.icon, '0 LEFT');
      return;
    }
    if (cd > 0) {
      showBriefTooltip(def.name, def.color, def.icon, `${cd.toFixed(1)}s`);
      return;
    }
    if (!hasEnergy) {
      showBriefTooltip(def.name, def.color, def.icon, `${def.energyCost} EN`);
      return;
    }
    if (isUlt && hud.playerUltimateCharge < 100) return;

    if (isTouch) {
      showBriefTooltip(def.name, def.color, def.icon, `${def.activeDuration}s`);
    }
    onUsePower(pid);
  };

  const renderIconPowerSlot = (
    pid: PowerId,
    opts: {
      key: string;
      testId?: string;
      isFree?: boolean;
      isPurchased?: boolean;
      sizeClass: string;
      iconClass: string;
      isTouch: boolean;
    },
  ) => {
    const def = PLAYER_POWERS[pid];
    const active = hud.powerActiveTimers[pid] ?? 0;
    const cd = hud.powerCooldowns[pid] ?? 0;
    const qty = hud.powerQuantities?.[pid] ?? 0;
    const hasEnergy = opts.isFree || hud.playerEnergy >= def.energyCost;
    const isActive = active > 0;
    const isCooling = !isActive && cd > 0;
    const isDepleted = !opts.isFree && qty <= 0 && !isActive && !isCooling;
    const ready = !isActive && !isCooling && !isDepleted && hasEnergy;
    const justRecharged = Boolean(rechargedMap[pid]);

    const activeTotal = Math.max(0.5, def.activeDuration);
    const activePct = Math.max(0, Math.min(100, (active / activeTotal) * 100));
    const cdPct = Math.max(0, Math.min(100, (cd / Math.max(0.5, def.cooldown)) * 100));
    const rechargePct = Math.max(0, Math.min(100, 100 - cdPct));

    return (
      <button
        key={opts.key}
        type="button"
        data-testid={opts.testId}
        aria-label={def.name}
        title={`${def.name} (${opts.isFree ? 'FREE' : `x${qty}`} · ${def.activeDuration}s / ${def.cooldown}s CD)`}
        aria-disabled={!ready}
        style={{
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'none',
          ...(isActive
            ? { borderColor: def.color, boxShadow: `0 0 14px ${def.color}99` }
            : ready && !opts.isFree
            ? { borderColor: def.color, boxShadow: `0 0 12px ${def.color}66` }
            : undefined),
        }}
        onPointerDown={
          opts.isTouch
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePowerTap(pid, true);
              }
            : undefined
        }
        onClick={opts.isTouch ? undefined : () => handlePowerTap(pid, false)}
        className={`relative flex touch-none select-none items-center justify-center overflow-hidden rounded-lg transition-transform ${opts.sizeClass} ${
          justRecharged ? 'animate-power-recharged' : ''
        } ${
          isActive
            ? 'border-2 bg-slate-900 text-white'
            : ready
            ? opts.isFree
              ? 'border-2 border-amber-400 bg-gradient-to-b from-amber-950/90 to-slate-900 text-white shadow-[0_0_12px_rgba(251,191,36,0.45)] active:scale-95'
              : 'border-2 bg-slate-900 text-white active:scale-95'
            : 'border border-slate-800 bg-slate-950/95 text-slate-500'
        }`}
      >
        {/* Active Duration Depletion Bar */}
        {isActive && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 opacity-35 transition-[height] duration-75 ease-linear"
            style={{ height: `${activePct}%`, backgroundColor: def.color }}
          />
        )}

        {/* Smooth Rising Automatic Recharge Progress Bar (0% -> 100%) */}
        {isCooling && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-slate-950/65" />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-100 ease-linear"
              style={{
                height: `${rechargePct}%`,
                backgroundColor: `${def.color}38`,
                borderTop: `2px solid ${def.color}`,
              }}
            />
          </>
        )}

        {/* Ready Subtle Shimmer / Status Dot */}
        {ready && (
          <span
            className="pointer-events-none absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-full shadow-sm"
            style={{ backgroundColor: def.color, boxShadow: `0 0 6px ${def.color}` }}
          />
        )}

        {/* Power Icon Only */}
        <span
          className={`relative transition-opacity duration-150 ${
            isDepleted
              ? 'opacity-25'
              : isCooling
              ? 'opacity-45'
              : !hasEnergy && !isActive
              ? 'opacity-45'
              : 'opacity-100'
          }`}
          style={{ color: isActive || ready || isCooling ? def.color : undefined }}
        >
          <PowerIcon type={def.icon} className={opts.iconClass} />
        </span>

        {/* Quantity Badge (Top-Right): Clear remaining count or ∞ for Free Surge */}
        <span
          data-testid={opts.testId ? `${opts.testId}-qty` : undefined}
          className={`pointer-events-none absolute top-0.5 right-0.5 rounded px-1 font-display text-[8px] font-black leading-tight tabular-nums ${
            opts.isFree
              ? 'bg-amber-400/95 text-slate-950'
              : qty > 0
              ? opts.isPurchased
                ? 'bg-amber-950/95 text-amber-300 ring-1 ring-amber-400/50'
                : 'bg-sky-950/95 text-sky-200 ring-1 ring-sky-400/45'
              : 'bg-rose-950/90 text-rose-300'
          }`}
        >
          {opts.isFree ? '∞' : `×${qty}`}
        </span>

        {/* Countdown Timer Overlay (Active Time Limit or Automatic Recharge Cooldown) */}
        {(isActive || isCooling) && (
          <span
            data-testid={opts.testId ? `${opts.testId}-timer` : undefined}
            className={`pointer-events-none absolute inset-x-0.5 bottom-0.5 rounded px-0.5 text-center font-display text-[9px] font-black leading-tight tabular-nums ${
              isActive
                ? 'bg-slate-950/85 text-white'
                : 'bg-slate-950/90 text-amber-300'
            }`}
          >
            {(isActive ? active : cd).toFixed(1)}s
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 flex flex-col justify-between"
      style={{
        paddingTop: 'max(6px, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(8px, calc(env(safe-area-inset-bottom, 0px) + 6px))',
        paddingLeft: 'max(6px, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(6px, env(safe-area-inset-right, 0px))',
      }}
    >
      {/* TOP FIGHTING HEALTH BARS (Compact on mobile landscape so 3D arena stays wide open) */}
      <div className="flex flex-col gap-1 sm:gap-1.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-1.5 sm:gap-3.5">
          {/* Player Health & Energy Cluster */}
          <div className="rounded-lg border border-sky-500/40 bg-slate-950/90 px-2 py-1 shadow-lg sm:px-3 sm:py-1.5">
            <div className="mb-0.5 flex items-center justify-between text-[10px] font-bold sm:text-xs">
              <span className="font-display tracking-wider text-sky-300">SCIENCE PALADIN</span>
              <span className="font-display tabular-nums text-white">
                {hud.playerHp} / {hud.playerMaxHp}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-800 sm:h-2.5">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-100"
                style={{ width: `${playerHpPct}%` }}
              />
            </div>

            <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-75"
                  style={{ width: `${energyPct}%` }}
                />
              </div>
              <span className="font-display text-[9px] font-bold tabular-nums text-amber-300 sm:text-[10px]">
                EN {hud.playerEnergy}
              </span>
              <span className="font-display text-[9px] font-bold tabular-nums text-rose-400 sm:text-[10px]">
                ULT {hud.playerUltimateCharge}%
              </span>
            </div>

            {(hud.playerShieldActive ||
              hud.playerSpeedBoostActive ||
              hud.playerRageActive ||
              hud.timeSlowActive) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-bold tabular-nums sm:text-[10px]">
                {hud.playerShieldActive && (
                  <span className="flex items-center gap-0.5 text-sky-300">
                    <Shield className="h-3 w-3" />
                    {hud.playerShieldRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.playerSpeedBoostActive && (
                  <span className="flex items-center gap-0.5 text-cyan-300">
                    <Gauge className="h-3 w-3" />
                    {hud.playerSpeedBoostRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.playerRageActive && (
                  <span className="flex items-center gap-0.5 text-rose-400">
                    <Swords className="h-3 w-3" />
                    {hud.playerRageRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.timeSlowActive && (
                  <span className="flex items-center gap-0.5 text-teal-300">
                    <Clock className="h-3 w-3" />
                    {hud.timeSlowRemaining.toFixed(1)}s
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Center Round Timer + Pause/Mute */}
          <div className="pointer-events-auto flex flex-col items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-950/92 px-2 py-1 sm:px-3 sm:py-1.5">
            <div className="text-[9px] font-bold tracking-widest text-amber-400 sm:text-[10px]">
              LV.{levelDef.level} · S{levelDef.sector}
              {levelDef.isBossLevel ? ' · BOSS' : ''}
            </div>
            {hud.survivalTotalWaves > 1 && (
              <div className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-display text-[8px] font-black tracking-wider text-emerald-300 sm:text-[9px]">
                WAVE {hud.survivalWave} / {hud.survivalTotalWaves}
              </div>
            )}
            <div className="font-display text-xs font-black tabular-nums text-white sm:text-sm">
              {Math.floor(hud.battleTime)}s
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleSound}
                aria-label="Toggle Sound"
                className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                )}
              </button>
              <button
                type="button"
                onClick={onPause}
                aria-label="Pause Game"
                className="rounded bg-slate-800 p-1 text-slate-200 hover:bg-slate-700"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Boss / Enemy Squad Health & Earned Monster Powers */}
          <div className="rounded-lg border border-rose-500/45 bg-slate-950/90 px-2 py-1 shadow-lg sm:px-3 sm:py-1.5">
            {hud.enemies.length > 1 ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9px] font-extrabold text-rose-300 sm:text-[10px]">
                  <span className="font-display tracking-wider">
                    {hud.enemies.filter((e) => e.alive).length} / {hud.enemies.length} ACTIVE
                  </span>
                  <span className="font-display tabular-nums text-white">
                    {hud.bossHp} / {hud.bossMaxHp}
                  </span>
                </div>
                <div
                  className={
                    hud.enemies.length >= 4
                      ? 'grid grid-cols-2 gap-x-2 gap-y-1'
                      : 'flex flex-col gap-1'
                  }
                >
                  {hud.enemies.map((e) => {
                    const pct = Math.max(0, Math.min(100, (e.hp / Math.max(1, e.maxHp)) * 100));
                    return (
                      <div key={e.id} className={e.alive ? '' : 'opacity-45'}>
                        <div className="mb-0.5 flex items-center justify-between gap-1 text-[9px] font-bold sm:text-[10px]">
                          <span className="font-display shrink-0 tabular-nums text-slate-200">
                            {e.alive ? `${e.hp}/${e.maxHp}` : 'KO'}
                          </span>
                          <div className="flex items-center gap-1 truncate">
                            {e.maxPhases && e.maxPhases > 1 && e.alive && (
                              <span className="rounded bg-rose-600 px-1 text-[8px] font-black text-white">
                                P{e.phase ?? 1}
                              </span>
                            )}
                            {e.shieldActive && (
                              <span className="rounded bg-sky-500 px-1 text-[8px] font-black text-slate-950">
                                SHD
                              </span>
                            )}
                            {e.stunned && (
                              <span className="rounded bg-amber-400 px-1 text-[8px] font-black text-slate-950">
                                STN
                              </span>
                            )}
                            {e.slowed && (
                              <span className="rounded bg-cyan-400 px-1 text-[8px] font-black text-slate-950">
                                ICE
                              </span>
                            )}
                            <span className="font-display truncate text-rose-300">{e.name}</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-sm bg-slate-800 sm:h-2">
                          <div
                            className={`ml-auto h-full transition-[width] duration-100 ${
                              e.alive
                                ? 'bg-gradient-to-l from-rose-600 to-orange-500'
                                : 'bg-slate-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-0.5 flex items-center justify-between gap-1.5 text-[10px] font-bold sm:text-xs">
                  <span className="font-display tabular-nums text-white">
                    {hud.bossHp} / {hud.bossMaxHp}
                  </span>
                  <div className="flex items-center gap-1 truncate">
                    {hud.enemies[0]?.maxPhases && hud.enemies[0].maxPhases > 1 && (
                      <span className="rounded bg-rose-600 px-1 py-0.5 font-display text-[8px] font-black text-white sm:px-1.5 sm:text-[9px]">
                        P{hud.enemies[0].phase ?? 1}/{hud.enemies[0].maxPhases}
                      </span>
                    )}
                    <span className="font-display truncate tracking-wider text-rose-400">
                      {levelDef.bossName}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-800 sm:h-2.5">
                  <div
                    className="ml-auto h-full bg-gradient-to-l from-rose-600 to-orange-500 transition-[width] duration-100"
                    style={{ width: `${bossHpPct}%` }}
                  />
                </div>

                {(hud.bossShieldActive || hud.bossStunned || hud.bossSlowed) && (
                  <div className="mt-1 flex flex-wrap items-center justify-end gap-1">
                    {hud.bossShieldActive && (
                      <span className="rounded bg-sky-500 px-1 py-0.5 text-[9px] font-extrabold text-slate-950">
                        SHIELD
                      </span>
                    )}
                    {hud.bossStunned && (
                      <span className="rounded bg-amber-500 px-1 py-0.5 text-[9px] font-extrabold text-slate-950">
                        STUNNED
                      </span>
                    )}
                    {hud.bossSlowed && (
                      <span className="rounded bg-cyan-400 px-1 py-0.5 text-[9px] font-extrabold text-slate-950">
                        SLOWED
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {bossBonusPowers.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center justify-end gap-1">
                {bossBonusPowers.map((mp, idx) => {
                  const mDef = getMonsterPowerDef(mp);
                  return (
                    <span
                      key={`${mp}_${idx}`}
                      title={mDef.name}
                      className="flex h-4 w-4 items-center justify-center rounded text-white"
                      style={{ backgroundColor: mDef.color }}
                    >
                      <PowerIcon type={mDef.icon} className="h-2.5 w-2.5" />
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Boss Telegraph Warning & Combo / Damage Callout */}
        <div className="flex items-center justify-between px-1">
          <div>
            {hud.comboCount >= 2 && (
              <div className="rounded-md border border-amber-400/60 bg-slate-950/90 px-2 py-0.5 font-display text-[11px] font-black text-amber-400 sm:px-2.5 sm:py-1 sm:text-xs">
                {hud.comboCount} HIT COMBO!
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hud.bossTelegraphLabel && (
              <div className="rounded-md border border-rose-400 bg-rose-950/95 px-2.5 py-0.5 font-display text-[10px] font-black tracking-wider text-rose-200 shadow-lg sm:px-3 sm:py-1 sm:text-xs">
                {hud.bossTelegraphLabel} — DODGE!
              </div>
            )}
            {hud.phaseBanner && (
              <div className="rounded-md border border-amber-400 bg-amber-950/95 px-2.5 py-0.5 font-display text-[10px] font-black tracking-wider text-amber-200 shadow-lg sm:px-3 sm:py-1 sm:text-xs">
                {hud.phaseBanner}
              </div>
            )}
          </div>

          <div>
            {hud.lastDamageEvent && (
              <div
                key={hud.lastDamageEvent.id}
                className={`rounded-md border px-2 py-0.5 font-display text-[11px] font-black tabular-nums sm:px-2.5 sm:py-1 sm:text-xs ${
                  hud.lastDamageEvent.isHeal
                    ? 'border-emerald-400/80 bg-emerald-950/90 text-emerald-300'
                    : hud.lastDamageEvent.target === 'boss'
                    ? 'border-sky-400/70 bg-slate-950/90 text-sky-300'
                    : 'border-rose-400/70 bg-slate-950/90 text-rose-300'
                }`}
              >
                {hud.lastDamageEvent.isHeal
                  ? `+${hud.lastDamageEvent.amount} HP`
                  : hud.lastDamageEvent.blocked
                  ? `BLOCKED -${hud.lastDamageEvent.amount}`
                  : hud.lastDamageEvent.isCrit
                  ? `CRIT! -${hud.lastDamageEvent.amount}`
                  : `-${hud.lastDamageEvent.amount}`}
                {hud.lastDamageEvent.label ? ` · ${hud.lastDamageEvent.label}` : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION DOCK */}
      <div className="flex flex-col gap-1">
        {/* Brief transient tooltip when tapping a power icon (auto-hides after 1.2s; never permanently visible) */}
        {tapTooltip && (
          <div className="pointer-events-none flex justify-center">
            <div
              className="flex items-center gap-1.5 rounded-lg border bg-slate-950/92 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg"
              style={{ borderColor: tapTooltip.color }}
            >
              <span style={{ color: tapTooltip.color }}>
                <PowerIcon type={tapTooltip.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="font-display">{tapTooltip.name}</span>
              <span className="font-display tabular-nums text-amber-300">
                {tapTooltip.detail}
              </span>
            </div>
          </div>
        )}

        {renderTouchControls ? (
          /* MOBILE LANDSCAPE ERGONOMIC LAYOUT (Original Controls & Proportions + Lowered Power Bar):
             Left: Responsive Large Virtual Joystick
             Bottom-Center (Lower Section, Icon-Only, Max 10 Slots): 4 MCQ + 1 FREE Power 5 + Equipped Loadout Powers
             Right (Thumb Arc): JUMP + DODGE + Large ATTACK + Ultimate Icon when 100% */
          <div className="flex items-end justify-between gap-1.5">
            {/* Left: Responsive Virtual Joystick */}
            <div className="flex shrink-0 flex-col items-center pb-1 pl-1 sm:pl-2">
              <div
                ref={joyBaseRef}
                data-testid="mobile-joystick"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    // Ignore synthetic pointer capture rejection
                  }
                  joyActivePointer.current = e.pointerId;
                  updateJoystick(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (joyActivePointer.current === e.pointerId) {
                    e.preventDefault();
                    updateJoystick(e.clientX, e.clientY);
                  }
                }}
                onPointerUp={(e) => resetJoystick(e.pointerId)}
                onPointerCancel={(e) => resetJoystick(e.pointerId)}
                onLostPointerCapture={(e) => resetJoystick(e.pointerId)}
                className="pointer-events-auto relative h-28 w-28 touch-none select-none rounded-full border-2 border-sky-400/70 bg-slate-950/80 shadow-[0_0_24px_rgba(56,189,248,0.22)] sm:h-32 sm:w-32"
              >
                {/* Directional Crosshairs */}
                <div className="pointer-events-none absolute inset-3.5 rounded-full border border-sky-400/25" />
                <div className="pointer-events-none absolute top-2 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-sky-400/50" />
                <div className="pointer-events-none absolute bottom-2 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-sky-400/50" />
                <div className="pointer-events-none absolute top-1/2 left-2 h-0.5 w-2 -translate-y-1/2 bg-sky-400/50" />
                <div className="pointer-events-none absolute top-1/2 right-2 h-0.5 w-2 -translate-y-1/2 bg-sky-400/50" />

                {/* Hardware-accelerated Thumb Knob */}
                <div
                  ref={joyKnobRef}
                  className="pointer-events-none absolute top-1/2 left-1/2 -ml-[24px] -mt-[24px] flex h-[48px] w-[48px] items-center justify-center rounded-full border-2 border-sky-200 bg-sky-500/90 shadow-lg"
                >
                  <div className="h-3.5 w-3.5 rounded-full bg-white/45" />
                </div>
              </div>
            </div>

            {/* Bottom-Center (Free MCQ Reward Bar & Separate Purchased Shop Power Bar, Max 10 Slots) */}
            <div className="pointer-events-auto flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5 px-0.5 pb-0.5 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-center">
              <div
                data-testid="mobile-power-panel"
                aria-label="Free MCQ Reward Powers"
                className="flex items-center justify-center gap-1 rounded-xl border border-sky-500/45 bg-slate-950/94 p-1 shadow-2xl sm:gap-1.5 sm:p-1.5"
              >
                {/* Slots 1-4: Pre-Battle MCQ Earned Powers (Icons + Quantity Only) */}
                {mcqSlots.map((pid, idx) => {
                  if (!pid) {
                    return (
                      <div
                        key={`mcq_empty_${idx}`}
                        data-testid={`power-slot-${idx + 1}`}
                        aria-label={`Locked Slot ${idx + 1}`}
                        className="flex h-11 w-11 select-none items-center justify-center rounded-lg border border-slate-800/90 bg-slate-950/90 text-slate-600 sm:h-12 sm:w-12"
                      >
                        <Lock className="h-4 w-4" />
                      </div>
                    );
                  }
                  return renderIconPowerSlot(pid, {
                    key: `${pid}_${idx}`,
                    testId: `power-slot-${idx + 1}`,
                    sizeClass: 'h-11 w-11 sm:h-12 sm:w-12',
                    iconClass: 'h-5 w-5 sm:h-5.5 sm:w-5.5',
                    isTouch: true,
                  });
                })}

                {/* Slot 5: Dedicated FREE Power with Active Time Limit + Reload System */}
                {renderIconPowerSlot(FREE_POWER_ID, {
                  key: 'slot_free_mobile',
                  testId: 'power-slot-free',
                  isFree: true,
                  sizeClass: 'h-11 w-11 sm:h-12 sm:w-12',
                  iconClass: 'h-5 w-5 sm:h-5.5 sm:w-5.5',
                  isTouch: true,
                })}
              </div>

              {extraPowers.length > 0 && (
                <div
                  data-testid="mobile-shop-powers"
                  aria-label="Purchased Shop Powers"
                  className="flex items-center justify-center gap-1 rounded-xl border border-amber-400/70 bg-amber-950/35 p-1 shadow-xl sm:gap-1.5 sm:p-1.5"
                >
                  {extraPowers.map((pid, idx) =>
                    renderIconPowerSlot(pid, {
                      key: `extra_mob_${pid}_${idx}`,
                      testId: `power-slot-extra-${idx + 1}`,
                      isPurchased: true,
                      sizeClass: 'h-9 w-9 sm:h-10 sm:w-10',
                      iconClass: 'h-4 w-4 sm:h-4.5 sm:w-4.5',
                      isTouch: true,
                    }),
                  )}
                </div>
              )}
            </div>

            {/* Right: Ergonomic Thumb Cluster with JUMP directly ABOVE ATTACK, and DODGE + ULTIMATE beside */}
            <div className="pointer-events-auto mr-1 mb-1.5 flex shrink-0 items-end gap-2 sm:mr-2.5 sm:mb-3 sm:gap-3">
              {/* Left of Attack Column: Ultimate (when ready) + Dodge */}
              <div className="flex flex-col items-end gap-2 pb-1">
                {(hud.playerUltimateCharge >= 100 ||
                  (hud.powerActiveTimers.ultimate ?? 0) > 0 ||
                  (hud.powerCooldowns.ultimate ?? 0) > 0) && (
                  <button
                    type="button"
                    data-testid="mobile-ult-btn"
                    aria-label="Ultimate Power"
                    style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
                    disabled={
                      hud.playerUltimateCharge < 100 ||
                      (hud.powerActiveTimers.ultimate ?? 0) > 0 ||
                      (hud.powerCooldowns.ultimate ?? 0) > 0
                    }
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePowerTap('ultimate', true);
                    }}
                    className={`relative flex h-11 w-11 touch-none select-none items-center justify-center overflow-hidden rounded-full border-2 text-white active:scale-90 sm:h-12 sm:w-12 ${
                      (hud.powerActiveTimers.ultimate ?? 0) > 0
                        ? 'border-rose-300 bg-rose-700 shadow-[0_0_18px_rgba(244,63,94,0.8)]'
                        : hud.playerUltimateCharge >= 100 && (hud.powerCooldowns.ultimate ?? 0) <= 0
                        ? 'border-rose-300 bg-rose-600 shadow-[0_0_16px_rgba(244,63,94,0.6)]'
                        : 'border-slate-700 bg-slate-900/90 text-slate-400'
                    }`}
                  >
                    <Sparkles className="h-5 w-5" />
                    {((hud.powerActiveTimers.ultimate ?? 0) > 0 ||
                      (hud.powerCooldowns.ultimate ?? 0) > 0) && (
                      <span className="pointer-events-none absolute bottom-0.5 rounded bg-slate-950/85 px-1 font-display text-[8px] font-black tabular-nums text-white">
                        {(
                          (hud.powerActiveTimers.ultimate ?? 0) > 0
                            ? hud.powerActiveTimers.ultimate
                            : hud.powerCooldowns.ultimate
                        ).toFixed(1)}
                        s
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  data-testid="mobile-dodge-btn"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAction('dodge');
                  }}
                  className="flex h-12 w-12 touch-none select-none flex-col items-center justify-center rounded-full border-2 border-cyan-300/90 bg-cyan-950/95 font-display text-[9px] font-black tracking-wider text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.28)] active:scale-90 sm:h-14 sm:w-14 sm:text-[10px]"
                >
                  <span>DODGE</span>
                </button>
              </div>

              {/* Primary Action Column: JUMP directly ABOVE ATTACK */}
              <div className="flex flex-col items-center gap-2 pb-1">
                <button
                  type="button"
                  data-testid="mobile-jump-btn"
                  aria-label="Jump"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAction('jump');
                  }}
                  className="flex h-12 w-12 touch-none select-none flex-col items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-950/95 font-display text-[9px] font-black tracking-wider text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.38)] active:scale-90 sm:h-14 sm:w-14 sm:text-[10px]"
                >
                  <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>JUMP</span>
                </button>

                <button
                  type="button"
                  data-testid="mobile-attack-btn"
                  aria-label="Attack"
                  style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAction('attack');
                  }}
                  className="flex h-[76px] w-[76px] touch-none select-none flex-col items-center justify-center gap-0.5 rounded-full border-[3px] border-amber-300 bg-gradient-to-br from-rose-600 via-orange-600 to-amber-500 font-display text-[11px] font-black tracking-wider text-white shadow-[0_0_24px_rgba(245,158,11,0.5)] active:scale-90 sm:h-[86px] sm:w-[86px] sm:text-xs"
                >
                  <Swords className="h-6 w-6 sm:h-7 sm:w-7" />
                  <span>ATTACK</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* PC DESKTOP BOTTOM BAR: Separate Purchased Powers + Free MCQ Reward Power Slots (Max 10) + Melee Controls */
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1">
            {extraPowers.length > 0 && (
              <div
                data-testid="desktop-shop-powers"
                aria-label="Purchased Shop Powers"
                className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-amber-400/65 bg-amber-950/35 p-1.5 shadow-xl"
              >
                {extraPowers.map((pid, idx) =>
                  renderIconPowerSlot(pid, {
                    key: `extra_pc_${pid}_${idx}`,
                    testId: `desktop-power-slot-extra-${idx + 1}`,
                    isPurchased: true,
                    sizeClass: 'h-10 w-10 hover:brightness-110',
                    iconClass: 'h-5 w-5',
                    isTouch: false,
                  }),
                )}
              </div>
            )}

            {/* 5 Power Slots: 4 Pre-Battle MCQ Slots + 1 Always-Available Free Surge (Compact & Icon-Only) */}
            <div
              data-testid="desktop-power-panel"
              aria-label="Free MCQ Reward Powers"
              className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-sky-500/45 bg-slate-950/94 p-1.5 shadow-2xl"
            >
              {mcqSlots.map((pid, idx) => {
                if (!pid) {
                  return (
                    <div
                      key={`slot_empty_${idx}`}
                      title={`Slot ${idx + 1} Locked`}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800/90 bg-slate-950 text-slate-600"
                    >
                      <Lock className="h-4 w-4" />
                    </div>
                  );
                }

                return renderIconPowerSlot(pid, {
                  key: `${pid}_${idx}`,
                  testId: `desktop-power-slot-${idx + 1}`,
                  sizeClass: 'h-11 w-11 hover:brightness-110',
                  iconClass: 'h-5 w-5',
                  isTouch: false,
                });
              })}

              {/* 5th Slot: Dedicated FREE Hero Surge with Active Duration + Reload System (Icon Only) */}
              {renderIconPowerSlot(FREE_POWER_ID, {
                key: 'slot_free_desktop',
                testId: 'desktop-power-slot-free',
                isFree: true,
                sizeClass: 'h-11 w-11 hover:brightness-110',
                iconClass: 'h-5 w-5',
                isTouch: false,
              })}
            </div>

            {/* Melee & Defensive Action Bar */}
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/90 px-2.5 py-1">
              <button
                type="button"
                onClick={() => onAction('normal')}
                className="rounded-lg border border-sky-500/60 bg-sky-950/80 px-2 py-0.5 text-[10px] font-bold text-sky-200 hover:bg-sky-900"
              >
                [J] PUNCH
              </button>
              <button
                type="button"
                onClick={() => onAction('kick')}
                className="rounded-lg border border-emerald-500/60 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-900"
              >
                [F] KICK
              </button>
              <button
                type="button"
                onClick={() => onAction('heavy')}
                className="rounded-lg border border-amber-500/60 bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-amber-900"
              >
                [K] HEAVY
              </button>
              <button
                type="button"
                onClick={() => onAction('jump')}
                className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-200 hover:bg-slate-800"
              >
                [Space] JUMP
              </button>
              <button
                type="button"
                onClick={() => onAction('dodge')}
                className="rounded-lg border border-cyan-500/60 bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900"
              >
                [Shift] DODGE
              </button>
              <button
                type="button"
                onPointerDown={() => onBlockHold(true)}
                onPointerUp={() => onBlockHold(false)}
                onPointerLeave={() => onBlockHold(false)}
                className="rounded-lg border border-blue-500/60 bg-blue-950/80 px-2 py-0.5 text-[10px] font-bold text-blue-200 hover:bg-blue-900"
              >
                [I] BLOCK
              </button>
              {(hud.playerUltimateCharge >= 100 ||
                (hud.powerActiveTimers.ultimate ?? 0) > 0 ||
                (hud.powerCooldowns.ultimate ?? 0) > 0) && (
                <button
                  type="button"
                  title="Ultimate Power [U]"
                  aria-label="Ultimate Power"
                  disabled={
                    hud.playerUltimateCharge < 100 ||
                    (hud.powerActiveTimers.ultimate ?? 0) > 0 ||
                    (hud.powerCooldowns.ultimate ?? 0) > 0
                  }
                  onClick={() => handlePowerTap('ultimate', false)}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-black text-white ${
                    (hud.powerActiveTimers.ultimate ?? 0) > 0
                      ? 'border-rose-300 bg-rose-700'
                      : hud.playerUltimateCharge >= 100 && (hud.powerCooldowns.ultimate ?? 0) <= 0
                      ? 'border-rose-300 bg-rose-600 hover:bg-rose-500'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {((hud.powerActiveTimers.ultimate ?? 0) > 0 ||
                    (hud.powerCooldowns.ultimate ?? 0) > 0) && (
                    <span className="font-display tabular-nums">
                      {(
                        (hud.powerActiveTimers.ultimate ?? 0) > 0
                          ? hud.powerActiveTimers.ultimate
                          : hud.powerCooldowns.ultimate
                      ).toFixed(1)}
                      s
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
