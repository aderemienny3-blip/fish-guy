export const QUOTE_STATUS = ["NEW", "QUOTED", "WON", "LOST"] as const;
export const QUOTE_LABEL: Record<string, string> = { NEW: "New", QUOTED: "Quote sent", WON: "Won", LOST: "Lost" };
