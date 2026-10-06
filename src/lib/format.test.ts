import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatAge,
  formatMoney,
  formatTariff,
  formatTimeWindow,
  freshness,
} from "./format";

test("money reads in cents under a dollar", () => {
  assert.equal(formatMoney(0.59), "59c");
  assert.equal(formatMoney(0.595), "59.5c");
  assert.equal(formatMoney(1.5), "$1.50");
});

test("tariff headline", () => {
  assert.equal(
    formatTariff({
      is_free: false,
      per_kwh: 0.69,
      per_minute: null,
      session_fee: 1,
    }),
    "69c/kWh + $1.00 per session",
  );
  assert.equal(
    formatTariff({
      is_free: true,
      per_kwh: null,
      per_minute: null,
      session_fee: null,
    }),
    "Free",
  );
});

test("ages and freshness", () => {
  const now = Date.parse("2026-10-06T12:00:00Z");
  assert.equal(formatAge("2026-10-06T11:59:30Z", now), "just now");
  assert.equal(formatAge("2026-10-06T09:00:00Z", now), "3 hours ago");
  assert.equal(formatAge("2026-10-03T12:00:00Z", now), "3 days ago");
  assert.equal(freshness("2026-10-03T12:00:00Z", now), "fresh");
  assert.equal(freshness("2026-09-20T12:00:00Z", now), "aging");
  assert.equal(freshness("2026-08-01T12:00:00Z", now), "stale");
});

test("time windows", () => {
  assert.equal(formatTimeWindow("22:00:00", "06:00:00", null), "10pm to 6am");
  assert.equal(formatTimeWindow(null, null, [6, 7]), "Sat, Sun");
});
