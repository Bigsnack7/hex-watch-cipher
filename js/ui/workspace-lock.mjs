import { createInactivityTimer } from '../session-lock.mjs';

export function createWorkspaceLock({
  card,
  lockScreen,
  resumeButton,
  lockMessage,
  onLock,
  onResume,
  inactivityMs = 300_000
}) {
  let locked = false;
  let controlStates = [];
  const inactivityTimer = createInactivityTimer(() => {
    lock('The workspace was locked after 5 minutes of inactivity. Sensitive fields and results have been cleared. Your RSA public key is retained; your private key is not.');
  }, inactivityMs);

  function lock(message) {
    if (locked) return;
    locked = true;
    onLock();
    controlStates = [...card.querySelectorAll('button,input,textarea,select')].map(control => ({
      control,
      disabled: control.disabled
    }));
    controlStates.forEach(({ control }) => { control.disabled = true; });
    card.inert = true;
    card.setAttribute('aria-hidden', 'true');
    lockMessage.textContent = message;
    lockScreen.hidden = false;
    resumeButton.focus();
  }

  function resume() {
    if (!locked) return;
    locked = false;
    card.inert = false;
    card.removeAttribute('aria-hidden');
    controlStates.forEach(({ control, disabled }) => { control.disabled = disabled; });
    controlStates = [];
    lockScreen.hidden = true;
    onResume();
    inactivityTimer.reset();
  }

  const bump = () => {
    if (!locked) inactivityTimer.reset();
  };
  ['keydown', 'pointerdown', 'input', 'change', 'wheel'].forEach(eventName => {
    window.addEventListener(eventName, bump, { passive: true });
  });
  const handlePageHide = () => {
    lock('The workspace was locked when the page was hidden. Sensitive fields and results have been cleared. Your RSA public key is retained; your private key is not.');
  };
  const handlePageShow = event => {
    if (event.persisted && locked) {
      lockScreen.hidden = false;
      resumeButton.focus();
    }
  };
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('pageshow', handlePageShow);
  resumeButton.addEventListener('click', resume);
  bump();

  return {
    lock,
    resume,
    get locked() { return locked; },
    dispose() {
      inactivityTimer.cancel();
      ['keydown', 'pointerdown', 'input', 'change', 'wheel'].forEach(eventName => {
        window.removeEventListener(eventName, bump);
      });
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      resumeButton.removeEventListener('click', resume);
    }
  };
}
