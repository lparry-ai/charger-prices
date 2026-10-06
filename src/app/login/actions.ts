"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { siteOrigin } from "@/lib/site-url";

export type LoginState = { error: string | null; sentTo: string | null };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "That doesn't look like an email address.", sentTo: null };
  }
  const next = safeNext(String(formData.get("next") ?? "/"));

  const origin = siteOrigin(await headers());

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    return { error: "Couldn't send the sign-in link. Please try again in a minute.", sentTo: null };
  }
  return { error: null, sentTo: email };
}
