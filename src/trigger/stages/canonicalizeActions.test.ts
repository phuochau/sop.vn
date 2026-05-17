import { test } from "node:test";
import assert from "node:assert";
import { canonicalizeActions } from "./canonicalizeActions";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";

function rec(over: Partial<ClassifiedActionRecord>): ClassifiedActionRecord {
  return {
    index: 0,
    decision: "action",
    verb: "click",
    screenName: "contacts",
    elementCaption: "Companies link",
    displayFrameIndex: 0,
    discardReason: null,
    displayFramePath: "/f.jpg",
    ...over,
  };
}

// A fake llmFn that records calls and returns a scripted result.
function fakeLlm(result: { actions: { index: number; screenName: string; elementCaption: string }[] }) {
  const calls: unknown[] = [];
  const fn = async (opts: unknown) => { calls.push(opts); return result; };
  return { fn, calls };
}

test("rewrites screenName/elementCaption from the LLM result, keyed by index", async () => {
  const input = [
    rec({ index: 0, elementCaption: "Companies link" }),
    rec({ index: 1, elementCaption: "companies LINK" }),
  ];
  const { fn } = fakeLlm({ actions: [
    { index: 0, screenName: "Danh bạ", elementCaption: "Liên kết Companies" },
    { index: 1, screenName: "Danh bạ", elementCaption: "Liên kết Companies" },
  ]});
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.equal(out.length, 2);
  assert.equal(out[0].elementCaption, "Liên kết Companies");
  assert.equal(out[1].elementCaption, "Liên kết Companies");
  assert.equal(out[0].screenName, "Danh bạ");
});

test("a record the LLM omits keeps its original values", async () => {
  const input = [rec({ index: 0 }), rec({ index: 1, elementCaption: "Import button" })];
  const { fn } = fakeLlm({ actions: [{ index: 0, screenName: "X", elementCaption: "Y" }] });
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.equal(out[1].elementCaption, "Import button");
});

test("an unknown index in the LLM result is ignored", async () => {
  const input = [rec({ index: 0 })];
  const { fn } = fakeLlm({ actions: [
    { index: 0, screenName: "X", elementCaption: "Y" },
    { index: 99, screenName: "Z", elementCaption: "Z" },
  ]});
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.equal(out.length, 1);
  assert.equal(out[0].elementCaption, "Y");
});

test("LLM throwing returns the input unchanged", async () => {
  const input = [rec({ index: 0, elementCaption: "Save button" })];
  const fn = async () => { throw new Error("boom"); };
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.equal(out[0].elementCaption, "Save button");
});

test("discard records pass through untouched; length/order/index preserved", async () => {
  const input = [
    rec({ index: 0, elementCaption: "Next button" }),
    rec({ index: 1, decision: "discard", verb: null, screenName: null, elementCaption: null, displayFrameIndex: null, displayFramePath: "", discardReason: "hover" }),
    rec({ index: 2, elementCaption: "Back button" }),
  ];
  const { fn } = fakeLlm({ actions: [
    { index: 0, screenName: "S", elementCaption: "Tiếp" },
    { index: 2, screenName: "S", elementCaption: "Quay lại" },
  ]});
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.deepEqual(out.map(r => r.index), [0, 1, 2]);
  assert.equal(out[1].decision, "discard");
  assert.equal(out[1].elementCaption, null);
});

test("empty / all-discard input returns input with NO LLM call", async () => {
  const allDiscard = [
    rec({ index: 0, decision: "discard", verb: null, screenName: null, elementCaption: null, displayFrameIndex: null, displayFramePath: "", discardReason: "hover" }),
  ];
  const { fn, calls } = fakeLlm({ actions: [] });
  const out1 = await canonicalizeActions({ classified: [], language: "vi", llmFn: fn });
  const out2 = await canonicalizeActions({ classified: allDiscard, language: "vi", llmFn: fn });
  assert.equal(out1.length, 0);
  assert.equal(out2.length, 1);
  assert.equal(calls.length, 0);
});
