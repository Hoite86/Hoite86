"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { RequireAuth } from "@/components/require-auth";
import { authedFetch } from "@/lib/api-client";
import type { Assessment } from "@/types/assessment";

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    authedFetch("/api/assessments").then(async (res) => {
      if (res.ok) setAssessments((await res.json()).assessments as Assessment[]);
    });
  }, []);

  const latest = assessments[0];

  return (
    <RequireAuth>
      <main>
        <Header />
        <section className="mx-auto max-w-4xl space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <Link href="/assessment/new" className="rounded bg-blue-600 px-4 py-2 text-white">
              New Assessment
            </Link>
          </div>

          {latest ? (
            <div className="rounded bg-white p-5 shadow">
              <h2 className="text-lg font-semibold">Latest Assessment</h2>
              <p>Name: {latest.name}</p>
              <p>Status: {latest.status}</p>
              <p>SPRS: {latest.sprsScore}</p>
              <Link className="mt-3 inline-block text-blue-600 underline" href={`/assessment/${latest.id}`}>
                Continue
              </Link>
            </div>
          ) : (
            <p className="text-slate-600">No assessments yet.</p>
          )}

          <ul className="space-y-2">
            {assessments.map((assessment) => (
              <li key={assessment.id} className="rounded border bg-white p-3">
                <Link href={`/assessment/${assessment.id}`} className="font-medium text-blue-600">
                  {assessment.name}
                </Link>
                <span className="ml-2 text-sm text-slate-600">SPRS: {assessment.sprsScore}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </RequireAuth>
  );
}
