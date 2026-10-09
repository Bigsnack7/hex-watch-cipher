import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioController, getNarrationGuide, NARRATION_GUIDES } from '../js/ui/audio.mjs';

const expectedModes = {
  aes: ['CT1', 'access key', 'Decrypt message'],
  cbc: ['CBC1', 'authentication', 'Decrypt message'],
  rsa: ['RSA1', 'fingerprint', 'private key'],
  hybrid: ['RSA1', 'AES-256-GCM', 'private key'],
  legacy: ['Grumpy v2', 'Encrypt message', 'Decrypt message']
};

test('narration has a distinct how-it-works and usage guide for every encryption method', () => {
  assert.deepEqual(Object.keys(NARRATION_GUIDES), Object.keys(expectedModes));
  for (const [mode, phrases] of Object.entries(expectedModes)) {
    const guide = getNarrationGuide(mode);
    assert.equal(guide.length, 3, `${mode} guide should explain the method and give actionable steps`);
    const text = guide.join(' ').toLowerCase();
    for (const phrase of phrases) {
      assert.ok(text.includes(phrase.toLowerCase()), `${mode} narration should mention ${phrase}`);
    }
  }
  assert.equal(getNarrationGuide('unknown'), getNarrationGuide('aes'));
});

test('active narration switches immediately to the guide for the newly selected method', async () => {
  const elements = new Map();
  const utterances = [];
  const eventListeners = new Map();
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const makeElement = () => ({
    textContent: '',
    attributes: new Map(),
    classList: { add() {}, remove() {} },
    addEventListener(name, handler) {
      const listeners = eventListeners.get(this) || new Map();
      listeners.set(name, handler);
      eventListeners.set(this, listeners);
    },
    setAttribute(name, value) { this.attributes.set(name, value); }
  });
  globalThis.document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
      return elements.get(id);
    },
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.window = {
    speechSynthesis: {
      speak(utterance) { utterances.push(utterance); },
      cancel() {},
      getVoices() { return []; },
      pause() {},
      resume() {}
    },
    SpeechSynthesisUtterance: class {
      constructor(text) { this.text = text; }
    },
    addEventListener() {}
  };

  try {
    const controller = createAudioController({ isLocked: () => false });
    controller.setNarrationMode('aes');
    const narrationButton = elements.get('voxB');
    await eventListeners.get(narrationButton).get('click')();
    assert.match(utterances.at(-1).text, /AES-256-GCM/);

    controller.setNarrationMode('cbc');
    assert.match(utterances.at(-1).text, /CBC with HMAC/);
    controller.setNarrationMode('rsa');
    assert.match(utterances.at(-1).text, /AES-256-GCM key/);
    controller.setNarrationMode('legacy');
    assert.match(utterances.at(-1).text, /Grumpy v2 encryption and decryption are available/);
    assert.equal(elements.get('ntext').textContent, `"${utterances.at(-1).text}"`);
    controller.reset();
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('narration explains focused controls and selected-method benefits while enabled', async () => {
  const elements = new Map();
  const utterances = [];
  const documentListeners = new Map();
  const elementListeners = new Map();
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const makeElement = id => ({
    id,
    textContent: '',
    attributes: new Map(),
    classList: { add() {}, remove() {} },
    addEventListener(name, handler) {
      const listeners = elementListeners.get(this) || new Map();
      listeners.set(name, handler);
      elementListeners.set(this, listeners);
    },
    setAttribute(name, value) { this.attributes.set(name, value); }
  });
  globalThis.document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    addEventListener(name, handler) { documentListeners.set(name, handler); },
    removeEventListener(name, handler) {
      if (documentListeners.get(name) === handler) documentListeners.delete(name);
    }
  };
  globalThis.window = {
    speechSynthesis: {
      speak(utterance) { utterances.push(utterance); },
      cancel() {},
      getVoices() { return []; },
      pause() {},
      resume() {}
    },
    SpeechSynthesisUtterance: class {
      constructor(text) { this.text = text; }
    },
    addEventListener() {}
  };

  try {
    const controller = createAudioController({ isLocked: () => false });
    const narrationButton = elements.get('voxB');
    await elementListeners.get(narrationButton).get('click')();
    const previousCount = utterances.length;
    const focusin = documentListeners.get('focusin');
    const control = id => ({ closest: () => ({ id, tagName: 'INPUT' }) });

    controller.setNarrationMode('cbc');
    focusin({ target: control('key') });
    assert.match(utterances.at(-1).text, /Access key field/);
    assert.match(utterances.at(-1).text, /passphrase/);
    assert.match(utterances.at(-1).text, /CBC with HMAC is provided for compatibility/);

    const afterFocus = utterances.length;
    documentListeners.get('click')({ target: control('key') });
    assert.equal(utterances.length, afterFocus, 'click after focus should not announce twice');

    focusin({ target: control('inp') });
    assert.match(utterances.at(-1).text, /Message or encrypted token field/);
    focusin({ target: control('encB') });
    assert.match(utterances.at(-1).text, /Encrypt message button/);
    controller.setNarrationMode('hybrid');
    focusin({ target: control('rsaPublic') });
    assert.match(utterances.at(-1).text, /SPKI PEM format/);
    assert.match(utterances.at(-1).text, /RSA public-key delivery/);
    focusin({ target: control('rsaPrivate') });
    assert.match(utterances.at(-1).text, /matching PKCS#8 private key/);
    focusin({ target: control('out') });
    assert.match(utterances.at(-1).text, /Result area/);
    focusin({ target: control('migrateLegacy') });
    assert.match(utterances.at(-1).text, /Prepare AES-GCM migration button/);
    assert.match(utterances.at(-1).text, /clears the old passphrase/);
    assert.ok(utterances.length > previousCount);
    controller.reset();
    assert.equal(documentListeners.has('focusin'), false);
    assert.equal(documentListeners.has('click'), false);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
