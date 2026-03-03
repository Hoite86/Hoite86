import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { requireUserIdFromAuthHeader } from "@/lib/auth-server";
import { apiError } from "@/lib/api";

const authHeaderSchema = z.string().startsWith("Bearer ");

export async function POST(req: Request) {
  try {
    authHeaderSchema.parse(req.headers.get("authorization") ?? "");
    const uid = await requireUserIdFromAuthHeader();
    await db.collection("users").doc(uid).set(
      {
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("sync-user failed", error);
    return apiError(401, "Unauthorized");
  }
}
