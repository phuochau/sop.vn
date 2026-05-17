/**
 * Per-run AI cost tracking.
 *
 * The pipeline makes many paid AI calls across stages. `runWithCostTracking`
 * establishes an AsyncLocalStorage context for one run; every AI call records
 * its usage into that context via `recordCost`, with no parameter plumbing.
 * `withStage` tags subsequent records with a stage label so the summary has a
 * per-stage breakdown.
 *
 * OpenRouter returns exact USD cost (`usage.cost`) when the request asks for
 * it — those records are `estimated: false`. fal/Whisper has no cost field, so
 * its cost is estimated from audio duration — `estimated: true`.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export type CostRecord = {
  stage: string;
  provider: "openrouter" | "fal";
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUSD: number;
  estimated: boolean;
};

export type StageCost = {
  stage: string;
  costUSD: number;
  callCount: number;
  promptTokens: number;
  completionTokens: number;
};

export type CostSummary = {
  totalUSD: number;
  exactUSD: number;       // sum of provider-reported (OpenRouter) costs
  estimatedUSD: number;   // sum of estimated (fal/Whisper) costs
  callCount: number;
  byStage: StageCost[];
  generatedAt: Date;
};

type CostContext = { records: CostRecord[]; stage: string };

const als = new AsyncLocalStorage<CostContext>();

/** Round to 6 decimal places — AI costs are fractions of a cent. */
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function summarizeCost(records: CostRecord[]): CostSummary {
  const byStageMap = new Map<string, StageCost>();
  let exactUSD = 0;
  let estimatedUSD = 0;
  for (const r of records) {
    if (r.estimated) estimatedUSD += r.costUSD;
    else exactUSD += r.costUSD;
    const s = byStageMap.get(r.stage) ?? {
      stage: r.stage, costUSD: 0, callCount: 0, promptTokens: 0, completionTokens: 0,
    };
    s.costUSD += r.costUSD;
    s.callCount += 1;
    s.promptTokens += r.promptTokens;
    s.completionTokens += r.completionTokens;
    byStageMap.set(r.stage, s);
  }
  const byStage = [...byStageMap.values()]
    .map(s => ({ ...s, costUSD: round6(s.costUSD) }))
    .sort((a, b) => b.costUSD - a.costUSD);
  return {
    totalUSD: round6(exactUSD + estimatedUSD),
    exactUSD: round6(exactUSD),
    estimatedUSD: round6(estimatedUSD),
    callCount: records.length,
    byStage,
    generatedAt: new Date(),
  };
}

/**
 * Run `fn` inside a cost-tracking context. Returns `fn`'s result plus the
 * summary of every cost recorded during it. The summary is always returned,
 * even if `fn` throws — callers that need partial-cost-on-failure should catch.
 */
export async function runWithCostTracking<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; summary: CostSummary }> {
  const ctx: CostContext = { records: [], stage: "other" };
  const result = await als.run(ctx, fn);
  return { result, summary: summarizeCost(ctx.records) };
}

/** Tag every `recordCost` call made inside `fn` with `stage`. */
export function withStage<T>(stage: string, fn: () => Promise<T>): Promise<T> {
  const parent = als.getStore();
  if (!parent) return fn();
  // Child context shares the parent's records array but carries its own stage,
  // so concurrent stages never clobber each other's label.
  return als.run({ records: parent.records, stage }, fn);
}

/**
 * Record one AI call's cost into the active tracking context. No-op when
 * called outside `runWithCostTracking` (e.g. tests, ad-hoc scripts).
 */
export function recordCost(r: Omit<CostRecord, "stage">): void {
  const ctx = als.getStore();
  if (!ctx) return;
  ctx.records.push({ ...r, stage: ctx.stage });
}
