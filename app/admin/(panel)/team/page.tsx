import { db } from "@/lib/db";
import { OWNER_ONLY, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { Banner, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { addStaff, resetStaffPassword, toggleStaff } from "./actions";

const ROLE_HELP: Record<string, string> = {
  OWNER: "Everything",
  MANAGER: "Orders, products, delivery, customers",
  PACKER: "Orders and manifest: packing steps only",
  RIDER: "Orders and manifest: marks deliveries",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const me = await requireAdmin(OWNER_ONLY);
  const { saved, error } = await searchParams;
  const staff = await db.adminUser.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <>
      <PageHeader title="Team" subtitle="Give each person their own login and only the access they need." />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <section className={`${card} mb-6 divide-y divide-white/5`}>
        {staff.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {u.name} {u.id === me.id && <span className="text-xs text-[#9A9585]">(you)</span>}
              </p>
              <p className="text-xs text-[#9A9585]">
                {u.email} · {u.role.toLowerCase()} · {ROLE_HELP[u.role]}
                {u.lastLoginAt ? ` · last in ${fmtDateTime(u.lastLoginAt)}` : " · never signed in"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={resetStaffPassword} className="flex gap-2">
                <input type="hidden" name="id" value={u.id} />
                <input name="password" type="password" minLength={10} placeholder="New password" className={`${input} w-40`} autoComplete="new-password" />
                <button type="submit" className={btnGhost}>Set</button>
              </form>
              {u.id !== me.id && (
                <form action={toggleStaff}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className={btnGhost}>{u.active ? "Switch off" : "Switch on"}</button>
                </form>
              )}
              {!u.active && <span className="text-xs text-red-300">Switched off</span>}
            </div>
          </div>
        ))}
      </section>

      <section className={`${card} max-w-2xl p-5`}>
        <h2 className="mb-4 font-serif text-xl">Add a team member</h2>
        <form action={addStaff} className="grid gap-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="name">Name</label><input id="name" name="name" required className={input} /></div>
          <div><label className={label} htmlFor="email">Email</label><input id="email" name="email" type="email" required className={input} /></div>
          <div>
            <label className={label} htmlFor="role">Role</label>
            <select id="role" name="role" className={input} defaultValue="PACKER">
              <option value="MANAGER">Manager: {ROLE_HELP.MANAGER}</option>
              <option value="PACKER">Packer: {ROLE_HELP.PACKER}</option>
              <option value="RIDER">Rider: {ROLE_HELP.RIDER}</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="password">Starting password</label>
            <input id="password" name="password" type="password" minLength={10} required className={input} autoComplete="new-password" />
          </div>
          <div className="sm:col-span-2"><button type="submit" className={btn}>Add team member</button></div>
        </form>
      </section>
    </>
  );
}
