import test from 'node:test';
import assert from 'node:assert/strict';
import { createResult, normalizeName, updateLeaderboard } from '../../public/games/ten-second-challenge/js/scoring.js';
import { ChallengeTimer } from '../../public/games/ten-second-challenge/js/timer.js';
import { loadState, saveState } from '../../public/games/ten-second-challenge/js/storage.js';

test('only an exact millisecond result receives full marks', () => {
  assert.equal(createResult(10_000, 'A', 1).score, 1000);
  assert.ok(createResult(10_001, 'A', 1).score < 1000);
  assert.equal(createResult(9_980, 'A', 1).score, createResult(10_020, 'A', 1).score);
  assert.equal(createResult(10_000.4, 'A', 1).elapsedMs, 10_000);
  assert.equal(createResult(60_000, 'A', 1).score, 0);
});

test('leaderboard retains every attempt and ranks equal errors by achievement time', () => {
  let entries = updateLeaderboard([], createResult(10_020, 'A', 1));
  entries = updateLeaderboard(entries, createResult(9_980, 'B', 2));
  assert.deepEqual(entries.map((entry) => entry.name), ['A', 'B']);
  entries = updateLeaderboard(entries, createResult(10_200, 'A', 3));
  assert.equal(entries[0].elapsedMs, 10_020);
  entries = updateLeaderboard(entries, createResult(10_001, 'B', 4));
  assert.deepEqual(entries.map((entry) => entry.name), ['B', 'A', 'B', 'A']);
  assert.deepEqual(entries.map((entry) => entry.errorMs), [1, 20, 20, 200]);
  entries = updateLeaderboard(entries, createResult(10_020, 'A', 5));
  assert.deepEqual(entries.map((entry) => entry.achievedAt), [4, 1, 2, 5, 3]);
  assert.equal(entries.length, 5);
  assert.equal(normalizeName('  '), '玩家一号');
});

test('timer measures elapsed monotonic time even without animation frames', (t) => {
  let now = 100;
  const ticks = [];
  t.mock.method(performance, 'now', () => now);
  const oldRaf = globalThis.requestAnimationFrame;
  const oldCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  t.after(() => {
    if (oldRaf) globalThis.requestAnimationFrame = oldRaf; else delete globalThis.requestAnimationFrame;
    if (oldCancel) globalThis.cancelAnimationFrame = oldCancel; else delete globalThis.cancelAnimationFrame;
  });
  const timer = new ChallengeTimer((value) => ticks.push(value));
  timer.start();
  now = 10_123;
  assert.equal(timer.stop(), 10_023);
  assert.equal(ticks.at(-1), 10_023);
  assert.equal(timer.running, false);
  timer.start();
  timer.cancel();
  assert.equal(timer.running, false);
});

test('storage restores results, rejects malformed rows, and tolerates access failures', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored = null;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => stored,
    setItem: (_key, value) => { stored = value; },
  } });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });
  const result = createResult(10_013, 'A', 1);
  const state = { name: 'A', entries: [result], attempts: 1, last: result };
  assert.equal(saveState(state), true);
  assert.deepEqual(loadState().state, state);
  stored = JSON.stringify({ ...state, entries: [result, { name: 'fake', elapsedMs: 'bad' }] });
  assert.equal(loadState().state.entries.length, 1);
  stored = '{invalid';
  assert.equal(loadState().available, false);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
  assert.equal(loadState().available, false);
  assert.equal(saveState(state), false);
});
