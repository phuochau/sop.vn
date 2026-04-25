import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

async function withStubbedFetch(payload: unknown, fn: () => Promise<void>) {
  const original = global.fetch;
  global.fetch = (async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
    text: async () => "",
  })) as unknown as typeof fetch;
  try { await fn(); } finally { global.fetch = original; }
}

async function tmpJpegs(n: number): Promise<{ paths: string[]; cleanup: () => Promise<void> }> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "ve-"));
  const paths: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = path.join(dir, `f-${i}.jpg`);
    await fs.promises.writeFile(p, Buffer.from([0xff, 0xd8, 0xff]));
    paths.push(p);
  }
  return { paths, cleanup: () => fs.promises.rm(dir, { recursive: true, force: true }) };
}

test("runVisualExtract parses valid response", async () => {
  const { paths, cleanup } = await tmpJpegs(3);
  await withStubbedFetch(
    { title: "Pha espresso", steps: [{ title: "Xay", description: "Xay hạt mịn.", startTime: 0, endTime: 5 }] },
    async () => {
      const { runVisualExtract } = await import("./visualExtract");
      const out = await runVisualExtract({
        framePaths: paths,
        frameTimestamps: [1, 3, 5],
        durationSec: 6,
        category: "Coffee & Drinks",
        domainSummary: "Test domain summary",
        language: "vi",
      });
      assert.equal(out.title, "Pha espresso");
      assert.equal(out.steps.length, 1);
      assert.equal(out.steps[0].startTime, 0);
    }
  );
  await cleanup();
});

test("runVisualExtract rejects when endTime exceeds duration", async () => {
  const { paths, cleanup } = await tmpJpegs(2);
  await withStubbedFetch(
    { title: "x", steps: [{ title: "s", description: "d", startTime: 0, endTime: 999 }] },
    async () => {
      const { runVisualExtract } = await import("./visualExtract");
      await assert.rejects(() => runVisualExtract({
        framePaths: paths, frameTimestamps: [1, 2], durationSec: 5,
        category: "Other", domainSummary: "Test domain summary", language: "vi",
      }));
    }
  );
  await cleanup();
});

test("runVisualExtract rejects unsorted steps", async () => {
  const { paths, cleanup } = await tmpJpegs(2);
  await withStubbedFetch(
    {
      title: "x",
      steps: [
        { title: "a", description: "", startTime: 5, endTime: 10 },
        { title: "b", description: "", startTime: 1, endTime: 4 },
      ],
    },
    async () => {
      const { runVisualExtract } = await import("./visualExtract");
      await assert.rejects(() => runVisualExtract({
        framePaths: paths, frameTimestamps: [1, 2], durationSec: 15,
        category: "Other", domainSummary: "Test domain summary", language: "vi",
      }));
    }
  );
  await cleanup();
});

test("runVisualExtract rejects empty steps array (schema .min(1))", async () => {
  const { paths, cleanup } = await tmpJpegs(2);
  await withStubbedFetch(
    { title: "x", steps: [] },
    async () => {
      const { runVisualExtract } = await import("./visualExtract");
      await assert.rejects(() => runVisualExtract({
        framePaths: paths, frameTimestamps: [1, 2], durationSec: 5,
        category: "Other", domainSummary: "Test domain summary", language: "vi",
      }));
    }
  );
  await cleanup();
});

test("runVisualExtract user prompt includes language, durationSec, and per-frame timestamps", async () => {
  const { paths, cleanup } = await tmpJpegs(2);
  let capturedBody: { messages: { content: string | { type: string; text?: string }[] }[] } | null = null;
  const original = global.fetch;
  global.fetch = (async (_url: string, init?: { body?: string }) => {
    capturedBody = JSON.parse(init?.body ?? "{}");
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ title: "t", steps: [{ title: "s", description: "d", startTime: 0, endTime: 1 }] }) } }],
      }),
      text: async () => "",
    };
  }) as unknown as typeof fetch;
  try {
    const { runVisualExtract } = await import("./visualExtract");
    await runVisualExtract({
      framePaths: paths,
      frameTimestamps: [1.25, 3.75],
      durationSec: 5,
      category: "Coffee & Drinks",
      domainSummary: "Test domain summary",
      language: "vi",
    });
    assert.ok(capturedBody, "fetch was not called");
    const body = capturedBody as unknown as { messages: { content: string | { type: string; text?: string }[] }[] };
    const userMsg = body.messages.find((m) => Array.isArray(m.content));
    assert.ok(userMsg, "user message missing");
    const textPart = (userMsg!.content as { type: string; text?: string }[]).find(p => p.type === "text");
    const text = textPart?.text ?? "";
    assert.ok(text.includes("5.00 seconds"), `prompt should include durationSec — got: ${text}`);
    assert.ok(text.includes("Frame 1: 1.25s"), `prompt should include first frame timestamp — got: ${text}`);
    assert.ok(text.includes("Frame 2: 3.75s"), `prompt should include second frame timestamp — got: ${text}`);
    // Language appears in the system prompt, not the user prompt; confirm via the system message.
    const sysMsg = body.messages.find((m) => typeof m.content === "string");
    const sysText = (sysMsg?.content as string) ?? "";
    assert.ok(sysText.includes("vi"), `system prompt should include language — got: ${sysText}`);
  } finally {
    global.fetch = original;
    await cleanup();
  }
});

test("runVisualExtract retries on assertion failure (out-of-range timestamp)", async () => {
  const { paths, cleanup } = await tmpJpegs(2);
  let calls = 0;
  const original = global.fetch;
  global.fetch = (async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          title: "x",
          steps: [{ title: "s", description: "d", startTime: 0, endTime: 999 }],
        }) } }],
      }),
      text: async () => "",
    };
  }) as unknown as typeof fetch;
  try {
    const { runVisualExtract } = await import("./visualExtract");
    const { config } = await import("@/config");
    await assert.rejects(() => runVisualExtract({
      framePaths: paths, frameTimestamps: [1, 2], durationSec: 5,
      category: "Other", domainSummary: "Test domain summary", language: "vi",
    }));
    assert.equal(calls, config.ai.maxRetries + 1, `expected ${config.ai.maxRetries + 1} fetch calls, got ${calls}`);
  } finally {
    global.fetch = original;
    await cleanup();
  }
});
