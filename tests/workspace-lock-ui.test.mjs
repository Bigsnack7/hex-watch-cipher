import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceLock } from '../js/ui/workspace-lock.mjs';

test('workspace lock clears sensitive state, disables controls, and restores prior states on resume', () => {
  const listeners = new Map();
  globalThis.window = {
    addEventListener(name, listener) {
      const entries = listeners.get(name) || new Set();
      entries.add(listener);
      listeners.set(name, entries);
    },
    removeEventListener(name, listener) {
      listeners.get(name)?.delete(listener);
    }
  };
  const controls = [{ disabled: false }, { disabled: true }];
  const card = {
    inert: false,
    attributes: new Map(),
    querySelectorAll: () => controls,
    setAttribute(name, value) { this.attributes.set(name, value); },
    removeAttribute(name) { this.attributes.delete(name); }
  };
  const lockScreen = { hidden: true };
  let resumeHandler;
  let focused = false;
  const resumeButton = {
    addEventListener(name, handler) { if (name === 'click') resumeHandler = handler; },
    removeEventListener(name, handler) { if (resumeHandler === handler) resumeHandler = null; },
    focus() { focused = true; }
  };
  const lockMessage = { textContent: '' };
  let lockCount = 0;
  let resumeCount = 0;
  const lock = createWorkspaceLock({
    card,
    lockScreen,
    resumeButton,
    lockMessage,
    inactivityMs: 60_000,
    onLock() { lockCount++; },
    onResume() { resumeCount++; }
  });

  try {
    listeners.get('pagehide').values().next().value();
    assert.equal(lock.locked, true);
    assert.equal(lockCount, 1);
    assert.equal(card.inert, true);
    assert.equal(card.attributes.get('aria-hidden'), 'true');
    assert.deepEqual(controls.map(control => control.disabled), [true, true]);
    assert.equal(lockScreen.hidden, false);
    assert.match(lockMessage.textContent, /page was hidden/);
    assert.equal(focused, true);

    resumeHandler();
    assert.equal(lock.locked, false);
    assert.equal(resumeCount, 1);
    assert.equal(card.inert, false);
    assert.equal(card.attributes.has('aria-hidden'), false);
    assert.deepEqual(controls.map(control => control.disabled), [false, true]);
    assert.equal(lockScreen.hidden, true);
  } finally {
    lock.dispose();
    delete globalThis.window;
  }

  assert.equal(listeners.get('pagehide').size, 0);
  assert.equal(listeners.get('pageshow').size, 0);
  assert.equal(resumeHandler, null);
});
