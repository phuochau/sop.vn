import { test } from "node:test";
import assert from "node:assert";
import { traceEnabled, makeTrace } from "./pipelineTrace";

test("traceEnabled is false when SOP_PIPELINE_DEBUG is unset", () => {
  delete process.env.SOP_PIPELINE_DEBUG;
  assert.equal(traceEnabled(), false);
});

test("traceEnabled is true when SOP_PIPELINE_DEBUG === '1'", () => {
  process.env.SOP_PIPELINE_DEBUG = "1";
  try {
    assert.equal(traceEnabled(), true);
  } finally {
    delete process.env.SOP_PIPELINE_DEBUG;
  }
});

test("traceEnabled is false when SOP_PIPELINE_DEBUG === 'false' or other strings", () => {
  for (const v of ["false", "0", "yes", "no", ""]) {
    process.env.SOP_PIPELINE_DEBUG = v;
    try {
      assert.equal(traceEnabled(), false, `value ${JSON.stringify(v)} should be false`);
    } finally {
      delete process.env.SOP_PIPELINE_DEBUG;
    }
  }
});

test("makeTrace returns a well-formed doc shape for a happy-path entry", () => {
  const doc = makeTrace({
    sopId: "abc",
    stepIndex: 2,
    intent: "Click Sign up.",
    pickedLetter: "B",
    runnerUpLetter: "A",
    pickerReasoning: "B clearly shows the Sign up button",
    verifyMatch: "yes",
    verifyReasoning: "matches",
    highlightOutcome: "yes",
    finalActionRecorded: true,
    droppedAt: "none",
  });
  assert.equal(doc.sopId, "abc");
  assert.equal(doc.stepIndex, 2);
  assert.equal(doc.pickedLetter, "B");
  assert.equal(doc.droppedAt, "none");
  assert.ok(doc.createdAt instanceof Date);
});

test("makeTrace supports drop-at-pick entries (verify/highlight skipped)", () => {
  const doc = makeTrace({
    sopId: "abc",
    stepIndex: 2,
    intent: "Click something",
    pickedLetter: null,
    runnerUpLetter: null,
    pickerReasoning: "no candidate matches",
    verifyMatch: "skipped",
    verifyReasoning: "",
    highlightOutcome: "skipped",
    finalActionRecorded: false,
    droppedAt: "pick",
  });
  assert.equal(doc.droppedAt, "pick");
  assert.equal(doc.finalActionRecorded, false);
});

test("makeTrace supports drop-at-verify entries (highlight skipped)", () => {
  const doc = makeTrace({
    sopId: "abc",
    stepIndex: 2,
    intent: "Click something",
    pickedLetter: "A",
    runnerUpLetter: null,
    pickerReasoning: "A looked right",
    verifyMatch: "no",
    verifyReasoning: "wrong screen",
    highlightOutcome: "skipped",
    finalActionRecorded: false,
    droppedAt: "verify",
  });
  assert.equal(doc.droppedAt, "verify");
  assert.equal(doc.verifyMatch, "no");
});
