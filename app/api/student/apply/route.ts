import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeNgPhone } from "@/lib/phone";
import { getStudentRules } from "@/lib/student";

const Body = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string(),
  email: z.string().trim().email().max(254),
  institutionId: z.string().nullable().optional(),
  otherInstitution: z.string().trim().max(150).optional(),
  matricNumber: z.string().trim().min(3).max(40),
  idPath: z.string().startsWith("student-ids/").max(300),
  consent: z.literal(true),
});

export async function POST(req: Request) {
  const rules = await getStudentRules();
  if (rules.percent <= 0) return NextResponse.json({ error: "The student discount is not open yet." }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please complete every field and tick the consent box." }, { status: 400 });
  const b = parsed.data;

  const phone = normalizeNgPhone(b.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid Nigerian phone number." }, { status: 400 });

  let institutionId: string | null = null;
  if (b.institutionId) {
    const inst = await db.institution.findFirst({ where: { id: b.institutionId, active: true } });
    if (!inst) return NextResponse.json({ error: "Choose your school from the list." }, { status: 400 });
    institutionId = inst.id;
  } else if (!b.otherInstitution || b.otherInstitution.length < 3) {
    return NextResponse.json({ error: "Choose your school, or type its name under Other." }, { status: 400 });
  }

  const existing = await db.studentVerification.findFirst({
    where: { phone, OR: [{ status: "PENDING" }, { status: "APPROVED", expiresAt: { gt: new Date() } }] },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This phone number already has a student application. Open the status link you saved, or contact us if you lost it." },
      { status: 409 },
    );
  }

  const reference = "STU-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  await db.studentVerification.create({
    data: {
      reference,
      fullName: b.fullName,
      phone,
      email: b.email,
      institutionId,
      otherInstitution: institutionId ? null : b.otherInstitution,
      matricNumber: b.matricNumber,
      idPath: b.idPath,
    },
  });
  return NextResponse.json({ reference }, { status: 201 });
}
