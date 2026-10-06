import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function isModerator(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.rpc("is_moderator");
  return data === true;
}

export const flagReasonLabels: Record<
  Database["public"]["Enums"]["flag_reason"],
  string
> = {
  wrong: "Wrong or out of date",
  spam: "Spam",
  offensive: "Offensive",
  duplicate: "Duplicate",
  other: "Something else",
};
