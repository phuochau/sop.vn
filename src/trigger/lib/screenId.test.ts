import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import sharp from "sharp";
import {
  buildScreenClusters,
  clusterFor,
  frameSharpness,
  selectInClusterFrame,
  type DensePoolFrame,
  type ScreenCluster,
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

function fakeCluster(letter: string, members: Array<{ t: number; localPath: string; dHash: string }>): ScreenCluster {
  const times = members.map(m => m.t);
  return {
    letter,
    representative: { t: members[0].t, localPath: members[0].localPath },
    members: members.map(m => ({ frame: { t: m.t, localPath: m.localPath }, dHash: m.dHash })),
    timeSpan: { start: Math.min(...times), end: Math.max(...times) },
    dHash: members[0].dHash,
  };
}

test("clusterFor finds a cluster by letter", () => {
  const clusters: ScreenCluster[] = [
    fakeCluster("A", [{ t: 0, localPath: "/a.jpg", dHash: "aaaa" }]),
    fakeCluster("B", [{ t: 5, localPath: "/b.jpg", dHash: "bbbb" }]),
  ];
  assert.equal(clusterFor("A", clusters)?.letter, "A");
  assert.equal(clusterFor("B", clusters)?.letter, "B");
  assert.equal(clusterFor("Z", clusters), null);
});

test("selectInClusterFrame prefers the in-window member nearest the action time", async () => {
  const c = fakeCluster("A", [
    { t: 1, localPath: "/m1.jpg", dHash: "aaaa" },
    { t: 5, localPath: "/m2.jpg", dHash: "aaab" },
    { t: 9, localPath: "/m3.jpg", dHash: "aaac" },
  ]);
  const picked = await selectInClusterFrame(c, { start: 4, end: 6 }, 5, async () => 1);
  assert.equal(picked.localPath, "/m2.jpg");
});

test("selectInClusterFrame falls back to representative when no member is in window", async () => {
  const c = fakeCluster("A", [
    { t: 1, localPath: "/m1.jpg", dHash: "aaaa" },
    { t: 5, localPath: "/m2.jpg", dHash: "aaab" },
  ]);
  const picked = await selectInClusterFrame(c, { start: 100, end: 200 }, 150, async () => 1);
  assert.equal(picked.localPath, c.representative.localPath);
});

test("frameSharpness scores a blurred frame lower than the sharp original", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sharp-"));
  try {
    const fixture = "src/trigger/stages/__fixtures__/sample-1080p.jpg";
    const blurred = path.join(tmp, "blur.jpg");
    await sharp(fixture).blur(8).jpeg().toFile(blurred);
    const sharpScore = await frameSharpness(fixture);
    const blurScore = await frameSharpness(blurred);
    assert.ok(
      sharpScore > blurScore,
      `expected sharp score ${sharpScore} > blurred score ${blurScore}`,
    );
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("selectInClusterFrame picks the sharpest frame in the action-time neighborhood", async () => {
  const c = fakeCluster("A", [
    { t: 10, localPath: "/n10.jpg", dHash: "aaaa" },
    { t: 11, localPath: "/n11.jpg", dHash: "aaab" },
    { t: 12, localPath: "/n12.jpg", dHash: "aaac" },
  ]);
  // /n12.jpg is farthest from actionTime 10 but sharpest — it must still win.
  const sharpness = async (p: string) => (p === "/n12.jpg" ? 9 : 1);
  const picked = await selectInClusterFrame(c, { start: 0, end: 20 }, 10, sharpness);
  assert.equal(picked.localPath, "/n12.jpg");
});

test("selectInClusterFrame returns distinct frames for distinct action times", async () => {
  const c = fakeCluster("A", [
    { t: 70, localPath: "/e70.jpg", dHash: "aaaa" },
    { t: 72, localPath: "/e72.jpg", dHash: "aaab" },
    { t: 74, localPath: "/e74.jpg", dHash: "aaac" },
    { t: 76, localPath: "/e76.jpg", dHash: "aaad" },
  ]);
  const flat = async () => 1;
  const early = await selectInClusterFrame(c, { start: 60, end: 90 }, 70, flat);
  const late = await selectInClusterFrame(c, { start: 60, end: 90 }, 76, flat);
  assert.notEqual(early.localPath, late.localPath);
  assert.equal(early.localPath, "/e70.jpg");
  assert.equal(late.localPath, "/e76.jpg");
});

test("selectInClusterFrame handles fewer than K frames in the window", async () => {
  const c = fakeCluster("A", [
    { t: 3, localPath: "/p3.jpg", dHash: "aaaa" },
    { t: 4, localPath: "/p4.jpg", dHash: "aaab" },
  ]);
  const picked = await selectInClusterFrame(c, { start: 0, end: 10 }, 4, async () => 1);
  assert.equal(picked.localPath, "/p4.jpg");
});

test("selectInClusterFrame breaks a sharpness tie by nearest action time", async () => {
  const c = fakeCluster("A", [
    { t: 20, localPath: "/q20.jpg", dHash: "aaaa" },
    { t: 22, localPath: "/q22.jpg", dHash: "aaab" },
  ]);
  // Both frames score equally — the tie must resolve to the one nearer 22.
  const picked = await selectInClusterFrame(c, { start: 0, end: 40 }, 22, async () => 5);
  assert.equal(picked.localPath, "/q22.jpg");
});
