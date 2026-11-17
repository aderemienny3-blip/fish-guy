import { db } from "@/lib/db";

export const STUDENT_REF = /^STU-[A-F0-9]{16}$/;

export type StudentRules = { percent: number; maxKobo: number | null; validityDays: number };

export async function getStudentRules(): Promise<StudentRules> {
  const s = await db.storeSettings.findUnique({ where: { id: 1 } });
  return {
    percent: s?.studentDiscountPercent ?? 0,
    maxKobo: s?.studentDiscountMaxKobo ?? null,
    validityDays: s?.studentValidityDays ?? 365,
  };
}

export { discountFor } from "@/lib/student-math";

/** A verification is usable only if approved, unexpired and bound to this phone number. */
export async function findUsableVerification(reference: string, phone: string) {
  if (!STUDENT_REF.test(reference)) return null;
  const v = await db.studentVerification.findUnique({ where: { reference } });
  if (!v || v.status !== "APPROVED" || v.phone !== phone) return null;
  if (!v.expiresAt || v.expiresAt <= new Date()) return null;
  return v;
}
