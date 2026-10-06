import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { flagReasonLabels, isModerator } from "@/lib/moderation";
import {
  formatAge,
  formatTariff,
  statusLabels,
  tierLabels,
} from "@/lib/format";
import type { Database } from "@/lib/database.types";
import { dismissFlag, setHidden, setShadowban } from "./actions";

export const metadata: Metadata = { title: "Moderate" };

type Tables = Database["public"]["Tables"];
type PriceReport = Tables["price_reports"]["Row"];
type StatusReport = Tables["status_reports"]["Row"];
type Station = Pick<
  Tables["stations"]["Row"],
  "id" | "name" | "hidden_at" | "created_by"
>;

const button =
  "rounded-full border border-border px-3 py-1 text-sm hover:border-muted";
const dangerButton =
  "rounded-full border border-danger/40 px-3 py-1 text-sm text-danger hover:bg-danger-soft";

export default async function ModeratePage() {
  const { supabase, user } = await getUser();
  if (!user || !(await isModerator(supabase))) notFound();

  const [{ data: flags }, { data: recent }, { data: banned }] =
    await Promise.all([
      supabase
        .from("flags")
        .select("*")
        .is("resolved_at", null)
        .order("created_at")
        .limit(100),
      supabase
        .from("price_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("user_moderation")
        .select("user_id, shadowbanned_at, shadowban_reason")
        .not("shadowbanned_at", "is", null)
        .order("shadowbanned_at", { ascending: false }),
    ]);

  const idsOf = (type: string) =>
    (flags ?? []).filter((f) => f.target_type === type).map((f) => f.target_id);
  const [{ data: flaggedPrices }, { data: flaggedStatuses }] =
    await Promise.all([
      supabase
        .from("price_reports")
        .select("*")
        .in("id", idsOf("price_report")),
      supabase
        .from("status_reports")
        .select("*")
        .in("id", idsOf("status_report")),
    ]);

  const prices = new Map<number, PriceReport>(
    [...(recent ?? []), ...(flaggedPrices ?? [])].map((p) => [p.id, p]),
  );
  const statuses = new Map<number, StatusReport>(
    (flaggedStatuses ?? []).map((s) => [s.id, s]),
  );

  const stationIds = new Set<number>([
    ...idsOf("station"),
    ...[...prices.values()].map((p) => p.station_id),
    ...[...statuses.values()].map((s) => s.station_id),
  ]);
  const { data: stationRows } = await supabase
    .from("stations")
    .select("id, name, hidden_at, created_by")
    .in("id", [...stationIds]);
  const stations = new Map<number, Station>(
    (stationRows ?? []).map((s) => [s.id, s]),
  );

  const userIds = new Set<string>(
    [
      ...(flags ?? []).map((f) => f.flagged_by),
      ...[...prices.values()].map((p) => p.reported_by),
      ...[...statuses.values()].map((s) => s.reported_by),
      ...[...stations.values()].map((s) => s.created_by),
      ...(banned ?? []).map((b) => b.user_id),
    ].filter((id): id is string => id != null),
  );
  const [{ data: profileRows }, { data: moderationRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, reputation")
      .in("id", [...userIds]),
    supabase
      .from("user_moderation")
      .select("user_id, role, shadowbanned_at")
      .in("user_id", [...userIds]),
  ]);
  const profiles = new Map((profileRows ?? []).map((p) => [p.id, p]));
  const moderation = new Map((moderationRows ?? []).map((m) => [m.user_id, m]));

  // Flags raised by shadowbanned users are noise; leave them out of the queue.
  const queue = (flags ?? []).filter(
    (f) =>
      !f.flagged_by || moderation.get(f.flagged_by)?.shadowbanned_at == null,
  );
  const mutedFlags = (flags?.length ?? 0) - queue.length;

  function Author({
    id,
    flagId,
  }: {
    id: string | null;
    flagId: number | null;
  }) {
    if (!id) return <span className="text-muted">Imported</span>;
    const p = profiles.get(id);
    const m = moderation.get(id);
    const isBanned = m?.shadowbanned_at != null;
    const isStaff = m?.role === "moderator" || m?.role === "admin";
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span>
          {p?.display_name ?? "Unknown user"}{" "}
          <span className="text-muted">· reputation {p?.reputation ?? 0}</span>
          {isBanned && (
            <span className="ml-1 rounded bg-danger-soft px-1.5 py-0.5 text-xs text-danger">
              shadowbanned
            </span>
          )}
          {isStaff && (
            <span className="ml-1 rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent-strong">
              {m.role}
            </span>
          )}
        </span>
        {!isStaff && id !== user!.id && (
          <form action={setShadowban.bind(null, id, !isBanned, flagId)}>
            <button className={isBanned ? button : dangerButton}>
              {isBanned ? "Unban" : "Shadowban"}
            </button>
          </form>
        )}
      </span>
    );
  }

  function StationLink({ id }: { id: number }) {
    return (
      <Link href={`/stations/${id}`} className="font-medium hover:underline">
        {stations.get(id)?.name ?? `Station ${id}`}
      </Link>
    );
  }

  function HiddenToggle({
    target,
    id,
    hidden,
    flagId,
  }: {
    target: Database["public"]["Enums"]["flag_target"];
    id: number;
    hidden: boolean;
    flagId: number | null;
  }) {
    return (
      <form action={setHidden.bind(null, target, id, !hidden, flagId)}>
        <button className={hidden ? button : dangerButton}>
          {hidden ? "Unhide" : "Hide"}
        </button>
      </form>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Moderate</h1>
      <p className="mt-1 text-muted">
        Hidden content and shadowbanned users stay visible to their authors, so
        nothing looks different to them.
      </p>

      <section className="mt-8" aria-labelledby="flags">
        <h2 id="flags" className="mb-3 text-lg font-semibold">
          Open flags <span className="text-muted">({queue.length})</span>
        </h2>
        {mutedFlags > 0 && (
          <p className="-mt-1 mb-3 text-sm text-muted">
            {mutedFlags} more from shadowbanned users not shown.
          </p>
        )}
        {queue.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-muted">
            Nothing to review.
          </p>
        ) : (
          <ul className="space-y-3">
            {queue.map((f) => {
              const price =
                f.target_type === "price_report"
                  ? prices.get(f.target_id)
                  : undefined;
              const status =
                f.target_type === "status_report"
                  ? statuses.get(f.target_id)
                  : undefined;
              const station =
                f.target_type === "station"
                  ? stations.get(f.target_id)
                  : undefined;
              const target = price ?? status ?? station;
              return (
                <li
                  key={f.id}
                  className="rounded-xl border border-border bg-surface p-4 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p>
                      <span className="font-medium">
                        {flagReasonLabels[f.reason]}
                      </span>
                      <span className="text-muted">
                        {" "}
                        ·{" "}
                        {f.flagged_by
                          ? `flagged by ${profiles.get(f.flagged_by)?.display_name ?? "a user"}`
                          : "automatic"}{" "}
                        · {formatAge(f.created_at)}
                      </span>
                    </p>
                    <form action={dismissFlag.bind(null, f.id)}>
                      <button className={button}>Dismiss</button>
                    </form>
                  </div>
                  {f.note && <p className="mt-1 text-muted">“{f.note}”</p>}

                  <div className="mt-3 space-y-2 rounded-lg bg-background p-3">
                    {!target && (
                      <p className="text-muted">This item no longer exists.</p>
                    )}
                    {price && (
                      <>
                        <p>
                          <span className="text-base font-semibold">
                            {formatTariff(price)}
                          </span>{" "}
                          <span className="text-muted">
                            {tierLabels[price.tier]} at{" "}
                            <StationLink id={price.station_id} /> ·{" "}
                            {formatAge(price.created_at)}
                          </span>
                        </p>
                        {price.notes && (
                          <p className="text-muted">“{price.notes}”</p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Author id={price.reported_by} flagId={f.id} />
                          <HiddenToggle
                            target="price_report"
                            id={price.id}
                            hidden={price.hidden_at != null}
                            flagId={f.id}
                          />
                        </div>
                      </>
                    )}
                    {status && (
                      <>
                        <p>
                          <span className="font-semibold">
                            {statusLabels[status.status]}
                          </span>{" "}
                          <span className="text-muted">
                            at <StationLink id={status.station_id} /> ·{" "}
                            {formatAge(status.created_at)}
                          </span>
                        </p>
                        {status.notes && (
                          <p className="text-muted">“{status.notes}”</p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Author id={status.reported_by} flagId={f.id} />
                          <HiddenToggle
                            target="status_report"
                            id={status.id}
                            hidden={status.hidden_at != null}
                            flagId={f.id}
                          />
                        </div>
                      </>
                    )}
                    {station && (
                      <>
                        <p>
                          Station details: <StationLink id={station.id} />
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Author id={station.created_by} flagId={f.id} />
                          <HiddenToggle
                            target="station"
                            id={station.id}
                            hidden={station.hidden_at != null}
                            flagId={f.id}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="recent">
        <h2 id="recent" className="mb-3 text-lg font-semibold">
          Latest price reports
        </h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
          {(recent ?? []).map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p>
                  <span
                    className={`font-semibold ${p.hidden_at ? "text-muted line-through" : ""}`}
                  >
                    {formatTariff(p)}
                  </span>{" "}
                  <span className="text-muted">
                    {tierLabels[p.tier]} at <StationLink id={p.station_id} /> ·{" "}
                    {formatAge(p.created_at)}
                  </span>
                </p>
                <div className="mt-1">
                  <Author id={p.reported_by} flagId={null} />
                </div>
              </div>
              <HiddenToggle
                target="price_report"
                id={p.id}
                hidden={p.hidden_at != null}
                flagId={null}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="banned">
        <h2 id="banned" className="mb-3 text-lg font-semibold">
          Shadowbanned users
        </h2>
        {!banned?.length ? (
          <p className="text-sm text-muted">Nobody is shadowbanned.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
            {banned.map((b) => (
              <li
                key={b.user_id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <span>
                  {profiles.get(b.user_id)?.display_name ?? "Unknown user"}{" "}
                  <span className="text-muted">
                    · banned {formatAge(b.shadowbanned_at)}
                    {b.shadowban_reason ? ` · ${b.shadowban_reason}` : ""}
                  </span>
                </span>
                <form action={setShadowban.bind(null, b.user_id, false, null)}>
                  <button className={button}>Unban</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
