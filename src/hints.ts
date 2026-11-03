import type { Question } from './questions.ts';
export interface HintState { question: Question; combined: boolean; removed: number[]; counted: number[] }
export function createHint(question: Question): HintState {
  return { question, combined: false, removed: [], counted: [] };
}
export function hintStage(hint: HintState): 'combine' | 'remove' | 'count' {
  const q = hint.question;
  if (q.op === '+' && !hint.combined) return 'combine';
  if (q.op === '−' && hint.removed.length < q.b) return 'remove';
  return 'count';
}
export function touchFruit(hint: HintState, index: number): number | null {
  const q = hint.question;
  const total = q.op === '+' ? q.a + q.b : q.a;
  if (!Number.isInteger(index) || index < 0 || index >= total) return null;
  const stage = hintStage(hint);
  if (stage === 'combine') return null;
  if (stage === 'remove') {
    if (hint.removed.includes(index)) return null;
    hint.removed.push(index);
    return hint.removed.length;
  }
  if (hint.removed.includes(index)) return null;
  if (!hint.counted.includes(index)) hint.counted.push(index);
  return hint.counted.indexOf(index) + 1;
}
