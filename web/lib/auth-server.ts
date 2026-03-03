import { headers } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

export async function requireUserIdFromAuthHeader(): Promise<string> {
  const authHeader = headers().get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.slice("Bearer ".length);
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}
