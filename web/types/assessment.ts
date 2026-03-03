export type Domain = "Access Control" | "Audit and Accountability" | "Configuration Management" | "Incident Response";

export type Control = {
  id: string;
  domain: Domain;
  family: string;
  title: string;
  description: string;
  deduction: number;
};

export type ResponseAnswer = "MET" | "NOT_MET" | "PARTIALLY_MET" | "NOT_APPLICABLE";

export type Assessment = {
  id: string;
  userId: string;
  name: string;
  level: "L1" | "L2";
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
