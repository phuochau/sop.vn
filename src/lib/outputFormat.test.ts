import { test } from "node:test";
import assert from "node:assert";
import { resolveOutputFormat } from "./outputFormat";

test("auto + web returns screenshots", () => {
  const r = resolveOutputFormat("auto", "web");
  assert.equal(r.effective, "screenshots");
  assert.equal(r.coerced, undefined);
});

test("auto + mobile returns screenshots", () => {
  assert.equal(resolveOutputFormat("auto", "mobile").effective, "screenshots");
});

test("auto + desktop returns screenshots", () => {
  assert.equal(resolveOutputFormat("auto", "desktop").effective, "screenshots");
});

test("auto + physical returns clips", () => {
  const r = resolveOutputFormat("auto", "physical");
  assert.equal(r.effective, "clips");
  assert.equal(r.coerced, undefined);
});

test("screenshots + web returns screenshots", () => {
  assert.equal(resolveOutputFormat("screenshots", "web").effective, "screenshots");
});

test("screenshots + physical coerces to clips with physical_detected reason", () => {
  const r = resolveOutputFormat("screenshots", "physical");
  assert.equal(r.effective, "clips");
  assert.deepEqual(r.coerced, {
    from: "screenshots",
    to: "clips",
    reason: "physical_detected",
  });
});

test("clips + web returns clips, no coercion", () => {
  const r = resolveOutputFormat("clips", "web");
  assert.equal(r.effective, "clips");
  assert.equal(r.coerced, undefined);
});

test("clips + physical returns clips, no coercion", () => {
  const r = resolveOutputFormat("clips", "physical");
  assert.equal(r.effective, "clips");
  assert.equal(r.coerced, undefined);
});
