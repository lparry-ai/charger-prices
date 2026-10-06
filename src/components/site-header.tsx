import Link from "next/link";
import { getUser } from "@/lib/supabase/server";

export async function SiteHeader() {
  const { supabase, user } = await getUser();
  let displayName: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = data?.display_name ?? "Account";
  }

  return (
    <header className="sticky top-0 z-[1100] border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-accent text-white">
            <BoltIcon />
          </span>
          ChargerPrices
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <Link
              href="/account"
              className="rounded-full px-3 py-1.5 text-muted hover:bg-accent-soft hover:text-foreground"
            >
              {displayName}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-foreground px-3.5 py-1.5 font-medium text-background hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function BoltIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.6L13.5 2Z" />
    </svg>
  );
}
