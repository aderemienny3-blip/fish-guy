import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { Banner, Empty, PageHeader, btn, btnDanger, btnGhost, card } from "@/components/admin/ui";
import { approveApplication, rejectApplication } from "../actions";

export const dynamic = "force-dynamic";

export default async function Applications({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const apps = await db.artistApplication.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <>
      <PageHeader
        title="Artist applications"
        subtitle="Approving creates the artist's page. You then upload their tracks."
        actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>}
      />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}
      {apps.length === 0 ? (
        <Empty title="No applications yet" hint="Artists apply from the Fish Guy Sounds page." />
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className={`${card} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium">{a.artistName}</p>
                  <p className="text-xs text-[#9A9585]">
                    {a.contactName} · {a.email} · {fmtDateTime(a.createdAt)} · {a.status.toLowerCase()} · {a.rightsAcceptedAt ? "rights confirmed " + fmtDateTime(a.rightsAcceptedAt) : "rights not recorded"}
                  </p>
                </div>
                {a.status === "PENDING" && (
                  <div className="flex gap-2">
                    <form action={approveApplication}><input type="hidden" name="id" value={a.id} /><button className={btn}>Approve</button></form>
                    <form action={rejectApplication}><input type="hidden" name="id" value={a.id} /><button className={btnDanger}>Reject</button></form>
                  </div>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[#F5F1E6]">{a.links}</p>
              {a.message && <p className="mt-2 whitespace-pre-wrap text-sm text-[#9A9585]">{a.message}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
