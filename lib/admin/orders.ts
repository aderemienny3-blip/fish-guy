import type { AdminRole, OrderStatus } from "@prisma/client";

/** Orders that count as real sales. */
export const PAID_STATUSES: OrderStatus[] = ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];

export const CANCELLABLE: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "PREPARING"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid, to pack",
  PREPARING: "Being packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  REFUNDED: "Refund needed",
};

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: "PREPARING",
  PREPARING: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

export const ADVANCE_LABEL: Partial<Record<OrderStatus, string>> = {
  PAID: "Start packing",
  PREPARING: "Hand to rider",
  OUT_FOR_DELIVERY: "Mark delivered",
};

export function canAdvance(role: AdminRole, status: OrderStatus): boolean {
  if (!NEXT_STATUS[status]) return false;
  if (role === "OWNER" || role === "MANAGER") return true;
  if (role === "PACKER") return status === "PAID" || status === "PREPARING";
  if (role === "RIDER") return status === "OUT_FOR_DELIVERY";
  return false;
}

export function canCancel(role: AdminRole, status: OrderStatus): boolean {
  return (role === "OWNER" || role === "MANAGER") && CANCELLABLE.includes(status);
}
