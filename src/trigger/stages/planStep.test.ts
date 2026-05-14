import { test } from "node:test";
import assert from "node:assert";
import { runPlanStep, validateAndFilter, type PlannerFn } from "./planStep";
import type { NarrationSegment } from "@/trigger/lib/narration";
import type { ScreenCluster } from "@/trigger/lib/screenId";

const narration: NarrationSegment[] = [
  { id: 0, start: 0, end: 2, text: "Click sign up." },
  { id: 1, start: 2, end: 4, text: "Enter your email." },
];

function fakeCluster(letter: string): ScreenCluster {
  return {
    letter,
    representative: { t: 1, localPath: "/x.jpg" },
    members: [{ frame: { t: 1, localPath: "/x.jpg" }, dHash: "0".repeat(16) }],
    timeSpan: { start: 0, end: 4 },
    dHash: "0".repeat(16),
  };
}

test("runPlanStep returns subSteps from the injected planner", async () => {
  const planner: PlannerFn = async () => ({
    subSteps: [
      { intent: "Click sign up.", verb: "click", narrationSegmentIds: [0], timeWindow: null, visualConfidence: "high" },
      { intent: "Enter your email.", verb: "input", narrationSegmentIds: [1], timeWindow: null, visualConfidence: "high" },
    ],
  });
  const out = await runPlanStep({
    stepIndex: 0,
    stepTitle: "Sign up",
    stepDescription: "User signs up",
    narration,
    clusters: [fakeCluster("A")],
    language: "en",
    planner,
  });
  assert.equal(out.subSteps.length, 2);
});

test("validateAndFilter drops sub-steps with visualConfidence: low", () => {
  const out = validateAndFilter(
    {
      subSteps: [
        { intent: "ok", verb: "click", narrationSegmentIds: [0], timeWindow: null, visualConfidence: "high" },
        { intent: "skip", verb: "click", narrationSegmentIds: [1], timeWindow: null, visualConfidence: "low" },
      ],
    },
    new Set([0, 1]),
  );
  assert.equal(out.subSteps.length, 1);
  assert.equal(out.subSteps[0].intent, "ok");
});

test("validateAndFilter filters out-of-range narrationSegmentIds but keeps the sub-step", () => {
  const out = validateAndFilter(
    {
      subSteps: [
        { intent: "ok", verb: "click", narrationSegmentIds: [0, 99, 1], timeWindow: null, visualConfidence: "high" },
      ],
    },
    new Set([0, 1]),
  );
  assert.equal(out.subSteps.length, 1);
  assert.deepEqual(out.subSteps[0].narrationSegmentIds, [0, 1]);
});

test("validateAndFilter drops sub-step when filtered ids are empty AND timeWindow is null", () => {
  const out = validateAndFilter(
    {
      subSteps: [
        { intent: "bad", verb: "click", narrationSegmentIds: [99], timeWindow: null, visualConfidence: "high" },
      ],
    },
    new Set([0, 1]),
  );
  assert.equal(out.subSteps.length, 0);
});

test("validateAndFilter keeps sub-step when ids become empty but timeWindow is set", () => {
  const out = validateAndFilter(
    {
      subSteps: [
        { intent: "anchor by time", verb: "view", narrationSegmentIds: [99], timeWindow: { start: 1, end: 5 }, visualConfidence: "high" },
      ],
    },
    new Set([0, 1]),
  );
  assert.equal(out.subSteps.length, 1);
  assert.deepEqual(out.subSteps[0].narrationSegmentIds, []);
});

test("validateAndFilter emits pipeline.plan.low_confidence_dropped for low-confidence sub-steps", () => {
  const events: Array<{ event: string; attrs: Record<string, unknown> }> = [];
  validateAndFilter(
    {
      subSteps: [
        { intent: "drop me", verb: "click", narrationSegmentIds: [0], timeWindow: null, visualConfidence: "low" },
        { intent: "keep me", verb: "click", narrationSegmentIds: [0], timeWindow: null, visualConfidence: "high" },
      ],
    },
    new Set([0]),
    { stepIndex: 1, log: (event, attrs) => events.push({ event, attrs }) },
  );
  const drops = events.filter(e => e.event === "pipeline.plan.low_confidence_dropped");
  assert.equal(drops.length, 1);
  assert.equal(drops[0].attrs.intent, "drop me");
  assert.equal(drops[0].attrs.stepIndex, 1);
});

test("validateAndFilter emits pipeline.plan.filtered_invalid_ids when ids are partially filtered", () => {
  const events: Array<{ event: string; attrs: Record<string, unknown> }> = [];
  validateAndFilter(
    {
      subSteps: [
        { intent: "ok", verb: "click", narrationSegmentIds: [0, 99, 1], timeWindow: null, visualConfidence: "high" },
      ],
    },
    new Set([0, 1]),
    { stepIndex: 2, log: (event, attrs) => events.push({ event, attrs }) },
  );
  const filtered = events.filter(e => e.event === "pipeline.plan.filtered_invalid_ids");
  assert.equal(filtered.length, 1);
  assert.deepEqual(filtered[0].attrs.droppedIds, [99]);
});

test("validateAndFilter emits pipeline.plan.no_temporal_anchor when sub-step is dropped for that reason", () => {
  const events: Array<{ event: string; attrs: Record<string, unknown> }> = [];
  validateAndFilter(
    {
      subSteps: [
        { intent: "bad", verb: "click", narrationSegmentIds: [99], timeWindow: null, visualConfidence: "high" },
      ],
    },
    new Set([0, 1]),
    { stepIndex: 0, log: (event, attrs) => events.push({ event, attrs }) },
  );
  const drops = events.filter(e => e.event === "pipeline.plan.no_temporal_anchor");
  assert.equal(drops.length, 1);
  assert.equal(drops[0].attrs.intent, "bad");
});

test("runPlanStep retries once when planner returns 0 sub-steps and narration is non-empty", async () => {
  let calls = 0;
  const planner: PlannerFn = async () => {
    calls++;
    if (calls === 1) return { subSteps: [] };
    return {
      subSteps: [
        { intent: "Click sign up.", verb: "click", narrationSegmentIds: [0], timeWindow: null, visualConfidence: "high" },
      ],
    };
  };
  const out = await runPlanStep({
    stepIndex: 0,
    stepTitle: "Sign up",
    stepDescription: "",
    narration,
    clusters: [fakeCluster("A")],
    language: "en",
    planner,
  });
  assert.equal(calls, 2);
  assert.equal(out.subSteps.length, 1);
});
