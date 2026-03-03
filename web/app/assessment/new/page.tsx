"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/header";
import { RequireAuth } from "@/components/require-auth";
import { authedFetch } from "@/lib/api-client";
import type { AssessmentLevel } from "@/types/assessment";

export default function NewAssessmentPage() {
  const router = useRouter();
  const [name, setName] = useState("Initial CMMC Assessment");
  const [level, setLevel] = useState<AssessmentLevel>("L2");

  return (
    <RequireAuth>
      <main>
        <Header />
        <section className="mx-auto max-w-xl rounded bg-white p-6 shadow">
          <h1 className="mb-4 text-xl font-semibold">Create Assessment</h1>
          <label className="mb-1 block text-sm font-medium">Assessment name</label>
          <input className="mb-4 w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="mb-1 block text-sm font-medium">Level</label>
          <select
            className="mb-4 w-full rounded border p-2"
            value={level}
            onChange={(e) => setLevel(e.target.value as AssessmentLevel)}
          >
            <option value="L1">L1</option>
            <option value="L2">L2</option>
          </select>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={async () => {
              const res = await authedFetch("/api/assessments", {
                method: "POST",
                body: JSON.stringify({ name, level }),
              });
              const payload = await res.json();
              if (res.ok) router.push(`/assessment/${payload.assessment.id}`);
            }}
          >
            Create
          </button>
        </section>
      </main>
    </RequireAuth>
  );
}
