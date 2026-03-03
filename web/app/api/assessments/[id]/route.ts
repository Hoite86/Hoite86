import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import { AuthError, requireUserIdFromRequest } from "@/lib/auth-server";
import { apiError } from "@/lib/api";

const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const parsedParams = paramsSchema.parse(params);
    const uid = await requireUserIdFromRequest(req);
    const assessmentRef = db.collection("assessments").doc(parsedParams.id);
    const assessmentDoc = await assessmentRef.get();

    if (!assessmentDoc.exists) {
      return apiError(404, "Assessment not found");
    }

    const assessment = assessmentDoc.data();
    if (assessment?.userId !== uid) {
      return apiError(403, "Forbidden");
    }

    const responseDocs = await assessmentRef.collection("responses").get();
    const responses = responseDocs.docs.map((doc) => {
      const data = doc.data();
      return {
        controlId: doc.id,
        answer: data.answer,
        notes: data.notes,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return Response.json({
      assessment: {
        id: assessmentDoc.id,
        userId: assessment?.userId,
        name: assessment?.name,
        level: assessment?.level,
        sprsScore: assessment?.sprsScore,
        status: assessment?.status,
        createdAt: assessment?.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: assessment?.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      },
      responses,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(401, "Unauthorized");
    }

    console.error("assessment details failed", error);
    return apiError(400, "Unable to fetch assessment");
  }
}
