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
      { t: start, localPath: repPath },
      { t: end, localPath: repPath },
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

test("buildActionsForStep drops discards including those with null discardReason", () => {
  const cls = [
    action({ index: 0 }),
    action({ index: 1, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, bbox: null, displayFrame: null, discardReason: "hover", fullFrameBbox: null }),
    action({ index: 2, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, bbox: null, displayFrame: null, discardReason: null, fullFrameBbox: null }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 1.5, 2.0],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  assert.equal(out.filter(a => a.verb !== "view").length, 1);
});

test("buildActionsForStep dedupes same (screenName, elementId) keeping latest", () => {
  const cls = [
    action({ index: 0, elementCaption: "Get started free button" }),
    action({ index: 1, elementCaption: "Get started free" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 3)],
    eventTimes: [46.0, 47.5],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].time, 47.5);
});

test("buildActionsForStep verb-collapse rule: input wins over click", () => {
  const cls = [
    action({ index: 0, verb: "click", elementCaption: "Email field" }),
    action({ index: 1, verb: "input", elementCaption: "Email field" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 2.0],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].verb, "input");
});

test("buildActionsForStep unifies cluster letters when screenName matches case-insensitively", () => {
  const cls = [
    action({ index: 0, screenCluster: "A", screenName: "Check Your Email", elementCaption: "code input" }),
    action({ index: 1, screenCluster: "B", screenName: "check your email", elementCaption: "Next button" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 3), cluster("B", 3, 6)],
    eventTimes: [1.0, 4.0],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 2);
  assert.equal(elements[0].screenId, elements[1].screenId);
});

test("buildActionsForStep emits View when cluster persists >= threshold with zero overlapping actions", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [
      action({ index: 0, screenCluster: "A", screenName: "Page A" }),
    ],
    screenClusters: [
      cluster("A", 0, 1),
      cluster("B", 10, 20, "/rep-b.jpg"),
    ],
    eventTimes: [0.5],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  const views = out.filter(a => a.verb === "view");
  assert.equal(views.length, 1);
  assert.equal(views[0].time, 15);
});

test("buildActionsForStep does NOT emit View when an action's time overlaps the cluster's span", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [
      action({ index: 0, screenCluster: "B", screenName: "Page B" }),
    ],
    screenClusters: [
      cluster("B", 10, 20),
    ],
    eventTimes: [15],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  assert.equal(out.filter(a => a.verb === "view").length, 0);
});

test("buildActionsForStep orders actions chronologically", () => {
  const cls = [
    action({ index: 0, elementCaption: "E1" }),
    action({ index: 1, elementCaption: "E2" }),
    action({ index: 2, elementCaption: "E3" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 10)],
    eventTimes: [5.0, 1.0, 3.0],
    viewMinDurationSec: 100.0,
    language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.deepEqual(elements.map(e => e.elementCaption), ["E2", "E3", "E1"]);
});

test("buildActionsForStep uses English caption for en, Vietnamese for vi", () => {
  const baseArgs = {
    stepIndex: 0,
    classified: [] as ClassifiedActionRecord[],
    screenClusters: [cluster("X", 0, 10)],
    eventTimes: [] as number[],
    viewMinDurationSec: 4.0,
  };
  const en = buildActionsForStep({ ...baseArgs, language: "en" });
  const vi = buildActionsForStep({ ...baseArgs, language: "vi" });
  assert.equal(en[0].verb === "view" && en[0].caption.includes("Review"), true);
  assert.equal(vi[0].verb === "view" && vi[0].caption.includes("màn hình"), true);
});
