import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, LEVELS, choices, DEFAULT_SETTINGS, isSettings } from '../src/questions.ts';
import { createSession, submit, next, skip, summary, isSession, restoreSession } from '../src/session.ts';

function rng(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
for (const level of LEVELS) for (const operation of ['mixed', 'add', 'subtract'] as const) for (const count of [15,20] as const) {
  test(`${level.id}/${operation}/${count}: valid, balanced, bounded, no exact repeats`, () => {
    for (let seed = 0; seed < 60; seed++) {
      const { questions } = generate({ level: level.id, operation, count, input: 'keypad' }, rng(seed));
      assert.equal(questions.length, count);
      assert.equal(new Set(questions.map(q => `${q.a}${q.op}${q.b}`)).size, count);
      for (const q of questions) {
        assert.ok(q.a >= 0 && q.b >= 0 && q.answer >= 0 && q.answer <= level.max);
        assert.equal(q.answer, q.op === '+' ? q.a + q.b : q.a - q.b);
        if (level.id === 'garden') assert.ok(q.op === '+' ? q.a % 10 + q.b % 10 < 10 : q.a % 10 >= q.b % 10);
        if (operation !== 'mixed') assert.equal(q.op, operation === 'add' ? '+' : '−');
      }
      if (operation === 'mixed') assert.equal(questions.filter(q => q.op === '+').length, Math.ceil(count / 2));
      if (level.id === 'challenge') assert.ok(questions.filter(q => q.op === '+' ? q.a % 10 + q.b % 10 >= 10 : q.a % 10 < q.b % 10).length >= (operation === 'mixed' ? 6 : 3));
    }
  });
}
test('small pool relaxes swapped sums without hanging or exact repetition', () => {
  const set = generate({ ...DEFAULT_SETTINGS, level: 'seed', operation: 'add', count: 20 }, rng(2));
  assert.ok(set.notice);
  assert.equal(set.questions.length, 20);
});
test('choice options are distinct, in bounds and always include zero or twenty when correct', () => {
  for (const answer of [0,1,5,10,19,20]) for (let i = 0; i < 20; i++) {
    const opts = choices({ a: answer, b: 0, op: '+', answer }, 20);
    assert.equal(opts.length, 3); assert.equal(new Set(opts).size, 3); assert.ok(opts.includes(answer));
    assert.ok(opts.every(n => n >= 0 && n <= 20));
  }
});
test('a repeated answer cannot double-submit or skip unanswered questions', () => {
  const s = createSession(DEFAULT_SETTINGS, [{ a: 2, b: 3, op: '+', answer: 5 }, { a: 5, b: 5, op: '−', answer: 0 }]);
  next(s); assert.equal(s.index, 0);
  assert.equal(submit(s, 5), true); assert.equal(submit(s, 5), false); assert.equal(s.records[0].attempts, 1);
  next(s); assert.equal(s.index, 1); assert.equal(s.completed, false);
  assert.equal(submit(s, 0), true); next(s); assert.equal(s.completed, true);
  assert.equal(summary(s).firstCorrect, 2);
});
test('retry success stays separate from first-correct; help is recorded', () => {
  const s = createSession(DEFAULT_SETTINGS, [{ a: 8, b: 3, op: '−', answer: 5 }]);
  s.records[0].helped = true;
  submit(s, 4); assert.equal(s.records[0].status, 'retry');
  submit(s, 5); assert.equal(s.records[0].status, 'correct'); next(s);
  const stats = summary(s); assert.equal(stats.firstCorrect, 0); assert.equal(stats.retried, 1); assert.equal(stats.helped, 1); assert.equal(stats.review.length, 1);
});
test('repeated mistakes never reveal an answer or end the question; zero can still succeed', () => {
  const s = createSession(DEFAULT_SETTINGS, [{ a: 0, b: 0, op: '+', answer: 0 }]);
  assert.equal(submit(s, NaN), false); assert.equal(submit(s, -1), false);
  for (let i = 0; i < 6; i++) { submit(s, 1); assert.equal(s.records[0].status, 'retry'); }
  next(s); assert.equal(s.completed, false);
  assert.equal(submit(s, 0), true); assert.equal(s.records[0].status, 'correct');
  next(s); assert.equal(s.completed, true); assert.equal(summary(s).firstCorrect, 0);
});
test('local save survives JSON roundtrip and rejects malformed records', () => {
  const s = createSession(DEFAULT_SETTINGS, generate(DEFAULT_SETTINGS).questions);
  submit(s, 2); assert.ok(isSession(JSON.parse(JSON.stringify(s))));
  assert.equal(isSession({ ...s, index: 200 }), false);
  const broken = JSON.parse(JSON.stringify(s)); broken.records[0].question.answer = 999; assert.equal(isSession(broken), false);
  assert.equal(isSettings({ ...DEFAULT_SETTINGS, count: 999 }), false);
});

test('automatic judging waits indefinitely for a second digit without recording a wrong attempt', async () => {
  const { assessEntry } = await import('../src/session.ts');
  const s = createSession(DEFAULT_SETTINGS, [{ a: 8, b: 4, op: '+', answer: 12 }]);
  assert.equal(assessEntry('', 12), 'incomplete');
  assert.equal(assessEntry('1', 12), 'incomplete');
  assert.equal(s.records[0].attempts, 0);
  assert.equal(assessEntry('12', 12), 'correct');
  submit(s, 12); assert.equal(s.records[0].status, 'correct');
  assert.equal(summary(s).firstCorrect, 1);
  assert.equal(assessEntry('2', 20), 'incomplete');
  assert.equal(assessEntry('20', 20), 'correct');
});
test('automatic judging accepts zero immediately and rejects wrong digits and wrong complete answers', async () => {
  const { assessEntry } = await import('../src/session.ts');
  assert.equal(assessEntry('0', 0), 'correct');
  assert.equal(assessEntry('1', 1), 'correct');
  assert.equal(assessEntry('3', 12), 'wrong');
  assert.equal(assessEntry('11', 12), 'wrong');
  assert.equal(assessEntry('0', 12), 'wrong');
});

test('independent, assisted and skipped outcomes remain distinct', () => {
  const s = createSession(DEFAULT_SETTINGS, [
    { a: 2, b: 3, op: '+', answer: 5 }, { a: 3, b: 1, op: '−', answer: 2 }, { a: 4, b: 4, op: '−', answer: 0 },
  ]);
  submit(s, 4); submit(s, 5); next(s);
  s.records[1].helped = true; submit(s, 2); next(s);
  skip(s);
  const stats = summary(s);
  assert.equal(stats.independent, 1); assert.equal(stats.withHelp, 1); assert.equal(stats.skipped, 1);
  assert.equal(stats.solved, 2); assert.equal(stats.firstCorrect, 1); assert.equal(s.completed, true);
  assert.equal(submit(s, 0), false);
});
test('skipping a fresh question does not fabricate a first answer', () => {
  const s = createSession(DEFAULT_SETTINGS, [{ a: 1, b: 1, op: '+', answer: 2 }]);
  assert.equal(summary(s).review.length, 0);
  skip(s); assert.equal(s.records[0].firstAnswer, null); assert.equal(s.records[0].attempts, 0);
  assert.equal(summary(s).firstCorrect, 0); assert.equal(summary(s).review.length, 1);
});
test('previously revealed saves restore as skipped, never as child success', () => {
  const s = createSession(DEFAULT_SETTINGS, [{ a: 2, b: 2, op: '+', answer: 4 }]);
  const legacy = JSON.parse(JSON.stringify(s)); legacy.records[0].status = 'revealed'; legacy.records[0].attempts = 2; legacy.records[0].firstAnswer = 3;
  const restored = restoreSession(legacy)!;
  assert.ok(restored); assert.equal(restored.records[0].status, 'skipped'); assert.equal(restored.completed, true);
  assert.equal(summary(restored).solved, 0);
});
