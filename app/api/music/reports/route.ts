import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { reportRef } from "@/lib/copyright";

export const runtime = "nodejs";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Please check the report details." }, { status: 400 });
  if (str(b.website)) return NextResponse.json({ submitted: true, reference: "FGR-000000" }); // honeypot: pretend it worked

  const trackRef = str(b.trackRef), name = str(b.name), email = str(b.email).toLowerCase();
  const ownership = str(b.ownership), description = str(b.description), proofUrl = str(b.proofUrl), signature = str(b.signature);
  const trackSlug = str(b.trackSlug);
  if (
    !trackRef || trackRef.length > 300 || !name || name.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    !ownership || ownership.length > 1200 || !description || description.length > 1500 ||
    proofUrl.length > 500 || !signature || signature.length > 120 || !str(b.agree)
  ) {
    return NextResponse.json({ error: "Please fill in every required box, tick the statement and sign with your full name." }, { status: 400 });
  }

  const dayAgo = new Date(Date.now() - 86_400_000);
  const [mine, all] = await Promise.all([
    db.takedownReport.count({ where: { reporterEmail: email, createdAt: { gte: dayAgo } } }),
    db.takedownReport.count({ where: { createdAt: { gte: new Date(Date.now() - 3_600_000) } } }),
  ]);
  if (mine >= 5 || all >= 40) return NextResponse.json({ error: "Too many reports right now. Please try again later." }, { status: 429 });

  const track = trackSlug ? await db.track.findFirst({ where: { slug: trackSlug }, select: { id: true } }) : null;
  const report = await db.takedownReport.create({
    data: { trackId: track?.id ?? null, trackRef, reporterName: name, reporterEmail: email, ownership, description, proofUrl: proofUrl || null, signature },
  });
  const ref = reportRef(report.id);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";

  const admins = (process.env.ADMIN_ALERT_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.length) {
    await sendEmail(admins, `Copyright report ${ref}: ${trackRef.slice(0, 60)}`,
      `<p>A copyright report needs review.</p><p><b>${esc(trackRef)}</b><br>From ${esc(name)} (${esc(email)})</p><p><a href="${site}/admin/music/reports">Open reports</a></p>`);
  }
  await sendEmail(email, `We received your copyright report (${ref})`,
    `<p>Hello ${esc(name)},</p><p>We received your report about <b>${esc(trackRef)}</b>. Your reference is <b>${ref}</b>. We review every report and will take a track offline while we look into a valid claim.</p><p>Fish Guy Sounds</p>`);

  return NextResponse.json({ submitted: true, reference: ref }, { status: 201 });
}
