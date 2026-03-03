"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

export function Header() {
  return (
    <header className="mb-6 flex items-center justify-between border-b bg-white px-6 py-4">
      <Link href="/dashboard" className="font-semibold">CMMC MVP</Link>
      <button className="rounded border px-3 py-1 text-sm" onClick={() => signOut(auth)}>Sign out</button>
    </header>
  );
}
