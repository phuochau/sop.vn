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
        category: "Other", language: "vi",
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
        category: "Other", language: "vi",
      }));
    }
  );
  await cleanup();
});
