export type AssessmentLevel = "L1" | "L2";

export type DomainName =
  | "Access Control"
  | "Audit and Accountability"
  | "Configuration Management"
  | "Incident Response";

export type Control = {
  id: string;
  domain: DomainName;
  family: string;
  title: string;
  description: string;
  deduction: number;
  level: AssessmentLevel;
  order: number;
};

export type ControlDomain = {
  id: string;
  name: DomainName;
  order: number;
  controls: Control[];
};

export type ResponseAnswer = "MET" | "NOT_MET" | "PARTIALLY_MET" | "NOT_APPLICABLE";

export type Assessment = {
  id: string;
  userId: string;
  name: string;
  level: AssessmentLevel;
  sprsScore: number;
  status: "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
};

export type ControlResponse = {
  controlId: string;
  answer: ResponseAnswer;
  notes: string;
  updatedAt: string;
};
