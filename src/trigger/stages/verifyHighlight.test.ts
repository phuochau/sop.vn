import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import { verifyGroundedPoint } from "./verifyHighlight";

const okFrame = "src/trigger/stages/__fixtures__/sample-1080p.jpg";

function tmpVerifyDirs(): string[] {
  return fs.readdirSync(os.tmpdir()).filter(n => n.startsWith("highlight-verify-"));
}

test("returns true when the verifier answers yes", async () => {
  const out = await verifyGroundedPoint({
    framePath: okFrame, point: { x: 0.5, y: 0.5 }, caption: "Save button",
    model: "fake", visionFn: async () => ({ onElement: "yes" }),
  });
  assert.equal(out, true);
});

test("returns false when the verifier answers no", async () => {
  const out = await verifyGroundedPoint({
    framePath: okFrame, point: { x: 0.5, y: 0.5 }, caption: "Save button",
    model: "fake", visionFn: async () => ({ onElement: "no" }),
  });
  assert.equal(out, false);
});

test("fails open (returns true) when the verifier throws", async () => {
  const out = await verifyGroundedPoint({
    framePath: okFrame, point: { x: 0.5, y: 0.5 }, caption: "Save button",
    model: "fake", visionFn: async () => { throw new Error("verifier down"); },
  });
  assert.equal(out, true);
});

test("leaves no temp dir behind", async () => {
  const before = tmpVerifyDirs().length;
  await verifyGroundedPoint({
    framePath: okFrame, point: { x: 0.5, y: 0.5 }, caption: "Save button",
    model: "fake", visionFn: async () => ({ onElement: "yes" }),
  });
  assert.equal(tmpVerifyDirs().length, before);
});
