import * as SecureStore from 'expo-secure-store';

import { ProviderRule } from '../types';

const ACTIVE_KEY = 'vpu-policy-active-v1';
const PREVIOUS_KEY = 'vpu-policy-previous-v1';
const PINNED_VERSION_KEY = 'vpu-policy-pinned-version-v1';
const REVOKED_KEY_IDS_KEY = 'vpu-policy-revoked-key-ids-v1';

const POLICY_PUBLIC_KEYS: Record<string, string> = {
  'vpu-root-2026':
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtmYz1j38Tafw8D0R8iX9QfJx3s5FODhS8vY4X7Qm9yNn9qfQm3gzbFQ7qzA6Sm2SmpM5BZd2V8cJv+VEXAMPLEKEYREPLACEk8d6h6K0f6e8l8M3fR0tYx9wIDAQAB',
  'vpu-online-2026-q3':
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArEPLACEOFFLINEONLINEKEYREPLACEME0hZ9Xu8U3Rq3NvfgA1YqjYf1yDkM3wIDAQAB'
};

type TrackerIntelUpdate = {
  urlKeywords?: string[];
  pathKeywords?: string[];
  queryParamKeywords?: string[];
  scriptSignatures?: string[];
  globalAllowExceptions?: string[];
  providerAllowExceptions?: Record<string, string[]>;
  blockingMode?: 'LOG_ONLY' | 'SOFT_BLOCK' | 'HARD_BLOCK';
  confidenceThresholdSoft?: number;
  confidenceThresholdHard?: number;
  confidenceThresholdQuarantine?: number;
  environmentCohort?: 'dev' | 'beta' | 'prod';
};

export type UpdatePayload = {
  version: string;
  signature: string;
  signatureAlgorithm: 'RSA-PSS-SHA256';
  keyId: string;
  keyChainLevel: 'root' | 'online';
  dnsBlocklist: string[];
  dnsAllowlist: string[];
  providerRules: ProviderRule[];
  trackerIntel?: TrackerIntelUpdate;
  generatedAt: string;
  releaseChannel: 'dev' | 'beta' | 'stable';
  rollbackFloorVersion?: string;
};

const parseVersion = (value: string): number => {
  const numeric = value.replace(/[^0-9]/g, '');
  return Number(numeric || '0');
};

const versionAtLeast = (candidate: string, baseline: string): boolean =>
  parseVersion(candidate) >= parseVersion(baseline);

const bytesFromBase64 = (base64: string): Uint8Array => {
  if (typeof atob === 'function') {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  const nodeBuffer = (globalThis as unknown as { Buffer?: { from: (s: string, enc: string) => Uint8Array } })
    .Buffer;
  if (nodeBuffer) {
    return new Uint8Array(nodeBuffer.from(base64, 'base64'));
  }

  return new Uint8Array();
};

const importPublicKey = async (spkiBase64: string): Promise<unknown | null> => {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!subtle) {
    return null;
  }

  const keyBytes = bytesFromBase64(spkiBase64);
  return subtle.importKey(
    'spki',
    keyBytes,
    {
      name: 'RSA-PSS',
      hash: 'SHA-256'
    },
    false,
    ['verify']
  );
};

const canonicalPolicyPayload = (payload: UpdatePayload): string =>
  JSON.stringify({
    version: payload.version,
    keyId: payload.keyId,
    keyChainLevel: payload.keyChainLevel,
    dnsBlocklist: payload.dnsBlocklist,
    dnsAllowlist: payload.dnsAllowlist,
    providerRules: payload.providerRules,
    trackerIntel: payload.trackerIntel,
    generatedAt: payload.generatedAt,
    releaseChannel: payload.releaseChannel,
    rollbackFloorVersion: payload.rollbackFloorVersion
  });

const isRevoked = async (keyId: string): Promise<boolean> => {
  const raw = await SecureStore.getItemAsync(REVOKED_KEY_IDS_KEY);
  if (!raw) return false;
  try {
    const revoked = JSON.parse(raw) as string[];
    return revoked.includes(keyId);
  } catch (_error) {
    return false;
  }
};

export const updateRevokedKeyIds = async (keyIds: string[]): Promise<void> => {
  await SecureStore.setItemAsync(REVOKED_KEY_IDS_KEY, JSON.stringify(keyIds));
};

const verifySignature = async (payload: UpdatePayload): Promise<boolean> => {
  const keyBase64 = POLICY_PUBLIC_KEYS[payload.keyId];
  if (!keyBase64 || payload.signatureAlgorithm !== 'RSA-PSS-SHA256') {
    return false;
  }

  if (await isRevoked(payload.keyId)) {
    return false;
  }

  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!subtle) {
    // (Later Date) ensure WebCrypto/native signature verification availability in home IDE builds.
    return false;
  }

  const key = await importPublicKey(keyBase64);
  if (!key) {
    return false;
  }

  const signature = bytesFromBase64(payload.signature);
  const data = new TextEncoder().encode(canonicalPolicyPayload(payload));
  return subtle.verify({ name: 'RSA-PSS', saltLength: 32 }, key as any, signature, data);
};

const verifyPayloadShape = (payload: UpdatePayload): boolean =>
  Array.isArray(payload.dnsBlocklist) &&
  Array.isArray(payload.providerRules) &&
  Boolean(payload.version) &&
  Boolean(payload.signature) &&
  Boolean(payload.keyId) &&
  Boolean(payload.keyChainLevel) &&
  Boolean(payload.releaseChannel);

const getPinnedVersion = async (): Promise<string> => {
  return (await SecureStore.getItemAsync(PINNED_VERSION_KEY)) ?? 'v0';
};

const setPinnedVersion = async (version: string): Promise<void> => {
  await SecureStore.setItemAsync(PINNED_VERSION_KEY, version);
};

const minimumVersionForChannel = (channel: UpdatePayload['releaseChannel']): string => {
  if (channel === 'stable') return 'v100';
  if (channel === 'beta') return 'v10';
  return 'v1';
};

export const applyPolicyUpdate = async (payload: UpdatePayload): Promise<boolean> => {
  if (!verifyPayloadShape(payload)) {
    return false;
  }

  const pinnedVersion = await getPinnedVersion();
  const channelMin = minimumVersionForChannel(payload.releaseChannel);
  const floor = payload.rollbackFloorVersion ?? pinnedVersion;

  if (!versionAtLeast(payload.version, pinnedVersion) || !versionAtLeast(payload.version, channelMin)) {
    return false;
  }

  if (!versionAtLeast(payload.version, floor)) {
    return false;
  }

  const signatureValid = await verifySignature(payload);
  if (!signatureValid) {
    return false;
  }

  const existing = await SecureStore.getItemAsync(ACTIVE_KEY);
  if (existing) {
    await SecureStore.setItemAsync(PREVIOUS_KEY, existing);
  }

  await SecureStore.setItemAsync(ACTIVE_KEY, JSON.stringify(payload));
  await setPinnedVersion(payload.version);
  return true;
};

export const rollbackPolicyUpdate = async (): Promise<boolean> => {
  const previous = await SecureStore.getItemAsync(PREVIOUS_KEY);
  if (!previous) {
    return false;
  }

  let previousPayload: UpdatePayload;
  try {
    previousPayload = JSON.parse(previous) as UpdatePayload;
  } catch (_error) {
    return false;
  }

  const pinnedVersion = await getPinnedVersion();
  if (!versionAtLeast(previousPayload.version, pinnedVersion)) {
    return false;
  }

  const active = await SecureStore.getItemAsync(ACTIVE_KEY);
  if (active) {
    await SecureStore.setItemAsync(PREVIOUS_KEY, active);
  }

  await SecureStore.setItemAsync(ACTIVE_KEY, previous);
  return true;
};

export const getActivePolicyUpdate = async (): Promise<UpdatePayload | null> => {
  const raw = await SecureStore.getItemAsync(ACTIVE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UpdatePayload;
  } catch (_error) {
    return null;
  }
};
