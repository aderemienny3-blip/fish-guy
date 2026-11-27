import { db } from "@/lib/db";

export const normMatric = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

type V = { id: string; fullName: string; phone: string; email: string; matricNumber: string };
type Other = V & { status: string };

/** Reasons to look twice at an application: the same matric number, phone or email already used by someone else. Pure. */
export function flagsFor(v: V, others: Other[]): string[] {
  const out: string[] = [];
  for (const o of others) {
    if (o.id === v.id) continue;
    const why: string[] = [];
    if (normMatric(o.matricNumber) === normMatric(v.matricNumber) && normMatric(v.matricNumber)) why.push("matric number");
    if (o.phone === v.phone) why.push("phone");
    if (o.email.toLowerCase() === v.email.toLowerCase()) why.push("email");
    if (why.length && !(why.length === 1 && why[0] === "phone" && o.fullName.toLowerCase() === v.fullName.toLowerCase())) out.push(`Same ${why.join(" and ")} as ${o.fullName} (${o.status.toLowerCase()})`);
  }
  return out.slice(0, 4);
}

export async function studentFlags(pending: V[]): Promise<Map<string, string[]>> {
  const res = new Map<string, string[]>();
  if (pending.length === 0) return res;
  const matrics = [...new Set(pending.flatMap((p) => [p.matricNumber, p.matricNumber.toUpperCase(), p.matricNumber.toLowerCase()]))];
  const others = await db.studentVerification.findMany({
    where: { OR: [{ phone: { in: pending.map((p) => p.phone) } }, { email: { in: pending.map((p) => p.email) } }, { matricNumber: { in: matrics } }] },
    select: { id: true, fullName: true, phone: true, email: true, matricNumber: true, status: true },
    take: 500,
  });
  for (const p of pending) res.set(p.id, flagsFor(p, others));
  return res;
}
