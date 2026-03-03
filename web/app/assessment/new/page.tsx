"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/header";
import { authedFetch } from "@/lib/api-client";

export default function NewAssessmentPage() {
  const router = useRouter();
  const [name, setName] = useState("Initial CMMC Assessment");

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-xl rounded bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-semibold">Create Assessment</h1>
        <input className="mb-4 w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={async () => {
          const res = await authedFetch("/api/assessments", { method: "POST", body: JSON.stringify({ name, level: "L2" }) });
          const payload = await res.json();
          if (res.ok) router.push(`/assessment/${payload.assessment.id}`);
        }}>Create</button>
      </section>
    </main>
  );
}
