import { redirect } from "next/navigation";

const TZ = "Africa/Lagos";

export const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat("en-NG", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);

/** isoDate is YYYY-MM-DD */
export const fmtDay = (isoDate: string) =>
  new Intl.DateTimeFormat("en-NG", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(isoDate + "T00:00:00Z"));

export function minutesToHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function hhmmToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

export function fmt12(m: number): string {
  const h = Math.floor(m / 60);
  const mi = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mi).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Start of a Lagos calendar day (Lagos is UTC+1, no daylight saving). */
export const lagosDayStart = (date: string) => new Date(`${date}T00:00:00+01:00`);

export const lagosDateOf = (d: Date) =>
  new Date(d.getTime() + 3_600_000).toISOString().slice(0, 10);

export const daysSince = (d: Date, now = new Date()) =>
  Math.floor((now.getTime() - d.getTime()) / 86_400_000);

/** Naira text ("4,500" or "4500.50") to integer kobo, or null if invalid. */
export function nairaToKobo(input: string): number | null {
  const n = Number(input.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export const koboToInput = (kobo: number) => String(kobo / 100);

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Redirect back to a form with an error message shown in a banner. */
export function bail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export function isUniqueError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}
