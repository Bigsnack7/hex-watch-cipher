import test from 'node:test';
import assert from 'node:assert/strict';
import { createInactivityTimer } from '../js/session-lock.mjs';

function makeFakeTimers() {
  let nextId = 0;
  const tasks = new Map();
  return {
    tasks,
    setTimeout(callback, delay) {
      const id = ++nextId;
      tasks.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      tasks.delete(id);
    },
    fire(id) {
      const task = tasks.get(id);
      if (!task) return;
      tasks.delete(id);
      task.callback();
    }
  };
}

test('inactivity timer fires once after the full idle period and can be rearmed', () => {
  const timers = makeFakeTimers();
  let lockCount = 0;
  const timer = createInactivityTimer(() => lockCount++, 300_000, timers);
  timer.reset();
  const firstId = [...timers.tasks.keys()][0];
  assert.equal(timers.tasks.get(firstId).delay, 300_000);
  timer.reset();
  assert.equal(timers.tasks.has(firstId), false);
  const currentId = [...timers.tasks.keys()][0];
  timers.fire(currentId);
  assert.equal(lockCount, 1);
  assert.equal(timers.tasks.size, 0);
  timer.reset();
  timers.fire([...timers.tasks.keys()][0]);
  assert.equal(lockCount, 2);
});

test('cancel prevents a pending or future idle callback', () => {
  const timers = makeFakeTimers();
  let lockCount = 0;
  const timer = createInactivityTimer(() => lockCount++, 300_000, timers);
  timer.reset();
  timer.cancel();
  assert.equal(timers.tasks.size, 0);
  timer.reset();
  assert.equal(timers.tasks.size, 0);
  assert.equal(lockCount, 0);
});
