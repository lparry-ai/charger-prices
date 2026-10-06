import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "Report a price" };

export default async function ReportPage(props: PageProps<"/stations/[id]/report">) {
  const { id: rawId } = await props.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=/stations/${id}/report`);

  const [{ data: station }, { data: connectors }] = await Promise.all([
    supabase.from("station_summaries").select("id, name, operator_name").eq("id", id).maybeSingle(),
    supabase.from("connectors").select("connector_type").eq("station_id", id),
  ]);
  if (!station) notFound();

  const connectorTypes = [...new Set((connectors ?? []).map((c) => c.connector_type))];

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-16">
      <Link href={`/stations/${id}`} className="text-sm text-muted hover:text-foreground">
        ← {station.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Report a price</h1>
      <p className="mt-1 text-muted">
        Enter what the charger screen or {station.operator_name ?? "the network"}’s app shows right now.
      </p>
      <ReportForm stationId={id} connectorTypes={connectorTypes} />
    </main>
  );
}
