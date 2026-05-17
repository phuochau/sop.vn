import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { markRegion } from "./markRegion";

const FIXTURE = path.join(__dirname, "../stages/__fixtures__/sample-1080p.jpg");

test("markRegion writes a valid JPEG with the same pixel dimensions as the input", async () => {
  const src = await sharp(FIXTURE).metadata();
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "markregion-"));
  try {
    const outPath = path.join(tmpDir, "marked.jpg");
    await markRegion(FIXTURE, { x: 0.3, y: 0.4, w: 0.2, h: 0.15 }, outPath);
    assert.ok(fs.existsSync(outPath), "output file exists");
    const out = await sharp(outPath).metadata();
    assert.equal(out.format, "jpeg");
    assert.equal(out.width, src.width);
    assert.equal(out.height, src.height);
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
});

test("markRegion handles a bbox touching the frame edge without throwing", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "markregion-"));
  try {
    const outPath = path.join(tmpDir, "edge.jpg");
    await markRegion(FIXTURE, { x: 0.0, y: 0.0, w: 0.1, h: 0.1 }, outPath);
    assert.ok(fs.existsSync(outPath));
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
});
