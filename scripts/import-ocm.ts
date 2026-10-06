// Imports Australian charging stations from Open Charge Map.
//
//   OCM_API_KEY=... SUPABASE_SECRET_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
//     npm run import:ocm -- [--state NSW] [--limit 500] [--dry-run]
//
// Or import a saved API response instead of calling the API:
//
//     npm run import:ocm -- --file ocm-au.json
//
// New stations are added with their plugs. Stations already imported are left
// alone, so corrections made by users and moderators are never overwritten.

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import type { Database } from "../src/lib/database.types";
import { mapPoi, mapState, type OcmPoi } from "./ocm";

const { values: args } = parseArgs({
  options: {
    state: { type: "string" },
    limit: { type: "string", default: "10000" },
    file: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} (see .env.example).`);
  return value;
}

async function fetchPois(): Promise<OcmPoi[]> {
  if (args.file) return JSON.parse(await readFile(args.file, "utf8"));
  const url = new URL("https://api.openchargemap.io/v3/poi");
  url.search = new URLSearchParams({
    output: "json",
    countrycode: "AU",
    maxresults: args.limit!,
    compact: "false",
    verbose: "false",
  }).toString();
  const res = await fetch(url, { headers: { "X-API-Key": env("OCM_API_KEY") } });
  if (!res.ok) throw new Error(`Open Charge Map returned ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const wantedState = args.state ? mapState(args.state) : null;
  if (args.state && !wantedState) throw new Error(`Unknown state "${args.state}".`);

  const pois = await fetchPois();
  const stations = pois
    .map(mapPoi)
    .filter((s): s is NonNullable<typeof s> => s != null)
    .filter((s) => !wantedState || s.state === wantedState);
  console.log(`Open Charge Map returned ${pois.length} sites; ${stations.length} to consider.`);

  if (args["dry-run"]) {
    console.log(JSON.stringify(stations.slice(0, 3), null, 2));
    return;
  }

  const supabase = createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false } },
  );

  // Operators first, so stations can point at them.
  const operators = new Map(
    stations.filter((s) => s.operator).map((s) => [s.operator!.ocm_operator_id, s.operator!]),
  );
  const operatorIds = new Map<number, number>();
  if (operators.size) {
    const { data, error } = await supabase
      .from("operators")
      .upsert([...operators.values()], { onConflict: "ocm_operator_id" })
      .select("id, ocm_operator_id");
    if (error) throw error;
    for (const o of data) operatorIds.set(o.ocm_operator_id!, o.id);
  }

  let added = 0;
  for (let i = 0; i < stations.length; i += 500) {
    const batch = stations.slice(i, i + 500);
    const { data: inserted, error } = await supabase
      .from("stations")
      .upsert(
        batch.map((s) => ({
          ocm_id: s.ocm_id,
          name: s.name,
          address: s.address,
          suburb: s.suburb,
          state: s.state,
          postcode: s.postcode,
          location: s.location,
          access_type: s.access_type,
          access_hours: s.access_hours,
          is_24_7: s.is_24_7,
          source: "ocm" as const,
          operator_id: s.operator ? (operatorIds.get(s.operator.ocm_operator_id) ?? null) : null,
        })),
        { onConflict: "ocm_id", ignoreDuplicates: true },
      )
      .select("id, ocm_id");
    if (error) throw error;

    // Only stations inserted just now come back, so existing plugs are kept.
    const byOcmId = new Map(batch.map((s) => [s.ocm_id, s]));
    const connectors = inserted.flatMap((row) =>
      byOcmId.get(row.ocm_id!)!.connectors.map((c) => ({ ...c, station_id: row.id })),
    );
    if (connectors.length) {
      const { error: cErr } = await supabase.from("connectors").insert(connectors);
      if (cErr) throw cErr;
    }
    added += inserted.length;
    console.log(`Processed ${Math.min(i + 500, stations.length)}/${stations.length}, ${added} new.`);
  }
  console.log(`Done. Added ${added} stations.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
