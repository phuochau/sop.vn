import { test } from "node:test";
import assert from "node:assert";
import {
  HighlightDecision,
  AutomationFields,
  ClassifiedCandidate,
  verbToAutomationAction,
  VideoAnalysisOutput,
  OutputFormatChoice,
} from "./schemas";

test("HighlightDecision accepts a point", () => {
  const parsed = HighlightDecision.parse({
    highlight: "yes",
    point: { x: 0.5, y: 0.4 },
    bbox: null,
    noHighlightReason: null,
  });
  assert.deepEqual(parsed.point, { x: 0.5, y: 0.4 });
});

test("HighlightDecision allows point to be omitted (optional key)", () => {
  const parsed = HighlightDecision.parse({
    highlight: "no",
    bbox: null,
    noHighlightReason: "view_action",
  });
  assert.equal(parsed.point ?? null, null);
});

test("HighlightDecision accepts the grounding_unavailable reason", () => {
  const parsed = HighlightDecision.parse({
    highlight: "no",
    point: null,
    bbox: null,
    noHighlightReason: "grounding_unavailable",
  });
  assert.equal(parsed.noHighlightReason, "grounding_unavailable");
});

test("AutomationFields parses a full object", () => {
  const parsed = AutomationFields.parse({
    target: { text: "Save", role: "button", location: "top-right toolbar" },
    inputValue: { field: "email", valueType: "email", example: "j***@***.com" },
    expectedOutcome: "the contact form opens",
  });
  assert.equal(parsed.target.role, "button");
  assert.equal(parsed.inputValue?.valueType, "email");
});

test("AutomationFields allows inputValue and expectedOutcome to be omitted", () => {
  const parsed = AutomationFields.parse({
    target: { text: "Companies", role: "link", location: "left sidebar" },
  });
  assert.equal(parsed.inputValue ?? null, null);
  assert.equal(parsed.expectedOutcome ?? null, null);
});

test("verbToAutomationAction maps each actionable verb", () => {
  assert.equal(verbToAutomationAction("click"), "click");
  assert.equal(verbToAutomationAction("input"), "type");
  assert.equal(verbToAutomationAction("select"), "select");
  assert.equal(verbToAutomationAction("link"), "navigate");
});

test("ClassifiedCandidate accepts automation and allows it to be absent", () => {
  const withAuto = ClassifiedCandidate.parse({
    index: 0, decision: "action", verb: "click",
    screenName: "x", elementCaption: "Save button", displayFrameIndex: 0,
    discardReason: null,
    automation: { target: { text: "Save", role: "button", location: "toolbar" } },
  });
  assert.ok(withAuto.automation);
  const without = ClassifiedCandidate.parse({
    index: 1, decision: "discard", verb: null,
    screenName: null, elementCaption: null, displayFrameIndex: null,
    discardReason: "hover",
  });
  assert.equal(without.automation ?? null, null);
});

test("VideoAnalysisOutput parses appType physical with a valid industry", () => {
  const parsed = VideoAnalysisOutput.parse({
    appUIFrameCount: 0,
    totalFrames: 12,
    appType: "physical",
    industry: "manufacturing",
    category: "Assembly line",
    domainSummary: "A worker assembles a part.",
  });
  assert.equal(parsed.appType, "physical");
  assert.equal(parsed.industry, "manufacturing");
});

test("VideoAnalysisOutput rejects an industry outside the enum", () => {
  assert.throws(() =>
    VideoAnalysisOutput.parse({
      appUIFrameCount: 5, totalFrames: 10, appType: "web",
      industry: "banking", category: "x", domainSummary: "y",
    }),
  );
});

test("VideoAnalysisOutput rejects an appType outside the 5-value enum", () => {
  assert.throws(() =>
    VideoAnalysisOutput.parse({
      appUIFrameCount: 5, totalFrames: 10, appType: "game",
      industry: "retail", category: "x", domainSummary: "y",
    }),
  );
});

test("OutputFormatChoice accepts auto, screenshots, clips", () => {
  assert.equal(OutputFormatChoice.parse("auto"), "auto");
  assert.equal(OutputFormatChoice.parse("screenshots"), "screenshots");
  assert.equal(OutputFormatChoice.parse("clips"), "clips");
});

test("OutputFormatChoice rejects unknown values", () => {
  assert.throws(() => OutputFormatChoice.parse("video"));
});
