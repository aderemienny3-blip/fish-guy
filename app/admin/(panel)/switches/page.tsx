import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, PageHeader, btn, btnGhost, card } from "@/components/admin/ui";
import { setMusic, testAlert } from "./actions";

export const dynamic = "force-dynamic";

export default async function Switches({ searchParams }: { searchParams: Promise<{ saved?: string; alert?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const s = await db.storeSettings.findUnique({ where: { id: 1 }, select: { musicEnabled: true } });
  const music = s?.musicEnabled ?? true;
  const alerts = (process.env.ADMIN_ALERT_EMAIL ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return (
    <>
      <PageHeader title="Site switches" subtitle="Turn parts of the site on or off, and check that error alerts reach you." />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {q.alert === "sent" && <Banner kind="ok">Test alert sent. Check your inbox (and spam).</Banner>}
      {q.alert === "failed" && <Banner>The test alert could not be sent. Check that ADMIN_ALERT_EMAIL and RESEND_API_KEY are set on Vercel.</Banner>}

      <section className={`${card} mb-6 max-w-2xl space-y-3 p-5`}>
        <h2 className="font-serif text-xl">Fish Guy Sounds (music)</h2>
        <p className="text-sm text-[#9A9585]">Turn this off to run the site as a frozen-food shop only. It hides the Sounds links, the music button and the listening strip, removes music pages from the sitemap, and sends /sounds visitors to the shop. Your tracks, artists and earnings are not deleted. Turn it on again any time.</p>
        <p className="text-sm text-[#9A9585]">Before switching off, make sure no music order is waiting to be paid. Customers returning from a music payment would be sent to the shop.</p>
        <form action={setMusic} className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="music" defaultChecked={music} /> Music is on</label>
          <button type="submit" className={btn}>Save</button>
        </form>
      </section>

      <section className={`${card} max-w-2xl space-y-3 p-5`}>
        <h2 className="font-serif text-xl">Error alerts</h2>
        <p className="text-sm text-[#9A9585]">When something breaks on the server, an email is sent to {alerts.length ? alerts.join(", ") : "the address in ADMIN_ALERT_EMAIL (not set yet)"}. The same problem is emailed at most once every 30 minutes. Messages are short and never include customer details.</p>
        <form action={testAlert}><button type="submit" className={btnGhost} disabled={alerts.length === 0}>Send a test alert</button></form>
      </section>
    </>
  );
}
