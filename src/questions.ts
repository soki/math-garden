export type Level = 'seed' | 'sprout' | 'garden' | 'challenge';
export type Operation = 'mixed' | 'add' | 'subtract';
export type InputMode = 'keypad' | 'choices';
export interface Settings { level: Level; operation: Operation; count: 15 | 20; input: InputMode }
export interface Question { a: number; b: number; op: '+' | '−'; answer: number }
export const LEVELS: { id: Level; name: string; description: string; max: number; icon: string }[] = [
  { id: 'seed', name: '小种子', description: '5以内加减法', max: 5, icon: 'seed' },
  { id: 'sprout', name: '小花苗', description: '10以内加减法', max: 10, icon: 'sprout' },
  { id: 'garden', name: '小花园', description: '20以内 · 不进退位', max: 20, icon: 'flower' },
  { id: 'challenge', name: '小挑战', description: '20以内 · 含进退位', max: 20, icon: 'sun' },
];
export const DEFAULT_SETTINGS: Settings = { level: 'sprout', operation: 'mixed', count: 15, input: 'keypad' };
export function isSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false;
  const s = value as Settings;
  return LEVELS.some(l => l.id === s.level) && ['mixed', 'add', 'subtract'].includes(s.operation)
    && [15, 20].includes(s.count) && ['keypad', 'choices'].includes(s.input);
}
export function pool(level: Level): Question[] {
  const max = LEVELS.find(l => l.id === level)!.max;
  const questions: Question[] = [];
  for (let a = 0; a <= max; a++) for (let b = 0; b <= max; b++) {
    if (a + b <= max && (level !== 'garden' || a % 10 + b % 10 < 10)) questions.push({ a, b, op: '+', answer: a + b });
    if (a >= b && (level !== 'garden' || a % 10 >= b % 10)) questions.push({ a, b, op: '−', answer: a - b });
  }
  return questions;
}
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function canonical(q: Question) { return q.op === '+' ? `+${Math.min(q.a, q.b)},${Math.max(q.a, q.b)}` : `-${q.a},${q.b}`; }
export function generate(settings: Settings, random = Math.random): { questions: Question[]; notice: string } {
  const all = pool(settings.level);
  const targets: [Question['op'], number][] = settings.operation === 'mixed'
    ? [['+', Math.ceil(settings.count / 2)], ['−', Math.floor(settings.count / 2)]]
    : [[settings.operation === 'add' ? '+' : '−', settings.count]];
  const chosen: Question[] = [];
  const used = new Set<string>();
  let relaxed = false;
  for (const [op, count] of targets) {
    const candidates = shuffle(all.filter(q => q.op === op), random);
    // Keep easy identity/zero facts occasional, then fill from the finite pool.
    const trivial = (q: Question) => q.a === 0 || q.b === 0 || q.answer === 0;
    const normal = candidates.filter(q => !trivial(q));
    const easy = candidates.filter(trivial);
    const preferred = [...normal.slice(0, Math.max(0, count - 2)), ...easy.slice(0, 2), ...normal.slice(Math.max(0, count - 2)), ...easy.slice(2)];
    const selected: Question[] = [];
    for (const q of preferred) {
      if (selected.length === count) break;
      if (!used.has(canonical(q))) { selected.push(q); used.add(canonical(q)); }
    }
    if (selected.length < count) {
      relaxed = true;
      for (const q of candidates) {
        if (selected.length === count) break;
        if (!selected.includes(q)) selected.push(q);
      }
    }
    chosen.push(...selected);
  }
  // Give challenge sessions a meaningful number of carrying/borrowing facts.
  if (settings.level === 'challenge') {
    const crossing = (q: Question) => q.op === '+' ? q.a % 10 + q.b % 10 >= 10 : q.a % 10 < q.b % 10;
    for (const [op] of targets) {
      const needed = Math.min(3, chosen.filter(q => q.op === op).length);
      const extra = shuffle(all.filter(q => q.op === op && crossing(q) && !chosen.some(c => canonical(c) === canonical(q))), random);
      let have = chosen.filter(q => q.op === op && crossing(q)).length;
      for (let i = 0; i < chosen.length && have < needed && extra.length; i++) {
        if (chosen[i].op === op && !crossing(chosen[i])) { chosen[i] = extra.pop()!; have++; }
      }
    }
  }
  return { questions: shuffle(chosen, random), notice: relaxed ? '这个范围的题目较少，本轮包含交换加数的练习；相同题目不会重复。' : '' };
}
export function choices(q: Question, max: number): number[] {
  const alternatives = [...new Set([q.answer - 1, q.answer + 1, q.answer - 2, q.answer + 2])]
    .filter(n => n >= 0 && n <= max && n !== q.answer);
  return shuffle([q.answer, ...shuffle(alternatives).slice(0, 2)]);
}
