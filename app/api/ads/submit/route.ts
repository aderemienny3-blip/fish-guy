import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { addDays, lagosNow } from "@/lib/delivery";
import { normalizeNgPhone } from "@/lib/phone";
import { MAX_DAYS_AHEAD, PLACEMENT_INFO, type Placement } from "@/lib/ads/labels";
import { mailSubmitted } from "@/lib/ads/mail";

const Body = z.object({
  packageId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  artistName: z.string().trim().min(2).max(80),
  contactName: z.string().trim().min(2).max(100),
  phone: z.string(),
  email: z.string().trim().email().max(254),
  trackId: z.string().nullable().optional(),
  linkUrl: z.string().trim().max(500).optional(),
  headline: z.string().trim().min(3).max(60),
  tagline: z.string().trim().max(120).optional(),
  imagePath: z.string().startsWith("ads/").max(300).nullable().optional(),
  consent: z.literal(true),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please complete every required field and tick the box." }, { status: 400 });
  const b = parsed.data;

  const phone = normalizeNgPhone(b.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid Nigerian phone number." }, { status: 400 });

  const pkg = await db.adPackage.findFirst({ where: { id: b.packageId, active: true } });
  if (!pkg) return NextResponse.json({ error: "That package is no longer available." }, { status: 409 });

  const today = lagosNow().date;
  if (b.startDate < today || b.startDate > addDays(today, MAX_DAYS_AHEAD)) {
    return NextResponse.json({ error: `Pick a start date within the next ${MAX_DAYS_AHEAD} days.` }, { status: 400 });
  }

  let trackId: string | null = null;
  let linkUrl: string | null = null;
  if (b.trackId) {
    const t = await db.track.findFirst({ where: { id: b.trackId, isPublished: true }, select: { id: true } });
    if (!t) return NextResponse.json({ error: "That track is not available." }, { status: 400 });
    trackId = t.id;
  } else if (b.linkUrl && /^https:\/\//i.test(b.linkUrl)) {
    linkUrl = b.linkUrl;
  } else {
    return NextResponse.json({ error: "Choose one of your tracks on Fish Guy Sounds, or paste a link starting with https://" }, { status: 400 });
  }

  const info = PLACEMENT_INFO[pkg.placement as Placement];
  if (info.imageRequired && !b.imagePath) return NextResponse.json({ error: "This package needs an image. Upload your cover art or artwork." }, { status: 400 });

  const waiting = await db.adCampaign.count({ where: { phone, status: "SUBMITTED" } });
  if (waiting >= 5) return NextResponse.json({ error: "You already have several ads waiting for review. Please wait for a decision." }, { status: 429 });

  const reference = "AD-" + crypto.randomBytes(8).toString("hex").toUpperCase();
  const endDate = addDays(b.startDate, pkg.durationDays - 1);
  const c = await db.adCampaign.create({
    data: {
      reference, packageId: pkg.id, packageName: pkg.name, placement: pkg.placement, priceKobo: pkg.priceKobo, durationDays: pkg.durationDays,
      artistName: b.artistName, contactName: b.contactName, phone, email: b.email,
      trackId, linkUrl, headline: b.headline, tagline: b.tagline || null, imagePath: b.imagePath ?? null,
      startDate: b.startDate, endDate,
    },
  });
  try { await mailSubmitted(c); } catch (e) { console.error("ad submit mail failed", e); }
  return NextResponse.json({ reference }, { status: 201 });
}
