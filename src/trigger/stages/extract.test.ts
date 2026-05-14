import { test } from "node:test";
import assert from "node:assert";
import { runExtractWith, pickBetterExtraction } from "./extract";

const fixtureSegments = [
  { id: 0, text: "Hello and welcome." },
  { id: 1, text: "Today we'll create a HubSpot account." },
  { id: 2, text: "Click get started free." },
];

test("runExtractWith calls llmJson with temperature 0.0", async () => {
  let captured: number | undefined;
  const fakeCall = async (args: { temperature?: number }) => {
    captured = args.temperature;
    return { title: "T", steps: [{ title: "s1", description: "d", startSegmentId: 0, endSegmentId: 2 }] };
  };
  await runExtractWith(
    { segmentsClean: fixtureSegments, category: "c", domainSummary: "d", language: "en" },
    fakeCall,
  );
  assert.equal(captured, 0.0);
});

test("runExtractWith retries once when initial count is out of range", async () => {
  let calls = 0;
  const fakeCall = async () => {
    calls++;
    if (calls === 1) {
      return {
        title: "T",
        steps: Array.from({ length: 25 }, (_, i) => ({
          title: `s${i}`, description: "d", startSegmentId: 0, endSegmentId: 2,
        })),
      };
    }
    return {
      title: "T",
      steps: Array.from({ length: 6 }, (_, i) => ({
        title: `s${i}`, description: "d", startSegmentId: 0, endSegmentId: 2,
      })),
    };
  };
  const out = await runExtractWith(
    { segmentsClean: fixtureSegments, category: "c", domainSummary: "d", language: "en" },
    fakeCall,
  );
  assert.equal(calls, 2);
  assert.equal(out.steps.length, 6);
});

test("pickBetterExtraction prefers in-range over out-of-range", () => {
  const a = { title: "A", steps: makeSteps(2) };
  const b = { title: "B", steps: makeSteps(5) };
  assert.equal(pickBetterExtraction(a, b).title, "B");
  assert.equal(pickBetterExtraction(b, a).title, "B");
});

test("pickBetterExtraction prefers second when both in-range", () => {
  const a = { title: "A", steps: makeSteps(5) };
  const b = { title: "B", steps: makeSteps(8) };
  assert.equal(pickBetterExtraction(a, b).title, "B");
});

test("pickBetterExtraction prefers smaller count when both out of range", () => {
  const a = { title: "A", steps: makeSteps(2) };
  const b = { title: "B", steps: makeSteps(25) };
  assert.equal(pickBetterExtraction(a, b).title, "A");
});

test("pickBetterExtraction returns second on tie when both out of range", () => {
  const a = { title: "A", steps: makeSteps(2) };
  const b = { title: "B", steps: makeSteps(2) };
  assert.equal(pickBetterExtraction(a, b).title, "B");
});

function makeSteps(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    title: `s${i}`, description: "d", startSegmentId: 0, endSegmentId: 1,
  }));
}
