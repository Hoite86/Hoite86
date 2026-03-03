import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { AuthError, requireUserIdFromRequest } from "@/lib/auth-server";
import { apiError } from "@/lib/api";

const bodySchema = z.object({}).optional();

export async function POST(req: Request) {
  try {
    bodySchema.parse(await req.json().catch(() => ({})));
    const uid = await requireUserIdFromRequest(req);

    await db.collection("users").doc(uid).set(
      {
        uid,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(401, "Unauthorized");
    }

    console.error("sync-user failed", error);
    return apiError(400, "Unable to sync user");
  }
}
