import { getControlsForLevel } from "@/data/controls";
import type { AssessmentLevel, ControlResponse } from "@/types/assessment";

const BASELINE_SPRS = 110;

export function calculateSprs(level: AssessmentLevel, responses: ControlResponse[]): number {
  const deductionMap = getControlsForLevel(level).reduce<Record<string, number>>((acc, control) => {
    acc[control.id] = control.deduction;
    return acc;
  }, {});

  let score = BASELINE_SPRS;

  for (const response of responses) {
    if (response.answer === "NOT_MET" || response.answer === "PARTIALLY_MET") {
      score -= deductionMap[response.controlId] ?? 1;
    }
  }

  return Math.max(-203, Math.min(BASELINE_SPRS, score));
}

export function completionPercent(responses: ControlResponse[], totalControls: number): number {
  if (totalControls === 0) return 0;
  const answered = responses.filter((r) => r.answer !== "NOT_APPLICABLE").length;
  return Math.round((answered / totalControls) * 100);
}
