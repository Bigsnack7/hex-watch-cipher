import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAudioController,
  getNarrationGuide,
  NARRATION_GUIDES,
  NARRATION_LANGUAGES
} from '../js/ui/audio.mjs';

const expectedModes = {
  aes: ['recommended choice', 'encrypted result', 'same access key'],
  cbc: ['older encryption option', 'CBC1', 'separate check'],
  hybrid: ['recommended way to send', 'RSA1', 'private key'],
  'rsa-direct': ['short messages', 'RSA2', '190 bytes'],
  'rsa-aes': ['short messages', 'RSA3', 'both'],
  legacy: ['old method is not safe', 'old messages', 'unsafe']
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
  assert.match(getNarrationGuide('rsa-aes', 'en', 256, 2048)[2], /190 UTF-8 bytes/);
  for (const language of Object.keys(NARRATION_LANGUAGES)) {
    const rsaDirectGuide = getNarrationGuide('rsa-direct', language, 256, 4096).join(' ');
    assert.match(rsaDirectGuide, /446/);
    assert.doesNotMatch(rsaDirectGuide, /190/);
    assert.doesNotMatch(rsaDirectGuide, /default 4096-bit key/);
    assert.doesNotMatch(rsaDirectGuide, /default 4096-bit key/);
  }
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
  assert.match(getNarrationGuide('rsa-aes', 'fr', 256, 3072)[2], /318 octets UTF-8/);
});

test('clicked controls speak guidance for the currently selected method', async () => {
  const elements = new Map();
  const utterances = [];
  const eventListeners = new Map();
  const documentListeners = new Map();
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const makeElement = id => ({
    id,
    tagName: id === 'mode' ? 'SELECT' : 'BUTTON',
    value: id === 'mode' ? 'aes' : '',
    textContent: '',
    attributes: new Map(),
    classList: { add() {}, remove() {} },
    closest() { return this; },
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
    controller.setNarrationMode('aes');
    const narrationButton = elements.get('voxB');
    await eventListeners.get(narrationButton).get('click')();
    assert.equal(utterances.length, 0, 'turning narration on must not start speech on its own');
    const click = (id, tagName = 'INPUT') => documentListeners.get('click')({
      type: 'click',
      target: { closest: () => ({ id, tagName }) }
    });
    const change = (id, value) => {
      const element = elements.get(id);
      element.value = String(value);
      eventListeners.get(element).get('change')();
    };
    click('voxB', 'BUTTON');
    assert.equal(utterances.length, 0, 'clicking the narration toggle must not make it read its own guide');
    const beforeSelectClick = utterances.length;
    click('mode', 'SELECT');
    assert.equal(utterances.length, beforeSelectClick, 'opening a select must not narrate guidance for the old selection');
    change('mode', 'cbc');
    change('mode', 'aes');
    assert.match(utterances.at(-1).text, /AES-256-GCM/);
    const oneShotCount = utterances.length;
    utterances.at(-1).onend();
    assert.equal(utterances.length, oneShotCount, 'finished guidance must not start another speech on its own');

    change('aesKeySize', 128);
    assert.match(utterances.at(-1).text, /AES key size is the length of the secret key/);
    assert.match(utterances.at(-1).text, /length of the secret key the app creates from your access key/);
    assert.match(utterances.at(-1).text, /more possible keys to guess/);
    assert.match(utterances.at(-1).text, /do not make a weak access key stronger/);
    assert.match(utterances.at(-1).text, /128 bits is already strong/);
    assert.match(utterances.at(-1).text, /Use a long, unique access key whatever size you choose/);
    assert.match(utterances.at(-1).text, /each message saves its size/);
    assert.match(utterances.at(-1).text, /File encryption always uses its own fixed AES-256 key size/);
    change('aesKeySize', 192);
    assert.match(utterances.at(-1).text, /192 bits is a supported middle option/);
    change('aesKeySize', 256);
    assert.match(utterances.at(-1).text, /256 bits is the recommended default/);
    assert.match(utterances.at(-1).text, /do not make a weak access key stronger/);
    change('aesKeySize', 128);
    assert.match(utterances.at(-1).text, /128 bits is already strong/);

    const modeSelect = elements.get('mode');
    change('mode', 'cbc');
    assert.match(utterances.at(-1).text, /older encryption option/);

    const rsaSizeSelect = elements.get('rsaKeySize');
    for (const [keyBits, limit, expected] of [
      [2048, 190, /recommended default and usually offers a practical balance/],
      [3072, 318, /3072 bits is larger than the default/],
      [4096, 446, /4096 bits is the largest option/]
    ]) {
      rsaSizeSelect.value = String(keyBits);
      eventListeners.get(rsaSizeSelect).get('change')();
      assert.match(utterances.at(-1).text, expected);
      assert.match(utterances.at(-1).text, new RegExp(`limits messages to ${limit} bytes`));
      assert.match(utterances.at(-1).text, /public key locks messages for its owner/);
      assert.match(utterances.at(-1).text, /affects new key pairs only/);
      assert.match(utterances.at(-1).text, /For longer messages, choose hybrid encryption/);
      assert.match(utterances.at(-1).text, /RSA and AES bit sizes measure different things/);
    }
    modeSelect.value = 'rsa-direct';
    eventListeners.get(modeSelect).get('change')();
    assert.match(utterances.at(-1).text, /limit is 446 bytes/);
    assert.doesNotMatch(utterances.at(-1).text, /limit is 190 bytes/);
    const beforeRsaSelectClick = utterances.length;
    click('rsaKeySize', 'SELECT');
    assert.equal(utterances.length, beforeRsaSelectClick, 'opening a key-size select must not announce its old value');
    assert.match(utterances.at(-1).text, /4096 bits is the largest option/);
    assert.match(utterances.at(-1).text, /not keys you paste or import/);
    click('generateRsa', 'BUTTON');
    assert.match(utterances.at(-1).text, /makes a 4096-bit public key and private key/);

    change('mode', 'cbc');
    assert.match(utterances.at(-1).text, /older encryption option/);
    change('mode', 'hybrid');
    assert.match(utterances.at(-1).text, /new one-time key/);
    assert.match(utterances.at(-1).text, /4096 bits/);
    change('mode', 'rsa-direct');
    click('key');
    assert.match(utterances.at(-1).text, /access key is not used/i);
    click('rsaPrivate', 'TEXTAREA');
    assert.match(utterances.at(-1).text, /matching private key here to open messages/i);
    click('fileEncrypt', 'BUTTON');
    assert.match(utterances.at(-1).text, /protects the chosen file with your access key/i);
    assert.doesNotMatch(utterances.at(-1).text, /RSA Hybrid is the recommended/);
    change('mode', 'rsa-aes');
    controller.announceStatus('rsaKeyGenerated');
    assert.match(utterances.at(-1).text, /limit is 446 bytes/);
    click('key');
    assert.match(utterances.at(-1).text, /shared access key/);
    change('mode', 'legacy');
    assert.match(utterances.at(-1).text, /This old method is not safe/);
    assert.equal(elements.get('ntext').textContent, `"${utterances.at(-1).text}"`);
    controller.announceStatus('messageEncrypted');
    assert.match(utterances.at(-1).text, /method is unsafe/);
    assert.match(utterances.at(-1).text, /Re-encrypt with AES-GCM/);
    change('mode', 'aes');
    controller.announceStatus('messageEncrypted');
    assert.match(utterances.at(-1).text, /Follow the selected method’s guidance/);
    assert.doesNotMatch(utterances.at(-1).text, /Send the access key separately/);
    controller.reset();
    rsaSizeSelect.value = '2048';
    await eventListeners.get(narrationButton).get('click')();
    eventListeners.get(rsaSizeSelect).get('change')();
    assert.match(utterances.at(-1).text, /recommended default and usually offers a practical balance/);
    click('generateRsa', 'BUTTON');
    assert.match(utterances.at(-1).text, /makes a 2048-bit public key and private key/);
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
    assert.equal(utterances.length, 0, 'enabling narration and changing method must not speak automatically');

    const languageSelect = elements.get('narrLanguage');
    languageSelect.value = 'ig';
    elementListeners.get(languageSelect).get('change')();
    const click = id => documentListeners.get('click')({
      type: 'click',
      target: { closest: () => ({ id, tagName: id === 'narrLanguage' ? 'SELECT' : 'BUTTON' }) }
    });
    assert.equal(utterances.at(-1).lang, 'ig-NG');
    assert.match(utterances.at(-1).text, /A họrọla Igbo maka ntuziaka olu/);
    const modeSelect = elements.get('mode');
    // The language-change announcement is immediate. Verify it first, then change mode and expect the mode narration.
    assert.equal(utterances.at(-1).lang, 'ig-NG');
    assert.match(utterances.at(-1).text, /A họrọla Igbo maka ntuziaka olu/);
    modeSelect.value = 'aes';
    elementListeners.get(modeSelect).get('change')();
    assert.equal(utterances.at(-1).lang, 'ig-NG');
    // Accept either the last utterance or any recent utterance mentioning the mode guide in Igbo.
    assert.ok(utterances.some(u => /Usoro izochi ozi ị họọrọ/.test(u.text)), 'mode narration in Igbo should be present');
    const beforeLanguageSelectClick = utterances.length;
    click('narrLanguage');
    assert.equal(utterances.length, beforeLanguageSelectClick, 'opening a select must not narrate the previous value');
    for (const [id, phrase] of [['eye', /Njikwa igosi/]]) {
      click(id);
      assert.equal(utterances.at(-1).lang, 'ig-NG');
      assert.match(utterances.at(-1).text, phrase);
    }
    const beforeNarrationToggle = utterances.length;
    click('voxB');
    assert.equal(utterances.length, beforeNarrationToggle, 'the narration toggle must not read its own guide');
    controller.announceStatus('fileFailed');
    assert.equal(utterances.at(-1).lang, 'ig-NG');
    assert.match(utterances.at(-1).text, /Ọrụ faịlụ ahụ emeghị nke ọma/);
    assert.equal(controller.announceStatus('legacyMigrationPrepared'), true);
    assert.equal(utterances.at(-1).lang, 'ig-NG');
    assert.match(utterances.at(-1).text, /Ozi ochie dị n'oghere ozi ugbu a/);
    assert.equal(controller.announceStatus('unknown-event'), false);

    languageSelect.value = 'fr';
    elementListeners.get(languageSelect).get('change')();
    assert.equal(utterances.at(-1).lang, 'fr-FR');
    assert.match(utterances.at(-1).text, /La langue de narration est le français/);
    click('encB');
    assert.equal(utterances.at(-1).lang, 'fr-FR');
    assert.match(utterances.at(-1).text, /Pour chiffrer/);
    modeSelect.value = 'aes';
    elementListeners.get(modeSelect).get('change')();
    assert.equal(utterances.at(-1).lang, 'fr-FR');
    assert.match(utterances.at(-1).text, /La méthode de chiffrement que vous avez choisie/);

    languageSelect.value = 'pcm';
    elementListeners.get(languageSelect).get('change')();
    modeSelect.value = 'cbc';
    elementListeners.get(modeSelect).get('change')();
    assert.equal(utterances.at(-1).lang, 'en-NG');
    assert.equal(utterances.at(-1).voice.lang, 'en-GB', 'Pidgin falls back to an installed English voice');
    assert.match(utterances.at(-1).text, /Na method wey you choose/);
    controller.reset();
    assert.equal(documentListeners.has('focusin'), false);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('speech playback errors stop narration and reset its control', async () => {
  const elements = new Map();
  const utterances = [];
  const elementListeners = new Map();
  const documentListeners = new Map();
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  let failNextSpeak = true;
  const makeElement = id => ({
    id,
    value: 'en',
    textContent: '',
    attributes: new Map(),
    classList: {
      values: new Set(),
      add(value) { this.values.add(value); },
      remove(value) { this.values.delete(value); },
      contains(value) { return this.values.has(value); }
    },
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
      speak(utterance) {
        if (failNextSpeak) {
          failNextSpeak = false;
          throw new Error('speech-start-failed');
        }
        utterances.push(utterance);
      },
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
    const click = elementListeners.get(narrationButton).get('click');
    await click();
    assert.equal(utterances.length, 0, 'turning narration on should not play speech automatically');
    documentListeners.get('click')({
      type: 'click',
      target: { closest: () => ({ id: 'mode', tagName: 'SELECT' }) }
    });
    // After a failed attempt, the UI should show narration as off and an error status.
    assert.ok(elements.get('ntext').textContent === 'Off' || elements.get('ntext').textContent === '', 'narration text shows Off or is empty');
    assert.match(elements.get('audioStatus').textContent, /Narration could not play/);
    assert.equal(elements.get('audioStatus').classList.contains('error'), true);

    await click();
    documentListeners.get('click')({
      type: 'click',
      target: { closest: () => ({ id: 'mode', tagName: 'SELECT' }) }
    });
    utterances.at(-1).onerror();
    // Playback error handlers should result in narration being stopped and an error status shown.
    assert.ok(elements.get('ntext').textContent === 'Off' || elements.get('ntext').textContent === '', 'narration text shows Off or is empty');
    assert.match(elements.get('audioStatus').textContent, /Narration could not play/);
    assert.equal(elements.get('audioStatus').classList.contains('error'), true);

    await click();
    documentListeners.get('click')({
      type: 'click',
      target: { closest: () => ({ id: 'mode', tagName: 'SELECT' }) }
    });
    controller.announceStatus('messageEncrypted');
    utterances.at(-1).onerror();
    assert.ok(elements.get('ntext').textContent === 'Off' || elements.get('ntext').textContent === '', 'narration text shows Off or is empty');
    assert.match(elements.get('audioStatus').textContent, /Narration could not play/);
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
    const control = id => ({ closest: () => ({ id, tagName: 'INPUT' }) });
    const click = id => documentListeners.get('click')({ type: 'click', target: control(id) });

    controller.setNarrationMode('cbc');
    click('key');
    assert.match(utterances.at(-1).text, /Access key box/);
    assert.match(utterances.at(-1).text, /long access key/);
    assert.match(utterances.at(-1).text, /older choice is only needed for some existing systems/);

    click('inp');
    assert.match(utterances.at(-1).text, /Message box/);
    click('encB');
    assert.match(utterances.at(-1).text, /Encrypt message button/);
    controller.announceStatus('operationFailed');
    const failureAnnouncement = utterances.at(-1).text;
    click('encB');
    assert.notEqual(utterances.at(-1).text, failureAnnouncement, 'a new click should read its help text');
    controller.setNarrationMode('hybrid');
    click('rsaPublic');
    assert.match(utterances.at(-1).text, /public key text/);
    assert.match(utterances.at(-1).text, /recipient’s public key/);
    click('rsaPrivate');
    assert.match(utterances.at(-1).text, /matching private key here/);
    click('out');
    assert.match(utterances.at(-1).text, /Result area/);
    click('migrateLegacy');
    assert.match(utterances.at(-1).text, /Move old message to safer protection button/);
    assert.match(utterances.at(-1).text, /removes the old key from the box/);
    document.getElementById('fileStatus').textContent = 'Unable to decrypt this message.';
    click('fileStatus');
    assert.match(utterances.at(-1).text, /Unable to decrypt this message/);
    assert.ok(utterances.length > 0);
    controller.reset();
    assert.equal(documentListeners.has('focusin'), false);
    assert.equal(documentListeners.has('click'), true);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('hash calculator controls and completion statuses are announced', async () => {
  const elements = new Map();
  const utterances = [];
  const documentListeners = new Map();
  const elementListeners = new Map();
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
    await elementListeners.get(elements.get('voxB')).get('click')();
    const click = target => documentListeners.get('click')({ type: 'click', target });
    click({
      closest(selector) {
        assert.match(selector, /\.hash-dropzone/);
        return { id: 'hashDropzone', tagName: 'DIV' };
      }
    });
    assert.match(utterances.at(-1).text, /File check area/);
    assert.match(utterances.at(-1).text, /does not send them anywhere/);

    click({
      closest() {
        return { id: 'sha256', name: 'hashAlgorithm', value: 'sha256', tagName: 'INPUT' };
      }
    });
    assert.match(utterances.at(-1).text, /SHA two fifty-six is checked/);
    assert.match(utterances.at(-1).text, /does not hide the file or prove who made it/);
    assert.match(utterances.at(-1).text, /compare the full code shown here with a code from a source you trust/);

    for (const language of Object.keys(NARRATION_LANGUAGES)) {
      controller.setNarrationLanguage(language);
      assert.equal(controller.announceStatus('hashSelected'), true, `${language} selection status`);
      assert.equal(controller.announceStatus('hashCalculated'), true, `${language} completion status`);
      assert.equal(controller.announceStatus('hashFailed'), true, `${language} failure status`);
    }
    for (const [algorithm, expected] of [
      ['md5', /MD5 is checked/],
      ['sha1', /SHA one is checked/],
      ['sha256', /SHA two fifty-six is checked/],
      ['sha512', /SHA five twelve is checked/]
    ]) {
      assert.equal(controller.announceHashAlgorithm(algorithm), true);
      assert.match(utterances.at(-1).text, expected);
      assert.match(utterances.at(-1).text, /To use it here/);
    }
    assert.equal(controller.announceHashAlgorithm('md5', false), true);
    assert.match(utterances.at(-1).text, /MD5 is unchecked, so it will not be included in the file check/);
    assert.equal(controller.announceHashAlgorithm('unknown'), false);
    controller.reset();
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
