export function copyrightLine(a: { owner?: string | null; year?: number | null; fallbackOwner: string; fallbackYear: number }) {
  const owner = (a.owner || "").trim() || a.fallbackOwner;
  const year = a.year && a.year >= 1900 ? a.year : a.fallbackYear;
  return `© ${year} ${owner}. All rights reserved.`;
}

export const REPORT_OPEN = "OPEN";
export const REPORT_ACTIONED = "ACTIONED";
export const REPORT_DISMISSED = "DISMISSED";
export const reportRef = (id: string) => "FGR-" + id.slice(-6).toUpperCase();
