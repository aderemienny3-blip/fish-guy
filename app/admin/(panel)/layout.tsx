import type { AdminRole } from "@prisma/client";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { lagosNow } from "@/lib/delivery";
import { fmt12 } from "@/lib/admin/format";
import NavLink from "@/components/admin/NavLink";
import { logout } from "../actions";

const ALL: AdminRole[] = ["OWNER", "MANAGER", "PACKER", "RIDER"];
const MGR: AdminRole[] = ["OWNER", "MANAGER"];

const NAV: { href: string; label: string; roles: AdminRole[]; exact?: boolean }[] = [
  { href: "/admin", label: "Overview", roles: MGR, exact: true },
  { href: "/admin/orders", label: "Orders", roles: ALL, exact: true },
  { href: "/admin/orders/manifest", label: "Delivery manifest", roles: ALL },
  { href: "/admin/products", label: "Products", roles: MGR },
  { href: "/admin/delivery", label: "Delivery", roles: MGR },
  { href: "/admin/alerts", label: "Order alerts", roles: MGR },
  { href: "/admin/festive", label: "Festive deals", roles: MGR },
  { href: "/admin/customers", label: "Customers", roles: MGR },
  { href: "/admin/students", label: "Students", roles: MGR },
  { href: "/admin/homepage", label: "Homepage", roles: MGR },
  { href: "/admin/ads", label: "Ads", roles: MGR },
  { href: "/admin/music", label: "Music", roles: MGR },
  { href: "/admin/music/reports", label: "Copyright reports", roles: MGR },
  { href: "/admin/music/announcements", label: "Fan announcements", roles: MGR },
  { href: "/admin/team", label: "Team", roles: ["OWNER"] },
  { href: "/admin/settings", label: "Settings", roles: ["OWNER"] },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const settings = await getSettings();
  const now = lagosNow();
  const open = now.minutes >= settings.openMinute && now.minutes < settings.closeMinute;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-white/10 bg-[#0F0F0F] md:w-60 md:shrink-0 md:border-b-0 md:border-r print:hidden">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <div>
            <p className="font-serif text-xl text-[#D4AF37]">FISH GUY</p>
            <p className="text-xs text-[#9A9585]">Admin</p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs md:mt-3 md:inline-block ${
              open ? "border-emerald-400/50 text-emerald-300" : "border-white/20 text-[#9A9585]"
            }`}
          >
            {open ? `Open until ${fmt12(settings.closeMinute)}` : `Closed, opens ${fmt12(settings.openMinute)}`}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:pb-0">
          {NAV.filter((n) => n.roles.includes(admin.role)).map((n) => (
            <NavLink key={n.href} href={n.href} exact={n.exact}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-4 py-6 md:block">
          <p className="truncate text-sm">{admin.name}</p>
          <p className="text-xs capitalize text-[#9A9585]">{admin.role.toLowerCase()}</p>
          <form action={logout} className="mt-3">
            <button type="submit" className="text-xs text-[#9A9585] underline hover:text-[#D4AF37]">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
        <form action={logout} className="mt-10 md:hidden print:hidden">
          <button type="submit" className="text-xs text-[#9A9585] underline">
            Sign out ({admin.name})
          </button>
        </form>
      </main>
    </div>
  );
}
