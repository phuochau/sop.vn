import { test } from "node:test";
import assert from "node:assert";
import { clipKey, clipPosterKey } from "./utils";

test("clipKey follows the sops/ + step- key convention", () => {
  assert.equal(clipKey("SOP1", 2, "abc123"), "sops/SOP1/clips/step-2/abc123.mp4");
});

test("clipPosterKey appends -poster.jpg under the same prefix", () => {
  assert.equal(clipPosterKey("SOP1", 2, "abc123"), "sops/SOP1/clips/step-2/abc123-poster.jpg");
});
