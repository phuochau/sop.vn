# User-selectable output format (screenshots vs video clips)

Date: 2026-05-20
Status: Design

## Problem

Today, the SOP processing pipeline decides between screenshots and video clips
solely from the auto-detected `appType`:

- `physical` → clip pipeline (one trimmed video + poster per step).
- everything else (`web`, `app`, etc.) → screenshot pipeline (frames + yellow
  point highlight).

We want the user to choose the output format at upload time, so app/web
recordings can also be turned into video clips. Physical recordings remain
clips-only for now.

## Scope

In scope:

- Let the user pick `Auto`, `Screenshots`, or `Clips` at upload.
- Run the existing clip pipeline for app/web SOPs when the user picks `Clips`.
- Resolve a single `effectiveOutputFormat` per SOP after analyze, persist it,
  and use it to drive the orchestrator branch and the SOP viewer.
- Surface a coercion notice when the user picked `Screenshots` for a video that
  analyze classifies as `physical`.

Out of scope:

- Physical → screenshots. The user explicitly chose to defer this. UI coerces
  physical to clips with a notice rather than generating screenshots from
  physical video.
- New highlight rendering. Clips remain clean (no yellow point overlay) for all
  appTypes — matches existing physical clip behavior.
- Generating both formats for a single SOP, or switching format after
  processing. Choice is locked at upload.

## Output-format matrix

| User pick × detected appType | app/web      | physical                       |
| ---------------------------- | ------------ | ------------------------------ |
| `auto`                       | screenshots  | clips                          |
| `screenshots`                | screenshots  | **coerced to clips** + notice  |
| `clips`                      | clips (new)  | clips                          |

Only one new pipeline path: **app/web + clips**. Everything else reuses an
existing branch.

## UI: UploadZone

Add a tri-state segmented control under the dropzone in
`src/components/UploadZone.tsx`:

```
Output: [ Auto ] [ Screenshots ] [ Clips ]
```

- Default: `Auto`.
- Three explicit options; no appType picker (auto-detection stays).
- Each option has a short tooltip explaining the choice.
- Selection is sent in the upload commit payload as `outputFormat`.

The same control applies to Loom ingest (`POST /api/ingest/loom`), which
shares the upload form.

## API changes

Two routes accept an optional `outputFormat` field:

- `POST /api/upload/commit` — body gains
  `outputFormat?: "auto" | "screenshots" | "clips"`.
- `POST /api/ingest/loom` — same field.

Both default to `"auto"` when the field is missing, preserving back-compat
with any external callers.

## Data model

Add to the SOP document:

- `outputFormat: "auto" | "screenshots" | "clips"` — user's choice at upload,
  immutable for the run.
- `effectiveOutputFormat: "screenshots" | "clips"` — resolved after analyze,
  persisted, drives orchestrator branch and SOP viewer.
- `outputFormatCoerced?: { from: "screenshots"; to: "clips"; reason: "physical_detected" }`
  — set only when coercion happens; powers the UI notice.

Existing `Step.screenshots[]` and `Step.clip` schemas are unchanged.

The SOP viewer currently chooses a per-step renderer based on which field is
populated (`StepCardClips` vs the screenshot renderer — commit `355f851`).
For new SOPs, read `sop.effectiveOutputFormat` at the top level so the
renderer choice is explicit. For older SOPs missing the field, keep the
existing per-step inference from data presence (see Edge cases).

## Resolver

Single pure function:

```ts
type GatedAppType = "web" | "mobile" | "desktop" | "physical"; // "none" is rejected upstream
type UserChoice = "auto" | "screenshots" | "clips";
type Effective = "screenshots" | "clips";

function resolveOutputFormat(
  choice: UserChoice,
  appType: GatedAppType,
): { effective: Effective; coerced?: { from: "screenshots"; to: "clips"; reason: "physical_detected" } } {
  if (appType === "physical") {
    if (choice === "screenshots") {
      return { effective: "clips", coerced: { from: "screenshots", to: "clips", reason: "physical_detected" } };
    }
    return { effective: "clips" };
  }
  // app/web
  if (choice === "clips") return { effective: "clips" };
  return { effective: "screenshots" };
}
```

The input type is narrowed to `GatedAppType` because `appType === "none"` is
rejected by the analyze gate before the resolver runs. The caller is
responsible for that gate; the resolver does not re-check.

## Orchestrator change

In `src/trigger/processSopScreenshots.ts`, replace the existing
`isPhysical`-keyed branch (around line 214) with a single resolver call right
after analyze:

```ts
const { effective: effectiveOutputFormat, coerced } = resolveOutputFormat(
  sop.outputFormat,
  analysis.appType,
);

await (await sops()).updateOne(
  { _id },
  {
    $set: {
      effectiveOutputFormat,
      ...(coerced ? { outputFormatCoerced: coerced } : {}),
      updatedAt: new Date(),
    },
  },
);
```

Then branch the rest of the pipeline on `effectiveOutputFormat`:

```ts
if (effectiveOutputFormat === "clips") {
  // existing runExtractClips → runUploadClips → composeClipSteps path
} else {
  // existing screenshots path
}
```

`runExtractClips` already operates on any video — it trims by step boundaries
with no appType assumption. For app/web clips it runs after `resolved` steps
exist, exactly like the physical path today. No new highlight overlay.

The `decideAppGate` rejection for non-physical recordings stays — it guards
"is this a usable recording at all" and is independent of output format.

## Edge cases

- **`appType === "none"`**: rejected as `not_an_app` before the resolver runs.
  Unchanged.
- **User picks `clips` for app/web with very short steps**: produces short
  clips. Acceptable; existing clip pipeline already handles step boundaries.
- **Retry / resume**: `outputFormat` is set once at upload and never mutated.
  `effectiveOutputFormat` is recomputed if analyze re-runs; coercion state
  follows analyze.
- **Old SOPs missing the field**: viewer treats absent `effectiveOutputFormat`
  as "infer from data" (current per-step behavior from commit `355f851`), so
  existing records keep rendering. No backfill required.

## SOP viewer

- Read `sop.effectiveOutputFormat` to pick the per-step renderer
  (`StepCardClips` for clips, screenshot renderer for screenshots).
- When `outputFormatCoerced` is set, show a one-line notice on the SOP page:
  *"This looked like a physical recording, so we generated video clips instead."*

## Processing page

No new statuses required. The existing `building-clips` / `uploading-clips`
statuses (commit `0bf91f9`) already cover app/web + clips because the
orchestrator emits them from the shared clip path.

## Testing

- Unit: `resolveOutputFormat` truth table — 6 reachable input combinations
  (3 user choices × 2 non-`none` appTypes), asserting `effective` and presence
  of `coerced` for the one coercion case.
- Integration: orchestrator
  - `outputFormat = "clips"` + non-physical fixture → produces `Step.clip`
    entries and `effectiveOutputFormat = "clips"`, no coercion.
  - `outputFormat = "screenshots"` + physical fixture → coerces, sets
    `outputFormatCoerced`, runs clip pipeline.
  - `outputFormat = "auto"` + each appType → matches default matrix.
- UI: UploadZone snapshot with the segmented control; commit payload includes
  `outputFormat`.
- Viewer: snapshot with `effectiveOutputFormat = "clips"` on an app/web SOP;
  snapshot with `outputFormatCoerced` set shows the notice.

## Open questions

None at design time.
