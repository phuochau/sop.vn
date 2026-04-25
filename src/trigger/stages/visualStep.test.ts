import { test } from "node:test";
import assert from "node:assert";

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff]);

async function withStubbedFetch(payload: unknown, fn: () => Promise<void>): Promise<{ capturedBody: unknown }> {
  let capturedBody: unknown = null;
  const original = global.fetch;
  global.fetch = (async (_url: string, init?: { body?: string }) => {
    capturedBody = JSON.parse(init?.body ?? "{}");
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
      text: async () => "",
    };
  }) as unknown as typeof fetch;
  try { await fn(); return { capturedBody }; }
  finally { global.fetch = original; }
}

test("runVisualStep returns parsed StepRewrite when given image buffers", async () => {
  const { capturedBody } = await withStubbedFetch(
    {
      prose: "Trộn thịt với gia vị.",
      subBullets: ["Thái thịt", "Thêm tỏi", "Ướp 10 phút"],
      callouts: [{ kind: "tip", text: "Nên dùng thịt thăn." }],
    },
    async () => {
      const { runVisualStep } = await import("./visualStep");
      const out = await runVisualStep({
        step: { title: "Ướp thịt", description: "Ướp thịt bò.", startTime: 0, endTime: 30 },
        imageBuffers: [JPEG_HEADER, JPEG_HEADER, JPEG_HEADER],
        prevTitle: null,
        category: "Vietnamese stir-fry cooking",
        domainSummary: "Stir-fried beef with onions.",
        language: "vi",
      });
      assert.equal(out.prose, "Trộn thịt với gia vị.");
      assert.equal(out.subBullets.length, 3);
      assert.equal(out.callouts[0].kind, "tip");
    }
  );
  const body = capturedBody as { messages: { content: string | { type: string; text?: string }[] }[] };
  const userMsg = body.messages.find(m => Array.isArray(m.content));
  const textPart = (userMsg!.content as { type: string; text?: string }[]).find(p => p.type === "text");
  const text = textPart?.text ?? "";
  assert.ok(text.includes("Ướp thịt"), `prompt should include step title — got: ${text}`);
  assert.ok(text.includes("Vietnamese stir-fry cooking"), `prompt should include category — got: ${text}`);
  assert.ok(text.includes("Stir-fried beef"), `prompt should include domainSummary — got: ${text}`);
});

test("runVisualStep includes prevTitle when provided", async () => {
  const { capturedBody } = await withStubbedFetch(
    { prose: "x", subBullets: [], callouts: [] },
    async () => {
      const { runVisualStep } = await import("./visualStep");
      await runVisualStep({
        step: { title: "Bước 2", description: "d", startTime: 30, endTime: 60 },
        imageBuffers: [JPEG_HEADER],
        prevTitle: "Bước 1: Ướp thịt",
        category: "x", domainSummary: "y", language: "vi",
      });
    }
  );
  const body = capturedBody as { messages: { content: string | { type: string; text?: string }[] }[] };
  const userMsg = body.messages.find(m => Array.isArray(m.content));
  const textPart = (userMsg!.content as { type: string; text?: string }[]).find(p => p.type === "text");
  const text = textPart?.text ?? "";
  assert.ok(text.includes("Bước 1: Ướp thịt"), `prompt should include prevTitle — got: ${text}`);
});

test("runVisualStep short-circuits to fallback when imageBuffers is empty (no LLM call)", async () => {
  let calls = 0;
  const original = global.fetch;
  global.fetch = (async () => { calls++; throw new Error("should not be called"); }) as unknown as typeof fetch;
  try {
    const { runVisualStep } = await import("./visualStep");
    const out = await runVisualStep({
      step: { title: "Bước trống", description: "Mô tả gốc.", startTime: 0, endTime: 10 },
      imageBuffers: [],
      prevTitle: null,
      category: "x", domainSummary: "y", language: "vi",
    });
    assert.equal(out.prose, "Mô tả gốc.");
    assert.deepEqual(out.subBullets, []);
    assert.deepEqual(out.callouts, []);
    assert.equal(calls, 0);
  } finally {
    global.fetch = original;
  }
});
