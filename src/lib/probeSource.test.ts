import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { probeSourceFile } from "./probeSource";

// Reuse a small real sample from samples/ — no fixture commit needed.
const FIXTURE = path.join(process.cwd(), "samples/trimmed-hubspot_crm.mp4");

test("probeSourceFile returns full metadata for an mp4", async () => {
  const meta = await probeSourceFile(FIXTURE);
  assert.equal(meta.ext, "mp4");
  assert.equal(meta.mime, "video/mp4");
  assert.ok(meta.sizeBytes > 0);
  assert.ok(meta.width > 0);
  assert.ok(meta.height > 0);
  assert.ok(meta.durationSec > 0);
  assert.ok(meta.fps > 0);
  assert.ok(meta.codec.length > 0);
});
