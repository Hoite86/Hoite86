import { PrivacyDecision } from '../types';

const STRICT_ACCURACY_PROVIDERS = new Set([
  'Banking',
  'Healthcare',
  'Government',
  'Navigation',
  'LocalNetwork'
]);

export type CompatibilityResolution = {
  effectiveDecision: PrivacyDecision;
  notices: string[];
  strictModeApplied: boolean;
};

export const resolveCompatibilityDecision = (
  decision: PrivacyDecision
): CompatibilityResolution => {
  const notices: string[] = [];
  const strictModeApplied = STRICT_ACCURACY_PROVIDERS.has(decision.provider);

  if (!strictModeApplied) {
    return { effectiveDecision: decision, notices, strictModeApplied };
  }

  notices.push(
    `Compatibility guard active for ${decision.provider}: precise data required by legal/regulatory or functional constraints.`
  );

  return {
    effectiveDecision: {
      ...decision,
      allowLocationMasking: false,
      allowQueryMutation: false,
      allowHeaderObfuscation: false,
      notifyOnBlock: true,
      locationRadiusMiles: 0
    },
    notices,
    strictModeApplied
  };
};
