import type { AssessmentLevel, Control, ControlDomain, DomainName } from "@/types/assessment";

type DomainSeed = {
  id: string;
  name: DomainName;
  order: number;
  controls: Array<Omit<Control, "domain" | "level"> & { level?: AssessmentLevel }>;
};

const DOMAIN_SEEDS: DomainSeed[] = [
  {
    id: "ac",
    name: "Access Control",
    order: 1,
    controls: [
      { id: "3.1.1", family: "AC", title: "Limit System Access", description: "Limit information system access to authorized users.", deduction: 5, order: 1 },
      { id: "3.1.2", family: "AC", title: "Limit Transaction Types", description: "Limit information system access to authorized transactions and functions.", deduction: 3, order: 2 },
      { id: "3.1.5", family: "AC", title: "Separate Duties", description: "Employ separation of duties for privileged functions.", deduction: 5, order: 3 },
    ],
  },
  {
    id: "au",
    name: "Audit and Accountability",
    order: 2,
    controls: [
      { id: "3.3.1", family: "AU", title: "Create Audit Records", description: "Create and retain system audit logs.", deduction: 5, order: 1 },
      { id: "3.3.2", family: "AU", title: "Ensure Audit Events", description: "Ensure auditing for user activities and security events.", deduction: 5, order: 2 },
      { id: "3.3.6", family: "AU", title: "Review Logs", description: "Review and analyze audit logs for indications of inappropriate activity.", deduction: 3, order: 3 },
    ],
  },
  {
    id: "cm",
    name: "Configuration Management",
    order: 3,
    controls: [
      { id: "3.4.1", family: "CM", title: "Baseline Configurations", description: "Establish and maintain baseline system configurations.", deduction: 5, order: 1 },
      { id: "3.4.8", family: "CM", title: "Apply Security Patches", description: "Apply security-relevant software patches in a timely manner.", deduction: 5, order: 2 },
    ],
  },
  {
    id: "ir",
    name: "Incident Response",
    order: 4,
    controls: [
      { id: "3.6.1", family: "IR", title: "Incident Handling", description: "Establish an operational incident-handling capability.", deduction: 5, order: 1 },
      { id: "3.6.3", family: "IR", title: "Test Incident Response", description: "Test the organizational incident response capability.", deduction: 3, order: 2 },
    ],
  },
];

function mapLevelDomains(level: AssessmentLevel): ControlDomain[] {
  // Seed set is same for L1/L2 in MVP; model supports diverging sets as controls expand.
  return DOMAIN_SEEDS.sort((a, b) => a.order - b.order).map((domain) => ({
    id: domain.id,
    name: domain.name,
    order: domain.order,
    controls: domain.controls
      .filter((control) => !control.level || control.level === level)
      .sort((a, b) => a.order - b.order)
      .map((control) => ({
        ...control,
        domain: domain.name,
        level,
      })),
  }));
}

export function getDomainsForLevel(level: AssessmentLevel): ControlDomain[] {
  return mapLevelDomains(level).filter((domain) => domain.controls.length > 0);
}

export function getControlsForLevel(level: AssessmentLevel): Control[] {
  return getDomainsForLevel(level).flatMap((domain) => domain.controls);
}

export function getControlById(level: AssessmentLevel, controlId: string): Control | null {
  return getControlsForLevel(level).find((control) => control.id === controlId) ?? null;
}
