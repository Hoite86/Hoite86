import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const KEY_ALIAS = 'vpu-data-key-v1';

type CipherPayload = {
  v: 1;
  iv: string;
  value: string;
};

const getOrCreateKey = async (): Promise<string> => {
  const existing = await SecureStore.getItemAsync(KEY_ALIAS);
  if (existing) {
    return existing;
  }

  const generated = CryptoJS.lib.WordArray.random(32).toString();
  await SecureStore.setItemAsync(KEY_ALIAS, generated, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
  });
  return generated;
};

export const encryptAndStore = async (key: string, plaintext: string): Promise<void> => {
  const secret = await getOrCreateKey();
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(secret), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  const payload: CipherPayload = {
    v: 1,
    iv: iv.toString(),
    value: encrypted.toString()
  };

  await SecureStore.setItemAsync(key, JSON.stringify(payload), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
  });
};

export const readAndDecrypt = async (key: string): Promise<string | null> => {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) {
    return null;
  }

  const payload = JSON.parse(raw) as CipherPayload;
  const secret = await getOrCreateKey();
  const bytes = CryptoJS.AES.decrypt(payload.value, CryptoJS.enc.Hex.parse(secret), {
    iv: CryptoJS.enc.Hex.parse(payload.iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return bytes.toString(CryptoJS.enc.Utf8);
};
