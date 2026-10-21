const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}:,.?';
const CHARACTER_GROUPS = [LOWERCASE, UPPERCASE, DIGITS, SYMBOLS];
const CHARACTER_SET = CHARACTER_GROUPS.join('');
const MIN_LENGTH = 16;
const MAX_LENGTH = 64;

export function countPassphraseCharacters(value) {
  return Array.from(value).length;
}

function randomIndex(cryptoProvider, upperBound) {
  const limit = Math.floor(256 / upperBound) * upperBound;
  const byte = new Uint8Array(1);
  do {
    cryptoProvider.getRandomValues(byte);
  } while (byte[0] >= limit);
  return byte[0] % upperBound;
}

export function generatePassphrase(length = 24, cryptoProvider = globalThis.crypto) {
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new Error('passphrase-length');
  }
  if (typeof cryptoProvider?.getRandomValues !== 'function') {
    throw new Error('nocrypto');
  }

  for (let attempt = 0; attempt < 128; attempt++) {
    let result = '';
    for (let index = 0; index < length; index++) {
      result += CHARACTER_SET[randomIndex(cryptoProvider, CHARACTER_SET.length)];
    }
    if (
      CHARACTER_GROUPS.every(group => [...result].some(character => group.includes(character))) &&
      estimatePassphraseStrength(result, length).score === 100
    ) {
      return result;
    }
  }
  throw new Error('randomness');
}

export function estimatePassphraseStrength(value, targetLength = 24) {
  const normalized = value.normalize('NFKC');
  const characters = [...normalized];
  if (characters.length === 0) return null;

  const checks = {
    length: characters.length === targetLength,
    lowercase: /\p{Ll}/u.test(normalized),
    uppercase: /\p{Lu}/u.test(normalized),
    numbers: /\p{N}/u.test(normalized),
    symbols: /[\p{P}\p{S}]/u.test(normalized)
  };
  const lengthScore = Math.min(100, characters.length / targetLength * 100);
  const classCount = ['lowercase', 'uppercase', 'numbers', 'symbols']
    .filter(group => checks[group]).length;
  const hasPredictableSequence = /(?:0123|1234|2345|abcd|bcde|qwer|asdf|zxcv|9876|8765|dcba)/i
    .test(normalized);
  const longestRepeatedRun = Math.max(
    ...characters.join('').match(/(.)\1*/gsu).map(run => [...run].length)
  );
  const hasRepeatedPattern = Array.from(
    { length: Math.floor(characters.length / 3) },
    (_, index) => index + 1
  ).some(patternLength => characters
    .slice(patternLength)
    .every((character, index) => character === characters[index % patternLength]));
  const missingGroups = ['lowercase', 'uppercase', 'numbers', 'symbols']
    .filter(group => !checks[group])
    .map(group => ({
      lowercase: 'lowercase letters',
      uppercase: 'uppercase letters',
      numbers: 'numbers',
      symbols: 'symbols'
    })[group]);
  let score = Math.round(lengthScore * 0.75 + classCount / 4 * 25);
  if (hasPredictableSequence) score -= 25;
  if (hasRepeatedPattern) score -= 25;
  if (longestRepeatedRun >= 4) score -= Math.min(45, (longestRepeatedRun - 3) * 15);
  if (new Set(characters).size === 1) score = Math.min(score, 20);
  score = Math.max(0, Math.min(100, score));
  const level = score < 35 ? 'weak'
    : score < 60 ? 'fair'
    : score < 80 ? 'good'
    : 'strong';
  let guidance;
  if (characters.length < targetLength) {
    guidance = `Add ${targetLength - characters.length} more character${targetLength - characters.length === 1 ? '' : 's'} to meet the selected length.`;
  } else if (characters.length > targetLength) {
    guidance = `Remove ${characters.length - targetLength} character${characters.length - targetLength === 1 ? '' : 's'} to meet the selected length.`;
  } else {
    const suggestions = [];
    if (hasPredictableSequence) suggestions.push('avoid predictable sequences');
    if (hasRepeatedPattern) suggestions.push('avoid repeating a character pattern');
    if (longestRepeatedRun >= 4) suggestions.push('avoid long repeated-character runs');
    if (missingGroups.length) {
      suggestions.push(`add ${missingGroups.join(', ')} for more character variety`);
    }
    guidance = suggestions.length
      ? `For a higher estimate, ${suggestions.join('; ')}. Character variety is a heuristic, not a requirement.`
      : 'Length and character variety look good. Use a unique passphrase; this estimate cannot detect reuse or personal information.';
  }
  return { score, level, checks, guidance };
}
