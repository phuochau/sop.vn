import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import sharp from "sharp";
import { buildScreenClusters, type DensePoolFrame } from "./screenId";

/**
 * Generate a frame with a distinctive light/dark pattern.
 * dHash compares adjacent pixels, so a uniform-color image hashes to all zeros
 * (every left>=right). We composite a contrasting block at `blockX` so the
 * hash varies with position.
 */
async function makeFrame(tmp: string, name: string, blockX: 0 | 1): Promise<string> {
  const p = path.join(tmp, name);
  const W = 320, H = 200, blockW = 80, blockH = 80;
  const left = blockX === 0 ? 20 : W - blockW - 20;
  const top = (H - blockH) / 2;
  const blockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${blockW}" height="${blockH}">
    <rect width="${blockW}" height="${blockH}" fill="#fff"/>
  </svg>`;
  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .composite([{ input: Buffer.from(blockSvg), top, left }])
    .jpeg()
    .toFile(p);
  return p;
}

test("buildScreenClusters groups visually-similar frames into one cluster", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sid-"));
  try {
    const fA1 = await makeFrame(tmp, "a1.jpg", 0);
    const fA2 = await makeFrame(tmp, "a2.jpg", 0);
    const fB = await makeFrame(tmp, "b.jpg", 1);

    const dense: DensePoolFrame[] = [
      { t: 0.0, localPath: fA1 },
      { t: 1.5, localPath: fA2 },
      { t: 3.0, localPath: fB },
    ];

    const clusters = await buildScreenClusters({
      denseFrames: dense,
      stepStart: 0,
      stepEnd: 5,
      samplingSec: 1.5,
      hammingThreshold: 10,
    });

    assert.equal(clusters.length, 2);
    const cA = clusters.find(c => c.members.length === 2);
    const cB = clusters.find(c => c.members.length === 1);
    assert.ok(cA);
    assert.ok(cB);
    assert.equal(cA!.letter, "A");
    assert.equal(cB!.letter, "B");
    assert.equal(cA!.timeSpan.start, 0.0);
    assert.equal(cA!.timeSpan.end, 1.5);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("buildScreenClusters samples only every samplingSec interval", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sid-"));
  try {
    const f = await makeFrame(tmp, "f.jpg", 0);
    const dense: DensePoolFrame[] = [
      { t: 0.0, localPath: f },
      { t: 0.5, localPath: f },
      { t: 1.0, localPath: f },
      { t: 1.5, localPath: f },
      { t: 2.0, localPath: f },
      { t: 3.0, localPath: f },
    ];
    const clusters = await buildScreenClusters({
      denseFrames: dense,
      stepStart: 0,
      stepEnd: 5,
      samplingSec: 1.5,
      hammingThreshold: 10,
    });
    // Sampled times: 0.0, 1.5, 3.0 → 3 members in one cluster.
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].members.length, 3);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("buildScreenClusters returns empty when no dense frames in step range", async () => {
  const clusters = await buildScreenClusters({
    denseFrames: [],
    stepStart: 0,
    stepEnd: 5,
    samplingSec: 1.5,
    hammingThreshold: 10,
  });
  assert.equal(clusters.length, 0);
});
