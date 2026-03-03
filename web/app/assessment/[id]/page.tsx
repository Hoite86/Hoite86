"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/header";
import { RequireAuth } from "@/components/require-auth";
import { authedFetch } from "@/lib/api-client";
import { calculateSprs, completionPercent } from "@/lib/sprs";
import type { Assessment, Control, ControlDomain, ControlResponse, ResponseAnswer } from "@/types/assessment";

const ANSWERS: ResponseAnswer[] = ["MET", "PARTIALLY_MET", "NOT_MET", "NOT_APPLICABLE"];

export default function AssessmentPage() {
  const params = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [controls, setControls] = useState<Control[]>([]);
  const [domains, setDomains] = useState<ControlDomain[]>([]);
  const [responses, setResponses] = useState<Record<string, ControlResponse>>({});
  const [activeControlId, setActiveControlId] = useState<string>("");
  const [activeDomainId, setActiveDomainId] = useState<string>("");

  useEffect(() => {
    authedFetch(`/api/assessments/${params.id}`).then(async (res) => {
      if (!res.ok) return;
      const payload = await res.json();

      const loadedAssessment = payload.assessment as Assessment;
      const loadedControls = payload.controls as Control[];
      const loadedDomains = payload.domains as ControlDomain[];

      setAssessment(loadedAssessment);
      setControls(loadedControls);
      setDomains(loadedDomains);

      const map: Record<string, ControlResponse> = {};
      for (const response of payload.responses as ControlResponse[]) {
        map[response.controlId] = response;
      }
      setResponses(map);

      if (loadedControls.length > 0) {
        setActiveControlId(loadedControls[0].id);
      }
      if (loadedDomains.length > 0) {
        setActiveDomainId(loadedDomains[0].id);
      }
    });
  }, [params.id]);

  const currentIndex = useMemo(
    () => controls.findIndex((control) => control.id === activeControlId),
    [activeControlId, controls]
  );
  const currentControl = currentIndex >= 0 ? controls[currentIndex] : null;
  const responseList = useMemo(() => Object.values(responses), [responses]);
  const level = assessment?.level ?? "L2";
  const sprs = calculateSprs(level, responseList);
  const complete = completionPercent(responseList, controls.length);

  const activateDomain = (domainId: string) => {
    setActiveDomainId(domainId);
    const domain = domains.find((entry) => entry.id === domainId);
    if (domain?.controls[0]) {
      setActiveControlId(domain.controls[0].id);
    }
  };

  const moveControl = (direction: "prev" | "next") => {
    if (currentIndex < 0) return;
    const targetIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    const target = controls[targetIndex];
    if (!target) return;

    setActiveControlId(target.id);
    const domain = domains.find((entry) => entry.name === target.domain);
    if (domain) setActiveDomainId(domain.id);
  };

  return (
    <RequireAuth>
      {!assessment || !currentControl ? (
        <main className="p-6">Loading...</main>
      ) : (
        <main>
          <Header />
          <section className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
            <div className="rounded bg-white p-4 shadow">
              <h1 className="text-2xl font-semibold">{assessment.name}</h1>
              <p className="text-sm text-slate-600">Assessment level: {assessment.level}</p>
              <p>
                Live SPRS Score: <span className="font-semibold">{sprs}</span>
              </p>
              <p>Completion: {complete}% ({responseList.length}/{controls.length})</p>
              <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
                <div className="h-full bg-blue-600" style={{ width: `${complete}%` }} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <aside className="rounded bg-white p-3 shadow">
                <h2 className="mb-2 font-semibold">Domains</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible">
                  {domains.map((domain) => {
                    const answered = domain.controls.filter((control) => responses[control.id]).length;
                    const isActive = activeDomainId === domain.id;
                    return (
                      <button
                        key={domain.id}
                        type="button"
                        onClick={() => activateDomain(domain.id)}
                        className={`min-w-[220px] rounded border p-2 text-left lg:min-w-0 ${
                          isActive ? "border-blue-600 bg-blue-50" : "border-slate-200"
                        }`}
                      >
                        <p className="text-sm font-medium">{domain.name}</p>
                        <p className="text-xs text-slate-600">
                          {answered}/{domain.controls.length} answered
                        </p>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="rounded bg-white p-5 shadow">
                <p className="text-sm text-slate-500">
                  Control {currentIndex + 1} of {controls.length}
                </p>
                <h2 className="text-lg font-semibold">
                  {currentControl.id} — {currentControl.title}
                </h2>
                <p className="mb-4 text-slate-700">{currentControl.description}</p>

                <label className="mb-1 block text-sm font-medium">Answer</label>
                <select
                  className="mb-3 w-full rounded border p-2"
                  value={responses[currentControl.id]?.answer ?? "MET"}
                  onChange={async (e) => {
                    const answer = e.target.value as ResponseAnswer;
                    const notes = responses[currentControl.id]?.notes ?? "";
                    const res = await authedFetch(`/api/assessments/${assessment.id}/responses`, {
                      method: "POST",
                      body: JSON.stringify({ controlId: currentControl.id, answer, notes }),
                    });
                    if (!res.ok) return;
                    const payload = await res.json();
                    setResponses((prev) => ({ ...prev, [currentControl.id]: payload.response as ControlResponse }));
                    setAssessment(payload.assessment as Assessment);
                  }}
                >
                  {ANSWERS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <label className="mb-1 block text-sm font-medium">Notes</label>
                <textarea
                  className="mb-4 w-full rounded border p-2"
                  rows={4}
                  placeholder="Notes"
                  value={responses[currentControl.id]?.notes ?? ""}
                  onChange={(e) =>
                    setResponses((prev) => ({
                      ...prev,
                      [currentControl.id]: {
                        controlId: currentControl.id,
                        answer: prev[currentControl.id]?.answer ?? "MET",
                        notes: e.target.value,
                        updatedAt: new Date().toISOString(),
                      },
                    }))
                  }
                />

                <div className="flex justify-between">
                  <button
                    disabled={currentIndex <= 0}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                    onClick={() => moveControl("prev")}
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentIndex >= controls.length - 1}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                    onClick={() => moveControl("next")}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}
    </RequireAuth>
  );
}
