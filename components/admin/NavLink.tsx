"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  exact,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
        active
          ? "bg-[#D4AF37]/15 text-[#F5C84C]"
          : "text-[#9A9585] hover:bg-white/5 hover:text-[#F5F1E6]"
      }`}
    >
      {children}
    </Link>
  );
}
