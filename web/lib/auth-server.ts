import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";

const authHeaderSchema = z.string().regex(/^Bearer\s+.+$/, "Missing Bearer token");

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireUserIdFromRequest(req: Request): Promise<string> {
  const headerValue = req.headers.get("authorization");
  const parsed = authHeaderSchema.safeParse(headerValue);

  if (!parsed.success) {
    throw new AuthError("Missing or invalid Authorization header");
  }

  const token = parsed.data.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new AuthError("Missing Bearer token");
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    return decoded.uid;
  } catch {
    throw new AuthError("Invalid auth token");
  }
}
