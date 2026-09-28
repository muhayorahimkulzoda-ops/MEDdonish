import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gradeAttempt } from './grading';

test('0–14 is failed', () => {
  const result = gradeAttempt(14, 30);
  assert.equal(result.grade, 'failed');
  assert.equal(result.passed, false);
});

test('15 is grade 3 and passed', () => {
  const result = gradeAttempt(15, 30);
  assert.equal(result.grade, 3);
  assert.equal(result.passed, true);
});

test('24 is grade 4', () => {
  assert.equal(gradeAttempt(24, 30).grade, 4);
});

test('28 is grade 5', () => {
  assert.equal(gradeAttempt(28, 30).grade, 5);
});
