"use client";

import { useActionState } from "react";
import { updateDisplayName, type AccountState } from "./actions";

export function AccountForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateDisplayName, {
    error: null,
    saved: false,
  });
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="display_name" className="block text-sm font-medium">
        Display name
      </label>
      <p className="text-sm text-muted">Shown next to the prices you report.</p>
      <div className="flex gap-2">
        <input
          id="display_name"
          name="display_name"
          defaultValue={displayName}
          maxLength={40}
          required
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-4 py-2 font-medium text-white hover:bg-accent-strong disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.saved && !state.error && <p className="text-sm text-accent-strong">Saved.</p>}
    </form>
  );
}
