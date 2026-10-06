import type { Database } from "@/lib/database.types";

type Insert = Database["public"]["Tables"]["price_reports"]["Insert"];
type ParsedPrice = Omit<Insert, "station_id" | "reported_by">;

const connectorTypes = ["ccs2", "chademo", "type2", "type1", "nacs"] as const;
const tiers = ["casual", "member", "subscription"] as const;

function money(form: FormData, name: string): number | null | "invalid" {
  const raw = String(form.get(name) ?? "").trim().replace(/^\$/, "").replace(/c$/i, "");
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1000) return "invalid";
  return value;
}

// Turns the report form into a price_reports row, or a message for the user.
export function parsePriceForm(form: FormData): { value: ParsedPrice } | { error: string } {
  const isFree = form.get("is_free") === "on";

  let perKwh = money(form, "per_kwh");
  const perMinute = money(form, "per_minute");
  const sessionFee = money(form, "session_fee");
  const idleFee = money(form, "idle_fee_per_minute");
  if ([perKwh, perMinute, sessionFee, idleFee].includes("invalid")) {
    return { error: "Prices need to be numbers, like 0.59." };
  }
  // Nobody pays $5+/kWh, so "59" means 59 cents.
  if (typeof perKwh === "number" && perKwh >= 5) perKwh = perKwh / 100;

  if (!isFree && perKwh == null && perMinute == null && sessionFee == null) {
    return { error: "Add at least one price, or tick “Free to charge”." };
  }

  const graceRaw = String(form.get("idle_fee_grace_minutes") ?? "").trim();
  const grace = graceRaw === "" ? null : Number(graceRaw);
  if (grace != null && (!Number.isInteger(grace) || grace < 0 || grace > 600)) {
    return { error: "The idle fee grace period should be a whole number of minutes." };
  }

  const tierRaw = String(form.get("tier") ?? "casual");
  const tier = (tiers as readonly string[]).includes(tierRaw) ? (tierRaw as (typeof tiers)[number]) : "casual";
  const planName = String(form.get("plan_name") ?? "").trim().slice(0, 80) || null;

  const connectorRaw = String(form.get("connector_type") ?? "");
  const connector = (connectorTypes as readonly string[]).includes(connectorRaw)
    ? (connectorRaw as (typeof connectorTypes)[number])
    : null;

  const timed = form.get("timed") === "on";
  const start = String(form.get("time_window_start") ?? "");
  const end = String(form.get("time_window_end") ?? "");
  const timeRe = /^\d{2}:\d{2}$/;
  if (timed && (!timeRe.test(start) || !timeRe.test(end))) {
    return { error: "Add both a start and end time, or untick “Only at certain times”." };
  }

  const notes = String(form.get("notes") ?? "").trim().slice(0, 500) || null;

  return {
    value: {
      is_free: isFree,
      per_kwh: isFree ? null : (perKwh as number | null),
      per_minute: isFree ? null : (perMinute as number | null),
      session_fee: isFree ? null : (sessionFee as number | null),
      idle_fee_per_minute: idleFee as number | null,
      idle_fee_grace_minutes: idleFee == null ? null : grace,
      tier,
      plan_name: tier === "casual" ? null : planName,
      connector_type: connector,
      time_window_start: timed ? start : null,
      time_window_end: timed ? end : null,
      notes,
    },
  };
}
