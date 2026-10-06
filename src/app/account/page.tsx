import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { formatAge } from "@/lib/format";
import { AccountForm } from "./account-form";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/account");

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("display_name, created_at").eq("id", user.id).single(),
    supabase.from("price_reports").select("id", { count: "exact", head: true }).eq("reported_by", user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-8 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-1 text-muted">
        {user.email} · joined {formatAge(profile?.created_at)} · {count ?? 0} price
        {count === 1 ? "" : "s"} reported
      </p>
      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <AccountForm displayName={profile?.display_name ?? ""} />
      </div>
      <form action={signOut} className="mt-6">
        <button className="rounded-full border border-border px-4 py-2 text-sm hover:border-muted">Sign out</button>
      </form>
    </main>
  );
}
