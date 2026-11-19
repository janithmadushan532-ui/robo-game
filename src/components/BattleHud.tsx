import React, { useEffect, useRef, useState } from 'react';
import {
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
import { getMonsterPowerDef, PLAYER_POWERS } from '../data/powers';
import {
  BattleHudSnapshot,
  BossLevelDef,
  MonsterPowerId,
  PowerId,
} from '../types/game';
import { PowerIcon } from './PowerIcon';

interface BattleHudProps {
  hud: BattleHudSnapshot;
  levelDef: BossLevelDef;
  matchSlotPowers: (PowerId | null)[];
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
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  const joyActivePointer = useRef<number | null>(null);
  const onJoystickMoveRef = useRef(onJoystickMove);
  onJoystickMoveRef.current = onJoystickMove;

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

  // Strictly 4 MCQ Slots + 1 Always-Available Free Power = 5 Powers total in bottom bar
  const mcqSlots: (PowerId | null)[] = [
    matchSlotPowers[0] ?? null,
    matchSlotPowers[1] ?? null,
    matchSlotPowers[2] ?? null,
    matchSlotPowers[3] ?? null,
  ];
  const freeDef = PLAYER_POWERS[FREE_POWER_ID];
  const freeCd = hud.powerCooldowns[FREE_POWER_ID] ?? 0;
  const freeCdPct = Math.max(0, Math.min(100, (freeCd / freeDef.cooldown) * 100));
  const freeHasEnergy = hud.playerEnergy >= freeDef.energyCost;
  const freeReady = freeCd <= 0 && freeHasEnergy;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1.5 sm:p-3">
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
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] font-bold sm:gap-2 sm:text-[10px]">
                {hud.playerShieldActive && (
                  <span className="flex items-center gap-1 text-sky-300">
                    <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    SHIELD {hud.playerShieldRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.playerSpeedBoostActive && (
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Gauge className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    SPEED {hud.playerSpeedBoostRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.playerRageActive && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <Swords className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    RAGE {hud.playerRageRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.timeSlowActive && (
                  <span className="flex items-center gap-1 text-teal-300">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    SLOW {hud.timeSlowRemaining.toFixed(1)}s
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
                      className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold text-white sm:text-[9px]"
                      style={{ backgroundColor: mDef.color }}
                    >
                      <PowerIcon type={mDef.icon} className="h-2.5 w-2.5" />
                      <span>{mDef.name.replace('Monster ', '')}</span>
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
      <div className="flex flex-col gap-1.5">
        {renderTouchControls ? (
          /* MOBILE LANDSCAPE ERGONOMIC LAYOUT:
             Left: Responsive Large Virtual Joystick
             Bottom-Center: Strictly 5 Power Slots (4 Pre-Battle MCQ Slots + 1 Always-Available FREE Surge)
             Right (Higher Ergonomic Thumb Zone): Elevated DODGE + Elevated Large ATTACK */
          <div className="flex items-end justify-between gap-2 pb-1">
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

            {/* Bottom-Center: Strictly 5 Power Slots (4 MCQ-Earned Slots + 1 Always-Available FREE Power) */}
            <div className="pointer-events-auto mb-1 flex min-w-0 flex-1 justify-center px-1 sm:mb-2">
              <div
                data-testid="mobile-power-panel"
                className="grid w-full max-w-[440px] grid-cols-5 gap-1.5 rounded-xl border border-slate-700/90 bg-slate-950/92 p-1.5 shadow-2xl sm:max-w-[500px] sm:gap-2 sm:p-2"
              >
                {/* Slots 1-4: Pre-Battle MCQ Earned Powers Only */}
                {mcqSlots.map((pid, idx) => {
                  if (!pid) {
                    return (
                      <div
                        key={`mcq_empty_${idx}`}
                        data-testid={`power-slot-${idx + 1}`}
                        className="flex min-h-[54px] select-none flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-800/90 bg-slate-950/90 px-1 py-1 text-slate-600 sm:min-h-[60px]"
                      >
                        <div className="flex items-center gap-1">
                          <span className="rounded bg-slate-900 px-1 text-[8px] font-black text-slate-500">
                            {idx + 1}
                          </span>
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-display text-[8px] font-bold tracking-tight sm:text-[9px]">
                          Q{idx + 1} MISS
                        </span>
                      </div>
                    );
                  }

                  const def = PLAYER_POWERS[pid];
                  const cd = hud.powerCooldowns[pid] ?? 0;
                  const cdPct = Math.max(0, Math.min(100, (cd / def.cooldown) * 100));
                  const hasEnergy = hud.playerEnergy >= def.energyCost;
                  const ready = cd <= 0 && hasEnergy;

                  return (
                    <button
                      key={`${pid}_${idx}`}
                      type="button"
                      data-testid={`power-slot-${idx + 1}`}
                      disabled={!ready}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!ready) return;
                        onUsePower(pid);
                      }}
                      className={`relative flex min-h-[54px] touch-none select-none flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border px-1 py-1 transition-transform sm:min-h-[60px] ${
                        ready
                          ? 'bg-slate-900 text-white shadow-md active:scale-95'
                          : 'border-slate-800 bg-slate-950 text-slate-500'
                      }`}
                      style={ready ? { borderColor: def.color } : undefined}
                    >
                      {cd > 0 && (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-700/75"
                          style={{ height: `${cdPct}%` }}
                        />
                      )}
                      <span className="relative rounded bg-slate-800/90 px-1 text-[8px] font-black text-slate-200">
                        {idx + 1}
                      </span>
                      <div
                        className="relative flex items-center justify-center gap-1"
                        style={{ color: ready ? def.color : undefined }}
                      >
                        <PowerIcon type={def.icon} className="h-4 w-4 shrink-0 sm:h-4.5 sm:w-4.5" />
                      </div>
                      <span className="relative w-full truncate text-center font-display text-[8px] font-black tracking-tight sm:text-[9px]">
                        {def.shortTag}
                      </span>
                      <span className="relative text-[8px] font-bold tabular-nums opacity-90">
                        {cd > 0 ? `${cd.toFixed(1)}s` : `${def.energyCost}EN`}
                      </span>
                    </button>
                  );
                })}

                {/* Slot 5: Dedicated Always-Available FREE Power */}
                <button
                  type="button"
                  data-testid="power-slot-free"
                  disabled={!freeReady}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!freeReady) return;
                    onUsePower(FREE_POWER_ID);
                  }}
                  className={`relative flex min-h-[54px] touch-none select-none flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border-2 px-1 py-1 transition-transform sm:min-h-[60px] ${
                    freeReady
                      ? 'border-amber-400 bg-gradient-to-b from-amber-950/90 to-slate-900 text-white shadow-[0_0_12px_rgba(251,191,36,0.3)] active:scale-95'
                      : 'border-amber-900/50 bg-slate-950 text-slate-500'
                  }`}
                >
                  {freeCd > 0 && (
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 bg-amber-900/55"
                      style={{ height: `${freeCdPct}%` }}
                    />
                  )}
                  <span className="relative rounded bg-amber-400 px-1.5 py-px font-display text-[7px] font-black tracking-wider text-slate-950 sm:text-[8px]">
                    FREE
                  </span>
                  <div
                    className="relative flex items-center justify-center"
                    style={{ color: freeReady ? freeDef.color : undefined }}
                  >
                    <PowerIcon type={freeDef.icon} className="h-4 w-4 shrink-0 sm:h-4.5 sm:w-4.5" />
                  </div>
                  <span className="relative w-full truncate text-center font-display text-[8px] font-black tracking-tight sm:text-[9px]">
                    {freeDef.shortTag}
                  </span>
                  <span className="relative text-[8px] font-bold tabular-nums opacity-90">
                    {freeCd > 0 ? `${freeCd.toFixed(1)}s` : `${freeDef.energyCost}EN`}
                  </span>
                </button>
              </div>
            </div>

            {/* Right: Elevated Ergonomic DODGE + Large ATTACK (Clear Separation, Never Near Bottom Edge) */}
            <div className="pointer-events-auto mr-1.5 mb-6 flex shrink-0 items-end gap-3.5 sm:mr-3 sm:mb-8 sm:gap-4">
              {/* Elevated DODGE Button */}
              <button
                type="button"
                data-testid="mobile-dodge-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction('dodge');
                }}
                className="mb-8 flex h-14 w-14 touch-none select-none flex-col items-center justify-center rounded-full border-2 border-cyan-300/90 bg-cyan-950/95 font-display text-[10px] font-black tracking-wider text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.28)] active:scale-90 sm:mb-10 sm:h-16 sm:w-16 sm:text-[11px]"
              >
                <span>DODGE</span>
              </button>

              {/* Elevated Large ATTACK Button */}
              <button
                type="button"
                data-testid="mobile-attack-btn"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction('attack');
                }}
                className="flex h-[82px] w-[82px] touch-none select-none flex-col items-center justify-center gap-1 rounded-full border-[3px] border-amber-300 bg-gradient-to-br from-rose-600 via-orange-600 to-amber-500 font-display text-xs font-black tracking-wider text-white shadow-[0_0_24px_rgba(245,158,11,0.5)] active:scale-90 sm:h-[92px] sm:w-[92px] sm:text-sm"
              >
                <Swords className="h-7 w-7 sm:h-8 sm:w-8" />
                <span>ATTACK</span>
              </button>
            </div>
          </div>
        ) : (
          /* PC DESKTOP BOTTOM BAR: Strictly 5 Power Slots (4 MCQ + 1 FREE) + Melee Controls */
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1.5">
            {/* 5 Power Slots: 4 Pre-Battle MCQ Slots + 1 Always-Available Free Surge */}
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-700/85 bg-slate-950/94 px-3 py-2 shadow-2xl">
              {mcqSlots.map((pid, idx) => {
                if (!pid) {
                  return (
                    <div
                      key={`slot_empty_${idx}`}
                      className="flex min-w-[116px] items-center gap-2 rounded-lg border border-slate-800/90 bg-slate-950 px-2.5 py-1.5 text-slate-600"
                    >
                      <span className="rounded bg-slate-900 px-1.5 py-0.5 font-display text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div className="text-left">
                        <div className="font-display text-[10px] font-black">SLOT {idx + 1}</div>
                        <div className="text-[9px] font-semibold">Q{idx + 1} MISSED</div>
                      </div>
                    </div>
                  );
                }

                const def = PLAYER_POWERS[pid];
                const cd = hud.powerCooldowns[pid] ?? 0;
                const cdPct = Math.max(0, Math.min(100, (cd / def.cooldown) * 100));
                const hasEnergy = hud.playerEnergy >= def.energyCost;
                const ready = cd <= 0 && hasEnergy;

                return (
                  <button
                    key={`${pid}_${idx}`}
                    type="button"
                    disabled={!ready}
                    onClick={() => onUsePower(pid)}
                    title={`${def.name} (${def.effectNote}, ${def.energyCost} EN)`}
                    className={`relative flex min-w-[126px] items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-1.5 text-left transition ${
                      ready
                        ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                    style={ready ? { borderColor: def.color } : undefined}
                  >
                    {cd > 0 && (
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 bg-slate-800/65 transition-[width] duration-75"
                        style={{ width: `${cdPct}%` }}
                      />
                    )}
                    <span className="relative rounded bg-slate-800 px-1.5 py-0.5 font-display text-[10px] font-black text-slate-200">
                      {idx + 1}
                    </span>
                    <div
                      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: ready ? def.color : '#1e293b',
                        color: ready ? '#020617' : '#64748b',
                      }}
                    >
                      <PowerIcon type={def.icon} className="h-4 w-4" />
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <div className="truncate font-display text-[11px] font-black">
                        {def.shortTag}
                      </div>
                      <div className="text-[9px] font-bold tabular-nums">
                        {cd > 0
                          ? `CD ${cd.toFixed(1)}s`
                          : !hasEnergy
                          ? `NEED ${def.energyCost} EN`
                          : `${def.energyCost} EN · READY`}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* 5th Slot: Dedicated FREE Hero Surge */}
              <button
                type="button"
                disabled={!freeReady}
                onClick={() => onUsePower(FREE_POWER_ID)}
                title={`${freeDef.name} (${freeDef.effectNote}, ${freeDef.energyCost} EN)`}
                className={`relative flex min-w-[136px] items-center gap-2 overflow-hidden rounded-lg border-2 px-2.5 py-1.5 text-left transition ${
                  freeReady
                    ? 'border-amber-400 bg-gradient-to-r from-amber-950/90 to-slate-900 text-white hover:brightness-110 active:scale-95'
                    : 'border-amber-900/50 bg-slate-950 text-slate-500'
                }`}
              >
                {freeCd > 0 && (
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 bg-amber-900/55 transition-[width] duration-75"
                    style={{ width: `${freeCdPct}%` }}
                  />
                )}
                <span className="relative rounded bg-amber-400 px-1.5 py-0.5 font-display text-[9px] font-black text-slate-950">
                  FREE
                </span>
                <div
                  className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: freeReady ? freeDef.color : '#1e293b',
                    color: freeReady ? '#020617' : '#64748b',
                  }}
                >
                  <PowerIcon type={freeDef.icon} className="h-4 w-4" />
                </div>
                <div className="relative min-w-0 flex-1">
                  <div className="truncate font-display text-[11px] font-black">
                    [5/Q] {freeDef.shortTag}
                  </div>
                  <div className="text-[9px] font-bold tabular-nums">
                    {freeCd > 0
                      ? `CD ${freeCd.toFixed(1)}s`
                      : !freeHasEnergy
                      ? `NEED ${freeDef.energyCost} EN`
                      : `${freeDef.energyCost} EN · READY`}
                  </div>
                </div>
              </button>
            </div>

            {/* Melee & Defensive Action Bar */}
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-1.5">
              <button
                type="button"
                onClick={() => onAction('normal')}
                className="rounded-lg border border-sky-500/60 bg-sky-950/80 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-900"
              >
                [J] PUNCH
              </button>
              <button
                type="button"
                onClick={() => onAction('kick')}
                className="rounded-lg border border-emerald-500/60 bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold text-emerald-200 hover:bg-emerald-900"
              >
                [F] KICK
              </button>
              <button
                type="button"
                onClick={() => onAction('heavy')}
                className="rounded-lg border border-amber-500/60 bg-amber-950/80 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-900"
              >
                [K] HEAVY
              </button>
              <button
                type="button"
                onClick={() => onAction('jump')}
                className="rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
              >
                [Space] JUMP
              </button>
              <button
                type="button"
                onClick={() => onAction('dodge')}
                className="rounded-lg border border-cyan-500/60 bg-cyan-950/80 px-2.5 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-900"
              >
                [Shift] DODGE
              </button>
              <button
                type="button"
                onPointerDown={() => onBlockHold(true)}
                onPointerUp={() => onBlockHold(false)}
                onPointerLeave={() => onBlockHold(false)}
                className="rounded-lg border border-blue-500/60 bg-blue-950/80 px-2.5 py-1 text-[11px] font-bold text-blue-200 hover:bg-blue-900"
              >
                [I] BLOCK
              </button>
              {hud.playerUltimateCharge >= 100 && (
                <button
                  type="button"
                  onClick={() => onUsePower('ultimate')}
                  className="flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-rose-500"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>[U] ULT READY</span>
                </button>
              )}
            </div>

            <div className="rounded bg-slate-950/85 px-3 py-1 text-[11px] font-semibold text-slate-300">
              WASD/Arrows Move · Space Jump · J/Click Punch · F Kick · K/Right-Click Heavy · Shift Dodge · Hold I Block · 1–4 MCQ Powers · 5/Q Free Surge · U Ultimate
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
