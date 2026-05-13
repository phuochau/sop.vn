# Sub-step descriptions on curated screenshots

**Status:** Approved design, ready for implementation planning.
**Date:** 2026-05-13.
**Relates to:** `docs/superpowers/specs/2026-05-13-screenshots-per-step-design.md` (the screenshots POC this extends).

## 1. Goal

Each curated screenshot becomes a "sub-step" that may carry an optional `description` written by the same vision LLM that picks the frame. The description is whatever serves the reader best for that specific frame — a short imperative instruction for action moments, a brief observation for state/result frames, or `null` when the image is self-explanatory. Length and style are unconstrained; the LLM decides per frame.

The step-level `description` from the speech-path extract stage stays as the section overview. Sub-step descriptions are per-frame detail. Both render together: overview on top, play-by-play through the screenshot grid.

## 2. Scope

**In scope:**
- Extend the per-step picker schema from `{picks: [{index, reason}]}` to `{picks: [{index, description}]}` with `description: string | null`. Same single vision call per step — no extra LLM cost.
- Persist `description` on each `Screenshot` record in Mongo (optional field).
- Surface `description` through the SOP API.
- Render the description in `StepCardScreenshots` under each image.
- Update unit tests for the pure helpers to carry the new `Pick` shape.

**Out of scope:**
- User-edit UI for descriptions.
- PDF rendering of sub-steps.
- Loom / silent-path / clip-mode changes.
- Backfill of existing screenshot-mode SOPs. Records produced before this change keep `description: undefined`, which renders as no caption.

## 3. Data shape changes

**3.1 Mongo (`src/lib/mongo.ts`)** — one new optional field:

```ts
export interface Screenshot {
  frameId: string;
  r2Key: string;
  t: number;
  order: number;
  description?: string;   // NEW — LLM-written caption/instruction, optional
}
```

Absent ⇒ no caption rendered (back-compatible with existing rows).

**3.2 Zod schema (`src/lib/schemas.ts`)** — rename `reason` to `description`, make it nullable so the LLM can explicitly skip:

```ts
export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    description: z.string().nullable(),
  })),
});
```

## 4. LLM prompt update

Replace `config.ai.prompts.screenshotPickSystem` in `src/config/index.ts`:

```ts
screenshotPickSystem: (lang: string) =>
  `You select screenshots from a training video to illustrate one specific step, AND write a short caption or instruction for each picked frame.

You receive: the step's title and the trainer's narration, plus a list of candidate frames each labeled with a bucket-local index and a timestamp.

Pick the frames a reader would need to actually perform this step — relevant UI before the action, during the action, and the resulting state after the action. Skip redundant frames showing the same UI state. Return an empty array if no frames are useful for this step.

For each picked frame, write a "description":
- If the frame shows an action moment, write a short imperative instruction ("Cut the bell pepper into thirds").
- If the frame shows a state/result, write a brief observation ("Sauce is well combined and uniformly red").
- If the image is self-explanatory and no caption would help the reader, return null.
- Keep descriptions concise. Match the length to the value added — one short line is usually right, but you may go longer when needed.

LANGUAGE: Write every description in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,
```

In `src/trigger/stages/assignScreenshots.ts`, the user-text reminder line currently reads:

```
Return JSON: { "picks": [{ "index": <bucket index>, "reason": "<one short sentence>" }] }
```

Change to:

```
Return JSON: { "picks": [{ "index": <bucket index>, "description": "<short caption or null>" }] }
```

## 5. Plumbing the description through the pipeline

**5.1 `assignScreenshots.ts`** — the assignment result shape changes from `Map<number, string[]>` (stepIndex → poolIds) to `Map<number, Pick[]>`:

```ts
export type Pick = { poolId: string; description: string | null };

export type AssignmentResult = {
  byStep: Map<number, Pick[]>;
  errors: Map<number, string>;
};
```

`bucketFramesByStep` is unchanged. `resolveCrossStepDedup` is updated to operate on `Pick[]` instead of `string[]`: same logic (closer-center wins, ties → earlier step, sort by timestamp), but the description rides along with the `poolId` through the dedup.

`pickForStep` now returns `Pick[]` instead of `string[]`:

```ts
return validPicks.map(p => ({
  poolId: args.bucket[p.index].poolId,
  description: p.description,
}));
```

**5.2 `uploadScreenshots.ts`** — signature changes from `byStep: Map<number, string[]>` to `byStep: Map<number, Pick[]>`. The record-push line becomes:

```ts
const desc = pick.description?.trim();
records.push({
  frameId,
  r2Key,
  t: frame.t,
  order,
  ...(desc ? { description: desc } : {}),
});
```

`null`, `undefined`, empty strings, and whitespace-only strings are all normalized to the field being **absent** from the Mongo doc. (LLMs occasionally return `""` instead of `null` despite the prompt — handle both.) Documents stay clean.

**5.3 `processSopScreenshots.ts`** — no logic change. The orchestrator already passes `assignment.byStep` straight through to `runUploadScreenshots`; types flow.

**5.4 SOP API (`src/app/api/sop/[id]/route.ts`)** — include `description` in each screenshot entry:

```ts
screenshots: (s.screenshots ?? []).map(ss => ({
  frameId: ss.frameId,
  url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
  t: ss.t,
  order: ss.order,
  description: ss.description,   // NEW
})),
```

## 6. Viewer

**6.1 `src/components/StepCardScreenshots.tsx`** — extend `ScreenshotItem` and the figcaption:

```tsx
export type ScreenshotItem = {
  frameId: string;
  url: string;
  t: number;
  order: number;
  description?: string;   // NEW
};
```

Each figure inside the grid renders:

```tsx
<figure key={s.frameId} className="space-y-1.5">
  <img
    src={s.url}
    alt={`${title} — ${fmt(s.t)}`}
    loading="lazy"
    className="w-full rounded-lg border border-gray-200 object-contain bg-[#FAFAFA]"
  />
  <figcaption className="space-y-1">
    {s.description && (
      <p className="text-[13px] text-[#0A0A0A] leading-[1.5] whitespace-pre-line">
        {s.description}
      </p>
    )}
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
      <Camera className="w-3 h-3" strokeWidth={2} />
      {fmt(s.t)}
    </span>
  </figcaption>
</figure>
```

The timestamp shrinks to a small muted label so the description, when present, owns the visual weight.

**6.2 Layout note.** Descriptions of varying length will produce slight row asymmetry under `md:grid-cols-2`. Acceptable for the POC. If it ever looks bad, switch to `align-items: start` on the grid or use a masonry layout. Not in scope unless a real visual problem appears.

## 7. Testing

**7.1 Unit tests** — `src/trigger/stages/assignScreenshots.test.ts` needs the `Pick[]` shape:
- `resolveCrossStepDedup` test inputs change from `[[0, ["x"]], [1, ["x"]]]` to `[[0, [{ poolId: "x", description: null }]], [1, [{ poolId: "x", description: null }]]]`.
- Assertions change from `assert.deepEqual(out.get(0), ["x"])` to `assert.deepEqual(out.get(0), [{ poolId: "x", description: null }])`.
- The "timestamp order" test similarly carries `Pick`-shaped values throughout.
- `bucketFramesByStep` tests are unchanged — bucketing is over pool frames, not picks.

No new tests required for the description field itself; it's a passthrough.

**7.2 End-to-end smoke** — re-run the existing screenshots-mode upload flow on a sample video. Verify:
- Each screenshot in the SOP doc has either a `description` string or no field at all.
- The viewer renders descriptions where present and only the timestamp where not.
- Vietnamese language path produces Vietnamese descriptions (since the source video tested is Vietnamese narration).

## 8. Out of scope (explicit)

- User-edit UI / inline editing of descriptions.
- PDF rendering of sub-steps.
- Loom ingest, silent-path, clip-mode behavior — all unchanged.
- Migrations for existing screenshot-mode SOPs.
- Visual masonry layout for varying-length descriptions.
