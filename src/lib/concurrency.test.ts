import { test } from "node:test";
import assert from "node:assert";
import { runWithConcurrency } from "./concurrency";

test("runWithConcurrency returns results in input order", async () => {
  const items = [10, 20, 30, 40, 50];
  const out = await runWithConcurrency(items, 2, async (n) => n * 2);
  assert.deepEqual(out, [20, 40, 60, 80, 100]);
});

test("runWithConcurrency respects the concurrency limit", async () => {
  let inFlight = 0;
  let peak = 0;
  const items = Array.from({ length: 12 }, (_, i) => i);
  await runWithConcurrency(items, 3, async (n) => {
    inFlight++;
    if (inFlight > peak) peak = inFlight;
    await new Promise(r => setTimeout(r, 10));
    inFlight--;
    return n;
  });
  assert.ok(peak <= 3, `peak ${peak} should be <= 3`);
});

test("runWithConcurrency propagates the first error", async () => {
  const items = [1, 2, 3];
  await assert.rejects(
    () => runWithConcurrency(items, 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    }),
    /boom/,
  );
});

test("runWithConcurrency handles empty input", async () => {
  const out = await runWithConcurrency<number, string>([], 5, async () => "x");
  assert.deepEqual(out, []);
});

test("runWithConcurrency with limit >= items uses min(limit, items.length) workers", async () => {
  const items = [1, 2];
  const out = await runWithConcurrency(items, 100, async (n) => n + 1);
  assert.deepEqual(out, [2, 3]);
});
