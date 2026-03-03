import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import { apiError } from "@/lib/api";
import { AuthError, requireUserIdFromRequest } from "@/lib/auth-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { calculateSprs } from "@/lib/sprs";
import type { ControlResponse } from "@/types/assessment";

const paramsSchema = z.object({ id: z.string().min(1) });
const responseSchema = z.object({
  controlId: z.string().min(1),
  answer: z.enum(["MET", "NOT_MET", "PARTIALLY_MET", "NOT_APPLICABLE"]),
  notes: z.string().max(4000),
});

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const parsedParams = paramsSchema.parse(params);
    const uid = await requireUserIdFromRequest(req);

    const rateLimitResult = checkRateLimit(`responses:${uid}`, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      capacity: 3000,
    });

    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfterSec) },
        }
      );
    }

    const parsed = responseSchema.parse(await req.json());
    const assessmentRef = db.collection("assessments").doc(parsedParams.id);
    const assessmentDoc = await assessmentRef.get();

    if (!assessmentDoc.exists) return apiError(404, "Assessment not found");
    if (assessmentDoc.data()?.userId !== uid) return apiError(403, "Forbidden");

    await assessmentRef.collection("responses").doc(parsed.controlId).set({
      answer: parsed.answer,
      notes: parsed.notes,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const responseSnap = await assessmentRef.collection("responses").get();
    const allResponses: ControlResponse[] = responseSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        controlId: doc.id,
        answer: data.answer,
        notes: data.notes,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    const sprsScore = calculateSprs(allResponses);
    await assessmentRef.update({
      sprsScore,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({
      response: allResponses.find((entry) => entry.controlId === parsed.controlId),
      assessment: {
        id: parsedParams.id,
        userId: uid,
        ...(assessmentDoc.data() ?? {}),
        sprsScore,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(401, "Unauthorized");
    }

    console.error("upsert response failed", error);
    return apiError(400, "Unable to save response");
  }
}
