import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";

test("runVisualOverview against a real fixture (skipped if missing)", async (t) => {
  const fixture = path.resolve("samples/4_no_speech.mp4");
  if (!fs.existsSync(fixture)) {
    t.skip("samples/4_no_speech.mp4 missing");
    return;
  }

  // Sample frames across a 5-sec range — well within the fixture's actual
  // length (~157 s, verified via ffprobe), so sampleFrames won't seek past EOF.
  // Frames span this range only, not the full video; that's acceptable for a
  // unit test that mocks the LLM response.
  const durationSec = 5;

  let capturedBody: { messages: { content: string | { type: string; text?: string }[] }[] } | null = null;
  const originalFetch = global.fetch;
  global.fetch = (async (_url: string, init?: { body?: string }) => {
    capturedBody = JSON.parse(init?.body ?? "{}");
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          purpose: "Hướng dẫn món Bò lúc lắc.",
          audience: "Đầu bếp tập sự.",
          prerequisites: ["Bếp gas", "Chảo gang"],
          toolsMaterials: ["Thịt bò", "Hành tây", "Tỏi"],
          estimatedDuration: "~15 phút",
        }) } }],
      }),
      text: async () => "",
    };
  }) as unknown as typeof fetch;

  try {
    const { runVisualOverview } = await import("./visualOverview");
    const out = await runVisualOverview({
      srcPath: fixture,
      durationSec,
      title: "Bò lúc lắc",
      category: "Vietnamese stir-fry cooking",
      domainSummary: "Stir-fried beef with onions, a Vietnamese classic.",
      stepTitles: ["Ướp thịt", "Phi tỏi", "Xào thịt"],
      language: "vi",
    });
    assert.equal(out.purpose.length > 0, true);
    assert.equal(out.toolsMaterials.length, 3);

    const body = capturedBody as unknown as { messages: { content: string | { type: string; text?: string }[] }[] };
    const userMsg = body.messages.find(m => Array.isArray(m.content));
    assert.ok(userMsg, "user message missing");
    const textPart = (userMsg!.content as { type: string; text?: string }[]).find(p => p.type === "text");
    const text = textPart?.text ?? "";
    assert.ok(text.includes("Vietnamese stir-fry cooking"), `prompt should include category — got: ${text}`);
    assert.ok(text.includes("Stir-fried beef"), `prompt should include domainSummary — got: ${text}`);
    assert.ok(text.includes("Ướp thịt"), `prompt should include step titles — got: ${text}`);
    const sysMsg = body.messages.find(m => typeof m.content === "string");
    assert.ok(((sysMsg?.content as string) ?? "").includes("vi"), "system prompt should include language");
  } finally {
    global.fetch = originalFetch;
  }
});
