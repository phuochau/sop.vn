import { test } from "node:test";
import assert from "node:assert";
import { parseUiTarsReply, qwenToPoint, uiTarsPoint, qwenPoint } from "./grounding";

const FIXTURE = "src/trigger/stages/__fixtures__/sample-1080p.jpg";

test("parseUiTarsReply normalizes absolute pixels to 0-1", () => {
  assert.deepEqual(parseUiTarsReply("(960,540)", 1920, 1080), { x: 0.5, y: 0.5 });
});

test("parseUiTarsReply clamps out-of-range coordinates", () => {
  assert.deepEqual(parseUiTarsReply("(2000,-50)", 1920, 1080), { x: 1, y: 0 });
});

test("parseUiTarsReply returns null when no coordinates present", () => {
  assert.equal(parseUiTarsReply("I cannot find it", 1920, 1080), null);
});

test("parseUiTarsReply ignores numeric prose before the coordinate tuple", () => {
  assert.deepEqual(parseUiTarsReply("Step 3: click at (480,270)", 960, 540), { x: 0.5, y: 0.5 });
});

test("qwenToPoint converts a 0-1000 reply to a 0-1 point", () => {
  assert.deepEqual(qwenToPoint({ found: "yes", x: 500, y: 250 }), { x: 0.5, y: 0.25 });
});

test("qwenToPoint returns null when found=no", () => {
  assert.equal(qwenToPoint({ found: "no", x: null, y: null }), null);
});

test("uiTarsPoint parses an injected fetch response", async () => {
  const fakeFetch = (async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: "(480,270)" } }] }),
  })) as unknown as typeof fetch;
  const r = await uiTarsPoint({
    framePath: FIXTURE, intent: "Click Save", verb: "click",
    frameW: 960, frameH: 540, model: "test/model", fetcher: fakeFetch,
  });
  assert.deepEqual(r.point, { x: 0.5, y: 0.5 });
});

test("qwenPoint maps an injected vision response", async () => {
  const fakeVision = (async () => ({ found: "yes", x: 250, y: 750 })) as unknown as typeof import("@/lib/openrouter").llmJsonVision;
  const r = await qwenPoint({
    framePath: FIXTURE, intent: "Click Save", verb: "click",
    model: "test/model", visionFn: fakeVision,
  });
  assert.deepEqual(r.point, { x: 0.25, y: 0.75 });
});
