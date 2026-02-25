jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    })
  };
});

import {
  applyPolicyUpdate,
  getActivePolicyUpdate,
  rollbackPolicyUpdate,
  updateRevokedKeyIds
} from '../src/services/policyUpdates';

beforeAll(() => {
  (globalThis as unknown as { crypto?: unknown }).crypto = {
    subtle: {
      importKey: jest.fn(async () => ({ key: 'ok' })),
      verify: jest.fn(async () => true)
    }
  };
});

describe('policy updates', () => {
  it('accepts signed updates and enforces anti-rollback pinning', async () => {
    const v120 = {
      version: 'v120',
      signature: 'ZmFrZQ==',
      signatureAlgorithm: 'RSA-PSS-SHA256' as const,
      keyId: 'vpu-root-2026',
      keyChainLevel: 'online' as const,
      dnsBlocklist: ['a.example'],
      dnsAllowlist: ['b.example'],
      providerRules: [],
      generatedAt: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'stable' as const,
      rollbackFloorVersion: 'v100'
    };

    const v121 = {
      version: 'v121',
      signature: 'ZmFrZQ==',
      signatureAlgorithm: 'RSA-PSS-SHA256' as const,
      keyId: 'vpu-root-2026',
      keyChainLevel: 'online' as const,
      dnsBlocklist: ['c.example'],
      dnsAllowlist: ['d.example'],
      providerRules: [],
      generatedAt: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'stable' as const,
      rollbackFloorVersion: 'v120'
    };

    expect(await applyPolicyUpdate(v120)).toBe(true);
    expect((await getActivePolicyUpdate())?.version).toBe('v120');

    expect(await applyPolicyUpdate(v121)).toBe(true);
    expect((await getActivePolicyUpdate())?.version).toBe('v121');

    expect(await rollbackPolicyUpdate()).toBe(false);
  });

  it('rejects invalid payloads', async () => {
    const invalid = {
      version: 'v3',
      signature: 'invalid',
      signatureAlgorithm: 'RSA-PSS-SHA256' as const,
      keyId: 'unknown-key',
      keyChainLevel: 'online' as const,
      dnsBlocklist: ['x.example'],
      dnsAllowlist: ['y.example'],
      providerRules: [],
      generatedAt: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'beta' as const
    };

    expect(await applyPolicyUpdate(invalid)).toBe(false);
  });



  it('rejects stable channel updates below minimum channel version floor', async () => {
    const belowStableFloor = {
      version: 'v99',
      signature: 'ZmFrZQ==',
      signatureAlgorithm: 'RSA-PSS-SHA256' as const,
      keyId: 'vpu-root-2026',
      keyChainLevel: 'online' as const,
      dnsBlocklist: ['blocked.example'],
      dnsAllowlist: ['allowed.example'],
      providerRules: [],
      generatedAt: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'stable' as const,
      rollbackFloorVersion: 'v98'
    };

    expect(await applyPolicyUpdate(belowStableFloor)).toBe(false);
  });

  it('rejects updates below explicit rollback floor version', async () => {
    const belowRollbackFloor = {
      version: 'v150',
      signature: 'ZmFrZQ==',
      signatureAlgorithm: 'RSA-PSS-SHA256' as const,
      keyId: 'vpu-root-2026',
      keyChainLevel: 'online' as const,
      dnsBlocklist: ['blocked.example'],
      dnsAllowlist: ['allowed.example'],
      providerRules: [],
      generatedAt: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'stable' as const,
      rollbackFloorVersion: 'v151'
    };

    expect(await applyPolicyUpdate(belowRollbackFloor)).toBe(false);
  });

  it('rejects updates signed by revoked key ids', async () => {
    await updateRevokedKeyIds(['vpu-root-2026']);

    const revoked = {
      version: 'v130',
      signature: 'ZmFrZQ==',
      signatureAlgorithm: 'RSA-PSS-SHA256' as const,
      keyId: 'vpu-root-2026',
      keyChainLevel: 'online' as const,
      dnsBlocklist: ['blocked.example'],
      dnsAllowlist: ['allowed.example'],
      providerRules: [],
      generatedAt: '2026-01-01T00:00:00.000Z',
      releaseChannel: 'stable' as const,
      rollbackFloorVersion: 'v120'
    };

    expect(await applyPolicyUpdate(revoked)).toBe(false);
  });
});
