import { test } from "node:test";
import assert from "node:assert";
import { chunkCandidatesBySort, buildCandidateWindow, type CandidateForLLM } from "./classifyStepWithLLM";
import type { RawEvent } from "./classifyAndMergeEvents";

function c(index: number, time: number): CandidateForLLM {
  return { index, time, kindHint: "click", windowFramePaths: [`/c${index}-w0.jpg`] };
}

test("chunkCandidatesBySort produces single chunk when count <= cap", () => {
  const cands = [c(0, 1), c(1, 2)];
  const chunks = chunkCandidatesBySort(cands, 12);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].length, 2);
});

test("chunkCandidatesBySort produces multiple chunks when count > cap, each <= cap", () => {
  const cands = [c(0, 1), c(1, 2), c(2, 3), c(3, 4), c(4, 5)];
  const chunks = chunkCandidatesBySort(cands, 2);
  assert.ok(chunks.length > 1, "should produce more than one chunk");
  for (const chunk of chunks) {
    assert.ok(chunk.length <= 2, "each chunk should be <= cap");
  }
  assert.equal(chunks.flat().length, 5);
});

test("chunkCandidatesBySort flattened candidates are sorted by ascending time", () => {
  const cands = [c(4, 50), c(0, 10), c(2, 30), c(1, 20), c(3, 40)];
  const chunks = chunkCandidatesBySort(cands, 3);
  const flat = chunks.flat().map(x => x.time);
  assert.deepEqual(flat, [10, 20, 30, 40, 50]);
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
const WIN = { maxFrames: 9, preSec: 1.5, postSec: 0.5, postClickSec: 1.0, maxSpanSec: 6.0 };

test("buildCandidateWindow returns frames within the time range, sorted by t", () => {
  const pool = [frame(7), frame(9), frame(10), frame(11), frame(13)];
  const w = buildCandidateWindow(pool, evt({ kindHint: "input" }), WIN);
  assert.deepEqual(w.map(f => f.t), [9, 10, 11]); // input: [10-1.5 .. 11+0.5]
});

test("buildCandidateWindow downsamples to maxFrames but always keeps the anchors", () => {
  const pool = Array.from({ length: 30 }, (_, i) => frame(8.5 + i * 0.2));
  const e = evt({ kindHint: "input", beforeFramePath: pool[2].localPath, afterFramePath: pool[20].localPath });
  const w = buildCandidateWindow(pool, e, { ...WIN, maxFrames: 6 });
  assert.ok(w.length <= 6);
  assert.ok(w.some(f => f.localPath === pool[2].localPath), "before anchor kept");
  assert.ok(w.some(f => f.localPath === pool[20].localPath), "after anchor kept");
});

test("buildCandidateWindow (input) caps the sampled span via maxSpanSec but force-includes the after anchor", () => {
  const pool = [frame(9), frame(10), frame(11), frame(20), frame(30)];
  const e = evt({ kindHint: "input", beforeFramePath: "/f9.jpg", afterFramePath: "/f30.jpg", time: 10 });
  const w = buildCandidateWindow(pool, e, { ...WIN, maxSpanSec: 6.0 });
  assert.ok(w.some(f => f.t === 30), "far after-anchor still force-included");
  assert.ok(!w.some(f => f.t === 20), "frame inside the gap but outside the cap is excluded");
});

test("buildCandidateWindow (click) is source-biased — excludes the after frame and destination frames", () => {
  const pool = [frame(9), frame(10), frame(11), frame(15), frame(30)];
  // click navigates: afterFramePath is the destination screen at t=30
  const e = evt({ kindHint: "click", beforeFramePath: "/f9.jpg", afterFramePath: "/f30.jpg", time: 10 });
  const w = buildCandidateWindow(pool, e, WIN);
  assert.deepEqual(w.map(f => f.t), [9, 10, 11]); // [10-1.5 .. 10+1.0]
  assert.ok(!w.some(f => f.t === 30), "destination after-frame is NOT included for clicks");
  assert.ok(!w.some(f => f.t === 15), "frame past the click reach is excluded");
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
    candidates: [c(0, 1), c(1, 2), c(2, 3), c(3, 4)],
    maxCandidatesPerCall: 2,
    classifier: async ({ candidates }) => {
      calls++;
      return {
        candidates: candidates.map(cand => ({
          index: cand.index,
          decision: "action" as const,
          verb: "click" as const,
          screenName: "x",
          elementCaption: `el${cand.index}`,
          displayFrameIndex: 0,
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
