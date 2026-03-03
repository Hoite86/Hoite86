import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import { apiError } from "@/lib/api";
import { requireUserIdFromAuthHeader } from "@/lib/auth-server";
import { calculateSprs } from "@/lib/sprs";
import type { ControlResponse } from "@/types/assessment";

const authHeaderSchema = z.string().startsWith("Bearer ");
const paramsSchema = z.object({ id: z.string().min(1) });
const responseSchema = z.object({
  controlId: z.string().min(1),
  answer: z.enum(["MET", "NOT_MET", "PARTIALLY_MET", "NOT_APPLICABLE"]),
  notes: z.string().max(4000),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    authHeaderSchema.parse(req.headers.get("authorization") ?? "");
    const parsedParams = paramsSchema.parse(params);
    const uid = await requireUserIdFromAuthHeader();
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
        ...(assessmentDoc.data() ?? {}),
        sprsScore,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("upsert response failed", error);
    return apiError(400, "Unable to save response");
  }
}
