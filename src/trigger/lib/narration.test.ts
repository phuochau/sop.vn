import { test } from "node:test";
import assert from "node:assert";
import { assembleStepNarration, silentStepFallback } from "./narration";
import type { Segment, CleanSegment } from "@/lib/mongo";
import type { ScreenCluster } from "@/trigger/lib/screenId";

const segments: Segment[] = [
  { id: 0, start: 0.0, end: 2.0, text: "hello uh raw" },
  { id: 1, start: 2.0, end: 4.5, text: "raw two" },
  { id: 2, start: 4.5, end: 7.0, text: "raw three" },
];

const segmentsClean: CleanSegment[] = [
  { id: 0, text: "Hello" },
  { id: 1, text: "Cleaned two" },
  { id: 2, text: "Cleaned three" },
];

test("assembleStepNarration joins segments and segmentsClean by id within step range", () => {
  const step = { startSegmentId: 0, endSegmentId: 1 };
  const out = assembleStepNarration(step, segments, segmentsClean);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 0);
  assert.equal(out[0].text, "Hello");
  assert.equal(out[0].start, 0.0);
  assert.equal(out[0].end, 2.0);
  assert.equal(out[1].text, "Cleaned two");
});

test("assembleStepNarration falls back to segments[].text when segmentsClean is null", () => {
  const step = { startSegmentId: 0, endSegmentId: 0 };
  const out = assembleStepNarration(step, segments, null);
  assert.equal(out.length, 1);
  assert.equal(out[0].text, "hello uh raw");
});

test("assembleStepNarration returns empty when no segments match", () => {
  const step = { startSegmentId: 99, endSegmentId: 100 };
  const out = assembleStepNarration(step, segments, segmentsClean);
  assert.deepEqual(out, []);
});

test("assembleStepNarration falls back per-segment when segmentsClean is missing one id", () => {
  const step = { startSegmentId: 0, endSegmentId: 2 };
  const partial = [{ id: 0, text: "Hello" }, { id: 2, text: "Cleaned three" }];
  const out = assembleStepNarration(step, segments, partial);
  assert.equal(out.length, 3);
  assert.equal(out[0].text, "Hello");
  assert.equal(out[1].text, "raw two");
  assert.equal(out[2].text, "Cleaned three");
});

function fakeCluster(letter: string, start: number, end: number, repPath = "/rep.jpg"): ScreenCluster {
  return {
    letter,
    representative: { t: (start + end) / 2, localPath: repPath },
    members: [
      { frame: { t: start, localPath: repPath }, dHash: "0".repeat(16) },
      { frame: { t: end, localPath: repPath }, dHash: "0".repeat(16) },
    ],
    timeSpan: { start, end },
    dHash: "0".repeat(16),
  };
}

test("silentStepFallback emits one view sub-step per long-enough cluster", () => {
  const clusters: ScreenCluster[] = [
    fakeCluster("A", 0, 2),
    fakeCluster("B", 5, 12),
    fakeCluster("C", 20, 28),
  ];
  const plan = silentStepFallback(clusters, { stepIndex: 3 }, 4.0, "en");
  assert.equal(plan.subSteps.length, 2);
  assert.equal(plan.subSteps[0].verb, "view");
  assert.equal(plan.subSteps[0].timeWindow?.start, 5);
  assert.equal(plan.subSteps[1].timeWindow?.start, 20);
});

test("silentStepFallback uses Vietnamese caption for vi", () => {
  const clusters = [fakeCluster("A", 0, 10)];
  const plan = silentStepFallback(clusters, { stepIndex: 0 }, 4.0, "vi");
  assert.ok(plan.subSteps[0].intent.includes("màn hình"));
});

test("silentStepFallback emits no sub-steps when no cluster exceeds threshold", () => {
  const clusters = [fakeCluster("A", 0, 2)];
  const plan = silentStepFallback(clusters, { stepIndex: 0 }, 4.0, "en");
  assert.equal(plan.subSteps.length, 0);
});
