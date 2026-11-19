import { PowerId, SavedProgress } from '../types/game';

const STORAGE_KEY = 'science_arena_titan_clash_save_v1';

export const DEFAULT_PROGRESS: SavedProgress = {
  highestUnlockedLevel: 1,
  defeatedBossIds: [],
  collectedPowers: ['super_punch'], // Starter kinetic skill; more unlocked via MCQs & boss wins
  selectedUnitId: 1,
  usedQuestionIds: [],
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

export function loadProgress(): SavedProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      collectedPowers: Array.isArray(parsed.collectedPowers) && parsed.collectedPowers.length > 0
        ? (parsed.collectedPowers as PowerId[])
        : [...DEFAULT_PROGRESS.collectedPowers],
      defeatedBossIds: Array.isArray(parsed.defeatedBossIds) ? parsed.defeatedBossIds : [],
      usedQuestionIds: Array.isArray(parsed.usedQuestionIds) ? parsed.usedQuestionIds : [],
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
      (parsed.totalCorrectMcq ?? 0) > 0 ||
      (parsed.totalScore ?? 0) > 0
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
