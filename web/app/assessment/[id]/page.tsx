"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CONTROLS } from "@/data/controls";
import { Header } from "@/components/header";
import { authedFetch } from "@/lib/api-client";
import { calculateSprs, completionPercent } from "@/lib/sprs";
import type { Assessment, ControlResponse, ResponseAnswer } from "@/types/assessment";

const ANSWERS: ResponseAnswer[] = ["MET", "PARTIALLY_MET", "NOT_MET", "NOT_APPLICABLE"];

export default function AssessmentPage() {
  const params = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [responses, setResponses] = useState<Record<string, ControlResponse>>({});
  const [index, setIndex] = useState(0);

  useEffect(() => {
    authedFetch(`/api/assessments/${params.id}`).then(async (res) => {
      if (!res.ok) return;
      const payload = await res.json();
      setAssessment(payload.assessment as Assessment);
      const map: Record<string, ControlResponse> = {};
      for (const response of payload.responses as ControlResponse[]) {
        map[response.controlId] = response;
      }
      setResponses(map);
    });
  }, [params.id]);

  const current = CONTROLS[index];
  const responseList = useMemo(() => Object.values(responses), [responses]);
  const sprs = calculateSprs(responseList);
  const complete = completionPercent(responseList);

  if (!assessment) return <main className="p-6">Loading...</main>;

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="rounded bg-white p-4 shadow">
          <h1 className="text-2xl font-semibold">{assessment.name}</h1>
          <p>Live SPRS Score: <span className="font-semibold">{sprs}</span></p>
          <p>Completion: {complete}%</p>
        </div>

        <div className="rounded bg-white p-5 shadow">
          <p className="text-sm text-slate-500">Control {index + 1} of {CONTROLS.length}</p>
          <h2 className="text-lg font-semibold">{current.id} — {current.title}</h2>
          <p className="mb-4 text-slate-700">{current.description}</p>
          <select
            className="mb-3 w-full rounded border p-2"
            value={responses[current.id]?.answer ?? "MET"}
            onChange={async (e) => {
              const answer = e.target.value as ResponseAnswer;
              const notes = responses[current.id]?.notes ?? "";
              const res = await authedFetch(`/api/assessments/${assessment.id}/responses`, {
                method: "POST",
                body: JSON.stringify({ controlId: current.id, answer, notes }),
              });
              if (!res.ok) return;
              const payload = await res.json();
              setResponses((prev) => ({ ...prev, [current.id]: payload.response as ControlResponse }));
              setAssessment(payload.assessment as Assessment);
            }}
          >
            {ANSWERS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <textarea
            className="mb-4 w-full rounded border p-2"
            rows={3}
            placeholder="Notes"
            value={responses[current.id]?.notes ?? ""}
            onChange={(e) => setResponses((prev) => ({
              ...prev,
              [current.id]: {
                controlId: current.id,
                answer: prev[current.id]?.answer ?? "MET",
                notes: e.target.value,
                updatedAt: new Date().toISOString(),
              },
            }))}
          />
          <div className="flex justify-between">
            <button disabled={index === 0} className="rounded border px-3 py-1 disabled:opacity-50" onClick={() => setIndex((prev) => Math.max(0, prev - 1))}>Previous</button>
            <button disabled={index === CONTROLS.length - 1} className="rounded border px-3 py-1 disabled:opacity-50" onClick={() => setIndex((prev) => Math.min(CONTROLS.length - 1, prev + 1))}>Next</button>
          </div>
        </div>
      </section>
    </main>
  );
}
