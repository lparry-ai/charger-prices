"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";

export type AccountState = { error: string | null; saved: boolean };

export async function updateDisplayName(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/account");

  const name = String(formData.get("display_name") ?? "").trim();
  if (name.length < 1 || name.length > 40) {
    return { error: "Pick a name between 1 and 40 characters.", saved: false };
  }
  const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  if (error) return { error: "Couldn't save your name. Please try again.", saved: false };

  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
