import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

test("runVisualContext returns parsed category + summary", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vc-"));
  const f1 = path.join(tmp, "a.jpg");
  const f2 = path.join(tmp, "b.jpg");
  await fs.promises.writeFile(f1, Buffer.from([0xff, 0xd8, 0xff]));
  await fs.promises.writeFile(f2, Buffer.from([0xff, 0xd8, 0xff]));

  const originalFetch = global.fetch;
  global.fetch = (async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ category: "Coffee & Drinks", domainSummary: "Pha cà phê espresso." }) } }],
    }),
    text: async () => "",
  })) as unknown as typeof fetch;

  try {
    const { runVisualContext } = await import("./visualContext");
    const out = await runVisualContext({ framePaths: [f1, f2], language: "vi" });
    assert.equal(out.category, "Coffee & Drinks");
    assert.ok(out.domainSummary.length > 0);
  } finally {
    global.fetch = originalFetch;
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});
