// Maps Open Charge Map POIs (https://openchargemap.org/site/develop/api) to
// rows for our stations, operators and connectors tables.

import type { Database } from "../src/lib/database.types";

type Enums = Database["public"]["Enums"];

export type OcmPoi = {
  ID: number;
  AddressInfo: {
    Title?: string | null;
    AddressLine1?: string | null;
    Town?: string | null;
    StateOrProvince?: string | null;
    Postcode?: string | null;
    Latitude: number;
    Longitude: number;
    AccessComments?: string | null;
  };
  OperatorInfo?: { ID: number; Title?: string | null; WebsiteURL?: string | null } | null;
  UsageTypeID?: number | null;
  StatusType?: { IsOperational?: boolean | null } | null;
  Connections?: Array<{
    ConnectionTypeID?: number | null;
    ConnectionType?: { Title?: string | null } | null;
    CurrentTypeID?: number | null;
    PowerKW?: number | null;
    Quantity?: number | null;
  }> | null;
};

export type MappedStation = {
  ocm_id: number;
  name: string;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  location: string;
  access_type: Enums["access_type"];
  access_hours: string | null;
  is_24_7: boolean | null;
  operator: { ocm_operator_id: number; name: string; website: string | null } | null;
  connectors: Array<{
    connector_type: Enums["connector_type"];
    current_type: Enums["current_type"];
    power_kw: number | null;
    quantity: number;
    tethered: boolean | null;
  }>;
};

// OCM placeholder operators that don't name a real network.
const UNKNOWN_OPERATORS = new Set([1, 44, 45]);

const STATES: Record<string, string> = {
  act: "ACT",
  "australian capital territory": "ACT",
  nsw: "NSW",
  "new south wales": "NSW",
  nt: "NT",
  "northern territory": "NT",
  qld: "QLD",
  queensland: "QLD",
  sa: "SA",
  "south australia": "SA",
  tas: "TAS",
  tasmania: "TAS",
  vic: "VIC",
  victoria: "VIC",
  wa: "WA",
  "western australia": "WA",
};

export function mapState(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return STATES[raw.trim().toLowerCase().replace(/\./g, "")] ?? null;
}

// OCM usage types: 2 = Private - Restricted Access, 3 = Privately Owned -
// Notice Required, 6 = Private - For Staff, Visitors or Customers.
export function mapAccess(usageTypeId: number | null | undefined): Enums["access_type"] {
  if (usageTypeId === 6) return "customers";
  if (usageTypeId === 2 || usageTypeId === 3) return "restricted";
  return "public";
}

// Matching on the title is sturdier than OCM's numeric IDs, which have grown
// variants over the years (tethered, socket only, and so on).
export function mapConnectorType(
  id: number | null | undefined,
  title: string | null | undefined,
): { type: Enums["connector_type"]; tethered: boolean | null } | null {
  const t = (title ?? "").toLowerCase();
  if (id === 33 || /ccs.*type 2|type 2.*ccs|combo 2/.test(t)) return { type: "ccs2", tethered: true };
  if (id === 2 || t.includes("chademo")) return { type: "chademo", tethered: true };
  if (id === 25 || id === 1036 || t.includes("type 2") || t.includes("mennekes")) {
    if (id === 1036 || t.includes("tethered")) return { type: "type2", tethered: true };
    if (id === 25 || t.includes("socket")) return { type: "type2", tethered: false };
    return { type: "type2", tethered: null };
  }
  if (id === 1 || t.includes("j1772") || t.includes("type 1")) return { type: "type1", tethered: true };
  if (t.includes("nacs") || t.includes("j3400")) return { type: "nacs", tethered: true };
  return null;
}

export function mapPoi(poi: OcmPoi): MappedStation | null {
  const a = poi.AddressInfo;
  if (!a || !Number.isFinite(a.Latitude) || !Number.isFinite(a.Longitude)) return null;
  if (poi.StatusType?.IsOperational === false) return null;

  const grouped = new Map<string, MappedStation["connectors"][number]>();
  for (const c of poi.Connections ?? []) {
    const type = mapConnectorType(c.ConnectionTypeID, c.ConnectionType?.Title);
    if (!type) continue;
    const current: Enums["current_type"] =
      c.CurrentTypeID === 30 || type.type === "ccs2" || type.type === "chademo" ? "dc" : "ac";
    const power = c.PowerKW && c.PowerKW > 0 ? Math.round(c.PowerKW * 10) / 10 : null;
    const key = `${type.type}:${power}`;
    const existing = grouped.get(key);
    const quantity = c.Quantity && c.Quantity > 0 ? c.Quantity : 1;
    if (existing) existing.quantity += quantity;
    else
      grouped.set(key, {
        connector_type: type.type,
        current_type: current,
        power_kw: power,
        quantity,
        tethered: type.tethered,
      });
  }

  const op = poi.OperatorInfo;
  const postcode = a.Postcode?.trim() ?? "";
  const access = a.AccessComments?.trim() || null;

  return {
    ocm_id: poi.ID,
    name: (a.Title?.trim() || a.AddressLine1?.trim() || `Charger ${poi.ID}`).slice(0, 200),
    address: a.AddressLine1?.trim() || null,
    suburb: a.Town?.trim() || null,
    state: mapState(a.StateOrProvince),
    postcode: /^\d{4}$/.test(postcode) ? postcode : null,
    location: `SRID=4326;POINT(${a.Longitude} ${a.Latitude})`,
    access_type: mapAccess(poi.UsageTypeID),
    access_hours: access && access.length <= 200 ? access : null,
    is_24_7: access ? /24\s*\/\s*7|24 hours/i.test(access) || null : null,
    operator:
      op && !UNKNOWN_OPERATORS.has(op.ID) && op.Title
        ? { ocm_operator_id: op.ID, name: op.Title.trim(), website: op.WebsiteURL?.trim() || null }
        : null,
    connectors: [...grouped.values()],
  };
}
