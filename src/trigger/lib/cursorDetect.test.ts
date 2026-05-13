import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { detectCursor, verifyCursorInWindow } from "./cursorDetect";

const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 22" width="16" height="22">
  <path d="M1.5,1 L1.5,17 L5.5,13 L8,18.5 L11,17 L8.5,11.5 L13.5,11.5 Z"
        fill="black" stroke="white" stroke-width="2" stroke-linejoin="round"/>
  <path d="M1.5,1 L1.5,17 L5.5,13 L8,18.5 L11,17 L8.5,11.5 L13.5,11.5 Z" fill="black"/>
</svg>`;

async function makeSynthFrame(width: number, height: number, cursorXFrac: number | null, cursorYFrac: number | null, outPath: string, cursorPx = 22): Promise<{ cx: number; cy: number } | null> {
  const bg = sharp({ create: { width, height, channels: 3, background: "#f5f5f5" } });
  if (cursorXFrac === null || cursorYFrac === null) {
    await bg.jpeg({ quality: 90 }).toFile(outPath);
    return null;
  }
  const cursorBuf = await sharp(Buffer.from(ARROW_SVG))
    .resize(Math.round(cursorPx * 16 / 22), cursorPx)
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const cx = Math.round(cursorXFrac * width);
  const cy = Math.round(cursorYFrac * height);
  await bg
    .composite([{ input: cursorBuf, top: cy, left: cx }])
    .jpeg({ quality: 90 })
    .toFile(outPath);
  return { cx, cy };
}

test("detectCursor finds cursor at known location in synthetic frame", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cursor-test-"));
  try {
    const out = path.join(tmp, "frame.jpg");
    const placed = await makeSynthFrame(640, 360, 0.4, 0.6, out);
    assert.ok(placed);
    const det = await detectCursor(out);
    assert.ok(det, "detector should find the cursor");
    const detX = det!.x * 640;
    const detY = det!.y * 360;
    assert.ok(Math.abs(detX - placed!.cx) <= 6, `cursor X off by ${Math.abs(detX - placed!.cx)}`);
    assert.ok(Math.abs(detY - placed!.cy) <= 6, `cursor Y off by ${Math.abs(detY - placed!.cy)}`);
    assert.ok(det!.score > 0.55, `score ${det!.score} too low`);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("detectCursor returns null when no cursor is present", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cursor-test-"));
  try {
    const out = path.join(tmp, "blank.jpg");
    await makeSynthFrame(640, 360, null, null, out);
    const det = await detectCursor(out);
    assert.equal(det, null, `expected null, got ${JSON.stringify(det)}`);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("verifyCursorInWindow finds cursor when claim is correct", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cursor-verify-"));
  try {
    const out = path.join(tmp, "frame.jpg");
    const placed = await makeSynthFrame(1280, 720, 0.4, 0.6, out);
    assert.ok(placed);
    // Claim is slightly off-center to simulate LLM imprecision (~2% off)
    const det = await verifyCursorInWindow(out, 0.41, 0.605);
    assert.ok(det, "verifier should find cursor near the claim");
    const detX = det!.x * 1280;
    const detY = det!.y * 720;
    assert.ok(Math.abs(detX - placed!.cx) <= 6, `cursor X off by ${Math.abs(detX - placed!.cx)}`);
    assert.ok(Math.abs(detY - placed!.cy) <= 6, `cursor Y off by ${Math.abs(detY - placed!.cy)}`);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("verifyCursorInWindow returns null when claim is in empty region", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cursor-verify-"));
  try {
    const out = path.join(tmp, "frame.jpg");
    // Plant cursor at (0.4, 0.6) but claim it's at (0.8, 0.2) — far away
    await makeSynthFrame(1280, 720, 0.4, 0.6, out);
    const det = await verifyCursorInWindow(out, 0.8, 0.2);
    assert.equal(det, null, `expected null, got ${JSON.stringify(det)}`);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("verifyCursorInWindow returns null when image too small for any template", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cursor-verify-"));
  try {
    const out = path.join(tmp, "tiny.jpg");
    // 200×200 frame → 0.08*200 = 16 px window, below 30 min
    await sharp({ create: { width: 200, height: 200, channels: 3, background: "#ffffff" } })
      .jpeg()
      .toFile(out);
    const det = await verifyCursorInWindow(out, 0.5, 0.5);
    assert.equal(det, null, `expected null for too-small window, got ${JSON.stringify(det)}`);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("verifyCursorInWindow handles cursor near image edge", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cursor-verify-"));
  try {
    const out = path.join(tmp, "edge.jpg");
    // Cursor near top-left corner — window will clamp inward
    const placed = await makeSynthFrame(1280, 720, 0.01, 0.02, out);
    assert.ok(placed);
    const det = await verifyCursorInWindow(out, 0.01, 0.02);
    assert.ok(det, "verifier should still find cursor near edge after window clamping");
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});
