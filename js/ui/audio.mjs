export const NARRATION_GUIDES = Object.freeze({
  aes: Object.freeze([
    'AES-256-GCM is recommended for password-based messages. It uses your access key to derive an encryption key and authenticates the encrypted message, so a wrong key or altered token is rejected.',
    'To encrypt: enter a long, unique access key and your message, then select Encrypt message. Share the resulting CT1 token and the access key separately.',
    'To decrypt: paste the complete CT1 token into the message field, enter the same access key, and select Decrypt message. For files, use the file controls; file encryption uses AES-GCM regardless of the selected text method.'
  ]),
  cbc: Object.freeze([
    'AES-256-CBC with HMAC is a compatibility method. It encrypts the message and adds a separate authentication check; the app verifies that check before decrypting. Prefer AES-GCM for new messages.',
    'To encrypt: enter a long, unique access key and your message, then select Encrypt message. Share the CBC1 token and the access key separately.',
    'To decrypt: paste the complete CBC1 token, enter the same access key, and select Decrypt message. Modified data or a wrong key is rejected. File encryption still uses AES-GCM.'
  ]),
  rsa: Object.freeze([
    'RSA mode is hybrid encryption, not direct RSA encryption of the whole message. A random AES-256-GCM key encrypts the message, and RSA-OAEP with SHA-256 protects that temporary key. It uses the RSA1 format.',
    'To encrypt: generate a key pair for yourself or paste the recipient public key in SPKI PEM format. Verify its SHA-256 fingerprint with the recipient through a trusted separate channel, enter your message, then select Encrypt message.',
    'Share the RSA1 token with the recipient. Do not share a private key. To decrypt, the recipient pastes the token, provides the matching private key in the private-key field, and selects Decrypt message. The access-key field is not used for RSA text messages.'
  ]),
  hybrid: Object.freeze([
    'Hybrid AES-256-GCM plus RSA-OAEP is the recommended public-key method. It uses a fresh random AES-256-GCM key for the message and RSA-OAEP with SHA-256 to wrap that key. It uses the same RSA1 format as the other RSA selector.',
    'To encrypt: generate a key pair for yourself or paste the recipient public key in SPKI PEM format. Verify its SHA-256 fingerprint through a trusted separate channel, enter your message, then select Encrypt message.',
    'Share the RSA1 token with the recipient, never the private key. To decrypt, the recipient pastes the token, supplies the matching private key, and selects Decrypt message. The access-key field is not used for RSA text messages.'
  ]),
  legacy: Object.freeze([
    'Grumpy v2 encryption and decryption are available for legacy compatibility, but the cipher is cryptographically insecure. It does not provide reliable confidentiality or tamper detection. Never use it to protect sensitive information; prefer AES-256-GCM.',
    'For legacy compatibility or testing: select this method, enter a non-empty key, enter the message and select Encrypt message, or paste existing ciphertext and select Decrypt message. This uses the old format and is not safe for new sensitive messages.',
    'For new messages, use AES-256-GCM or a verified RSA hybrid method. After decrypting old Grumpy v2 text, use Prepare AES-256-GCM migration to re-encrypt it securely. File encryption always uses AES-GCM.'
  ])
});

export function getNarrationGuide(mode) {
  return NARRATION_GUIDES[mode] || NARRATION_GUIDES.aes;
}

export function createAudioController({ isLocked }) {
  const $ = id => document.getElementById(id);
  const light = $('light');
  const narration = $('narr');
  const narrationText = $('ntext');
  const audioStatus = $('audioStatus');
  const toggles = [];
  let context = null;
  let soundEffects = false;
  let narrationEnabled = false;
  let resetNarrationToggle = () => {};
  let narrationRunning = false;
  let narrationGeneration = 0;
  let narrationIndex = 0;
  let narrationMode = 'aes';
  let narrationGuide = getNarrationGuide(narrationMode);
  let narrationTimer = 0;
  let voice = null;

  const effects = {
    encrypt: [[440, 0, .08], [660, .1, .08], [880, .2, .14, .18]],
    decrypt: [[880, 0, .08], [660, .1, .16, .18]],
    blip: [[1200, 0, .05, .1, 'sine']],
    click: [[300, 0, .04, .06]]
  };
  const speech = typeof window.speechSynthesis !== 'undefined' &&
    typeof window.speechSynthesis.speak === 'function' &&
    typeof window.speechSynthesis.cancel === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function';

  function reportError(error) {
    audioStatus.textContent = error.message === 'speech-unavailable'
      ? 'Narration is not supported by this browser.'
      : error.message === 'audio-unavailable'
        ? 'Audio is not supported by this browser.'
        : error.name === 'NotAllowedError'
          ? 'Audio was blocked by the browser. Click the audio control again to allow playback.'
          : error.message === 'audio-suspended'
            ? 'Audio is paused by the browser. Reload this page, then enable audio again.'
            : `Could not start audio${error.message ? `: ${error.message}` : ''}. Check browser audio settings and try again.`;
    audioStatus.classList.add('error');
  }

  async function getContext() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) throw new Error('audio-unavailable');
    if (!context || context.state === 'closed' || context.state === 'interrupted') {
      context = new AudioContextCtor();
    }
    if (context.state !== 'running') await context.resume();
    if (context.state !== 'running') throw new Error('audio-suspended');
    return context;
  }

  function playTone(name) {
    if (!soundEffects) return;
    getContext().then(audioContext => {
      const start = audioContext.currentTime;
      effects[name].forEach(([frequency, offset, duration, volume = .15, type = 'square']) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const at = start + offset;
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(volume, at + .01);
        gain.gain.setValueAtTime(volume, at + duration - .02);
        gain.gain.linearRampToValueAtTime(0, at + duration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(at);
        oscillator.stop(at + duration);
      });
    }).catch(reportError);
  }

  function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    return voices.find(item => /daniel|uk english male|george|ryan|arthur|oliver/i.test(item.name)) ||
      voices.find(item => /^en[-_]gb/i.test(item.lang)) ||
      voices.find(item => /^en/i.test(item.lang)) ||
      voices[0];
  }

  function stopNarration() {
    narrationRunning = false;
    narrationGeneration++;
    clearTimeout(narrationTimer);
    if (speech) window.speechSynthesis.cancel();
    narration.classList.remove('active');
    light.classList.remove('active');
    narrationText.textContent = 'Off';
  }

  function say(generation) {
    if (generation !== narrationGeneration || !narrationRunning) return;
    if (narrationIndex >= narrationGuide.length) {
      narrationIndex = 0;
      narrationTimer = setTimeout(() => say(generation), 10_000);
      return;
    }
    if (document.hidden) {
      narrationTimer = setTimeout(() => say(generation), 2000);
      return;
    }
    try {
      voice = voice || pickVoice();
      const line = narrationGuide[narrationIndex++];
      const utterance = new window.SpeechSynthesisUtterance(line);
      if (voice) utterance.voice = voice;
      utterance.rate = .82;
      utterance.pitch = .75;
      utterance.volume = .85;
      narrationText.textContent = `"${line}"`;
      narration.classList.add('active');
      light.classList.add('active');
      utterance.onend = () => {
        if (generation !== narrationGeneration) return;
        narration.classList.remove('active');
        light.classList.remove('active');
        narrationTimer = setTimeout(() => say(generation), 3000);
      };
      utterance.onerror = () => {
        if (generation !== narrationGeneration) return;
        stopNarration();
        narrationEnabled = false;
        resetNarrationToggle();
        audioStatus.textContent = 'Narration could not play. Check your browser speech settings.';
        audioStatus.classList.add('error');
      };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      if (generation !== narrationGeneration) return;
      narrationRunning = false;
      narration.classList.remove('active');
      light.classList.remove('active');
      narrationText.textContent = 'Off';
      $('voxB').textContent = 'Narration: Off';
      $('voxB').setAttribute('aria-pressed', 'false');
      throw error;
    }
  }

  function startNarration() {
    if (!speech) throw new Error('speech-unavailable');
    if (narrationRunning) return;
    audioStatus.textContent = '';
    audioStatus.classList.remove('error');
    narrationRunning = true;
    say(++narrationGeneration);
  }

  function setNarrationMode(mode) {
    if (!NARRATION_GUIDES[mode] || mode === narrationMode) return;
    narrationMode = mode;
    narrationGuide = getNarrationGuide(mode);
    narrationIndex = 0;
    if (narrationRunning) {
      stopNarration();
      narrationRunning = true;
      say(++narrationGeneration);
    }
  }

  function getContextualGuide(target) {
    const element = target.closest('input,textarea,select,button,label,.field-hint,.otext');
    if (!element) return null;
    const id = element.tagName === 'LABEL' ? element.htmlFor : element.id;
    const method = NARRATION_GUIDES[narrationMode];
    const why = {
      aes: 'AES-GCM is the recommended password-based choice because encryption and tamper detection are built into one widely supported mode.',
      cbc: 'CBC with HMAC is provided for compatibility with CBC-based workflows; AES-GCM is generally simpler for new messages.',
      rsa: 'RSA hybrid mode is useful when the sender should encrypt to a recipient public key instead of sharing an access key first.',
      hybrid: 'This hybrid method combines fast AES-GCM message encryption with RSA public-key delivery of the AES key, so sender and recipient do not need to share a message password.',
      legacy: 'Grumpy v2 is not better for security. It is available for old-format compatibility and testing, but use AES-GCM or verified RSA hybrid encryption for new messages.'
    }[narrationMode];
    const accessKey = narrationMode === 'rsa' || narrationMode === 'hybrid'
      ? 'The access key is not used for RSA text messages. It is used for file encryption and password-based modes.'
      : narrationMode === 'legacy'
        ? 'For Grumpy v2 compatibility or testing, enter the legacy key. This cipher is insecure, does not reliably protect confidentiality or detect tampering, and is not suitable for new or sensitive messages.'
        : 'The access key is the passphrase from which this mode derives its encryption key. Use a long, unique passphrase and share it separately from the encrypted token.';
    const guides = {
      mode: `Encryption method selector. ${method[0]} ${why}`,
      key: `Access key field. ${accessKey}`,
      inp: `Message or encrypted token field. Type the original message here before encryption, or paste the complete encrypted token here before decryption. ${why}`,
      encB: `Encrypt message button. It encrypts the text in the message field using the selected method and displays an encrypted result. ${why}`,
      decB: `Decrypt message button. Paste the complete token, provide the matching access key or RSA private key as required, then select this button. Authenticated modes reject a wrong key or modified token. ${why}`,
      clrB: 'Clear button. It clears the current message, result, and selected file from this workspace. It does not delete files you already downloaded.',
      out: 'Result area. It displays either the encrypted token or the decrypted message. Treat decrypted text as sensitive; use Download .txt only to save an encrypted token.',
      copy: 'Copy output button. It copies the current result to the clipboard. Check whether the result is encrypted or plaintext before sharing it.',
      downloadToken: 'Download text button. It saves only the encrypted token as a text file, not the access key or private key.',
      rsaPublic: 'RSA public key field. Paste the recipient public key in SPKI PEM format to encrypt for them. Public keys may be shared, but verify the SHA-256 fingerprint with the recipient through a separate trusted channel.',
      rsaPrivate: 'Private-key PEM field. Paste a matching PKCS#8 private key here to decrypt RSA hybrid messages. Never share this key. Exportable private keys are visible in this page and need a secure backup.',
      rsaKeyMode: 'Private-key handling selector. Non-extractable keys stay in browser memory and cannot be backed up here; exportable PEM keys can be backed up but are visible and must be protected.',
      generateRsa: 'Generate key pair button. It creates an RSA-2048 public and private key pair. The default private key is non-extractable and is lost on reload or privacy lock. Confirm key fingerprints before exchanging public keys.',
      copyPublic: 'Copy public key button. The public key is safe to share, but verify its fingerprint with the intended recipient first.',
      copyPrivate: 'Copy private key button. This copies the exportable private key, which can decrypt messages addressed to it. Store it securely and never share it.',
      migrateLegacy: 'Prepare AES-GCM migration button. It transfers successfully decrypted legacy plaintext into the message field, selects the recommended AES-256-GCM method, and clears the old passphrase. Enter a new strong access key and encrypt to create a modern authenticated token. Grumpy v2 remains insecure.',
      rsaFingerprint: 'Public-key fingerprint. Compare the full SHA-256 fingerprint through a separate trusted channel before using this public key. A matching fingerprint confirms the key bytes match, not the owner identity.',
      fileInput: 'File selection. Choose a file to encrypt or an encrypted file to decrypt. File operations always use chunked AES-256-GCM and the access key, regardless of the selected text method.',
      fileEncrypt: 'Encrypt and download file button. It encrypts the selected file using chunked AES-256-GCM and the access key, then saves an encrypted file.',
      fileDecrypt: 'Decrypt and download file button. It verifies each AES-GCM chunk before writing the corresponding plaintext file. Use the same access key used for encryption.'
    };
    if (guides[id]) return `${guides[id]} ${why}`;
    if (element.id === 'rsaKeyModeHint') return `${guides.rsaKeyMode} ${why}`;
    if (element.id === 'keyHint') return `Access key guidance. ${accessKey} ${why}`;
    if (element.id === 'modeHint') return `${method[0]} ${why}`;
    if (element.id === 'rsaKeySummary' || element.id === 'rsaBackupReminder') return `${guides.rsaKeyMode} ${why}`;
    if (element.id === 'fingerprintStatus') return `${guides.rsaFingerprint} ${why}`;
    if (element.id === 'fileHint' || element.id === 'fileStatus') return `${guides.fileInput} ${why}`;
    return null;
  }

  let lastAnnouncement = '';
  let lastAnnouncementTime = 0;
  function announceContext(event) {
    if (!narrationRunning || isLocked() || document.hidden) return;
    const message = getContextualGuide(event.target);
    if (!message) return;
    const now = Date.now();
    if (message === lastAnnouncement && now - lastAnnouncementTime < 1200) return;
    lastAnnouncement = message;
    lastAnnouncementTime = now;
    clearTimeout(narrationTimer);
    narrationGeneration++;
    const generation = narrationGeneration;
    window.speechSynthesis.cancel();
    try {
      voice = voice || pickVoice();
      const utterance = new window.SpeechSynthesisUtterance(message);
      if (voice) utterance.voice = voice;
      utterance.rate = .82;
      utterance.pitch = .75;
      utterance.volume = .85;
      narrationText.textContent = `"${message}"`;
      narration.classList.add('active');
      light.classList.add('active');
      utterance.onend = () => {
        if (generation !== narrationGeneration) return;
        narration.classList.remove('active');
        light.classList.remove('active');
        narrationTimer = setTimeout(() => say(generation), 1500);
      };
      utterance.onerror = () => {
        if (generation !== narrationGeneration) return;
        narration.classList.remove('active');
        light.classList.remove('active');
        reportError(new Error('speech-failed'));
      };
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      narration.classList.remove('active');
      light.classList.remove('active');
      reportError(error);
    }
  }

  function toggle(button, onLabel, offLabel, action) {
    let enabled = false;
    let pending = false;
    const render = () => {
      button.textContent = enabled ? onLabel : offLabel;
      button.setAttribute('aria-pressed', String(enabled));
    };
    render();
    const reset = () => {
      enabled = false;
      render();
    };
    button.addEventListener('click', async () => {
      if (pending || isLocked()) return;
      pending = true;
      button.disabled = true;
      const next = !enabled;
      enabled = next;
      render();
      try {
        const applied = await action(next);
        if (isLocked()) {
          await action(false);
          enabled = false;
          render();
          return;
        }
        if (applied === false) {
          enabled = !next;
          render();
          return;
        }
        audioStatus.textContent = '';
        audioStatus.classList.remove('error');
      } catch (error) {
        enabled = isLocked() ? false : !next;
        render();
        if (!isLocked()) reportError(error);
      } finally {
        pending = false;
        if (!isLocked()) button.disabled = false;
      }
    });
    toggles.push(reset);
    return reset;
  }

  toggle($('sfxB'), 'Sounds: On', 'Sounds: Off', async enabled => {
    if (enabled) await getContext();
    soundEffects = enabled;
    if (enabled) playTone('click');
  });
  resetNarrationToggle = toggle($('voxB'), 'Narration: On', 'Narration: Off', async enabled => {
    if (enabled) {
      startNarration();
      narrationEnabled = true;
    } else {
      narrationEnabled = false;
      stopNarration();
    }
  });

  if (speech) window.speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
  document.addEventListener('focusin', announceContext);
  document.addEventListener('click', announceContext);
  document.addEventListener('visibilitychange', () => {
    if (context) {
      if (document.hidden) context.suspend().catch(reportError);
      else if (soundEffects) context.resume().catch(reportError);
    }
    if (document.hidden && speech) window.speechSynthesis.pause();
    else if (narrationEnabled && speech) window.speechSynthesis.resume();
  });

  return {
    play: playTone,
    setNarrationMode,
    reset() {
      soundEffects = narrationEnabled = false;
      stopNarration();
      toggles.forEach(reset => reset());
      if (context && context.state !== 'closed') context.suspend().catch(reportError);
      document.removeEventListener('focusin', announceContext);
      document.removeEventListener('click', announceContext);
    }
  }
}
