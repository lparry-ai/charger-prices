"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type ChargerStatus = Database["public"]["Enums"]["charger_status"];

async function requireUser(stationId: number) {
  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=/stations/${stationId}`);
  return { supabase, user };
}

export async function confirmPrice(stationId: number, reportId: number) {
  const { supabase, user } = await requireUser(stationId);
  const { error } = await supabase.from("price_confirmations").upsert(
    { report_id: reportId, user_id: user.id, confirmed_at: new Date().toISOString() },
    { onConflict: "report_id,user_id" },
  );
  if (error) throw new Error("Couldn't save your confirmation.");
  revalidatePath(`/stations/${stationId}`);
}

export async function reportStatus(stationId: number, status: ChargerStatus) {
  const { supabase, user } = await requireUser(stationId);
  const { error } = await supabase
    .from("status_reports")
    .insert({ station_id: stationId, status, reported_by: user.id });
  if (error) throw new Error("Couldn't save the charger status.");
  revalidatePath(`/stations/${stationId}`);
}
