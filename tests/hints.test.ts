import test from 'node:test';
import assert from 'node:assert/strict';
import { createHint, hintStage, touchFruit } from '../src/hints.ts';

test('addition requires combining before the child counts, each fruit counted once', () => {
  const h = createHint({ a: 3, b: 2, op: '+', answer: 5 });
  assert.equal(hintStage(h), 'combine'); assert.equal(touchFruit(h, 0), null);
  h.combined = true;
  assert.equal(hintStage(h), 'count');
  assert.equal(touchFruit(h, 3), 1); assert.equal(touchFruit(h, 0), 2);
  assert.equal(touchFruit(h, 3), 1); assert.equal(h.counted.length, 2);
  assert.equal(touchFruit(h, 5), null);
});
test('subtraction lets the child remove exactly the operand, then count remaining fruit', () => {
  const h = createHint({ a: 7, b: 3, op: '−', answer: 4 });
  assert.equal(hintStage(h), 'remove');
  assert.equal(touchFruit(h, 6), 1); assert.equal(touchFruit(h, 6), null);
  touchFruit(h, 1); touchFruit(h, 4);
  assert.equal(hintStage(h), 'count'); assert.equal(h.removed.length, 3);
  assert.equal(touchFruit(h, 6), null); assert.equal(touchFruit(h, 0), 1);
  assert.equal(h.removed.length, 3);
});
test('zero and twenty work without pre-counted or pre-removed fruit', () => {
  for (const q of [{ a: 0, b: 0, op: '+' as const, answer: 0 }, { a: 20, b: 0, op: '−' as const, answer: 20 }, { a: 20, b: 20, op: '−' as const, answer: 0 }]) {
    const h = createHint(q); assert.equal(h.counted.length, 0); assert.equal(h.removed.length, 0);
    assert.equal(touchFruit(h, -1), null); assert.equal(touchFruit(h, 100), null);
  }
});
