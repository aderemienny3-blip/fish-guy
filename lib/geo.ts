// Approximate location from the host's IP headers (Vercel adds these). Never exact, and it can be wrong on mobile data.
const NG_STATES: Record<string, string> = {
  AB: "Abia", AD: "Adamawa", AK: "Akwa Ibom", AN: "Anambra", BA: "Bauchi", BE: "Benue", BO: "Borno", BY: "Bayelsa",
  CR: "Cross River", DE: "Delta", EB: "Ebonyi", ED: "Edo", EK: "Ekiti", EN: "Enugu", FC: "Abuja (FCT)", GO: "Gombe",
  IM: "Imo", JI: "Jigawa", KD: "Kaduna", KE: "Kebbi", KN: "Kano", KO: "Kogi", KT: "Katsina", KW: "Kwara",
  LA: "Lagos", NA: "Nasarawa", NI: "Niger", OG: "Ogun", ON: "Ondo", OS: "Osun", OY: "Oyo", PL: "Plateau",
  RI: "Rivers", SO: "Sokoto", TA: "Taraba", YO: "Yobe", ZA: "Zamfara",
};

export type Geo = { country: string | null; region: string | null; city: string | null };

export function geoFrom(h: { get(name: string): string | null }): Geo {
  const country = (h.get("x-vercel-ip-country") || "").trim().toUpperCase().slice(0, 2) || null;
  const rawRegion = (h.get("x-vercel-ip-country-region") || "").trim().toUpperCase().slice(0, 40);
  let city: string | null = null;
  try { city = decodeURIComponent(h.get("x-vercel-ip-city") || "").trim().slice(0, 60) || null; } catch { city = null; }
  const region = country === "NG" && NG_STATES[rawRegion] ? NG_STATES[rawRegion] : rawRegion || null;
  return { country, region, city };
}

export function placeLabel(g: { country?: string | null; region?: string | null; city?: string | null }): string {
  const bits = [g.city, g.region].filter(Boolean) as string[];
  if (bits.length) return [...new Set(bits)].join(", ");
  return g.country === "NG" ? "Nigeria" : g.country || "Unknown";
}

/** Grouping key for "where": the state/region when known, else the country, else Unknown. */
export function placeKey(g: { country?: string | null; region?: string | null }): string {
  return g.region || (g.country === "NG" ? "Nigeria (state unknown)" : g.country) || "Unknown";
}
