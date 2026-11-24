// An ISRC is 12 characters: 2 letters (country), 3 letters or digits (who registered it), 2 digits (year), 5 digits (the recording).
// Example: NGABC2400001. Codes are issued by an ISRC agency or a distributor. This only checks the shape.
export const ISRC_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

/** Returns the clean code, "" when left blank, or null when it is not a valid ISRC. */
export function normalizeIsrc(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const clean = s.toUpperCase().replace(/^ISRC[\s:]*/, "").replace(/[\s-]/g, "");
  return ISRC_PATTERN.test(clean) ? clean : null;
}

export const prettyIsrc = (isrc: string) => `${isrc.slice(0, 2)}-${isrc.slice(2, 5)}-${isrc.slice(5, 7)}-${isrc.slice(7)}`;
