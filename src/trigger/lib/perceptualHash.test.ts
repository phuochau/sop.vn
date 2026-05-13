import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { dHash, hammingDistance, downscaleToMaxEdge } from "./perceptualHash";

async function makeSolidJpeg(rgb: [number, number, number], size = 64): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "phash-test-"));
  const out = path.join(dir, `solid-${rgb.join("-")}.jpg`);
  await sharp({
    create: { width: size, height: size, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } },
  }).jpeg().toFile(out);
  return out;
}

test("dHash returns a 16-char hex string (64 bits)", async () => {
  const p = await makeSolidJpeg([128, 128, 128]);
  const h = await dHash(p);
  assert.equal(typeof h, "string");
  assert.equal(h.length, 16);
  assert.match(h, /^[0-9a-f]{16}$/);
});

test("hammingDistance between two identical hashes is 0", () => {
  assert.equal(hammingDistance("ffffffffffffffff", "ffffffffffffffff"), 0);
});

test("hammingDistance between all-ones and all-zeros is 64", () => {
  assert.equal(hammingDistance("ffffffffffffffff", "0000000000000000"), 64);
});

test("dHash of differing images is further apart than identical images", async () => {
  const a1 = await dHash(await makeSolidJpeg([10, 10, 10]));
  const a2 = await dHash(await makeSolidJpeg([10, 10, 10]));
  // Make a striped image so its dHash bits actually differ from a flat one
  const striped = await (async () => {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "phash-test-striped-"));
    const out = path.join(dir, "striped.jpg");
    const width = 64, height = 64;
    const raw = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = x < width / 2 ? 0 : 255;
        const i = (y * width + x) * 3;
        raw[i] = v; raw[i + 1] = v; raw[i + 2] = v;
      }
    }
    await sharp(raw, { raw: { width, height, channels: 3 } }).jpeg().toFile(out);
    return out;
  })();
  const b = await dHash(striped);
  const distIdentical = hammingDistance(a1, a2);
  const distDiffer = hammingDistance(a1, b);
  assert.ok(distDiffer > distIdentical, `expected differing > identical, got ${distDiffer} > ${distIdentical}`);
});

test("downscaleToMaxEdge shrinks an oversized image", async () => {
  const big = await makeSolidJpeg([0, 0, 0], 2000);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "phash-ds-"));
  const out = path.join(tmpDir, "ds.jpg");
  await downscaleToMaxEdge(big, out, 1280);
  const meta = await sharp(out).metadata();
  assert.ok(meta.width! <= 1280 && meta.height! <= 1280, `expected <=1280px edge, got ${meta.width}x${meta.height}`);
});

test("downscaleToMaxEdge leaves a small image unchanged in dimensions", async () => {
  const small = await makeSolidJpeg([0, 0, 0], 500);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "phash-nods-"));
  const out = path.join(tmpDir, "nods.jpg");
  await downscaleToMaxEdge(small, out, 1280);
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, 500);
  assert.equal(meta.height, 500);
});
