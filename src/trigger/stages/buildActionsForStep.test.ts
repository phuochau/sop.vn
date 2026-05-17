import { test } from "node:test";
import assert from "node:assert";
import { buildActionsForStep, normalizeElementId } from "./buildActionsForStep";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";
import type { ScreenCluster } from "@/trigger/lib/screenId";

function action(over: Partial<ClassifiedActionRecord>): ClassifiedActionRecord {
  return {
    index: 0,
    decision: "action",
    verb: "click",
    screenName: "Login page",
    screenCluster: "A",
    elementCaption: "Sign in button",
    bbox: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    displayFrame: "before",
    discardReason: null,
    fullFrameBbox: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    beforeFramePath: "/b.jpg",
    afterFramePath: "/a.jpg",
    ...over,
  };
}

function cluster(letter: string, start: number, end: number, repPath = "/rep.jpg"): ScreenCluster {
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

test("normalizeElementId lowercases, trims, collapses whitespace, strips closed-class suffixes", () => {
  assert.equal(normalizeElementId("Verify email button"), "verify email");
  assert.equal(normalizeElementId("Verify email"), "verify email");
  assert.equal(normalizeElementId("  Search field  "), "search");
  assert.equal(normalizeElementId("Companies LINK"), "companies");
  assert.equal(normalizeElementId("Marketing menu item"), "marketing menu");
});

test("drops discards including those with null discardReason", () => {
  const cls = [
    action({ index: 0 }),
    action({ index: 1, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, bbox: null, displayFrame: null, discardReason: "hover", fullFrameBbox: null }),
    action({ index: 2, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, bbox: null, displayFrame: null, discardReason: null, fullFrameBbox: null }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 1.5, 2.0], viewMinDurationSec: 4.0, language: "en",
  });
  assert.equal(out.filter(a => a.verb !== "view").length, 1);
});

test("dedupes same (screenName, elementId) keeping the latest event", () => {
  const cls = [
    action({ index: 0, elementCaption: "Get started free button" }),
    action({ index: 1, elementCaption: "Get started free" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 3)],
    eventTimes: [46.0, 47.5], viewMinDurationSec: 4.0, language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].time, 47.5);
});

test("verb-collapse rule: input wins over click", () => {
  const cls = [
    action({ index: 0, verb: "click", elementCaption: "Email field" }),
    action({ index: 1, verb: "input", elementCaption: "Email field" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 2.0], viewMinDurationSec: 4.0, language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].verb, "input");
});

test("emits a View action when a cluster persists >= threshold with zero overlapping actions", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({ index: 0, screenName: "Page A" })],
    screenClusters: [cluster("A", 0, 1), cluster("B", 10, 20, "/rep-b.jpg")],
    eventTimes: [0.5], viewMinDurationSec: 4.0, language: "en",
  });
  const views = out.filter(a => a.verb === "view");
  assert.equal(views.length, 1);
  assert.equal(views[0].time, 15);
  assert.equal(views[0].displayFramePath, "/rep-b.jpg");
});

test("does NOT emit a View action when an action time overlaps the cluster span", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({ index: 0, screenName: "Page B" })],
    screenClusters: [cluster("B", 10, 20)],
    eventTimes: [15], viewMinDurationSec: 4.0, language: "en",
  });
  assert.equal(out.filter(a => a.verb === "view").length, 0);
});

test("orders actions chronologically and assigns sequential order", () => {
  const cls = [
    action({ index: 0, elementCaption: "E1" }),
    action({ index: 1, elementCaption: "E2" }),
    action({ index: 2, elementCaption: "E3" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 10)],
    eventTimes: [5.0, 1.0, 3.0], viewMinDurationSec: 100.0, language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.deepEqual(elements.map(e => e.description), ["E2", "E3", "E1"]);
  assert.deepEqual(elements.map(e => e.order), [0, 1, 2]);
});

test("uses the English caption for en and the Vietnamese caption for vi", () => {
  const baseArgs = {
    stepIndex: 0,
    classified: [] as ClassifiedActionRecord[],
    screenClusters: [cluster("X", 0, 10)],
    eventTimes: [] as number[],
    viewMinDurationSec: 4.0,
  };
  const en = buildActionsForStep({ ...baseArgs, language: "en" });
  const vi = buildActionsForStep({ ...baseArgs, language: "vi" });
  assert.equal(en[0].verb === "view" && en[0].description.includes("Review"), true);
  assert.equal(vi[0].verb === "view" && vi[0].description.includes("màn hình"), true);
});

test("emitted actions carry no highlight field (the highlight pass fills it later)", () => {
  const out = buildActionsForStep({
    stepIndex: 0, classified: [action({ index: 0 })], screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0], viewMinDurationSec: 4.0, language: "en",
  });
  assert.equal(out[0].highlight, undefined);
});
