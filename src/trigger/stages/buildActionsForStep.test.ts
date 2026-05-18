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
    elementCaption: "Sign in button",
    displayFrameIndex: 0,
    discardReason: null,
    displayFramePath: "/frame.jpg",
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
    action({ index: 1, decision: "discard", verb: null, screenName: null, elementCaption: null, displayFrameIndex: null, displayFramePath: "", discardReason: "hover" }),
    action({ index: 2, decision: "discard", verb: null, screenName: null, elementCaption: null, displayFrameIndex: null, displayFramePath: "", discardReason: null }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 1.5, 2.0], viewMinDurationSec: 4.0, language: "en",
  });
  assert.equal(out.filter(a => a.verb !== "view").length, 1);
});

test("dedupes same-element events within the window, keeping the earliest", () => {
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
  assert.equal(elements[0].time, 46.0);
});

test("same-element events collapse step-wide regardless of time gap", () => {
  const cls = [
    action({ index: 0, elementCaption: "Next button" }),
    action({ index: 1, elementCaption: "Next button" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 30)],
    eventTimes: [5.0, 20.0], viewMinDurationSec: 100.0, language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].time, 5.0);
});

test("element actions carry screenName and elementCaption; view actions carry empty strings", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({ index: 0, screenName: "Login page", elementCaption: "Sign in button" })],
    screenClusters: [cluster("A", 0, 1), cluster("B", 10, 20, "/rep-b.jpg")],
    eventTimes: [0.5], viewMinDurationSec: 4.0, language: "en",
  });
  const element = out.find(a => a.verb !== "view")!;
  const view = out.find(a => a.verb === "view")!;
  assert.equal(element.screenName, "Login page");
  assert.equal(element.elementCaption, "Sign in button");
  assert.equal(view.screenName, "");
  assert.equal(view.elementCaption, "");
});

test("same-element events on different screens are NOT collapsed even within the window", () => {
  const cls = [
    action({ index: 0, screenName: "Question one", elementCaption: "Skip button" }),
    action({ index: 1, screenName: "Question two", elementCaption: "Skip button" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 10)],
    eventTimes: [1.0, 2.0], viewMinDurationSec: 100.0, language: "en",
  });
  assert.equal(out.filter(a => a.verb !== "view").length, 2);
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

test("buildActionsForStep attaches automation with action derived from verb", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({
      index: 0, verb: "click",
      automation: { target: { text: "Save", role: "button", location: "toolbar" } },
    })],
    screenClusters: [],
    eventTimes: [5],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].automation?.action, "click");
  assert.equal(out[0].automation?.target.text, "Save");
});

test("buildActionsForStep sources automation from the input record when a group is promoted to input", () => {
  // Same (screen, element) key -> one group. The earlier click record anchors,
  // the input record follows; the group's effective verb becomes "input".
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [
      action({
        index: 0, verb: "click", screenName: "form", elementCaption: "Email field",
        automation: { target: { text: "Email", role: "textbox", location: "form" } },
      }),
      action({
        index: 1, verb: "input", screenName: "form", elementCaption: "Email field",
        automation: {
          target: { text: "Email", role: "textbox", location: "form" },
          inputValue: { field: "email", valueType: "email", example: "j***@***.com" },
        },
      }),
    ],
    screenClusters: [],
    eventTimes: [1, 2],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].verb, "input");
  assert.equal(out[0].automation?.action, "type");
  assert.equal(out[0].automation?.inputValue?.example, "j***@***.com");
});

test("buildActionsForStep view actions have no automation", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [],
    screenClusters: [cluster("A", 0, 10)],
    eventTimes: [],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].verb, "view");
  assert.equal(out[0].automation ?? null, null);
});

test("buildActionsForStep omits automation when the record has none", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({ index: 0, verb: "click" })],
    screenClusters: [],
    eventTimes: [5],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].automation ?? null, null);
});

test("buildActionsForStep keeps inputValue for a select action", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({
      index: 0, verb: "select",
      automation: {
        target: { text: "Country", role: "dropdown", location: "signup form" },
        inputValue: { field: "country", valueType: "selection", example: "Vietnam" },
      },
    })],
    screenClusters: [],
    eventTimes: [5],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].automation?.action, "select");
  assert.equal(out[0].automation?.inputValue?.example, "Vietnam");
});
