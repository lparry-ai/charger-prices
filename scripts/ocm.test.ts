import assert from "node:assert/strict";
import { test } from "node:test";
import { mapConnectorType, mapPoi, mapState } from "./ocm";

const poi = {
  ID: 1234,
  AddressInfo: {
    Title: "Example Shopping Centre",
    AddressLine1: "1 Main St",
    Town: "Parramatta",
    StateOrProvince: "New South Wales",
    Postcode: "2150",
    Latitude: -33.81,
    Longitude: 151.0,
    AccessComments: "Open 24/7",
  },
  OperatorInfo: { ID: 3534, Title: "Example Network", WebsiteURL: "https://example.com" },
  UsageTypeID: 1,
  Connections: [
    { ConnectionTypeID: 33, ConnectionType: { Title: "CCS (Type 2)" }, CurrentTypeID: 30, PowerKW: 150, Quantity: 2 },
    { ConnectionTypeID: 33, ConnectionType: { Title: "CCS (Type 2)" }, CurrentTypeID: 30, PowerKW: 150, Quantity: 2 },
    { ConnectionTypeID: 2, ConnectionType: { Title: "CHAdeMO" }, CurrentTypeID: 30, PowerKW: 50 },
    { ConnectionTypeID: 25, ConnectionType: { Title: "Type 2 (Socket Only)" }, CurrentTypeID: 20, PowerKW: null },
    { ConnectionTypeID: 9999, ConnectionType: { Title: "Some Unusual Plug" }, PowerKW: 3 },
  ],
};

test("maps a typical OCM site", () => {
  const s = mapPoi(poi)!;
  assert.equal(s.ocm_id, 1234);
  assert.equal(s.name, "Example Shopping Centre");
  assert.equal(s.state, "NSW");
  assert.equal(s.postcode, "2150");
  assert.equal(s.location, "SRID=4326;POINT(151 -33.81)");
  assert.equal(s.access_type, "public");
  assert.equal(s.is_24_7, true);
  assert.deepEqual(s.operator, { ocm_operator_id: 3534, name: "Example Network", website: "https://example.com" });
  assert.deepEqual(s.connectors, [
    { connector_type: "ccs2", current_type: "dc", power_kw: 150, quantity: 4, tethered: true },
    { connector_type: "chademo", current_type: "dc", power_kw: 50, quantity: 1, tethered: true },
    { connector_type: "type2", current_type: "ac", power_kw: null, quantity: 1, tethered: false },
  ]);
});

test("drops placeholder operators, bad postcodes and non-operational sites", () => {
  const s = mapPoi({ ...poi, OperatorInfo: { ID: 1, Title: "(Unknown Operator)" }, AddressInfo: { ...poi.AddressInfo, Postcode: "NSW 2150" } })!;
  assert.equal(s.operator, null);
  assert.equal(s.postcode, null);
  assert.equal(mapPoi({ ...poi, StatusType: { IsOperational: false } }), null);
});

test("maps states and plug names", () => {
  assert.equal(mapState("Vic."), "VIC");
  assert.equal(mapState("WA"), "WA");
  assert.equal(mapState("Auckland"), null);
  assert.deepEqual(mapConnectorType(1036, "Type 2 (Tethered Connector) "), { type: "type2", tethered: true });
  assert.deepEqual(mapConnectorType(null, "NACS / SAE J3400"), { type: "nacs", tethered: true });
  assert.equal(mapConnectorType(27, "Tesla (Model S/X)"), null);
});
