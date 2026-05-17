import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { runExtractClickEvents } from "./extractClickEvents";

async function frame(tmp: string, name: string, rects: { x: number; y: number; w: number; h: number }[]): Promise<string> {
  const p = path.join(tmp, name);
  const svgRects = rects.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#000"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#f5f5f5"/>${svgRects}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(p);
  return p;
}

test("assigns a detected event to the step whose time range contains it", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "extract-"));
  try {
    const f0 = await frame(tmp, "f0.jpg", []);
    const f1 = await frame(tmp, "f1.jpg", [{ x: 400, y: 300, w: 200, h: 60 }]);
    const f2 = await frame(tmp, "f2.jpg", [{ x: 400, y: 300, w: 200, h: 60 }]);
    const byStep = await runExtractClickEvents({
      steps: [
        { stepIndex: 0, tStart: 0, tEnd: 0.5 },
        { stepIndex: 1, tStart: 0.5, tEnd: 2.0 },
      ],
      denseFrames: [
        { t: 0, localPath: f0 },
        { t: 1.0, localPath: f1 },
        { t: 1.5, localPath: f2 },
      ],
    });
    assert.equal(byStep.get(0)!.length, 1);
    assert.equal(byStep.get(1)!.length, 0);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("last step uses an inclusive end so an event exactly at tEnd is kept", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "extract-"));
  try {
    const f0 = await frame(tmp, "f0.jpg", []);
    const f1 = await frame(tmp, "f1.jpg", [{ x: 400, y: 300, w: 200, h: 60 }]);
    const byStep = await runExtractClickEvents({
      steps: [
        { stepIndex: 0, tStart: 0, tEnd: 2.0 },
        { stepIndex: 1, tStart: 2.0, tEnd: 2.0 },
      ],
      denseFrames: [
        { t: 2.0, localPath: f0 },
        { t: 2.5, localPath: f1 },
      ],
    });
    assert.equal(byStep.get(0)!.length, 0);
    assert.equal(byStep.get(1)!.length, 1);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("caps a step at maxCandidatesPerStep", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "extract-"));
  try {
    const positions = [
      { x: 100, y: 100, w: 200, h: 60 },
      { x: 600, y: 100, w: 200, h: 60 },
      { x: 100, y: 400, w: 200, h: 60 },
      { x: 600, y: 400, w: 200, h: 60 },
      { x: 350, y: 250, w: 200, h: 60 },
    ];
    const frames: { t: number; localPath: string }[] = [
      { t: 0, localPath: await frame(tmp, "f0.jpg", []) },
    ];
    let accum: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < positions.length; i++) {
      accum = [...accum, positions[i]];
      frames.push({ t: i + 1, localPath: await frame(tmp, `f${i + 1}.jpg`, accum) });
    }
    const step = [{ stepIndex: 0, tStart: 0, tEnd: 100 }];

    const uncapped = await runExtractClickEvents({ steps: step, denseFrames: frames });
    assert.ok(
      uncapped.get(0)!.length >= 2,
      `fixture must produce >=2 events for a meaningful cap test, got ${uncapped.get(0)!.length}`,
    );

    const capped = await runExtractClickEvents({
      steps: step, denseFrames: frames, maxCandidatesPerStep: 1,
    });
    assert.equal(capped.get(0)!.length, 1);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});
