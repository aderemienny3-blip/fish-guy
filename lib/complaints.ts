export const COMPLAINT_KINDS: Record<string, string> = {
  MISSING: "An item is missing",
  WRONG: "I got the wrong item",
  DAMAGED: "An item is damaged",
  THAWED: "My order arrived thawed",
  LATE: "Delivery was very late",
  OTHER: "Something else",
};

export const RESOLUTIONS: Record<string, string> = {
  REPLACE: "We will replace it",
  REFUND: "We will refund it",
  CREDIT: "We will take it off your next order",
  REJECT: "We could not confirm the problem",
};

/** Hours between delivery and now. Null if the delivery time was never recorded. */
export function hoursSince(from: Date | null, now = new Date()): number | null {
  return from ? Math.max(0, Math.round(((now.getTime() - from.getTime()) / 3_600_000) * 10) / 10) : null;
}
