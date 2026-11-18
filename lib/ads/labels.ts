// Safe to import in the browser (no database).
export const PLACEMENTS = ["POPUP", "STICKER", "FEATURED_STRIP", "BAG_INSERT"] as const;
export type Placement = (typeof PLACEMENTS)[number];

export const PLACEMENT_INFO: Record<Placement, { label: string; blurb: string; imageRequired: boolean }> = {
  POPUP: { label: "Popup spotlight", blurb: "A card that opens once per visit on the home page and shop, like a streaming-app ad.", imageRequired: true },
  STICKER: { label: "Sponsored sticker", blurb: "Your song is tagged on the most-ordered products in the shop.", imageRequired: false },
  FEATURED_STRIP: { label: "Featured sound strip", blurb: "A banner with your cover art near the top of the home page.", imageRequired: true },
  BAG_INSERT: { label: "Bag insert", blurb: "Your printed card goes inside customers' delivery bags.", imageRequired: true },
};

export const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Waiting for review",
  APPROVED: "Approved. Ready for payment",
  PAID: "Paid and booked",
  REJECTED: "Not approved",
  CANCELLED: "Cancelled",
};

export const AD_REF = /^AD-[A-F0-9]{16}$/;
export const AD_PAY_REF = /^FGA-[A-F0-9]{32}$/;
export const MIN_PRICE_KOBO = 500_000; // ₦5,000
export const MAX_PRICE_KOBO = 200_000_000; // ₦2,000,000
export const MAX_DAYS_AHEAD = 60;
