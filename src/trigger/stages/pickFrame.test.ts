import { test } from "node:test";
import assert from "node:assert";
import { computeActionTime, computeSearchWindow, shortlistClusters, sanitizePick } from "./pickFrame";
import type { ScreenCluster } from "@/trigger/lib/screenId";

function fakeCluster(letter: string, start: number, end: number): ScreenCluster {
  return {
    letter,
    representative: { t: (start + end) / 2, localPath: `/${letter}.jpg` },
    members: [
      { frame: { t: start, localPath: `/${letter}.jpg` }, dHash: "0".repeat(16) },
      { frame: { t: end, localPath: `/${letter}.jpg` }, dHash: "0".repeat(16) },
    ],
    timeSpan: { start, end },
    dHash: "0".repeat(16),
  };
}

const narration = [
  { id: 0, start: 10, end: 12, text: "a" },
  { id: 1, start: 12, end: 15, text: "b" },
];

test("computeSearchWindow uses narration segment IDs when present", () => {
  const w = computeSearchWindow(
    { narrationSegmentIds: [0, 1], timeWindow: null },
    narration,
    { tStart: 0, tEnd: 100 },
    { pre: 1, post: 3 },
  );
  assert.equal(w.start, 9);
  assert.equal(w.end, 18);
});

test("computeSearchWindow falls back to timeWindow when ids are empty", () => {
  const w = computeSearchWindow(
    { narrationSegmentIds: [], timeWindow: { start: 20, end: 30 } },
    narration,
    { tStart: 0, tEnd: 100 },
    { pre: 0, post: 3 },
  );
  assert.equal(w.start, 20);
  assert.equal(w.end, 33);
});

test("computeSearchWindow applies symmetric pad in both directions for narration anchor", () => {
  const w = computeSearchWindow(
    { narrationSegmentIds: [1], timeWindow: null },
    narration,
    { tStart: 0, tEnd: 100 },
    { pre: 8, post: 8 },
  );
  // seg 1: start=12, end=15 → window = [12-8, 15+8] = [4, 23]
  assert.equal(w.start, 4);
  assert.equal(w.end, 23);
});

test("computeSearchWindow applies pre-pad to timeWindow fallback", () => {
  const w = computeSearchWindow(
    { narrationSegmentIds: [], timeWindow: { start: 20, end: 30 } },
    narration,
    { tStart: 0, tEnd: 100 },
    { pre: 8, post: 8 },
  );
  assert.equal(w.start, 12);
  assert.equal(w.end, 38);
});

test("shortlistClusters keeps clusters overlapping the window, up to cap, by longest in-window dwell", () => {
  const clusters: ScreenCluster[] = [
    fakeCluster("A", 0, 5),
    fakeCluster("B", 8, 12),
    fakeCluster("C", 14, 17),
    fakeCluster("D", 11, 16),
  ];
  const out = shortlistClusters(clusters, { start: 10, end: 18 }, 3);
  assert.equal(out.length, 3);
  const letters = new Set(out.map(c => c.letter));
  assert.ok(letters.has("D"));
  assert.ok(letters.has("C"));
  assert.ok(letters.has("B"));
  assert.ok(!letters.has("A"));
});

test("shortlistClusters honors cap", () => {
  const clusters: ScreenCluster[] = [
    fakeCluster("A", 0, 100),
    fakeCluster("B", 0, 100),
    fakeCluster("C", 0, 100),
    fakeCluster("D", 0, 100),
    fakeCluster("E", 0, 100),
    fakeCluster("F", 0, 100),
    fakeCluster("G", 0, 100),
  ];
  const out = shortlistClusters(clusters, { start: 0, end: 100 }, 6);
  assert.equal(out.length, 6);
});

test("sanitizePick coerces invalid letter to null", () => {
  const validLetters = new Set(["A", "B"]);
  const out = sanitizePick({ picked: "Z", runnerUp: "A", reasoning: "x" }, validLetters);
  assert.equal(out.picked, null);
  assert.equal(out.runnerUp, null);
});

test("sanitizePick coerces runnerUp to null when equal to picked", () => {
  const validLetters = new Set(["A", "B"]);
  const out = sanitizePick({ picked: "A", runnerUp: "A", reasoning: "x" }, validLetters);
  assert.equal(out.picked, "A");
  assert.equal(out.runnerUp, null);
});

test("sanitizePick keeps valid distinct letters", () => {
  const validLetters = new Set(["A", "B"]);
  const out = sanitizePick({ picked: "A", runnerUp: "B", reasoning: "x" }, validLetters);
  assert.equal(out.picked, "A");
  assert.equal(out.runnerUp, "B");
});

test("computeActionTime returns the unpadded end of the narration range", () => {
  const t = computeActionTime(
    { narrationSegmentIds: [1, 2], timeWindow: null },
    [
      { id: 1, start: 10, end: 14, text: "a" },
      { id: 2, start: 14, end: 19, text: "b" },
      { id: 3, start: 30, end: 35, text: "c" },
    ],
    { tStart: 0, tEnd: 100 },
  );
  assert.equal(t, 19);
});

test("computeActionTime falls back to timeWindow.end when there are no narration segments", () => {
  const t = computeActionTime(
    { narrationSegmentIds: [], timeWindow: { start: 40, end: 52 } },
    [],
    { tStart: 0, tEnd: 100 },
  );
  assert.equal(t, 52);
});

test("computeActionTime falls back to step.tEnd when there is no narration and no timeWindow", () => {
  const t = computeActionTime(
    { narrationSegmentIds: [], timeWindow: null },
    [],
    { tStart: 5, tEnd: 88 },
  );
  assert.equal(t, 88);
});

test("computeActionTime falls back when narration ids match no segment", () => {
  const t = computeActionTime(
    { narrationSegmentIds: [99], timeWindow: { start: 1, end: 7 } },
    [{ id: 1, start: 0, end: 3, text: "x" }],
    { tStart: 0, tEnd: 100 },
  );
  assert.equal(t, 7);
});
