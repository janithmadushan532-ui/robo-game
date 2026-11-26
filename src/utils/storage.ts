import { MAX_LOADOUT_SELECTION, PLAYER_POWERS } from '../data/powers';
import { PowerId, SavedProgress } from '../types/game';

const STORAGE_KEY = 'science_arena_titan_clash_save_v1';

export const DEFAULT_PROGRESS: SavedProgress = {
  highestUnlockedLevel: 1,
  defeatedBossIds: [],
  collectedPowers: ['super_punch'], // Starter kinetic skill; more unlocked via MCQs & boss wins
  purchasedPowers: [],
  activeLoadout: [],
  powerUpgrades: {},
  coins: 150, // Starter battle coins (must win/complete matches to afford expensive shop powers)
  selectedUnitId: 1,
  usedQuestionIds: [],
  unitQuestionCursors: {},
  totalWins: 0,
  totalCorrectMcq: 0,
  totalWrongMcq: 0,
  totalScore: 0,
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    graphicsQuality: 'high',
    showTouchControls: 'auto',
  },
};

function sanitizePowerList(raw: unknown): PowerId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<PowerId>();
  const out: PowerId[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item in PLAYER_POWERS) {
      const pid = item as PowerId;
      if (!seen.has(pid)) {
        seen.add(pid);
        out.push(pid);
      }
    }
  }
  return out;
}

function sanitizeUnitCursors(raw: unknown): Record<number, number> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<number, number> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const unitId = Number(key);
    if (Number.isInteger(unitId) && unitId > 0 && typeof val === 'number' && Number.isFinite(val)) {
      result[unitId] = Math.max(0, Math.floor(val));
    }
  }
  return result;
}

export function loadProgress(): SavedProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    const migratedCoins =
      typeof parsed.coins === 'number' && Number.isFinite(parsed.coins)
        ? Math.max(0, Math.floor(parsed.coins))
        : Math.max(
            DEFAULT_PROGRESS.coins,
            (parsed.totalWins ?? 0) * 120 + (parsed.totalCorrectMcq ?? 0) * 20,
          );

    const purchasedPowers = sanitizePowerList(parsed.purchasedPowers);
    const rawCollected = sanitizePowerList(parsed.collectedPowers);
    const mergedCollected = Array.from(
      new Set<PowerId>([
        ...(rawCollected.length > 0 ? rawCollected : DEFAULT_PROGRESS.collectedPowers),
        ...purchasedPowers,
      ]),
    );

    const purchasedSet = new Set<PowerId>(purchasedPowers);
    const hasExplicitLoadout = Array.isArray(parsed.activeLoadout);
    const sanitizedLoadout = hasExplicitLoadout
      ? sanitizePowerList(parsed.activeLoadout)
          .filter((pid) => pid !== 'ultimate' && pid !== 'hero_surge' && purchasedSet.has(pid))
          .slice(0, MAX_LOADOUT_SELECTION)
      : [...purchasedPowers].slice(0, MAX_LOADOUT_SELECTION);

    const selectedUnitId =
      typeof parsed.selectedUnitId === 'number' &&
      Number.isInteger(parsed.selectedUnitId) &&
      parsed.selectedUnitId >= 1 &&
      parsed.selectedUnitId <= 15
        ? parsed.selectedUnitId
        : DEFAULT_PROGRESS.selectedUnitId;

    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      selectedUnitId,
      collectedPowers: mergedCollected,
      purchasedPowers,
      activeLoadout: sanitizedLoadout,
      powerUpgrades:
        parsed.powerUpgrades && typeof parsed.powerUpgrades === 'object'
          ? (parsed.powerUpgrades as Partial<Record<PowerId, number>>)
          : {},
      coins: migratedCoins,
      defeatedBossIds: Array.isArray(parsed.defeatedBossIds) ? parsed.defeatedBossIds : [],
      usedQuestionIds: Array.isArray(parsed.usedQuestionIds) ? parsed.usedQuestionIds : [],
      unitQuestionCursors: sanitizeUnitCursors(parsed.unitQuestionCursors),
      settings: {
        ...DEFAULT_PROGRESS.settings,
        ...(parsed.settings ?? {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveProgress(progress: SavedProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function hasSavedProgress(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return (
      (parsed.highestUnlockedLevel ?? 1) > 1 ||
      (parsed.defeatedBossIds?.length ?? 0) > 0 ||
      (parsed.purchasedPowers?.length ?? 0) > 0 ||
      (parsed.activeLoadout?.length ?? 0) > 0 ||
      (parsed.totalCorrectMcq ?? 0) > 0 ||
      (parsed.totalScore ?? 0) > 0 ||
      Object.keys(parsed.unitQuestionCursors ?? {}).length > 0 ||
      Object.keys(parsed.powerUpgrades ?? {}).length > 0
    );
  } catch {
    return false;
  }
}

export function resetProgress(): SavedProgress {
  const fresh = structuredClone(DEFAULT_PROGRESS);
  saveProgress(fresh);
  return fresh;
}
