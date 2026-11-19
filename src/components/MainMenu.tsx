import React from 'react';
import {
  BookOpen,
  Cpu,
  Flame,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Skull,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BOSS_LEVELS } from '../data/levels';
import { PLAYER_POWER_LIST } from '../data/powers';
import { ActiveModal, GraphicsQuality, SavedProgress, ScienceUnit } from '../types/game';

interface MainMenuProps {
  progress: SavedProgress;
  selectedUnit: ScienceUnit;
  canContinue: boolean;
  onPlayNew: () => void;
  onContinue: () => void;
  onOpenModal: (modal: ActiveModal) => void;
  onToggleSound: () => void;
  onCycleGraphics: () => void;
}

const QUALITY_LABELS: Record<GraphicsQuality, string> = {
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
};

export const MainMenu: React.FC<MainMenuProps> = ({
  progress,
  selectedUnit,
  canContinue,
  onPlayNew,
  onContinue,
  onOpenModal,
  onToggleSound,
  onCycleGraphics,
}) => {
  return (
    <div className="game-scroll pointer-events-auto absolute inset-0 flex flex-col justify-between gap-2 overflow-y-auto p-2.5 sm:p-5">
      {/* Top Bar: Selected Science Unit + Quick Audio / Graphics Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => onOpenModal('units')}
          className="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-slate-950/88 px-3 py-1.5 text-left transition hover:border-sky-400 hover:bg-slate-900/95 sm:px-3.5 sm:py-2"
        >
          <BookOpen className="h-4 w-4 shrink-0 text-sky-400" />
          <div>
            <div className="text-[10px] font-bold tracking-wider text-sky-400 uppercase sm:text-[11px]">
              Grade 10 Science · {selectedUnit.code}
            </div>
            <div className="font-sinhala text-xs font-bold text-slate-100 sm:text-sm">
              {selectedUnit.sinhalaTitle}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onToggleSound}
            title="Sound On/Off"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/88 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 transition hover:border-sky-400 sm:px-3 sm:py-2 sm:text-xs"
          >
            {progress.settings.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-rose-400" />
            )}
            <span>{progress.settings.soundEnabled ? 'SOUND ON' : 'MUTED'}</span>
          </button>

          <button
            onClick={onCycleGraphics}
            title="Graphics Quality"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/88 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 transition hover:border-amber-400 sm:px-3 sm:py-2 sm:text-xs"
          >
            <Cpu className="h-4 w-4 text-amber-400" />
            <span>GFX: {QUALITY_LABELS[progress.settings.graphicsQuality]}</span>
          </button>

          <button
            onClick={() => onOpenModal('settings')}
            aria-label="Settings"
            className="flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/88 p-1.5 text-slate-200 transition hover:border-sky-400 sm:p-2"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Left-docked Fighting Game Menu Stack (Leaves center/right 3D Arena & Fighters clearly visible!) */}
      <div className="my-auto flex w-full max-w-md flex-col gap-2.5 sm:gap-3.5">
        {/* Bespoke SVG Title Lockup */}
        <div className="rounded-xl border border-sky-500/35 bg-slate-950/85 p-3 shadow-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0" aria-hidden="true">
              <defs>
                <linearGradient id="arenaShield" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
              <polygon
                points="32,4 58,18 58,46 32,60 6,46 6,18"
                fill="#0f172a"
                stroke="url(#arenaShield)"
                strokeWidth="3"
              />
              <ellipse
                cx="32"
                cy="32"
                rx="18"
                ry="7"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                transform="rotate(35 32 32)"
              />
              <ellipse
                cx="32"
                cy="32"
                rx="18"
                ry="7"
                fill="none"
                stroke="#facc15"
                strokeWidth="2"
                transform="rotate(-35 32 32)"
              />
              <circle cx="32" cy="32" r="5" fill="#f43f5e" />
            </svg>
            <div>
              <div className="font-display text-xl sm:text-2xl font-black tracking-wider text-white">
                SCIENCE <span className="text-sky-400">ARENA</span>
              </div>
              <div className="font-display text-xs font-bold tracking-[0.22em] text-amber-400">
                TITAN CLASH · 3D BOSS FIGHTER
              </div>
              <div className="font-sinhala mt-0.5 text-xs font-semibold text-slate-300">
                10 ශ්‍රේණිය විද්‍යාව · ප්‍රශ්න හා බල සටන
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800 pt-2.5 text-center text-xs">
            <div>
              <div className="text-[10px] font-bold text-slate-400">ARENA</div>
              <div className="font-display font-bold tabular-nums text-sky-400">
                {progress.highestUnlockedLevel} / {BOSS_LEVELS.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">BOSSES</div>
              <div className="font-display font-bold tabular-nums text-rose-400">
                {progress.defeatedBossIds.length} / {BOSS_LEVELS.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">POWERS</div>
              <div className="font-display font-bold tabular-nums text-amber-400">
                {progress.collectedPowers.length} / {PLAYER_POWER_LIST.length}
              </div>
            </div>
          </div>
        </div>

        {/* Primary & Secondary Action Buttons */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {canContinue && (
              <button
                onClick={onContinue}
                className="flex items-center justify-center gap-2 rounded-lg border border-emerald-400/70 bg-emerald-600 px-4 py-3 font-display text-sm font-extrabold tracking-wider text-white shadow-lg transition hover:bg-emerald-500 active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>CONTINUE LV.{progress.highestUnlockedLevel}</span>
              </button>
            )}
            <button
              onClick={onPlayNew}
              className={`flex items-center justify-center gap-2 rounded-lg border border-sky-300/70 bg-sky-600 px-4 py-3 font-display text-sm font-extrabold tracking-wider text-white shadow-lg transition hover:bg-sky-500 active:scale-[0.98] ${
                canContinue ? '' : 'sm:col-span-2'
              }`}
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{canContinue ? 'NEW / LEVEL 1' : 'PLAY GAME'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenModal('levels')}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3.5 py-2.5 text-xs font-bold tracking-wide text-slate-100 transition hover:border-sky-400 hover:bg-slate-900"
            >
              <Swords className="h-4 w-4 text-sky-400" />
              <span>LEVEL SELECTION</span>
            </button>

            <button
              onClick={() => onOpenModal('units')}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3.5 py-2.5 text-xs font-bold tracking-wide text-slate-100 transition hover:border-emerald-400 hover:bg-slate-900"
            >
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <span>SCIENCE UNITS</span>
            </button>

            <button
              onClick={() => onOpenModal('powers')}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3.5 py-2.5 text-xs font-bold tracking-wide text-slate-100 transition hover:border-amber-400 hover:bg-slate-900"
            >
              <Flame className="h-4 w-4 text-amber-400" />
              <span>POWER COLLECTION</span>
            </button>

            <button
              onClick={() => onOpenModal('monsters')}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3.5 py-2.5 text-xs font-bold tracking-wide text-slate-100 transition hover:border-rose-400 hover:bg-slate-900"
            >
              <Skull className="h-4 w-4 text-rose-400" />
              <span>MONSTER COLLECTION</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Control Hint Line */}
      <div className="pointer-events-none flex items-center justify-between text-[11px] font-semibold tracking-wider text-slate-300">
        <div className="rounded border border-slate-800 bg-slate-950/85 px-3 py-1.5">
          <Shield className="mr-1.5 inline h-3.5 w-3.5 text-sky-400" />
          Answer 4 Sinhala MCQs → Earn Powers → Defeat the 3D Arena Boss!
        </div>
        <div className="hidden rounded border border-slate-800 bg-slate-950/85 px-3 py-1.5 sm:block">
          WASD Move · J Punch · F Kick · K Heavy · Space Jump · Shift Dodge · I Block · 1–4 Powers · 5/Q Free Surge · U Ultimate
        </div>
      </div>
    </div>
  );
};
