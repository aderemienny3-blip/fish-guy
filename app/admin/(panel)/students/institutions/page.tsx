import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { addInstitution, toggleInstitution } from "../actions";

export const dynamic = "force-dynamic";
const TYPES: [string, string][] = [["UNIVERSITY", "University"], ["POLYTECHNIC", "Polytechnic"], ["COLLEGE_OF_EDUCATION", "College of education"], ["OTHER", "Other"]];

export default async function Institutions({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const list = await db.institution.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Schools" subtitle="Schools students can pick when they apply. Hide one to remove it from the form." actions={<Link href="/admin/students" className={btnGhost}>Back to students</Link>} />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}
      <form action={addInstitution} className={`${card} mb-6 grid gap-4 p-5 sm:grid-cols-[1fr_200px_auto] sm:items-end`}>
        <div><label className={label} htmlFor="name">School name</label><input id="name" name="name" className={input} required minLength={3} /></div>
        <div><label className={label} htmlFor="type">Type</label><select id="type" name="type" className={input}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <button className={btn}>Add school</button>
      </form>
      {list.length === 0 ? <Empty title="No schools yet" hint="Run the seed script, or add schools above." /> : (
        <div className="space-y-2">
          {list.map((i) => (
            <div key={i.id} className={`${card} flex items-center justify-between gap-3 px-5 py-3`}>
              <div><p className={i.active ? "" : "text-[#9A9585] line-through"}>{i.name}</p><p className="text-xs text-[#9A9585]">{TYPES.find(([v]) => v === i.type)?.[1]}</p></div>
              <form action={toggleInstitution}><input type="hidden" name="id" value={i.id} /><button className={btnGhost}>{i.active ? "Hide" : "Show"}</button></form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
