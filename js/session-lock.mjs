export function createInactivityTimer(onTimeout, delayMs, timers = globalThis) {
  let timerId = null;
  let disposed = false;

  function reset() {
    if (disposed) return;
    if (timerId !== null) timers.clearTimeout(timerId);
    timerId = timers.setTimeout(() => {
      timerId = null;
      if (!disposed) onTimeout();
    }, delayMs);
  }

  function cancel() {
    if (timerId !== null) timers.clearTimeout(timerId);
    timerId = null;
    disposed = true;
  }

  return { reset, cancel };
}
