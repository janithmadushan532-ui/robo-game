import React, { useEffect, useRef, useState } from 'react';
import { Clock, Gauge, Lock, Pause, Shield, Sparkles, Swords, Volume2, VolumeX } from 'lucide-react';
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
  onAction: (action: 'normal' | 'kick' | 'heavy' | 'jump' | 'dodge') => void;
  onBlockHold: (held: boolean) => void;
  onUsePower: (powerId: PowerId) => void;
}

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
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyActivePointer = useRef<number | null>(null);

  useEffect(() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
    setIsTouchDevice(Boolean(coarse));
  }, []);

  const renderTouchControls =
    showTouchMode === 'always' || (showTouchMode === 'auto' && isTouchDevice);

  const playerHpPct = Math.max(0, Math.min(100, (hud.playerHp / hud.playerMaxHp) * 100));
  const bossHpPct = Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100));
  const energyPct = Math.max(0, Math.min(100, (hud.playerEnergy / hud.playerMaxEnergy) * 100));

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = joyBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    onJoystickMove(dx / maxR, dy / maxR);
  };

  const resetJoystick = () => {
    joyActivePointer.current = null;
    setJoyKnob({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  const slots: (PowerId | null)[] = [
    matchSlotPowers[0] ?? null,
    matchSlotPowers[1] ?? null,
    matchSlotPowers[2] ?? null,
    matchSlotPowers[3] ?? null,
  ];
  const ultReady = hud.playerUltimateCharge >= 100;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 sm:p-4">
      {/* TOP FIGHTING HEALTH BARS (Low occlusion, crisp high-contrast) */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
          {/* Player Health & Energy Cluster */}
          <div className="rounded-lg border border-sky-500/40 bg-slate-950/90 px-3 py-2 shadow-lg">
            <div className="mb-1 flex items-center justify-between text-xs font-bold">
              <span className="font-display tracking-wider text-sky-300">SCIENCE PALADIN</span>
              <span className="font-display tabular-nums text-white">
                {hud.playerHp} / {hud.playerMaxHp}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-sm bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-100"
                style={{ width: `${playerHpPct}%` }}
              />
            </div>

            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-75"
                  style={{ width: `${energyPct}%` }}
                />
              </div>
              <span className="font-display text-[10px] font-bold tabular-nums text-amber-300">
                EN {hud.playerEnergy}
              </span>
              <span className="font-display text-[10px] font-bold tabular-nums text-rose-400">
                ULT {hud.playerUltimateCharge}%
              </span>
            </div>

            {(hud.playerShieldActive ||
              hud.playerSpeedBoostActive ||
              hud.playerRageActive ||
              hud.timeSlowActive) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold">
                {hud.playerShieldActive && (
                  <span className="flex items-center gap-1 text-sky-300">
                    <Shield className="h-3 w-3" />
                    SHIELD {hud.playerShieldRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.playerSpeedBoostActive && (
                  <span className="flex items-center gap-1 text-cyan-300">
                    <Gauge className="h-3 w-3" />
                    HYPER SPEED {hud.playerSpeedBoostRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.playerRageActive && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <Swords className="h-3 w-3" />
                    RAGE {hud.playerRageRemaining.toFixed(1)}s
                  </span>
                )}
                {hud.timeSlowActive && (
                  <span className="flex items-center gap-1 text-teal-300">
                    <Clock className="h-3 w-3" />
                    TIME SLOW {hud.timeSlowRemaining.toFixed(1)}s
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Center Round Timer + Pause/Mute */}
          <div className="pointer-events-auto flex flex-col items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/92 px-3 py-1.5">
            <div className="text-[10px] font-bold tracking-widest text-amber-400">
              LV.{levelDef.level} · S{levelDef.sector}
              {levelDef.isBossLevel ? ' · BOSS' : ''}
            </div>
            {hud.survivalTotalWaves > 1 && (
              <div className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-display text-[9px] font-black tracking-wider text-emerald-300">
                WAVE {hud.survivalWave} / {hud.survivalTotalWaves}
              </div>
            )}
            <div className="font-display text-sm sm:text-base font-black tabular-nums text-white">
              {Math.floor(hud.battleTime)}s
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleSound}
                aria-label="Toggle Sound"
                className="rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-rose-400" />}
              </button>
              <button
                onClick={onPause}
                aria-label="Pause Game"
                className="rounded bg-slate-800 p-1 text-slate-200 hover:bg-slate-700"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Boss / Enemy Squad Health & Earned Monster Powers */}
          <div className="rounded-lg border border-rose-500/45 bg-slate-950/90 px-3 py-2 shadow-lg">
            {hud.enemies.length > 1 ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-extrabold text-rose-300">
                  <span className="font-display tracking-wider">
                    {hud.enemies.filter((e) => e.alive).length} / {hud.enemies.length} ACTIVE
                  </span>
                  <span className="font-display tabular-nums text-white">
                    TOTAL {hud.bossHp} / {hud.bossMaxHp}
                  </span>
                </div>
                <div className={hud.enemies.length >= 4 ? 'grid grid-cols-2 gap-x-2.5 gap-y-1.5' : 'flex flex-col gap-1.5'}>
                  {hud.enemies.map((e) => {
                    const pct = Math.max(0, Math.min(100, (e.hp / Math.max(1, e.maxHp)) * 100));
                    return (
                      <div key={e.id} className={e.alive ? '' : 'opacity-45'}>
                        <div className="mb-0.5 flex items-center justify-between gap-1 text-[10px] font-bold">
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
                              <span className="rounded bg-sky-500 px-1 text-[8px] font-black text-slate-950">SHD</span>
                            )}
                            {e.stunned && (
                              <span className="rounded bg-amber-400 px-1 text-[8px] font-black text-slate-950">STN</span>
                            )}
                            {e.slowed && (
                              <span className="rounded bg-cyan-400 px-1 text-[8px] font-black text-slate-950">ICE</span>
                            )}
                            <span className="font-display truncate text-rose-300">
                              {e.name}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-800">
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
                <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="font-display tabular-nums text-white">
                    {hud.bossHp} / {hud.bossMaxHp}
                  </span>
                  <div className="flex items-center gap-1.5 truncate">
                    {hud.enemies[0]?.maxPhases && hud.enemies[0].maxPhases > 1 && (
                      <span className="rounded bg-rose-600 px-1.5 py-0.5 font-display text-[9px] font-black text-white">
                        PHASE {hud.enemies[0].phase ?? 1}/{hud.enemies[0].maxPhases}
                      </span>
                    )}
                    <span className="font-display truncate tracking-wider text-rose-400">
                      {levelDef.bossName} · {levelDef.monsterCategory.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-sm bg-slate-800">
                  <div
                    className="ml-auto h-full bg-gradient-to-l from-rose-600 to-orange-500 transition-[width] duration-100"
                    style={{ width: `${bossHpPct}%` }}
                  />
                </div>

                <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1">
                  {hud.bossShieldActive && (
                    <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                      AEGIS SHIELD
                    </span>
                  )}
                  {hud.bossStunned && (
                    <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                      STUNNED
                    </span>
                  )}
                  {hud.bossSlowed && (
                    <span className="rounded bg-cyan-400 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                      FROST SLOW
                    </span>
                  )}
                </div>
              </>
            )}

            {bossBonusPowers.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1">
                {bossBonusPowers.map((mp, idx) => {
                  const mDef = getMonsterPowerDef(mp);
                  return (
                    <span
                      key={`${mp}_${idx}`}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
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
              <div className="rounded-md border border-amber-400/60 bg-slate-950/90 px-2.5 py-1 font-display text-xs font-black text-amber-400">
                {hud.comboCount} HIT COMBO!
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hud.bossTelegraphLabel && (
              <div className="rounded-md border border-rose-400 bg-rose-950/95 px-3 py-1 font-display text-xs font-black tracking-wider text-rose-200 shadow-lg">
                {hud.bossTelegraphLabel} — DODGE / BLOCK!
              </div>
            )}
            {hud.phaseBanner && (
              <div className="rounded-md border border-amber-400 bg-amber-950/95 px-3 py-1 font-display text-xs font-black tracking-wider text-amber-200 shadow-lg">
                {hud.phaseBanner}
              </div>
            )}
          </div>

          <div>
            {hud.lastDamageEvent && (
              <div
                key={hud.lastDamageEvent.id}
                className={`rounded-md border px-2.5 py-1 font-display text-xs font-black tabular-nums ${
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

      {/* BOTTOM ACTION DOCK: 4 Pre-Battle Power Slots + Mobile/PC Controls */}
      <div className="flex flex-col gap-2">
        {renderTouchControls ? (
          /* MOBILE LANDSCAPE ERGONOMIC CONTROLS + 4 DEDICATED POWER SLOT BUTTONS */
          <div className="flex items-end justify-between gap-2">
            {/* Left: Virtual Joystick */}
            <div
              ref={joyBaseRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                joyActivePointer.current = e.pointerId;
                updateJoystick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (joyActivePointer.current === e.pointerId) {
                  updateJoystick(e.clientX, e.clientY);
                }
              }}
              onPointerUp={resetJoystick}
              onPointerCancel={resetJoystick}
              className="pointer-events-auto relative h-28 w-28 shrink-0 rounded-full border-2 border-sky-400/55 bg-slate-950/80"
            >
              <div
                className="absolute top-1/2 left-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300 bg-sky-500/85 shadow-lg"
                style={{
                  transform: `translate(calc(-50% + ${joyKnob.x}px), calc(-50% + ${joyKnob.y}px))`,
                }}
              />
            </div>

            {/* Center: 4 Independent Earned Power Buttons */}
            <div className="pointer-events-auto grid grid-cols-2 gap-1.5 rounded-xl border border-slate-700/85 bg-slate-950/92 p-1.5">
              {slots.map((pid, idx) => {
                if (!pid) {
                  return (
                    <div
                      key={`empty_${idx}`}
                      className="flex min-w-[74px] items-center justify-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-2 text-[9px] font-bold text-slate-600"
                    >
                      <Lock className="h-3 w-3" />
                      <span>S{idx + 1} NONE</span>
                    </div>
                  );
                }
                const def = PLAYER_POWERS[pid];
                const cd = hud.powerCooldowns[pid] ?? 0;
                const cdPct = Math.max(0, Math.min(100, (cd / def.cooldown) * 100));
                const ready = cd <= 0 && hud.playerEnergy >= def.energyCost;
                return (
                  <button
                    key={`${pid}_${idx}`}
                    disabled={!ready}
                    onClick={() => onUsePower(pid)}
                    className={`relative flex min-w-[78px] flex-col items-center overflow-hidden rounded-lg border px-2 py-1.5 text-[10px] font-extrabold transition ${
                      ready
                        ? 'bg-slate-900 text-white active:scale-95'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                    }`}
                    style={ready ? { borderColor: def.color } : undefined}
                  >
                    {cd > 0 && (
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-800/80"
                        style={{ height: `${cdPct}%` }}
                      />
                    )}
                    <div className="relative flex items-center gap-1" style={{ color: ready ? def.color : undefined }}>
                      <span className="rounded bg-slate-800 px-1 text-[8px] text-slate-300">
                        {idx + 1}
                      </span>
                      <PowerIcon type={def.icon} className="h-3.5 w-3.5" />
                      <span>{def.shortTag}</span>
                    </div>
                    <span className="relative text-[9px] tabular-nums">
                      {cd > 0 ? `${cd.toFixed(1)}s` : `${def.energyCost}EN`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Arcade Combat Cluster */}
            <div className="pointer-events-auto grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onAction('jump')}
                className="h-11 w-13 rounded-lg border border-slate-500 bg-slate-900/92 text-[10px] font-extrabold text-slate-100 active:scale-95"
              >
                JUMP
              </button>
              <button
                onClick={() => onAction('dodge')}
                className="h-11 w-13 rounded-lg border border-cyan-500/70 bg-cyan-950/92 text-[10px] font-extrabold text-cyan-200 active:scale-95"
              >
                DODGE
              </button>
              <button
                onPointerDown={() => onBlockHold(true)}
                onPointerUp={() => onBlockHold(false)}
                onPointerLeave={() => onBlockHold(false)}
                className="h-11 w-13 rounded-lg border border-blue-500/70 bg-blue-950/92 text-[10px] font-extrabold text-blue-200 active:scale-95"
              >
                BLOCK
              </button>

              <button
                onClick={() => onAction('normal')}
                className="h-12 w-13 rounded-xl border-2 border-sky-400 bg-sky-600/95 text-[11px] font-black text-white active:scale-95"
              >
                PUNCH
              </button>
              <button
                onClick={() => onAction('kick')}
                className="h-12 w-13 rounded-xl border-2 border-emerald-400 bg-emerald-600/95 text-[11px] font-black text-white active:scale-95"
              >
                KICK
              </button>
              <button
                onClick={() => onAction('heavy')}
                className="h-12 w-13 rounded-xl border-2 border-amber-400 bg-amber-600/95 text-[11px] font-black text-white active:scale-95"
              >
                HEAVY
              </button>

              <button
                disabled={!ultReady}
                onClick={() => onUsePower('ultimate')}
                className={`col-span-3 h-10 rounded-xl border-2 text-[11px] font-black transition active:scale-95 ${
                  ultReady
                    ? 'border-rose-300 bg-rose-600 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-500'
                }`}
              >
                ULTIMATE NOVA · {hud.playerUltimateCharge}%
              </button>
            </div>
          </div>
        ) : (
          /* PC DESKTOP BOTTOM BAR: 4 Pre-Battle Power Slot Buttons + Melee Controls */
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1.5">
            {/* 4 Dedicated Pre-Battle Power Slot Buttons */}
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-700/85 bg-slate-950/94 px-3 py-2 shadow-2xl">
              {slots.map((pid, idx) => {
                if (!pid) {
                  return (
                    <div
                      key={`slot_empty_${idx}`}
                      className="flex min-w-[116px] items-center gap-2 rounded-lg border border-slate-800/90 bg-slate-950 px-2.5 py-1.5 text-slate-600"
                    >
                      <span className="rounded bg-slate-900 px-1.5 py-0.5 font-display text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <div className="text-left">
                        <div className="font-display text-[10px] font-black">SLOT {idx + 1}</div>
                        <div className="text-[9px] font-semibold">NO POWER</div>
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
                      className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-950"
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

              {/* Ultimate Button */}
              <button
                disabled={!ultReady}
                onClick={() => onUsePower('ultimate')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-[11px] font-black transition ${
                  ultReady
                    ? 'border-rose-300 bg-rose-600 text-white hover:bg-rose-500 active:scale-95'
                    : 'border-slate-800 bg-slate-950 text-slate-500'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>[U] ULT {hud.playerUltimateCharge}%</span>
              </button>
            </div>

            {/* Melee & Defensive Action Bar */}
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-1.5">
              <button
                onClick={() => onAction('normal')}
                className="rounded-lg border border-sky-500/60 bg-sky-950/80 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:bg-sky-900"
              >
                [J] PUNCH
              </button>
              <button
                onClick={() => onAction('kick')}
                className="rounded-lg border border-emerald-500/60 bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold text-emerald-200 hover:bg-emerald-900"
              >
                [F] KICK
              </button>
              <button
                onClick={() => onAction('heavy')}
                className="rounded-lg border border-amber-500/60 bg-amber-950/80 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-900"
              >
                [K] HEAVY
              </button>
              <button
                onClick={() => onAction('jump')}
                className="rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
              >
                [Space] JUMP
              </button>
              <button
                onClick={() => onAction('dodge')}
                className="rounded-lg border border-cyan-500/60 bg-cyan-950/80 px-2.5 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-900"
              >
                [Shift] DODGE
              </button>
              <button
                onPointerDown={() => onBlockHold(true)}
                onPointerUp={() => onBlockHold(false)}
                onPointerLeave={() => onBlockHold(false)}
                className="rounded-lg border border-blue-500/60 bg-blue-950/80 px-2.5 py-1 text-[11px] font-bold text-blue-200 hover:bg-blue-900"
              >
                [I] BLOCK
              </button>
            </div>

            <div className="rounded bg-slate-950/85 px-3 py-1 text-[11px] font-semibold text-slate-300">
              WASD/Arrows Move · Space Jump · J/Click Punch · F Kick · K/Right-Click Heavy · Shift Dodge · Hold I Block · 1–4 Earned Powers · U Ultimate
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
