"use client";

import { useActionState, useState } from "react";
import { connectorLabels } from "@/lib/format";
import type { Database } from "@/lib/database.types";
import { submitPrice, type ReportState } from "./actions";

type ConnectorType = Database["public"]["Enums"]["connector_type"];

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
const label = "mb-1 block text-sm font-medium";

export function ReportForm({
  stationId,
  connectorTypes,
}: {
  stationId: number;
  connectorTypes: ConnectorType[];
}) {
  const [state, action, pending] = useActionState<ReportState, FormData>(
    submitPrice.bind(null, stationId),
    { error: null },
  );
  const [isFree, setIsFree] = useState(false);
  const [tier, setTier] = useState("casual");
  const [timed, setTimed] = useState(false);

  return (
    <form action={action} className="mt-6 space-y-6">
      <fieldset className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">Price</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_free"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Free to charge
        </label>
        {!isFree && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="per_kwh" className={label}>
                Per kWh
              </label>
              <input
                id="per_kwh"
                name="per_kwh"
                inputMode="decimal"
                placeholder="0.59"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="per_minute" className={label}>
                Per minute
              </label>
              <input
                id="per_minute"
                name="per_minute"
                inputMode="decimal"
                placeholder="—"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="session_fee" className={label}>
                Session fee
              </label>
              <input
                id="session_fee"
                name="session_fee"
                inputMode="decimal"
                placeholder="—"
                className={input}
              />
            </div>
          </div>
        )}
        <p className="text-xs text-muted">
          In dollars. Fill in whichever the charger uses; 59 and 0.59 both mean
          59c/kWh.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="idle_fee_per_minute" className={label}>
              Idle fee per minute{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="idle_fee_per_minute"
              name="idle_fee_per_minute"
              inputMode="decimal"
              placeholder="1.00"
              className={input}
            />
          </div>
          <div>
            <label htmlFor="idle_fee_grace_minutes" className={label}>
              Starts after (minutes)
            </label>
            <input
              id="idle_fee_grace_minutes"
              name="idle_fee_grace_minutes"
              inputMode="numeric"
              placeholder="10"
              className={input}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold">
          Who pays this price
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tier" className={label}>
              Rate
            </label>
            <select
              id="tier"
              name="tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className={input}
            >
              <option value="casual">Casual (anyone)</option>
              <option value="member">Member</option>
              <option value="subscription">Subscription</option>
            </select>
          </div>
          {tier !== "casual" && (
            <div>
              <label htmlFor="plan_name" className={label}>
                Plan name
              </label>
              <input
                id="plan_name"
                name="plan_name"
                placeholder="e.g. Premium"
                className={input}
              />
            </div>
          )}
          <div>
            <label htmlFor="connector_type" className={label}>
              Applies to
            </label>
            <select
              id="connector_type"
              name="connector_type"
              defaultValue=""
              className={input}
            >
              <option value="">All plugs</option>
              {connectorTypes.map((c) => (
                <option key={c} value={c}>
                  {connectorLabels[c]} only
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="timed"
            checked={timed}
            onChange={(e) => setTimed(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Only at certain times (e.g. off-peak)
        </label>
        {timed && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="time_window_start" className={label}>
                From
              </label>
              <input
                id="time_window_start"
                name="time_window_start"
                type="time"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="time_window_end" className={label}>
                Until
              </label>
              <input
                id="time_window_end"
                name="time_window_end"
                type="time"
                className={input}
              />
            </div>
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="notes" className={label}>
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Anything else drivers should know"
          className={input}
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Submit price"}
      </button>
    </form>
  );
}
