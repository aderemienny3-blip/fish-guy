import type { ReactNode } from "react";
import type { OrderStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/admin/orders";
import { SEGMENT_LABEL, type Segment } from "@/lib/admin/segments";

// Fish Guy admin theme: black + gold.
export const card = "rounded-xl border border-white/10 bg-[#141414]";
export const btn =
  "inline-flex items-center justify-center rounded-md bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#F5C84C] disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center rounded-md border border-white/15 px-3 py-1.5 text-sm text-[#F5F1E6] transition hover:border-[#D4AF37] hover:text-[#D4AF37]";
export const btnDanger =
  "inline-flex items-center justify-center rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10";
export const input =
  "w-full rounded-md border border-white/15 bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F1E6] placeholder:text-[#9A9585] focus:border-[#D4AF37] focus:outline-none";
export const label = "mb-1 block text-xs uppercase tracking-wide text-[#9A9585]";
export const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#9A9585]";
export const td = "px-4 py-3 align-middle text-sm";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl text-[#F5F1E6]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#9A9585]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label: l, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className={`${card} p-5`}>
      <p className="text-xs uppercase tracking-wide text-[#9A9585]">{l}</p>
      <p className="mt-2 text-2xl font-semibold text-[#D4AF37]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#9A9585]">{hint}</p>}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className={`${card} flex flex-col items-center gap-2 px-6 py-12 text-center`}>
      <p className="text-base text-[#F5F1E6]">{title}</p>
      {hint && <p className="max-w-md text-sm text-[#9A9585]">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Banner({ kind = "error", children }: { kind?: "error" | "ok"; children: ReactNode }) {
  const tone =
    kind === "error"
      ? "border-red-500/40 bg-red-500/10 text-red-200"
      : "border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#F5C84C]";
  return <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${tone}`}>{children}</div>;
}

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "border-white/20 text-[#9A9585]",
  PAID: "border-[#D4AF37]/60 text-[#F5C84C]",
  PREPARING: "border-sky-400/50 text-sky-300",
  OUT_FOR_DELIVERY: "border-violet-400/50 text-violet-300",
  DELIVERED: "border-emerald-400/50 text-emerald-300",
  CANCELLED: "border-red-500/40 text-red-300",
  EXPIRED: "border-white/15 text-[#9A9585]",
  REFUNDED: "border-red-500/60 text-red-300",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${STATUS_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const SEGMENT_TONE: Record<Segment, string> = {
  SUPER_BUYER: "border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5C84C]",
  LOYAL: "border-emerald-400/50 text-emerald-300",
  NEW: "border-sky-400/50 text-sky-300",
  REGULAR: "border-white/20 text-[#9A9585]",
  AT_RISK: "border-orange-400/60 text-orange-300",
  LOST: "border-red-500/40 text-red-300",
};

export function SegmentBadge({ segment }: { segment: Segment }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${SEGMENT_TONE[segment]}`}>
      {SEGMENT_LABEL[segment]}
    </span>
  );
}
