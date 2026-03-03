import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import { AuthError, requireUserIdFromRequest } from "@/lib/auth-server";
import { apiError } from "@/lib/api";
import { getControlsForLevel, getDomainsForLevel } from "@/data/controls";
import { cached } from "@/lib/server-cache";
import type { AssessmentLevel, ControlResponse } from "@/types/assessment";

const paramsSchema = z.object({ id: z.string().min(1) });
const TTL_MS = 20_000;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const parsedParams = paramsSchema.parse(params);
    const uid = await requireUserIdFromRequest(req);

    const payload = await cached(`assessment:${uid}:${parsedParams.id}`, TTL_MS, async () => {
      const assessmentRef = db.collection("assessments").doc(parsedParams.id);
      const assessmentDoc = await assessmentRef.get();

      if (!assessmentDoc.exists) {
        throw new Error("NOT_FOUND");
      }

      const assessment = assessmentDoc.data();
      if (assessment?.userId !== uid) {
        throw new Error("FORBIDDEN");
      }

      const level = (assessment?.level ?? "L2") as AssessmentLevel;
      const controls = await cached(`controls:${level}`, 300_000, async () => getControlsForLevel(level));
      const domains = await cached(`domains:${level}`, 300_000, async () => getDomainsForLevel(level));

      const responseDocs = await assessmentRef.collection("responses").get();
      const responses: ControlResponse[] = responseDocs.docs.map((doc) => {
        const data = doc.data();
        return {
          controlId: doc.id,
          answer: data.answer,
          notes: data.notes,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        };
      });

      return {
        assessment: {
          id: assessmentDoc.id,
          userId: assessment?.userId,
          name: assessment?.name,
          level,
          sprsScore: assessment?.sprsScore,
          status: assessment?.status,
          createdAt: assessment?.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          updatedAt: assessment?.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        },
        responses,
        controls,
        domains,
      };
    });

    return Response.json(payload);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(401, "Unauthorized");
    }

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return apiError(404, "Assessment not found");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return apiError(403, "Forbidden");
    }

    console.error("assessment details failed", error);
    return apiError(400, "Unable to fetch assessment");
  }
}
