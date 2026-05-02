import { test } from "node:test";
import assert from "node:assert";
import { decideIngest, mapStreamErrorToCode } from "./ingestLoom";

test("decideIngest: ingesting → run", () => {
  assert.deepEqual(decideIngest("ingesting", true), { action: "run" });
  assert.deepEqual(decideIngest("ingesting", false), { action: "run" });
});

test("decideIngest: transcribing + r2 present → resume (re-trigger only)", () => {
  assert.deepEqual(decideIngest("transcribing", true), { action: "resume" });
});

test("decideIngest: transcribing + no r2 → noop (something is wrong, leave it)", () => {
  assert.deepEqual(decideIngest("transcribing", false), { action: "noop" });
});

test("decideIngest: any other status → noop", () => {
  for (const s of ["uploading", "normalizing", "analyzing", "generating", "clipping", "done", "failed"] as const) {
    assert.deepEqual(decideIngest(s, true), { action: "noop" });
  }
});

test("mapStreamErrorToCode: size_exceeded → file_too_large", () => {
  assert.equal(mapStreamErrorToCode("size_exceeded"), "file_too_large");
});

test("mapStreamErrorToCode: other stream errors → loom_ingest_failed", () => {
  assert.equal(mapStreamErrorToCode("stalled"), "loom_ingest_failed");
  assert.equal(mapStreamErrorToCode("stream_error"), "loom_ingest_failed");
});
