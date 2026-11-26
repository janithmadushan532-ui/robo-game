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

/**
 * Returns all MCQs for the given Grade 10 Science Unit in exact sequential order
 * from the beginning of the unit to the end.
 */
export function getUnitMcqs(unitId: number): McqQuestion[] {
  return ALL_MCQS.filter((q) => q.unitId === unitId);
}

/**
 * Strictly sequential, deterministic per-unit MCQ rotation:
 * - Only questions belonging to `unitId` are selected.
 * - Starts from the beginning of the selected Unit (cursor 0) and advances sequentially.
 * - Every question in the Unit is asked before any question is repeated.
 * - Once all questions in the Unit have been asked, wraps cleanly to index 0 and repeats the cycle indefinitely.
 * - Progress is tracked independently for each Unit in `unitQuestionCursors`.
 */
export function pickMcqsForUnitSequential(
  unitId: number,
  unitQuestionCursors: Record<number, number>,
  count = 4,
): {
  questions: McqQuestion[];
  nextCursor: number;
  updatedCursors: Record<number, number>;
  cycleTotal: number;
} {
  const unitPool = getUnitMcqs(unitId);
  if (unitPool.length === 0) {
    return {
      questions: [],
      nextCursor: 0,
      updatedCursors: { ...unitQuestionCursors },
      cycleTotal: 0,
    };
  }

  const total = unitPool.length;
  const rawCursor = unitQuestionCursors[unitId] ?? 0;
  const startCursor = ((Math.floor(rawCursor) % total) + total) % total;
  const take = Math.min(count, total);

  const selected: McqQuestion[] = [];
  for (let i = 0; i < take; i++) {
    selected.push(unitPool[(startCursor + i) % total]);
  }

  const nextCursor = (startCursor + take) % total;
  const updatedCursors: Record<number, number> = {
    ...unitQuestionCursors,
    [unitId]: nextCursor,
  };

  return {
    questions: selected,
    nextCursor,
    updatedCursors,
    cycleTotal: total,
  };
}

/**
 * Legacy helper preserved for compatibility — delegates to sequential unit rotation.
 */
export function pickMcqsForUnit(
  unitId: number,
  usedQuestionIds: string[],
  count = 4,
): { questions: McqQuestion[]; updatedUsedIds: string[] } {
  const unitPool = getUnitMcqs(unitId);
  if (unitPool.length === 0) return { questions: [], updatedUsedIds: [...usedQuestionIds] };

  const usedSet = new Set(usedQuestionIds);
  const unusedSequential = unitPool.filter((q) => !usedSet.has(q.id));

  let selected: McqQuestion[] = [];
  let nextUsed = [...usedQuestionIds];

  if (unusedSequential.length >= count) {
    selected = unusedSequential.slice(0, count);
    nextUsed = [...nextUsed, ...selected.map((q) => q.id)];
  } else {
    selected = [...unusedSequential];
    const unitIdsSet = new Set(unitPool.map((q) => q.id));
    nextUsed = nextUsed.filter((id) => !unitIdsSet.has(id));
    const selectedIds = new Set(selected.map((q) => q.id));
    const refillPool = unitPool.filter((q) => !selectedIds.has(q.id));
    const needed = count - selected.length;
    selected = [...selected, ...refillPool.slice(0, needed)];
    nextUsed = [...nextUsed, ...selected.map((q) => q.id)];
  }

  return { questions: selected, updatedUsedIds: nextUsed };
}
