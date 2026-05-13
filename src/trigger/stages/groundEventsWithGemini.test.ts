import { test } from "node:test";
import assert from "node:assert";
import { runGroundEventsWithGemini } from "./groundEventsWithGemini";
import type { RawEvent } from "./classifyAndMergeEvents";

function rev(o: Partial<RawEvent> = {}): RawEvent {
  return {
    time: 1.0,
    bbox: { x: 0.4, y: 0.4, w: 0.1, h: 0.05 },
    beforeFramePath: "/before.jpg",
    afterFramePath: "/after.jpg",
    area: 100,
    density: 0.5,
    kindHint: "click",
    ...o,
  };
}

test("groundEvents calls injected groundOne per event and returns mapped output", async () => {
  let calls = 0;
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, [rev({ time: 1 }), rev({ time: 2 })]]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async (e) => {
      calls++;
      return {
        time: e.time,
        bbox: { x: 0.5, y: 0.5, w: 0.1, h: 0.05 },
        displayFramePath: e.beforeFramePath,
        kind: "click",
        caption: `c${e.time}`,
      };
    },
  });
  assert.equal(calls, 2);
  const list = out.get(0)!;
  assert.equal(list.length, 2);
  assert.equal(list[0].caption, "c1");
});

test("groundEvents falls back to raw diff bbox when groundOne returns null", async () => {
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, [rev({ bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 }, kindHint: "input" })]]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async () => null,
  });
  const e = out.get(0)![0];
  assert.deepEqual(e.bbox, { x: 0.1, y: 0.1, w: 0.2, h: 0.1 });
  assert.equal(e.caption, null);
  assert.equal(e.kind, "input");
});

test("groundEvents picks AFTER frame for input events on fallback", async () => {
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, [rev({ kindHint: "input" })]]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async () => null,
  });
  assert.equal(out.get(0)![0].displayFramePath, "/after.jpg");
});

test("groundEvents picks BEFORE frame for click events on fallback", async () => {
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, [rev({ kindHint: "click" })]]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async () => null,
  });
  assert.equal(out.get(0)![0].displayFramePath, "/before.jpg");
});

test("groundEvents respects concurrency limit", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const events = Array.from({ length: 12 }, (_, i) => rev({ time: i }));
  await runGroundEventsWithGemini({
    byStep: new Map([[0, events]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    concurrency: 3,
    groundOne: async (e) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(r => setTimeout(r, 10));
      inFlight--;
      return {
        time: e.time,
        bbox: e.bbox,
        displayFramePath: e.beforeFramePath,
        kind: "click",
        caption: null,
      };
    },
  });
  assert.ok(maxInFlight <= 3, `maxInFlight ${maxInFlight} exceeded 3`);
});

test("groundEvents preserves event order within a step", async () => {
  const events = [rev({ time: 1 }), rev({ time: 2 }), rev({ time: 3 })];
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, events]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async (e) => ({
      time: e.time,
      bbox: e.bbox,
      displayFramePath: e.beforeFramePath,
      kind: "click",
      caption: null,
    }),
  });
  const list = out.get(0)!;
  assert.equal(list[0].time, 1);
  assert.equal(list[1].time, 2);
  assert.equal(list[2].time, 3);
});
