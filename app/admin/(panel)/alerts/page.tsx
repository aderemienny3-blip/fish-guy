import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, PageHeader, btn, card } from "@/components/admin/ui";
import { alertConfigured, maskedAlertNumbers, whatsappConfigured } from "@/lib/whatsapp";
import { sendTestAlert } from "./actions";

export const dynamic = "force-dynamic";

export default async function Alerts({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { sent, error } = await searchParams;
  const numbers = maskedAlertNumbers();
  const ready = alertConfigured();
  return (
    <>
      <PageHeader title="Order alerts" subtitle="A WhatsApp message to your phone the moment an order is paid. Customer login codes use the same connection." />
      {sent && <Banner kind="ok">Test sent. Check your WhatsApp.</Banner>}
      {error && <Banner>{error}</Banner>}
      <div className={`${card} max-w-xl space-y-3 p-5 text-sm`}>
        <p>WhatsApp connection: <strong>{whatsappConfigured() ? "set up" : "not set up"}</strong> (needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID on Vercel)</p>
        <p>Alerts go to: <strong>{numbers.length ? numbers.join(", ") : "nobody yet"}</strong> (WHATSAPP_ALERT_TO, with country code, separated by commas)</p>
        <p>Email alerts still go to ADMIN_ALERT_EMAIL as before.</p>
        <form action={sendTestAlert}><button className={btn} disabled={!ready}>Send a test alert</button></form>
        {!ready && <p className="text-xs text-[#9A9585]">Finish the setup in README-ACCOUNT-WHATSAPP.txt, redeploy, then come back and press the button.</p>}
      </div>
    </>
  );
}
