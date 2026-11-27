import { redirect } from "next/navigation";
import { getSiteFlags } from "@/lib/site-flags";

/** When the owner turns music off in admin, the Sounds pages send visitors to the shop. */
export default async function SoundsLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSiteFlags()).music) redirect("/shop");
  return children;
}
