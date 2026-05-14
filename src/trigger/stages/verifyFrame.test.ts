import { test } from "node:test";
import assert from "node:assert";
import { runVerifyWithFallback, type VerifierFn } from "./verifyFrame";

const intent = "Click the Sign up button.";
const reasoning = "frame B shows a Sign up button";

test("runVerifyWithFallback returns yes on first call", async () => {
  let calls = 0;
  const verifier: VerifierFn = async () => {
    calls++;
    return { match: "yes", reasoning: "matches" };
  };
  const out = await runVerifyWithFallback({
    intent, verb: "click", pickedFramePath: "/picked.jpg", runnerUpFramePath: "/runner.jpg",
    pickerReasoning: reasoning, language: "en", verifier,
  });
  assert.equal(out.verify.match, "yes");
  assert.equal(out.finalFramePath, "/picked.jpg");
  assert.equal(calls, 1);
});

test("runVerifyWithFallback returns partially without retry", async () => {
  let calls = 0;
  const verifier: VerifierFn = async () => {
    calls++;
    return { match: "partially", reasoning: "screen right, element unclear" };
  };
  const out = await runVerifyWithFallback({
    intent, verb: "click", pickedFramePath: "/picked.jpg", runnerUpFramePath: "/runner.jpg",
    pickerReasoning: reasoning, language: "en", verifier,
  });
  assert.equal(out.verify.match, "partially");
  assert.equal(out.finalFramePath, "/picked.jpg");
  assert.equal(calls, 1);
});

test("runVerifyWithFallback retries runner-up on no", async () => {
  let calls = 0;
  const calledWith: string[] = [];
  const verifier: VerifierFn = async ({ framePath }) => {
    calls++;
    calledWith.push(framePath);
    if (framePath === "/picked.jpg") return { match: "no", reasoning: "wrong screen" };
    return { match: "yes", reasoning: "runner-up matches" };
  };
  const out = await runVerifyWithFallback({
    intent, verb: "click", pickedFramePath: "/picked.jpg", runnerUpFramePath: "/runner.jpg",
    pickerReasoning: reasoning, language: "en", verifier,
  });
  assert.equal(out.verify.match, "yes");
  assert.equal(out.finalFramePath, "/runner.jpg");
  assert.equal(calls, 2);
  assert.deepEqual(calledWith, ["/picked.jpg", "/runner.jpg"]);
});

test("runVerifyWithFallback returns no with null finalFramePath when no runner-up and verify says no", async () => {
  const verifier: VerifierFn = async () => ({ match: "no", reasoning: "wrong" });
  const out = await runVerifyWithFallback({
    intent, verb: "click", pickedFramePath: "/picked.jpg", runnerUpFramePath: null,
    pickerReasoning: reasoning, language: "en", verifier,
  });
  assert.equal(out.verify.match, "no");
  assert.equal(out.finalFramePath, null);
});

test("runVerifyWithFallback returns no when runner-up also fails", async () => {
  const verifier: VerifierFn = async () => ({ match: "no", reasoning: "wrong" });
  const out = await runVerifyWithFallback({
    intent, verb: "click", pickedFramePath: "/picked.jpg", runnerUpFramePath: "/runner.jpg",
    pickerReasoning: reasoning, language: "en", verifier,
  });
  assert.equal(out.verify.match, "no");
  assert.equal(out.finalFramePath, null);
});

test("verifier receives pickerReasoning in arguments", async () => {
  let captured: string | undefined;
  const verifier: VerifierFn = async (args) => {
    captured = args.pickerReasoning;
    return { match: "yes", reasoning: "ok" };
  };
  await runVerifyWithFallback({
    intent, verb: "click", pickedFramePath: "/picked.jpg", runnerUpFramePath: null,
    pickerReasoning: "the rationale", language: "en", verifier,
  });
  assert.equal(captured, "the rationale");
});
