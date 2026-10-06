"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { parsePriceForm } from "@/lib/price-form";

export type ReportState = { error: string | null };

export async function submitPrice(
  stationId: number,
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=/stations/${stationId}/report`);

  const parsed = parsePriceForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const row: Database["public"]["Tables"]["price_reports"]["Insert"] = {
    ...parsed.value,
    station_id: stationId,
    reported_by: user.id,
  };
  const { error } = await supabase.from("price_reports").insert(row);
  if (error) return { error: "Couldn't save that price. Please try again." };

  revalidatePath(`/stations/${stationId}`);
  redirect(`/stations/${stationId}`);
}
