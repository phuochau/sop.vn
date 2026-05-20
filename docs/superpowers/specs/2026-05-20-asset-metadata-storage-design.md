# Asset metadata storage

Date: 2026-05-20
Status: Design

## Problem

Today we persist almost no metadata about the original upload or the
derived assets:

- `SopDoc` only carries `videoSizeBytes` for the source video. Dimensions,
  duration, fps, extension, and mime are unknown after upload.
- `Screenshot` and `Clip` carry their R2 keys and timing but nothing about
  byte size, pixel dimensions, or container format. Downstream tooling
  (sharing UI, exports, analytics, debugging) has to re-probe R2 objects
  to learn anything physical about them.
- `Screenshot.highlight.point` is already normalized 0–1 (see
  `src/lib/grounding.ts:12`), but there is no breadcrumb back to *which*
  sub-step/action produced the point — making debugging
  highlight regressions painful.

We want to capture this metadata when assets are created, so later
features (download size badges, dimension-aware rendering, model
attribution dashboards) and ad-hoc debugging do not require touching
the storage layer.

## Scope

In scope:

- Store original source metadata on `SopDoc.source` at upload commit
  time (covers both direct upload and Loom ingest).
- Store per-asset metadata on every `Screenshot` and `Clip` written
  from now on.
- Store the highlight `source` breadcrumb (sub-step index, action id,
  grounder model) alongside the existing normalized point.
- New SOPs only. No backfill.

Out of scope:

- Rewriting old SOPs. Legacy rows simply lack the new fields and the
  UI / API continue to render them via existing optional-chaining paths.
- Surfacing the new fields in user-visible UI in this round (no badges,
  no debug overlays). This spec is a data-layer change; UI features
  consuming it ship in follow-ups.
- Content hashes / S3 dedupe. Explicitly deferred — out of the four
  options offered, the user picked size+dimensions, timestamps,
  format/codec only.
- Coordinate system changes. Points stay normalized 0–1 — they already
  are. We only *add* the source breadcrumb.

## Data model

### `SopDoc.source` (new)

```ts
interface SourceMetadata {
  sizeBytes: number;
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  ext: string;   // lowercased, no leading dot: "mp4", "mov", "webm"
  mime: string;  // e.g. "video/mp4"
}

interface SopDoc {
  // ...existing fields...
  source?: SourceMetadata;  // present on SOPs created after this change
  videoSizeBytes?: number;  // kept for back-compat; equals source.sizeBytes
}
```

`videoSizeBytes` stays so legacy readers keep working. New code reads
`source.sizeBytes`.

### `Screenshot` (extended)

```ts
interface Screenshot {
  // ...existing fields (frameId, r2Key, t, order, verb, highlight, ...)...
  sizeBytes?: number;
  width?: number;
  height?: number;
  ext?: string;   // "jpg"
  mime?: string;  // "image/jpeg"
  // `t` already encodes timestamp in seconds; no separate captureMs added.
}
```

### `Clip` (extended)

```ts
interface Clip {
  // ...existing fields (clipId, r2Key, posterR2Key, startTime, endTime, order)...
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  ext?: string;          // "mp4"
  mime?: string;         // "video/mp4"
  codec?: string;        // e.g. "h264", from ffprobe stream.codec_name
  posterSizeBytes?: number;
  posterWidth?: number;
  posterHeight?: number;
  posterMime?: string;   // "image/jpeg"
}
```

### `Screenshot.highlight.source` (new)

```ts
interface Screenshot {
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number }; // normalized 0–1 — unchanged
    source?: {
      subStepIndex: number;            // index of the Action within the step
      actionId?: string;               // Action.id if present
      grounder?: "ui-tars" | "qwen3-vl"; // which grounder returned the point
    };
  };
}
```

All new fields are optional so existing readers keep working. The
shape mirrors what is already in the pipeline — no new computation is
required other than threading the grounder identity out of
`pointFallbackHighlight` (see `src/trigger/stages/locateHighlight.ts:60`).

## Extraction points

### Source metadata — at upload commit

`POST /api/upload/commit` (direct upload) and `POST /api/ingest/loom`
(Loom ingest) both run after the source video is in R2. Add a probe
step right before the `insertOne` / `$set` that creates or finalizes the
SOP document:

```ts
const probed = await probeSource(r2KeyOrSignedUrl); // see lib helper below
const source: SourceMetadata = {
  sizeBytes: probed.sizeBytes,
  width:     probed.width,
  height:    probed.height,
  durationSec: probed.durationSec,
  fps:       probed.fps,
  ext:       probed.ext,
  mime:      probed.mime,
};
```

`probeSource` lives at `src/lib/probeSource.ts` (new), built on top of
the existing `ffmpeg.ffprobe` usage in `src/trigger/lib/probe.ts:14`.
It returns the full metadata block in one call instead of just
duration. The two routes call it once before persisting.

If probing fails (corrupt video, codec we can't read), the route
logs and proceeds *without* setting `source` — the rest of the
orchestrator is unaffected because `source` is optional. The
orchestrator already does its own probing inside analyze/extract for
the data it needs.

### Per-screenshot metadata — at upload-screenshots stage

`src/trigger/stages/uploadScreenshots.ts` is where the encoded JPEG
buffer is handed to R2. The buffer length is already known (`Buffer.byteLength`)
and the width/height are known from the sharp pipeline that
produced it. Capture both alongside the existing `r2Key`:

```ts
const out = { sizeBytes: jpegBuf.length, width: outW, height: outH,
              ext: "jpg", mime: "image/jpeg" };
```

Persist these on the `Screenshot` document when composing the final
`Step.screenshots[]` array. No new R2 round-trip — all the data is
already in scope at upload time.

### Per-clip metadata — at extract-clips + upload-clips

`src/trigger/stages/extractClips.ts` already invokes ffmpeg to trim
each clip. Capture container width/height/codec from the same ffprobe
pass; capture `sizeBytes` from the resulting mp4 file on disk before
upload. For the poster JPEG, capture `posterSizeBytes` and dimensions
from the sharp call that produces it.

Thread the metadata into the `Clip` record assembled in
`uploadClips.ts` so the persisted document carries everything.

### Highlight source breadcrumb — at highlight-actions stage

In `src/trigger/stages/highlightActions.ts:34`, when writing
`action.highlight`, also write:

```ts
action.highlight.source = {
  subStepIndex: idx,            // index into the actions array
  actionId: action.id,          // if Action carries an id (check schema)
  grounder: decision.grounder,  // returned from runLocateHighlight
};
```

`runLocateHighlight` / `pointFallbackHighlight` already know whether
the primary (`ui-tars`) or fallback (`qwen3-vl`) grounder produced the
point — currently this is dropped on the floor. Extend the
`Decision` shape (in `src/lib/schemas.ts` `HighlightDecision`) to
include an optional `grounder` field, and set it from both yes-paths
in `locateHighlight.ts`.

If `Action` does not carry a stable `id`, omit `actionId` rather than
inventing one; `subStepIndex` is enough for debugging because the
Action array is order-stable.

## Resolver / orchestrator changes

None at the orchestrator level. All metadata is captured at the stage
that already produces the asset; the orchestrator just forwards the
enriched records into `sops.updateOne`.

## Testing

- Unit: `probeSource` against a fixture mp4 and a fixture mov — asserts
  the seven fields. Reuse fixtures under
  `src/trigger/stages/__fixtures__/`.
- Unit: `uploadScreenshots` test — confirms the assembled `Screenshot`
  carries `sizeBytes`, `width`, `height`, `ext`, `mime`.
- Unit: `extractClips` / `uploadClips` tests — confirm the assembled
  `Clip` carries the new fields and the poster sub-block.
- Unit: `highlightActions` test — confirms `highlight.source` is
  populated with `subStepIndex` and `grounder` when a point is found.
- Integration: end-to-end run on a small fixture video — verify
  `sop.source`, `step.screenshots[*]`, `step.clips[*]`, and
  `screenshot.highlight.source` are all populated.

## Edge cases

- **Probe failure on upload**: log + persist SOP without `source`.
  Orchestrator continues; downstream consumers must treat `source`
  as optional.
- **Probe failure on clip / screenshot stages**: log; persist the
  asset without the affected fields rather than failing the whole
  step. Bytes and ext are the minimum useful set — fall back to
  those even if width/height/codec extraction fails.
- **Legacy SOPs**: lack all new fields. UI consumers must use
  optional chaining; this spec doesn't add any required reads.
- **Grounder identity unknown**: if neither path is taken (no point
  found), `highlight` is absent, so `highlight.source` doesn't apply.
- **Loom ingest**: `probeSource` runs on the signed R2 URL after the
  upload-from-Loom stream completes, exactly like the existing
  `probeDuration` flow in transcribe / loom paths.

## Open questions

None at design time.
