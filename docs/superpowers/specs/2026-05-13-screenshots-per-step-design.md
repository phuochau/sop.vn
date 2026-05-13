# Screenshots-per-step SOP pipeline (POC)

**Status:** Approved design, ready for implementation planning.
**Date:** 2026-05-13.
**Relates to:** `docs/video-to-sop-pipeline.md` (current clip-based pipeline).

## 1. Goal

Build a second SOP generation pipeline that, instead of cutting the source video into per-step clips, produces a curated set of **screenshots per step**. Each step's screenshots should be informative enough that a reader can perform the step without watching video — typically showing the relevant UI before, during, and after a user action.

The existing clip-based `process-sop` pipeline is left untouched. The two pipelines coexist; the user picks one at upload time.

## 2. Scope

**In scope:**
- New trigger.dev task `process-sop-screenshots` (slug `process-sop-screenshots`).
- New viewer route that renders screenshots instead of clips.
- Upload-time toggle that selects which pipeline runs.
- Speech-path only. Uploaded videos only.
- Test coverage at parity with existing `src/trigger/stages/*.test.ts`.

**Out of scope for this POC:**
- PDF export for screenshot mode.
- Loom ingest for screenshot mode.
- Silent-path support for screenshot mode.
- Cleanup cron extension (R2 leak is acceptable for the POC and tracked as follow-up).

## 3. Pipeline shape

State machine for `process-sop-screenshots`:

```
queued → downloading → transcribing → normalizing → contextualizing
       → extracting → building-pool → assigning → uploading → ready
```

Each transition writes to Mongo so the existing `app/processing/[id]` polling page works unchanged.

**Reused stages (1:1 from current pipeline):**
- `transcribe`, `normalize`, `context`, `extract` from `src/trigger/stages/`.
- Helpers: `sampleFrames`, `probe`, `videoTmp`.
- Clients: `openrouter` (vision + JSON-mode), R2, Mongo.

**New stages:**
- `buildFramePool` — dense sample, stability filter, perceptual-hash dedup.
- `assignScreenshots` — time-bucket frames per step with overlap buffer, per-step vision LLM call, cross-step dedup.
- `uploadScreenshots` — push selected JPEGs to R2, record keys on the SOP doc.

**New orchestrator:** `src/trigger/processSopScreenshots.ts`.

No clip-cutting, no keyframe stage, no visual-path branching.

## 4. Frame pool construction (`buildFramePool`)

**Input:** local video path, total duration.

**4.1 Dense sample.** Extract frames at fixed cadence via ffmpeg. Default **2 fps** (one frame every 500 ms). Configurable in `src/config/index.ts`. For a 10-minute video this yields roughly 1200 raw frames; downstream filtering reduces this aggressively.

**4.2 Stability filter (drop mid-transition frames).** Compute a perceptual hash (dHash via `sharp`) for each frame. Group consecutive frames into runs of similar hashes; mid-transition frames appear as singleton/short runs between stable plateaus. Keep one representative frame per stable run, drop the transition frames. This removes mid-scroll, mid-animation, and motion-blurred frames automatically.

**4.3 Dedup (drop near-duplicates).** After the stability pass, group remaining frames by pHash Hamming distance below a threshold (default **5/64**) within a sliding window (default **10 seconds**); keep the earliest frame of each group. This also collapses "user opens modal, closes, reopens" into a single representative screenshot of the modal.

**4.4 Output.** A list of `{ t: number, poolId: string, localPath: string, pHash: string }` records. `poolId` is a short in-memory identifier scoped to this run; it is distinct from the persistent `frameId` assigned at upload time (see §6.1). Expected size after filtering: roughly **15–60 frames for a 10-minute video**.

**4.5 Tunables** (added to `src/config/index.ts`):
- `screenshots.sampleFps` (default `2`)
- `screenshots.motionHammingThreshold` (default `8/64` — frames closer than this to a neighbor count as stable)
- `screenshots.dedupHammingThreshold` (default `5/64`)
- `screenshots.dedupWindowSeconds` (default `10`)
- `screenshots.maxPoolSize` (default `200`, hard safety cap)

**4.6 Implementation choice.** Add `sharp` as a dependency for perceptual hashing and the §5 downscaling pass. `sharp` is a small, well-maintained image library with native bindings; preferred over pulling in OpenCV. (Not currently in `package.json`.)

## 5. Screenshot assignment (`assignScreenshots`)

**Input:** step list (from `extract` stage — each step has `title`, `narration`, `tStart`, `tEnd`) plus the frame pool from §4.

**5.1 Pre-bucket frames by time with overlap buffer.** For each step `i` with range `[tStart_i, tEnd_i]`, build its candidate bucket as all pool frames with timestamp in `[tStart_i - 2s, tEnd_i + 2s]`. The ±2 s buffer handles the common case where the "result of action" frame falls just past a step boundary, or where pre-action context sits just before one. Frames near a boundary appear in both adjacent buckets; cross-step dedup (§5.3) resolves the overlap.

**5.2 Per-step vision LLM call.** Run buckets in parallel (e.g., `Promise.all` or trigger.dev batch). For each step, call `config.ai.visionModel` (Gemini 2.5 Flash) with:

- The step's `title` and `narration`.
- All frames in the bucket, in timestamp order, each labeled with a **bucket-local index** (`0..n-1`) and timestamp. Images are **downscaled to a max edge of 1280 px** before sending (preserves UI legibility while keeping the vision token cost predictable; raw screen recordings are often 2560×1440 or larger).
- A prompt that frames the task as "pick frames a reader would need to perform this step — relevant UI before, during, and after the action; skip redundant frames showing the same UI state; return an empty array if no frames are useful for this step."
- `response_format: json_schema, strict: true` with schema `{ picks: { index: number, reason: string }[] }`, where `index` is the bucket-local index. The orchestrator maps bucket indices back to `poolId`s after the call returns.

The `reason` field forces justification per pick and provides debug-able output. It is discarded before storage.

The LLM decides how many frames per step — there is no fixed count and no hard cap. A "wait 30 seconds" step may legitimately yield zero screenshots; a multi-field form may yield six.

**5.3 Cross-step dedup.** If a frame ends up picked by two adjacent steps (boundary case), assign it to whichever step's timestamp range is closer to the frame's `t`; break ties by earlier step. Each frame appears in at most one step in the final output.

**5.4 Output.** `Map<stepId, poolId[]>`, frames ordered by timestamp within each step. Empty arrays are valid. `uploadScreenshots` (§6) consumes this map, generates a persistent `frameId` per pool entry it actually uploads, and writes the final `screenshots[]` records on the SOP doc.

**5.5 Per-step error handling.** Vision call failures are **non-fatal**: if a step's LLM call fails after `config.ai.maxRetries`, the step gets an empty `screenshots[]` and the orchestrator continues. The Mongo doc records the failure on the step (e.g., `screenshotsError: string`) so the viewer can show a graceful placeholder. The task only fails wholesale if a stage *before* assignment (download, transcribe, normalize, context, extract) throws, matching existing pipeline behavior.

**5.6 Cost note.** `O(numSteps)` vision calls, each with roughly 5–15 images. For a typical 8-step SOP that is ~8 calls. Cheaper and higher-quality than a single mega-call carrying 60 images.

## 6. Storage

**6.1 R2 keyspace** (new prefix, isolated from clip mode):

```
sops/<sopId>/screenshots/<stepId>/<frameId>.jpg
```

Selected frames are encoded as JPEG quality 85. Screen recordings compress well; JPEG is materially smaller than PNG for this content and visually fine. `frameId` is a short `nanoid` generated when the frame is selected for storage (separate from the in-memory pool id).

Raw pool frames are *not* uploaded to R2 — they live on the worker's local disk only during the run and are cleaned up with the rest of the temp video files.

**6.2 Mongo `sops` doc — additions:**

```ts
{
  // existing fields...
  mode: "clips" | "screenshots", // NEW — set at upload time
  steps: [
    {
      // existing: id, title, narration, tStart, tEnd, ...
      // clip-mode adds: clipKey, posterKey (unchanged)
      // screenshot-mode adds:
      screenshots?: {
        frameId: string,
        r2Key: string,
        t: number,    // timestamp in source video
        order: number // display order within the step
      }[],
      screenshotsError?: string // set when this step's assignment LLM call failed (§5.5)
    }
  ]
}
```

`mode` is the discriminator. Existing documents are unchanged; absence of `mode` is treated as `"clips"`. No migration required.

## 7. Upload toggle

`api/upload/commit/route.ts` (or wherever `processSop` is currently triggered) accepts a new optional body field `mode: "clips" | "screenshots"`, default `"clips"`. When `"screenshots"`, trigger `process-sop-screenshots` instead of `process-sop`.

UI: a simple toggle on the upload page — *"Generate as: ☐ video clips ☑ screenshots (POC)"*. The toggle writes the `mode` field on the SOP doc at commit time so it is queryable later.

## 8. Viewer

`src/app/sop/[id]/page.tsx` reads `mode` from the SOP doc and branches:

- `"clips"` (or missing): existing `StepCard` + `HeroVideo` (no change).
- `"screenshots"`: new `StepCardScreenshots` component. Renders each step's screenshots as a vertical sequence with the frame's timestamp shown as a caption. Lazy-load via presigned URLs.

For presigned URL fetching, add `api/screenshots/[sopId]/[key]/route.ts` mirroring the existing `api/clips/[sopId]/[key]/route.ts` pattern.

## 9. Testing

New stages get the same level of unit-test coverage as existing stages in `src/trigger/stages/*.test.ts`:

- `buildFramePool.test.ts` — fixture-based: feed a short video, assert pool size is within an expected range and that obvious mid-transition frames are excluded.
- `assignScreenshots.test.ts` — mock the vision LLM; assert bucketing math, that the overlap buffer is applied, and that cross-step dedup picks the timestamp-closest step.
- `processSopScreenshots.test.ts` — orchestrator-level smoke test with mocked stages, asserting state machine transitions and Mongo writes.

No new e2e harness for this POC.

## 10. Out of scope (explicit, for clarity)

- PDF export for screenshot mode.
- Loom ingest for screenshot mode.
- Silent-path support.
- R2 cleanup cron extension.
- Production-grade abuse / quota handling on the new task.

These are deferred to follow-up POCs or production hardening.
