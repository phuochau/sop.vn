import { test } from "node:test";
import assert from "node:assert";
import { chunkCandidatesBySort, buildCandidateWindow, type CandidateForLLM } from "./classifyStepWithLLM";
import type { RawEvent } from "./classifyAndMergeEvents";

function c(index: number, time: number, cluster: string | null): CandidateForLLM {
  return {
    index,
    time,
    kindHint: "click",
    beforeMarkedPath: "/b.jpg",
    afterMarkedPath: "/a.jpg",
    screenCluster: cluster,
  };
}

test("chunkCandidatesBySort keeps same-screen candidates in one chunk", () => {
  const cands = [
    c(0, 1.0, "A"),
    c(1, 2.0, "B"),
    c(2, 3.0, "A"),
    c(3, 4.0, "B"),
    c(4, 5.0, "C"),
  ];
  const chunks = chunkCandidatesBySort(cands, 3);
  assert.equal(chunks.length, 2);
  const clustersInChunk0 = new Set(chunks[0].map(x => x.screenCluster));
  assert.ok(clustersInChunk0.has("A"));
  assert.equal(chunks[0].filter(x => x.screenCluster === "A").length, 2);
});

test("chunkCandidatesBySort produces single chunk when count <= cap", () => {
  const cands = [c(0, 1, "A"), c(1, 2, "B")];
  const chunks = chunkCandidatesBySort(cands, 12);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].length, 2);
});

test("chunkCandidatesBySort handles null screenCluster (sorts to the end)", () => {
  const cands = [c(0, 1, null), c(1, 2, "A"), c(2, 3, null), c(3, 4, "B")];
  const chunks = chunkCandidatesBySort(cands, 4);
  assert.equal(chunks.length, 1);
  const ordered = chunks[0].map(x => x.screenCluster);
  assert.deepEqual(ordered, ["A", "B", null, null]);
});

function frame(t: number): { t: number; localPath: string } {
  return { t, localPath: `/f${t}.jpg` };
}
function evt(over: Partial<RawEvent>): RawEvent {
  return {
    time: 10, bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    beforeFramePath: "/f9.jpg", afterFramePath: "/f11.jpg",
    area: 1, density: 0.5, kindHint: "click", ...over,
  };
}
const WIN = { maxFrames: 9, preSec: 1.5, postSec: 1.5, maxSpanSec: 6.0 };

test("buildCandidateWindow returns frames within the time range, sorted by t", () => {
  const pool = [frame(7), frame(9), frame(10), frame(11), frame(13)];
  const w = buildCandidateWindow(pool, evt({}), WIN);
  assert.deepEqual(w.map(f => f.t), [9, 10, 11]);
});

test("buildCandidateWindow downsamples to maxFrames but always keeps the anchors", () => {
  const pool = Array.from({ length: 30 }, (_, i) => frame(8.5 + i * 0.2));
  const e = evt({ beforeFramePath: pool[2].localPath, afterFramePath: pool[20].localPath });
  const w = buildCandidateWindow(pool, e, { ...WIN, maxFrames: 6 });
  assert.ok(w.length <= 6);
  assert.ok(w.some(f => f.localPath === pool[2].localPath), "before anchor kept");
  assert.ok(w.some(f => f.localPath === pool[20].localPath), "after anchor kept");
});

test("buildCandidateWindow caps the sampled span via maxSpanSec but force-includes the after anchor", () => {
  const pool = [frame(9), frame(10), frame(11), frame(20), frame(30)];
  const e = evt({ beforeFramePath: "/f9.jpg", afterFramePath: "/f30.jpg", time: 10 });
  const w = buildCandidateWindow(pool, e, { ...WIN, maxSpanSec: 6.0 });
  assert.ok(w.some(f => f.t === 30), "far after-anchor still force-included");
  assert.ok(!w.some(f => f.t === 20), "frame inside the gap but outside the cap is excluded");
});

test("buildCandidateWindow never returns empty — falls back to nearest frame", () => {
  const pool = [frame(100), frame(200)];
  const w = buildCandidateWindow(pool, evt({ time: 10, beforeFramePath: "/x", afterFramePath: "/y" }), WIN);
  assert.equal(w.length, 1);
  assert.equal(w[0].t, 100);
});

test("buildCandidateWindow returns empty only for an empty pool", () => {
  assert.deepEqual(buildCandidateWindow([], evt({}), WIN), []);
});

test("classifyStepWithLLM forwards each chunk to the injected classifier and concatenates", async () => {
  const { classifyStepWithLLM } = await import("./classifyStepWithLLM");
  let calls = 0;
  const out = await classifyStepWithLLM({
    stepTitle: "t",
    language: "en",
    candidates: [c(0,1,"A"), c(1,2,"A"), c(2,3,"B"), c(3,4,"B")],
    montageImagePath: null,
    maxCandidatesPerCall: 2,
    classifier: async ({ candidates }) => {
      calls++;
      return {
        candidates: candidates.map(cand => ({
          index: cand.index,
          decision: "action" as const,
          verb: "click" as const,
          screenName: cand.screenCluster ?? "x",
          screenCluster: cand.screenCluster,
          elementCaption: `el${cand.index}`,
          displayFrame: "before" as const,
          discardReason: null,
        })),
      };
    },
  });
  assert.equal(calls, 2);
  assert.equal(out.length, 4);
  const indices = out.map(c => c.index).sort((a, b) => a - b);
  assert.deepEqual(indices, [0, 1, 2, 3]);
});
