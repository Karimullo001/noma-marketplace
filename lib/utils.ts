import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return "0 so'm";
  const rounded = Math.round(Number(amount));
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} so'm`;
}

export function formatDateTashkent(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat("uz-Latn-UZ", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"`’‘]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const ORDER_STATUS_UZ: Record<OrderStatus, string> = {
  pending: "Kutilmoqda",
  accepted: "Qabul qilindi",
  rejected: "Rad etildi",
  preparing: "Tayyorlanmoqda",
  ready: "Yetkazishga tayyor",
  shipped: "Yo'lda (Kuryerda)",
  delivered: "Yetkazib berildi",
  cancelled: "Bekor qilindi",
};

export const SELLER_NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export function isTransitionAllowedForSeller(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  return SELLER_NEXT_STATUSES[current]?.includes(next) ?? false;
}

export const GENDER_LABELS_UZ: Record<string, string> = {
  men: "Erkaklar",
  women: "Ayollar",
  children: "Bolalar",
  sport: "Sport",
  accessories: "Aksessuarlar",
  unisex: "Uniseks",
};
