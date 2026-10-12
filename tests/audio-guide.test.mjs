import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAudioController,
  getNarrationGuide,
  NARRATION_GUIDES,
  NARRATION_LANGUAGES
} from '../js/ui/audio.mjs';

const expectedModes = {
  aes: ['CT2', 'access key', 'Decrypt message'],
  cbc: ['CBC1', 'authentication', 'Decrypt message'],
  rsa: ['RSA1', 'fingerprint', 'private key'],
  hybrid: ['RSA1', 'AES-256-GCM', 'private key'],
  'rsa-direct': ['RSA2', '190 UTF-8 bytes', 'hybrid RSA'],
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
  assert.deepEqual(getNarrationGuide('unknown'), getNarrationGuide('aes'));
});

test('AES narration reflects the selected derived-key size', () => {
  for (const keyBits of [128, 192, 256]) {
    assert.match(getNarrationGuide('aes', 'en', keyBits)[0], new RegExp(`AES-${keyBits}-GCM`));
    assert.match(getNarrationGuide('aes', 'fr', keyBits)[0], new RegExp(`AES-${keyBits}-GCM`));
  }
});

test('localized guides cover every cipher and include supported speech languages', () => {
  assert.deepEqual(Object.keys(NARRATION_LANGUAGES), ['en', 'yo', 'ig', 'ha', 'pcm', 'es', 'fr']);
  for (const language of Object.keys(NARRATION_LANGUAGES).filter(code => code !== 'en')) {
    for (const mode of Object.keys(NARRATION_GUIDES)) {
      const guide = getNarrationGuide(mode, language);
      assert.equal(guide.length, 3, `${language}/${mode} should have a complete guide`);
      assert.notDeepEqual(guide, NARRATION_GUIDES[mode], `${language}/${mode} should be translated`);
      assert.doesNotMatch(
        guide.join(' '),
        /\bEncrypt message\b|\bDecrypt message\b/,
        `${language}/${mode} should explain the action without relying on English button labels`
      );
    }
  }
});

test('active narration switches immediately to the guide for the newly selected method', async () => {
  const elements = new Map();
  const utterances = [];
  const eventListeners = new Map();
  const documentListeners = new Map();
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
    removeEventListener() {},
    setAttribute(name, value) { this.attributes.set(name, value); }
  });
  globalThis.document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement());
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
    controller.setNarrationMode('aes');
    const narrationButton = elements.get('voxB');
    await eventListeners.get(narrationButton).get('click')();
    assert.match(utterances.at(-1).text, /AES-256-GCM/);

    controller.setNarrationKeySize(128);
    assert.match(utterances.at(-1).text, /AES-128-GCM/);
    documentListeners.get('focusin')({
      target: { closest: () => ({ tagName: 'SELECT', id: 'aesKeySize' }) }
    });
    assert.match(utterances.at(-1).text, /selected derived key is 128 bits/);

    const rsaSizeSelect = elements.get('rsaKeySize');
    for (const keyBits of [2048, 3072, 4096]) {
      rsaSizeSelect.value = String(keyBits);
      eventListeners.get(rsaSizeSelect).get('change')();
      assert.match(utterances.at(-1).text, new RegExp(`will use ${keyBits}-bit RSA`));
    }
    documentListeners.get('focusin')({
      target: { closest: () => ({ tagName: 'SELECT', id: 'rsaKeySize' }) }
    });
    assert.match(utterances.at(-1).text, /New key pairs generated here will use 4096-bit RSA/);
    documentListeners.get('focusin')({
      target: { closest: () => ({ tagName: 'BUTTON', id: 'generateRsa' }) }
    });
    assert.match(utterances.at(-1).text, /creates a 4096-bit RSA public and private key pair/);

    controller.setNarrationMode('cbc');
    assert.match(utterances.at(-1).text, /CBC with HMAC/);
    controller.setNarrationMode('rsa');
    assert.match(utterances.at(-1).text, /AES-256-GCM key/);
    assert.match(utterances.at(-1).text, /4096-bit RSA/);
    controller.setNarrationMode('legacy');
    assert.match(utterances.at(-1).text, /Grumpy v2 encryption and decryption are available/);
    assert.equal(elements.get('ntext').textContent, `"${utterances.at(-1).text}"`);
    controller.reset();
    rsaSizeSelect.value = '2048';
    await eventListeners.get(narrationButton).get('click')();
    eventListeners.get(rsaSizeSelect).get('change')();
    assert.match(utterances.at(-1).text, /will use 2048-bit RSA/);
    documentListeners.get('focusin')({
      target: { closest: () => ({ tagName: 'BUTTON', id: 'generateRsa' }) }
    });
    assert.match(utterances.at(-1).text, /creates a 2048-bit RSA public and private key pair/);
    controller.reset();
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('changing the narration language updates active speech and its speech-synthesis locale', async () => {
  const elements = new Map();
  const utterances = [];
  const elementListeners = new Map();
  const documentListeners = new Map();
  const availableVoices = [{ name: 'English', lang: 'en-GB' }];
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const makeElement = id => ({
    id,
    value: 'en',
    textContent: '',
    attributes: new Map(),
    classList: { add() {}, remove() {} },
    addEventListener(name, handler) {
      const listeners = elementListeners.get(this) || new Map();
      listeners.set(name, handler);
      elementListeners.set(this, listeners);
    },
    removeEventListener() {},
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
      getVoices() { return availableVoices; },
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
    controller.setNarrationMode('cbc');

    const languageSelect = elements.get('narrLanguage');
    languageSelect.value = 'ig';
    elementListeners.get(languageSelect).get('change')();
    assert.equal(utterances.at(-1).lang, 'ig-NG');
    assert.match(utterances.at(-1).text, /Usoro izochi ozi ị họọrọ/);

    languageSelect.value = 'fr';
    elementListeners.get(languageSelect).get('change')();
    assert.equal(utterances.at(-1).lang, 'fr-FR');
    assert.match(utterances.at(-1).text, /La méthode de chiffrement que vous avez choisie/);
    documentListeners.get('focusin')({
      target: { closest: () => ({ id: 'encB', tagName: 'BUTTON' }) }
    });
    assert.equal(utterances.at(-1).lang, 'fr-FR');
    assert.match(utterances.at(-1).text, /Pour chiffrer/);

    languageSelect.value = 'pcm';
    elementListeners.get(languageSelect).get('change')();
    assert.equal(utterances.at(-1).lang, 'en-NG');
    assert.equal(utterances.at(-1).voice.lang, 'en-GB', 'Pidgin falls back to an installed English voice');
    assert.match(utterances.at(-1).text, /Na method wey you choose/);
    controller.reset();
    assert.equal(documentListeners.has('focusin'), true);
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
    removeEventListener() {},
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
    assert.equal(documentListeners.has('focusin'), true);
    assert.equal(documentListeners.has('click'), true);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
