import { McqQuestion } from '../types/game';
import { MCQ_PART_1 } from './mcqPart1';
import { MCQ_PART_2 } from './mcqPart2';
import { MCQ_PART_3 } from './mcqPart3';
import { MCQ_PART_4 } from './mcqPart4';

export const ALL_MCQS: McqQuestion[] = [
  ...MCQ_PART_1,
  ...MCQ_PART_2,
  ...MCQ_PART_3,
  ...MCQ_PART_4,
];

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Strictly selects `count` questions ONLY from `unitId`, avoiding `usedQuestionIds`.
 * If fewer than `count` unused questions remain in this unit, it resets the used pool
 * ONLY for this unit's questions while ensuring no duplicate within the returned batch.
 */
export function pickMcqsForUnit(
  unitId: number,
  usedQuestionIds: string[],
  count = 4,
): { questions: McqQuestion[]; updatedUsedIds: string[] } {
  const unitPool = ALL_MCQS.filter((q) => q.unitId === unitId);
  const usedSet = new Set(usedQuestionIds);
  const unused = shuffleArray(unitPool.filter((q) => !usedSet.has(q.id)));

  let selected: McqQuestion[] = [];
  let nextUsed = [...usedQuestionIds];

  if (unused.length >= count) {
    selected = unused.slice(0, count);
    nextUsed = [...nextUsed, ...selected.map((q) => q.id)];
  } else {
    // Take all remaining unused first, then clear this unit's old IDs and fill the rest
    selected = [...unused];
    const unitIdsSet = new Set(unitPool.map((q) => q.id));
    nextUsed = nextUsed.filter((id) => !unitIdsSet.has(id));
    const selectedIds = new Set(selected.map((q) => q.id));
    const refillPool = shuffleArray(unitPool.filter((q) => !selectedIds.has(q.id)));
    const needed = count - selected.length;
    const extra = refillPool.slice(0, needed);
    selected = [...selected, ...extra];
    nextUsed = [...nextUsed, ...selected.map((q) => q.id)];
  }

  return { questions: selected, updatedUsedIds: nextUsed };
}
