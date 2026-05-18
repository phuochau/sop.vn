import { test } from "node:test";
import assert from "node:assert";
import { mapClipsForStep } from "./mapClips";
import type { Clip } from "@/lib/mongo";

const clip: Clip = {
  clipId: "c1", r2Key: "sops/S/clips/step-0/c1.mp4",
  posterR2Key: "sops/S/clips/step-0/c1-poster.jpg",
  startTime: 1, endTime: 9, order: 0,
};

test("mapClipsForStep presigns clip + poster keys", async () => {
  const out = await mapClipsForStep([clip], async (key) => `signed:${key}`);
  assert.equal(out.length, 1);
  assert.equal(out[0].clipId, "c1");
  assert.equal(out[0].url, "signed:sops/S/clips/step-0/c1.mp4");
  assert.equal(out[0].posterUrl, "signed:sops/S/clips/step-0/c1-poster.jpg");
  assert.equal(out[0].startTime, 1);
  assert.equal(out[0].endTime, 9);
  assert.equal(out[0].order, 0);
});

test("mapClipsForStep returns [] for an undefined clip array", async () => {
  const out = await mapClipsForStep(undefined, async (k) => `signed:${k}`);
  assert.deepEqual(out, []);
});
