import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-3xl font-bold">CMMC/NIST 800-171 Self-Assessment</h1>
      <p className="mb-6 text-slate-700">Track control responses and SPRS score progression.</p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded bg-blue-600 px-4 py-2 text-white">Login</Link>
        <Link href="/dashboard" className="rounded border border-slate-300 px-4 py-2">Dashboard</Link>
      </div>
    </main>
  );
}
