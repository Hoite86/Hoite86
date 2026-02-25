import { mutateSearchQuery, randomizedHeaders } from '../src/services/obfuscation';
import { PrivacyDecision } from '../src/types';

const fullDecision: PrivacyDecision = {
  provider: 'Google',
  allowLocationMasking: true,
  allowTrackerBlocking: true,
  allowQueryMutation: true,
  allowHeaderObfuscation: true,
  notifyOnBlock: true,
  locationRadiusMiles: 50
};

describe('obfuscation utilities', () => {
  it('generates obfuscated headers when enabled', () => {
    const headers = randomizedHeaders(fullDecision, 'sess_1');
    expect(headers['User-Agent']).toBeTruthy();
    expect(headers['Accept-Language']).toBeTruthy();
    expect(headers['X-Session-Id']).toEqual('sess_1');
  });

  it('returns minimal headers when obfuscation disabled', () => {
    const headers = randomizedHeaders(
      { ...fullDecision, allowHeaderObfuscation: false },
      'sess_2'
    );
    expect(headers).toEqual({ 'X-Session-Id': 'sess_2' });
  });

  it('mutates known query terms into alternatives', () => {
    const result = mutateSearchQuery('best restaurants near new york', fullDecision);
    expect(result).not.toEqual('best restaurants near new york');
  });
});
