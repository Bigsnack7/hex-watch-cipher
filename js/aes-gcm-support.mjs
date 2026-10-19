export async function supportsAesGcmKeySize(subtle, keyBits) {
  if (!subtle || typeof subtle.generateKey !== 'function') return false;
  try {
    await subtle.generateKey({ name: 'AES-GCM', length: keyBits }, false, ['encrypt', 'decrypt']);
    return true;
  } catch (error) {
    if (error?.name === 'OperationError' || error?.name === 'NotSupportedError') return false;
    throw error;
  }
}
