"use client";

import { auth } from "@/lib/firebase-client";

export async function authedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const token = await user.getIdToken();

  return fetch(input, {
    ...init,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
