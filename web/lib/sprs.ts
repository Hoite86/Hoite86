import { CONTROLS } from "@/data/controls";
import type { ControlResponse } from "@/types/assessment";

const BASELINE_SPRS = 110;

const deductionMap = CONTROLS.reduce<Record<string, number>>((acc, control) => {
  acc[control.id] = control.deduction;
  return acc;
}, {});

export function calculateSprs(responses: ControlResponse[]): number {
  let score = BASELINE_SPRS;

  for (const response of responses) {
    if (response.answer === "NOT_MET" || response.answer === "PARTIALLY_MET") {
      score -= deductionMap[response.controlId] ?? 1;
    }
  }

  return Math.max(-203, Math.min(BASELINE_SPRS, score));
}

export function completionPercent(responses: ControlResponse[]): number {
  const answered = responses.filter((r) => r.answer !== "NOT_APPLICABLE").length;
  return Math.round((answered / CONTROLS.length) * 100);
}
