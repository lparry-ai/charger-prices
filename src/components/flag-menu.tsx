import { flagReasonLabels } from "@/lib/moderation";

// A small "Report a problem" disclosure that posts a flag. Works without JS.
export function FlagMenu({
  action,
  label = "Report a problem",
}: {
  action: (formData: FormData) => Promise<void>;
  label?: string;
}) {
  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none text-xs text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        {label}
      </summary>
      <form
        action={action}
        className="absolute right-0 z-10 mt-2 w-64 space-y-2 rounded-xl border border-border bg-surface p-3 text-sm shadow-lg"
      >
        <label htmlFor="reason" className="block font-medium">
          What’s wrong?
        </label>
        <select
          name="reason"
          defaultValue="wrong"
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5"
        >
          {Object.entries(flagReasonLabels).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          placeholder="Details (optional)"
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5"
        />
        <button className="w-full rounded-full bg-foreground px-3 py-1.5 font-medium text-background hover:opacity-90">
          Send to moderators
        </button>
      </form>
    </details>
  );
}
