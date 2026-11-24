import { db } from "@/lib/db";
import { ReportForm } from "@/components/music/report-form";

export const metadata = { title: "Report a copyright issue | Fish Guy Sounds", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReportTrackPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track } = await searchParams;
  const t = track ? await db.track.findFirst({ where: { slug: track }, select: { slug: true, title: true, artist: { select: { name: true } } } }) : null;
  return (
    <main className="page-width application-page">
      <div className="application-layout">
        <section className="application-intro">
          <p className="eyebrow">COPYRIGHT</p>
          <h1>Report a<br />copyright issue.</h1>
          <p>If a track on Fish Guy Sounds uses your music without permission, tell us here. We review every report and take a track offline while we look into a valid claim. Artists on Sounds confirm they own what they upload.</p>
          <p>Please only report music you own or are authorised to act for. Knowingly false reports can have legal consequences.</p>
        </section>
        <section className="application-card" aria-label="Copyright report form">
          <ReportForm trackSlug={t?.slug ?? ""} trackRef={t ? `${t.title} by ${t.artist.name}` : ""} />
        </section>
      </div>
    </main>
  );
}
