import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import {
  accessLabels,
  connectorLabels,
  formatAge,
  formatMoney,
  formatPower,
  formatTariff,
  formatTimeWindow,
  freshness,
  paymentLabels,
  statusLabels,
  tierLabels,
} from "@/lib/format";
import { FlagMenu } from "@/components/flag-menu";
import { confirmPrice, flagContent, reportStatus } from "./actions";

const notices: Record<string, { text: string; tone: "ok" | "error" }> = {
  flagged: { text: "Thanks. A moderator will take a look.", tone: "ok" },
  rate_limited: {
    text: "You’ve sent a lot of reports in a short time. Please wait a while and try again.",
    tone: "error",
  },
  error: {
    text: "Something went wrong saving that. Please try again.",
    tone: "error",
  },
};

async function loadStation(rawId: string) {
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const { supabase, user } = await getUser();
  const [station, connectors, prices, statuses] = await Promise.all([
    supabase.from("station_summaries").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("connectors")
      .select("*")
      .eq("station_id", id)
      .order("power_kw", { ascending: false, nullsFirst: false }),
    supabase
      .from("current_prices")
      .select("*")
      .eq("station_id", id)
      .order("tier")
      .order("time_window_start", { nullsFirst: true }),
    supabase
      .from("status_reports")
      .select("id, status, notes, observed_at, connector_id")
      .eq("station_id", id)
      .order("observed_at", { ascending: false })
      .limit(5),
  ]);
  if (!station.data) notFound();

  const reporterIds = [
    ...new Set((prices.data ?? []).map((p) => p.reported_by).filter(Boolean)),
  ];
  const [reporters, myConfirmations] = await Promise.all([
    reporterIds.length
      ? supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", reporterIds as string[])
      : Promise.resolve({ data: [] }),
    user && prices.data?.length
      ? supabase
          .from("price_confirmations")
          .select("report_id")
          .eq("user_id", user.id)
          .in(
            "report_id",
            prices.data.map((p) => p.id!),
          )
      : Promise.resolve({ data: [] }),
  ]);

  return {
    id,
    user,
    station: station.data,
    connectors: connectors.data ?? [],
    prices: prices.data ?? [],
    statuses: statuses.data ?? [],
    reporterNames: new Map(
      (reporters.data ?? []).map((r) => [r.id, r.display_name]),
    ),
    confirmed: new Set((myConfirmations.data ?? []).map((c) => c.report_id)),
  };
}

export async function generateMetadata(
  props: PageProps<"/stations/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const { station } = await loadStation(id);
  return { title: station.name ?? "Charger" };
}

export default async function StationPage(props: PageProps<"/stations/[id]">) {
  const { id: rawId } = await props.params;
  const { notice: noticeKey } = await props.searchParams;
  const notice = typeof noticeKey === "string" ? notices[noticeKey] : undefined;
  const {
    id,
    user,
    station: s,
    connectors,
    prices,
    statuses,
    reporterNames,
    confirmed,
  } = await loadStation(rawId);
  const latestStatus = statuses[0];
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
  const signInHref = `/login?next=/stations/${id}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-16">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Back to map
      </Link>

      <header className="mt-3 mb-6">
        <p className="text-sm font-medium text-accent-strong">
          {s.operator_name ?? "Unknown network"}
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
          {s.name}
        </h1>
        <p className="mt-1 text-muted">
          {[s.address, s.suburb, s.state, s.postcode]
            .filter(Boolean)
            .join(", ")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-foreground px-3.5 py-1.5 font-medium text-background hover:opacity-90"
          >
            Directions
          </a>
          {s.operator_website && (
            <a
              href={s.operator_website}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border px-3.5 py-1.5 hover:border-muted"
            >
              Network website
            </a>
          )}
        </div>
      </header>

      {notice && (
        <p
          role="status"
          className={`mb-6 rounded-lg px-3 py-2 text-sm ${
            notice.tone === "ok"
              ? "bg-accent-soft text-accent-strong"
              : "bg-danger-soft text-danger"
          }`}
        >
          {notice.text}
        </p>
      )}

      <section aria-labelledby="prices" className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="prices" className="text-lg font-semibold">
            Prices
          </h2>
          <Link
            href={user ? `/stations/${id}/report` : signInHref}
            className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-strong"
          >
            Report a price
          </Link>
        </div>

        {prices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-muted">
            Nobody has reported a price here yet. Seen one on the screen or in
            the app? Add it.
          </p>
        ) : (
          <ul className="space-y-3">
            {prices.map((p) => {
              const fresh = freshness(p.last_seen_at);
              const window = formatTimeWindow(
                p.time_window_start,
                p.time_window_end,
                p.days_of_week,
              );
              const details = [
                p.idle_fee_per_minute != null
                  ? `Idle fee ${formatMoney(p.idle_fee_per_minute)}/min${
                      p.idle_fee_grace_minutes
                        ? ` after ${p.idle_fee_grace_minutes} min`
                        : ""
                    }`
                  : null,
                p.connector_type
                  ? `${connectorLabels[p.connector_type]} only`
                  : null,
              ].filter(Boolean);
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold tracking-tight">
                        {formatTariff(p)}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {[tierLabels[p.tier!], p.plan_name, window]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {details.length > 0 && (
                        <p className="mt-1 text-sm">{details.join(" · ")}</p>
                      )}
                      {p.notes && (
                        <p className="mt-2 text-sm text-muted">“{p.notes}”</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        fresh === "fresh"
                          ? "bg-accent-soft text-accent-strong"
                          : fresh === "aging"
                            ? "bg-warn-soft text-warn"
                            : "bg-background text-muted"
                      }`}
                    >
                      Seen {formatAge(p.last_seen_at)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                    <span className="flex items-center gap-3 text-muted">
                      <span>
                        Reported by{" "}
                        {reporterNames.get(p.reported_by!) ?? "a driver"}
                        {p.confirmation_count
                          ? ` · confirmed ${p.confirmation_count}×`
                          : ""}
                      </span>
                      {user && (
                        <FlagMenu
                          action={flagContent.bind(
                            null,
                            id,
                            "price_report",
                            p.id!,
                          )}
                        />
                      )}
                    </span>
                    {user ? (
                      confirmed.has(p.id!) ? (
                        <form action={confirmPrice.bind(null, id, p.id!)}>
                          <button className="rounded-full border border-border px-3 py-1 text-muted hover:border-muted">
                            You confirmed this · Confirm again
                          </button>
                        </form>
                      ) : (
                        <form action={confirmPrice.bind(null, id, p.id!)}>
                          <button className="rounded-full border border-accent px-3 py-1 font-medium text-accent-strong hover:bg-accent-soft">
                            Still correct
                          </button>
                        </form>
                      )
                    ) : (
                      <Link
                        href={signInHref}
                        className="text-accent-strong hover:underline"
                      >
                        Sign in to confirm
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="status" className="mb-8">
        <h2 id="status" className="mb-3 text-lg font-semibold">
          Is it working?
        </h2>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm">
              {latestStatus ? (
                <>
                  <span
                    className={`font-medium ${
                      latestStatus.status === "working"
                        ? "text-accent-strong"
                        : "text-danger"
                    }`}
                  >
                    {statusLabels[latestStatus.status]}
                  </span>{" "}
                  <span className="text-muted">
                    · reported {formatAge(latestStatus.observed_at)}
                    {latestStatus.notes ? ` · “${latestStatus.notes}”` : ""}
                  </span>
                </>
              ) : (
                <span className="text-muted">No status reports yet.</span>
              )}
            </p>
            {user && latestStatus && (
              <FlagMenu
                action={flagContent.bind(
                  null,
                  id,
                  "status_report",
                  latestStatus.id,
                )}
              />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {user ? (
              (["working", "faulty", "blocked"] as const).map((status) => (
                <form key={status} action={reportStatus.bind(null, id, status)}>
                  <button className="rounded-full border border-border px-3 py-1 text-sm hover:border-muted">
                    {statusLabels[status]}
                  </button>
                </form>
              ))
            ) : (
              <Link
                href={signInHref}
                className="text-sm text-accent-strong hover:underline"
              >
                Sign in to report status
              </Link>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="details">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="details" className="text-lg font-semibold">
            Details
          </h2>
          {user && (
            <FlagMenu
              action={flagContent.bind(null, id, "station", id)}
              label="Details wrong?"
            />
          )}
        </div>
        <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
          <Row label="Plugs">
            {connectors.length === 0 ? (
              <span className="text-muted">Unknown</span>
            ) : (
              <ul className="space-y-0.5">
                {connectors.map((c) => (
                  <li key={c.id}>
                    {c.quantity} × {connectorLabels[c.connector_type]} ·{" "}
                    {formatPower(c.power_kw)}{" "}
                    <span className="text-muted">
                      {c.current_type.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Row>
          <Row label="Payment">
            {s.payment_methods?.length ? (
              s.payment_methods.map((m) => paymentLabels[m]).join(", ")
            ) : (
              <span className="text-muted">Unknown</span>
            )}
          </Row>
          <Row label="Access">
            {s.access_type ? accessLabels[s.access_type] : "Unknown"}
          </Row>
          <Row label="Hours">
            {s.is_24_7
              ? "24/7"
              : (s.access_hours ?? <span className="text-muted">Unknown</span>)}
          </Row>
          {s.parking_fee_note && (
            <Row label="Parking">{s.parking_fee_note}</Row>
          )}
          {s.amenities && s.amenities.length > 0 && (
            <Row label="Nearby">
              <span className="capitalize">{s.amenities.join(", ")}</span>
            </Row>
          )}
        </dl>
      </section>
    </main>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
