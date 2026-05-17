import { test } from "node:test";
import assert from "node:assert";
import { chunkCandidatesBySort, type CandidateForLLM } from "./classifyStepWithLLM";

function c(index: number, time: number, cluster: string | null): CandidateForLLM {
  return {
    index,
    time,
    kindHint: "click",
    diffBboxInCrop: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    beforeCropPath: "/b.jpg",
    afterCropPath: "/a.jpg",
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
          bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
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
