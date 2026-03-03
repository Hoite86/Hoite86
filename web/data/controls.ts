import type { Control } from "@/types/assessment";

export const CONTROLS: Control[] = [
  { id: "3.1.1", domain: "Access Control", family: "AC", title: "Limit System Access", description: "Limit information system access to authorized users.", deduction: 5 },
  { id: "3.1.2", domain: "Access Control", family: "AC", title: "Limit Transaction Types", description: "Limit information system access to authorized transactions and functions.", deduction: 3 },
  { id: "3.1.5", domain: "Access Control", family: "AC", title: "Separate Duties", description: "Employ separation of duties for privileged functions.", deduction: 5 },
  { id: "3.3.1", domain: "Audit and Accountability", family: "AU", title: "Create Audit Records", description: "Create and retain system audit logs.", deduction: 5 },
  { id: "3.3.2", domain: "Audit and Accountability", family: "AU", title: "Ensure Audit Events", description: "Ensure auditing for user activities and security events.", deduction: 5 },
  { id: "3.3.6", domain: "Audit and Accountability", family: "AU", title: "Review Logs", description: "Review and analyze audit logs for indications of inappropriate activity.", deduction: 3 },
  { id: "3.4.1", domain: "Configuration Management", family: "CM", title: "Baseline Configurations", description: "Establish and maintain baseline system configurations.", deduction: 5 },
  { id: "3.4.8", domain: "Configuration Management", family: "CM", title: "Apply Security Patches", description: "Apply security-relevant software patches in a timely manner.", deduction: 5 },
  { id: "3.6.1", domain: "Incident Response", family: "IR", title: "Incident Handling", description: "Establish an operational incident-handling capability.", deduction: 5 },
  { id: "3.6.3", domain: "Incident Response", family: "IR", title: "Test Incident Response", description: "Test the organizational incident response capability.", deduction: 3 },
];
