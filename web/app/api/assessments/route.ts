import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import { AuthError, requireUserIdFromRequest } from "@/lib/auth-server";
import { apiError } from "@/lib/api";

const createAssessmentSchema = z.object({
  name: z.string().min(2).max(120),
  level: z.enum(["L1", "L2"]),
});

export async function POST(req: Request) {
  try {
    const uid = await requireUserIdFromRequest(req);
    const parsed = createAssessmentSchema.parse(await req.json());
    const ref = db.collection("assessments").doc();

    const data = {
      userId: uid,
      name: parsed.name,
      level: parsed.level,
      sprsScore: 110,
      status: "in_progress" as const,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(data);
    return Response.json(
      {
        assessment: {
          id: ref.id,
          userId: uid,
          name: parsed.name,
          level: parsed.level,
          sprsScore: 110,
          status: "in_progress",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(401, "Unauthorized");
    }

    console.error("create assessment failed", error);
    return apiError(400, "Unable to create assessment");
  }
}

export async function GET(req: Request) {
  try {
    const uid = await requireUserIdFromRequest(req);
    const snapshot = await db
      .collection("assessments")
      .where("userId", "==", uid)
      .orderBy("updatedAt", "desc")
      .get();

    const assessments = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        name: data.name,
        level: data.level,
        sprsScore: data.sprsScore,
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return Response.json({ assessments });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(401, "Unauthorized");
    }

    console.error("list assessments failed", error);
    return apiError(400, "Unable to list assessments");
  }
}
