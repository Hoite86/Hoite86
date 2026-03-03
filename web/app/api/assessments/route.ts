import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import { requireUserIdFromAuthHeader } from "@/lib/auth-server";
import { apiError } from "@/lib/api";

const authHeaderSchema = z.string().startsWith("Bearer ");
const createAssessmentSchema = z.object({
  name: z.string().min(2).max(120),
  level: z.enum(["L1", "L2"]),
});

export async function POST(req: Request) {
  try {
    authHeaderSchema.parse(req.headers.get("authorization") ?? "");
    const uid = await requireUserIdFromAuthHeader();
    const parsed = createAssessmentSchema.parse(await req.json());
    const ref = db.collection("assessments").doc();

    const data = {
      userId: uid,
      name: parsed.name,
      level: parsed.level,
      sprsScore: 110,
      status: "in_progress",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await ref.set(data);
    return Response.json(
      { assessment: { id: ref.id, ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } },
      { status: 201 }
    );
  } catch (error) {
    console.error("create assessment failed", error);
    return apiError(400, "Unable to create assessment");
  }
}

export async function GET(req: Request) {
  try {
    authHeaderSchema.parse(req.headers.get("authorization") ?? "");
    const uid = await requireUserIdFromAuthHeader();
    const snapshot = await db.collection("assessments").where("userId", "==", uid).orderBy("updatedAt", "desc").get();
    const assessments = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      };
    });

    return Response.json({ assessments });
  } catch (error) {
    console.error("list assessments failed", error);
    return apiError(400, "Unable to list assessments");
  }
}
