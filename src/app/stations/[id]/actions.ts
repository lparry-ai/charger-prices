"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];

async function requireUser(stationId: number) {
  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=/stations/${stationId}`);
  return { supabase, user };
}

// Sends the user back to the station page with a one-off notice.
function done(
  stationId: number,
  error: { message?: string } | null,
  success?: string,
) {
  revalidatePath(`/stations/${stationId}`);
  const notice = error
    ? error.message?.includes("rate_limited")
      ? "rate_limited"
      : "error"
    : success;
  redirect(`/stations/${stationId}${notice ? `?notice=${notice}` : ""}`);
}

export async function confirmPrice(stationId: number, reportId: number) {
  const { supabase, user } = await requireUser(stationId);
  const { error } = await supabase
    .from("price_confirmations")
    .upsert(
      {
        report_id: reportId,
        user_id: user.id,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "report_id,user_id" },
    );
  done(stationId, error);
}

export async function reportStatus(
  stationId: number,
  status: Enums["charger_status"],
) {
  const { supabase, user } = await requireUser(stationId);
  const { error } = await supabase
    .from("status_reports")
    .insert({ station_id: stationId, status, reported_by: user.id });
  done(stationId, error);
}

const flagReasons = [
  "wrong",
  "spam",
  "offensive",
  "duplicate",
  "other",
] as const;

export async function flagContent(
  stationId: number,
  targetType: Enums["flag_target"],
  targetId: number,
  formData: FormData,
) {
  const { supabase, user } = await requireUser(stationId);
  const raw = String(formData.get("reason") ?? "");
  const reason = (flagReasons as readonly string[]).includes(raw)
    ? (raw as Enums["flag_reason"])
    : "other";
  const note =
    String(formData.get("note") ?? "")
      .trim()
      .slice(0, 500) || null;

  const { error } = await supabase
    .from("flags")
    .insert({
      target_type: targetType,
      target_id: targetId,
      reason,
      note,
      flagged_by: user.id,
    });
  // Flagging the same thing twice is fine; the first flag is still open.
  done(stationId, error?.code === "23505" ? null : error, "flagged");
}
