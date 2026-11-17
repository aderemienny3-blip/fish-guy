// Click-to-chat links: they open WhatsApp with the message typed. A person presses Send. No account or API needed.

export type WaMessage = { key: string; label: string; text: string };

export function waLink(phone234: string, text: string) {
  return `https://wa.me/${phone234.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function waMessages(o: { contactName: string; reference: string; slotLabel: string; day: string; status: string }): WaMessage[] {
  const first = o.contactName.trim().split(/\s+/)[0] || "there";
  return [
    { key: "confirmed", label: "Order confirmed", text: `Hello ${first}, this is Fish Guy. We have received your order ${o.reference} and we are packing it. Delivery: ${o.day}, ${o.slotLabel}. Thank you!` },
    { key: "enroute", label: "On the way", text: `Hello ${first}, your Fish Guy order ${o.reference} is on its way to you now. Please keep your phone close so our rider can reach you.` },
    { key: "arrived", label: "Rider has arrived", text: `Hello ${first}, our Fish Guy rider is at your address with order ${o.reference}. Please come out or call us if you cannot find the rider.` },
    { key: "delivered", label: "Delivered", text: `Hello ${first}, your Fish Guy order ${o.reference} has been delivered. Thank you for choosing us. Please tell us if anything is not right.` },
    { key: "reschedule", label: "Change delivery time", text: `Hello ${first}, this is Fish Guy about order ${o.reference}. We need to adjust your delivery time (currently ${o.day}, ${o.slotLabel}). What time works for you today?` },
  ];
}

/** The message most useful for the order's current stage comes first. */
export function suggestedKeys(status: string): string[] {
  if (status === "OUT_FOR_DELIVERY") return ["enroute", "arrived", "reschedule", "delivered", "confirmed"];
  if (status === "DELIVERED") return ["delivered"];
  if (status === "PREPARING") return ["enroute", "reschedule", "confirmed"];
  return ["confirmed", "reschedule"];
}
