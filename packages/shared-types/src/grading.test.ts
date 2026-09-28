import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gradeAttempt } from './index.ts';

test('28-30 is grade 5', () => {
  assert.equal(gradeAttempt(28, 30).grade, 5);
  assert.equal(gradeAttempt(30, 30).grade, 5);
});

test('24-27 is grade 4', () => {
  assert.equal(gradeAttempt(24, 30).grade, 4);
  assert.equal(gradeAttempt(27, 30).grade, 4);
});

test('15-23 is grade 3', () => {
  assert.equal(gradeAttempt(15, 30).grade, 3);
  assert.equal(gradeAttempt(23, 30).grade, 3);
});

test('0-14 is failed', () => {
  assert.equal(gradeAttempt(0, 30).grade, 'failed');
  assert.equal(gradeAttempt(14, 30).grade, 'failed');
  assert.equal(gradeAttempt(14, 30).passed, false);
});
