"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const syncUser = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch("/api/auth/sync-user", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  };

  const navigateDashboard = () => router.push("/dashboard");

  return (
    <main className="mx-auto mt-16 max-w-md rounded bg-white p-8 shadow">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        <input className="w-full rounded border p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border p-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full rounded bg-blue-600 p-2 text-white" onClick={async () => {
          try {
            setError(null);
            await signInWithEmailAndPassword(auth, email, password);
            await syncUser();
            navigateDashboard();
          } catch {
            setError("Login failed");
          }
        }}>Sign in</button>
        <button className="w-full rounded border p-2" onClick={async () => {
          try {
            setError(null);
            await createUserWithEmailAndPassword(auth, email, password);
            await syncUser();
            navigateDashboard();
          } catch {
            setError("Signup failed");
          }
        }}>Create account</button>
        <button className="w-full rounded border p-2" onClick={async () => {
          try {
            setError(null);
            await signInWithPopup(auth, googleProvider);
            await syncUser();
            navigateDashboard();
          } catch {
            setError("Google sign-in failed");
          }
        }}>Sign in with Google</button>
      </div>
    </main>
  );
}
