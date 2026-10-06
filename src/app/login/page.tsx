import type { Metadata } from "next";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 pt-12 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 mb-6 text-muted">
        Signing in lets you report prices and confirm other drivers’ reports. No password needed.
      </p>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          That sign-in link didn’t work. It may have expired, so request a new one.
        </p>
      )}
      <LoginForm next={safeNext(typeof next === "string" ? next : "/")} />
    </main>
  );
}
