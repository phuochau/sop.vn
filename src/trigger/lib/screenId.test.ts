import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import sharp from "sharp";
import {
  buildScreenClusters,
  type DensePoolFrame,
} from "./screenId";

async function makeFrame(tmp: string, name: string, blockX: 0 | 1 | 2): Promise<string> {
  const p = path.join(tmp, name);
  const W = 320, H = 200, blockW = 80, blockH = 80;
  const positions = [20, W - blockW - 20, (W - blockW) / 2];
  const left = positions[blockX];
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

test("buildScreenClusters returns members with per-member dHash", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sid-"));
  try {
    const f1 = await makeFrame(tmp, "f1.jpg", 0);
    const f2 = await makeFrame(tmp, "f2.jpg", 0);
    const dense: DensePoolFrame[] = [
      { t: 0.0, localPath: f1 },
      { t: 1.5, localPath: f2 },
    ];
    const clusters = await buildScreenClusters({
      denseFrames: dense, stepStart: 0, stepEnd: 5,
      samplingSec: 1.5, hammingThreshold: 10,
    });
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].members.length, 2);
    assert.ok(typeof clusters[0].members[0].dHash === "string");
    assert.ok(clusters[0].members[0].frame.localPath === f1);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("buildScreenClusters representative is the centroid (min sum-Hamming)", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sid-"));
  try {
    const f0 = await makeFrame(tmp, "f0.jpg", 0);
    const f1 = await makeFrame(tmp, "f1.jpg", 0);
    const f2 = await makeFrame(tmp, "f2.jpg", 0);
    const dense: DensePoolFrame[] = [
      { t: 0.0, localPath: f0 },
      { t: 1.5, localPath: f1 },
      { t: 3.0, localPath: f2 },
    ];
    const clusters = await buildScreenClusters({
      denseFrames: dense, stepStart: 0, stepEnd: 5,
      samplingSec: 1.5, hammingThreshold: 10,
    });
    assert.equal(clusters.length, 1);
    const memberPaths = clusters[0].members.map(m => m.frame.localPath);
    assert.ok(memberPaths.includes(clusters[0].representative.localPath));
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("buildScreenClusters returns empty when no dense frames in range", async () => {
  const clusters = await buildScreenClusters({
    denseFrames: [], stepStart: 0, stepEnd: 5,
    samplingSec: 1.5, hammingThreshold: 10,
  });
  assert.equal(clusters.length, 0);
});

