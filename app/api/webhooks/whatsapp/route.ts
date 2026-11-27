import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Meta calls this when a customer messages your WhatsApp number. We only act on STOP: it turns their offers off.
// Set in Meta: callback URL = https://<your site>/api/webhooks/whatsapp, verify token = WHATSAPP_VERIFY_TOKEN, subscribe to "messages".
export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === token) {
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

const STOP = new Set(["STOP", "STOP ALL", "UNSUBSCRIBE", "CANCEL", "OPT OUT", "OPTOUT"]);

export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return NextResponse.json({ error: "not set up" }, { status: 503 });
  const raw = await req.text();
  const want = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const got = req.headers.get("x-hub-signature-256") ?? "";
  if (want.length !== got.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(got))) return new Response("bad signature", { status: 401 });

  type Msg = { from?: string; type?: string; text?: { body?: string } };
  let body: { entry?: { changes?: { value?: { messages?: Msg[] } }[] }[] } = {};
  try { body = JSON.parse(raw); } catch { return new Response("ok"); }
  for (const e of body.entry ?? []) for (const c of e.changes ?? []) for (const m of c.value?.messages ?? []) {
    const phone = (m.from ?? "").replace(/\D/g, "");
    const text = (m.text?.body ?? "").trim().toUpperCase().replace(/[.!]+$/, "");
    if (m.type === "text" && phone && STOP.has(text)) {
      await db.messagingConsent.upsert({ where: { phone }, update: { marketing: false, optedOutAt: new Date() }, create: { phone, marketing: false, source: "whatsapp-stop", optedOutAt: new Date() } }).catch((err) => console.error("stop failed", err));
    }
  }
  return new Response("ok");
}
