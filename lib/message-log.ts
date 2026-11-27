import { db } from "@/lib/db";

/** Records that a message was sent (who, when, which kind, whether it worked). The message text is never stored. Never throws. */
export async function logMessage(m: { channel: "EMAIL" | "WHATSAPP"; to: string; kind: string; ok: boolean; error?: string | null; ref?: string | null }) {
  try {
    await db.messageLog.create({ data: { channel: m.channel, to: m.to.slice(0, 160), kind: m.kind.slice(0, 160), ok: m.ok, error: m.error ? m.error.slice(0, 200) : null, ref: m.ref ?? null } });
  } catch (e) {
    console.error("message log failed", e);
  }
}
