import test from 'node:test';
import assert from 'node:assert/strict';
import { grade } from '../src/services/grading.service.js';
import { computeHearts } from '../src/services/state.service.js';
import { units, exerciseById } from '../src/services/content.service.js';

test('grades multiple choice by index', () => {
  const ex = { type: 'mc', options: ['a', 'b'], answer: 1 };
  assert.equal(grade(ex, 1), true);
  assert.equal(grade(ex, '1'), true);
  assert.equal(grade(ex, 0), false);
  assert.equal(grade(ex, 'nonsense'), false);
});

test('grades numeric with tolerance', () => {
  const ex = { type: 'numeric', answer: 0.333, tolerance: 0.01 };
  assert.equal(grade(ex, 0.3333), true);
  assert.equal(grade(ex, '1/3'), false); // strings that are not numbers fail safely
  assert.equal(grade(ex, 0.5), false);
  assert.equal(grade(ex, Infinity), false);
});

test('hearts regenerate one per interval and cap at max', () => {
  const REGEN = 30 * 60 * 1000;
  const now = Date.now();
  assert.equal(computeHearts(2, now - REGEN, now).hearts, 3);
  assert.equal(computeHearts(2, now - 10 * REGEN, now).hearts, 5);
  assert.equal(computeHearts(5, now - REGEN, now).hearts, 5);
  assert.equal(computeHearts(0, now, now).nextHeartInMs, REGEN);
});

test('content is well-formed', () => {
  assert.equal(units.length, 6);
  for (const [, { exercise }] of exerciseById) {
    assert.ok(exercise.prompt.length > 0);
    assert.ok(exercise.explanation.length > 0);
    if (exercise.type === 'mc') {
      assert.ok(Number.isInteger(exercise.answer));
      assert.ok(exercise.answer >= 0 && exercise.answer < exercise.options.length);
    } else if (exercise.type === 'numeric') {
      assert.ok(Number.isFinite(exercise.answer));
    } else {
      assert.fail(`unknown exercise type ${exercise.type}`);
    }
  }
});
