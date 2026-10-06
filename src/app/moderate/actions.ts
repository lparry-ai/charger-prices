"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isModerator } from "@/lib/moderation";
import type { Database } from "@/lib/database.types";

type FlagTarget = Database["public"]["Enums"]["flag_target"];

const targetTables = {
  price_report: "price_reports",
  status_report: "status_reports",
  station: "stations",
} as const;

async function requireModerator() {
  const { supabase, user } = await getUser();
  if (!user || !(await isModerator(supabase))) notFound();
  return { supabase, user };
}

async function resolve(flagId: number | null, resolution: string) {
  if (flagId == null) return;
  const { supabase, user } = await requireModerator();
  const { error } = await supabase
    .from("flags")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolution,
    })
    .eq("id", flagId);
  if (error) throw new Error("Couldn't resolve the flag.");
}

export async function setHidden(
  target: FlagTarget,
  targetId: number,
  hidden: boolean,
  flagId: number | null,
) {
  const { supabase } = await requireModerator();
  const { error } = await supabase
    .from(targetTables[target])
    .update({ hidden_at: hidden ? new Date().toISOString() : null })
    .eq("id", targetId);
  if (error) throw new Error("Couldn't update that.");
  await resolve(flagId, hidden ? "hidden" : "unhidden");
  revalidatePath("/", "layout");
}

export async function dismissFlag(flagId: number) {
  await resolve(flagId, "dismissed");
  revalidatePath("/moderate");
}

export async function setShadowban(
  userId: string,
  banned: boolean,
  flagId: number | null,
) {
  const { supabase } = await requireModerator();
  const { error } = await supabase.rpc("set_shadowban", {
    target: userId,
    banned,
    reason: flagId ? `From flag #${flagId}` : undefined,
  });
  if (error) throw new Error(`Couldn't change the shadowban: ${error.message}`);
  await resolve(flagId, banned ? "author shadowbanned" : "author unbanned");
  revalidatePath("/", "layout");
}
