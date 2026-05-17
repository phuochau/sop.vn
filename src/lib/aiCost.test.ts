import { test } from "node:test";
import assert from "node:assert";
import {
  summarizeCost,
  runWithCostTracking,
  withStage,
  recordCost,
  type CostRecord,
} from "./aiCost";

function rec(over: Partial<CostRecord>): CostRecord {
  return {
    stage: "other",
    provider: "openrouter",
    model: "m",
    promptTokens: 0,
    completionTokens: 0,
    costUSD: 0,
    estimated: false,
    ...over,
  };
}

test("summarizeCost totals exact and estimated separately", () => {
  const s = summarizeCost([
    rec({ stage: "classify", costUSD: 0.01, promptTokens: 100 }),
    rec({ stage: "classify", costUSD: 0.02, promptTokens: 200 }),
    rec({ stage: "transcribe", provider: "fal", costUSD: 0.005, estimated: true }),
  ]);
  assert.equal(s.exactUSD, 0.03);
  assert.equal(s.estimatedUSD, 0.005);
  assert.equal(s.totalUSD, 0.035);
  assert.equal(s.callCount, 3);
});

test("summarizeCost groups by stage, sorted by cost desc", () => {
  const s = summarizeCost([
    rec({ stage: "extract", costUSD: 0.001 }),
    rec({ stage: "classify", costUSD: 0.05 }),
    rec({ stage: "classify", costUSD: 0.05 }),
  ]);
  assert.deepEqual(s.byStage.map(x => x.stage), ["classify", "extract"]);
  assert.equal(s.byStage[0].callCount, 2);
  assert.equal(s.byStage[0].costUSD, 0.1);
});

test("recordCost outside a tracking context is a no-op (does not throw)", () => {
  assert.doesNotThrow(() => recordCost({
    provider: "openrouter", model: "m", promptTokens: 1, completionTokens: 1,
    costUSD: 0.001, estimated: false,
  }));
});

test("runWithCostTracking captures records and withStage tags them", async () => {
  const { result, summary } = await runWithCostTracking(async () => {
    await withStage("transcribe", async () => {
      recordCost({ provider: "fal", model: "whisper", promptTokens: 0,
        completionTokens: 0, costUSD: 0.002, estimated: true });
    });
    await withStage("classify", async () => {
      recordCost({ provider: "openrouter", model: "vlm", promptTokens: 500,
        completionTokens: 50, costUSD: 0.04, estimated: false });
    });
    return "done";
  });
  assert.equal(result, "done");
  assert.equal(summary.totalUSD, 0.042);
  assert.equal(summary.byStage.length, 2);
  const classify = summary.byStage.find(s => s.stage === "classify")!;
  assert.equal(classify.promptTokens, 500);
});

test("records made outside any withStage are tagged 'other'", async () => {
  const { summary } = await runWithCostTracking(async () => {
    recordCost({ provider: "openrouter", model: "m", promptTokens: 1,
      completionTokens: 1, costUSD: 0.01, estimated: false });
  });
  assert.equal(summary.byStage[0].stage, "other");
});
