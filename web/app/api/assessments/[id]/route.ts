import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import { requireUserIdFromAuthHeader } from "@/lib/auth-server";
import { apiError } from "@/lib/api";

const authHeaderSchema = z.string().startsWith("Bearer ");
const paramsSchema = z.object({ id: z.string().min(1) });

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    authHeaderSchema.parse(req.headers.get("authorization") ?? "");
    const parsedParams = paramsSchema.parse(params);
    const uid = await requireUserIdFromAuthHeader();
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
        ...data,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return Response.json({
      assessment: {
        id: assessmentDoc.id,
        ...assessment,
        createdAt: assessment?.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: assessment?.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      },
      responses,
    });
  } catch (error) {
    console.error("assessment details failed", error);
    return apiError(400, "Unable to fetch assessment");
  }
}
