import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePriceForm } from "./price-form";

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

test("reads cents or dollars per kWh", () => {
  for (const raw of ["0.59", "$0.59", "59", "59c"]) {
    const r = parsePriceForm(form({ per_kwh: raw }));
    assert.ok("value" in r);
    assert.equal(r.value.per_kwh, 0.59, raw);
  }
});

test("needs a price unless free", () => {
  assert.ok("error" in parsePriceForm(form({})));
  const free = parsePriceForm(form({ is_free: "on", per_kwh: "0.5" }));
  assert.ok("value" in free);
  assert.equal(free.value.is_free, true);
  assert.equal(free.value.per_kwh, null);
});

test("rejects junk and half-filled time windows", () => {
  assert.ok("error" in parsePriceForm(form({ per_kwh: "abc" })));
  assert.ok("error" in parsePriceForm(form({ per_kwh: "0.5", timed: "on", time_window_start: "22:00" })));
});

test("keeps plan names only for member tiers and drops unknown connectors", () => {
  const r = parsePriceForm(form({ per_kwh: "0.4", tier: "member", plan_name: "Plus", connector_type: "bogus" }));
  assert.ok("value" in r);
  assert.equal(r.value.plan_name, "Plus");
  assert.equal(r.value.connector_type, null);
  const casual = parsePriceForm(form({ per_kwh: "0.4", plan_name: "Plus" }));
  assert.ok("value" in casual);
  assert.equal(casual.value.plan_name, null);
});
