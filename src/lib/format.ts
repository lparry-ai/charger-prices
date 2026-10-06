import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];

export const connectorLabels: Record<Enums["connector_type"], string> = {
  ccs2: "CCS2",
  chademo: "CHAdeMO",
  type2: "Type 2",
  type1: "Type 1",
  nacs: "NACS",
};

export const paymentLabels: Record<Enums["payment_method"], string> = {
  credit_card: "Tap credit card",
  app: "App",
  rfid: "RFID card",
  plug_and_charge: "Plug & Charge",
};

export const tierLabels: Record<Enums["price_tier"], string> = {
  casual: "Casual",
  member: "Member",
  subscription: "Subscription",
};

export const accessLabels: Record<Enums["access_type"], string> = {
  public: "Public",
  customers: "Customers only",
  restricted: "Restricted",
};

export const statusLabels: Record<Enums["charger_status"], string> = {
  working: "Working",
  faulty: "Faulty",
  blocked: "Blocked or occupied",
};

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Prices under a dollar read naturally in cents ("59c"), anything else in
// dollars ("$1.50").
export function formatMoney(value: number | null | undefined): string {
  if (value == null) return "";
  if (value < 1) {
    const cents = Math.round(value * 1000) / 10;
    return `${cents}c`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatPower(kw: number | null | undefined): string {
  if (kw == null) return "Unknown kW";
  return `${Number.isInteger(kw) ? kw : kw.toFixed(1)} kW`;
}

// "just now", "5 min ago", "3 hours ago", "2 days ago", "4 months ago".
export function formatAge(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 45) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.round(months / 12)} years ago`;
}

export type Freshness = "fresh" | "aging" | "stale";

// Prices change rarely, but a month-old report deserves a hint of doubt.
export function freshness(iso: string | null | undefined, now = Date.now()): Freshness {
  if (!iso) return "stale";
  const days = (now - Date.parse(iso)) / 86_400_000;
  if (days <= 7) return "fresh";
  if (days <= 30) return "aging";
  return "stale";
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

export function formatTimeWindow(
  start: string | null,
  end: string | null,
  days: number[] | null,
): string | null {
  const parts: string[] = [];
  if (start && end) parts.push(`${formatTime(start)} to ${formatTime(end)}`);
  if (days && days.length > 0 && days.length < 7) {
    parts.push(days.map((d) => dayNames[d - 1]).join(", "));
  }
  return parts.length ? parts.join(", ") : null;
}

type PriceParts = {
  is_free: boolean | null;
  per_kwh: number | null;
  per_minute: number | null;
  session_fee: number | null;
};

// The headline for a tariff, e.g. "59c/kWh + $1.00 per session".
export function formatTariff(p: PriceParts): string {
  if (p.is_free) return "Free";
  const parts: string[] = [];
  if (p.per_kwh != null) parts.push(`${formatMoney(p.per_kwh)}/kWh`);
  if (p.per_minute != null) parts.push(`${formatMoney(p.per_minute)}/min`);
  if (p.session_fee != null) parts.push(`${formatMoney(p.session_fee)} per session`);
  return parts.join(" + ");
}
