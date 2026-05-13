# Click/tap highlights on screenshots

**Status:** Approved design, ready for implementation planning.
**Date:** 2026-05-13.
**Relates to:** `docs/superpowers/specs/2026-05-13-screenshots-per-step-design.md` and `docs/superpowers/specs/2026-05-13-substep-descriptions-design.md`. This extends the screenshots POC.

## 1. Goal

When a screenshot shows the user clicking, tapping, or typing into a UI element of a web or mobile app, draw a yellow rectangle around that element on the stored image (Guidde-style). The same vision LLM that picks the frame and writes its description also returns the bounding box, so there is no extra LLM round-trip. Frames that are not UI interactions get no rectangle.

The rectangle is **baked into the JPEG** before upload to R2. The viewer renders the annotated image as-is — no overlay logic.

## 2. Scope

**In scope:**
- Extend the per-step picker schema to add `highlight: { kind, bbox } | null` per pick.
- Update the picker prompt so the LLM returns highlights for `kind: "click"` (buttons, links, tabs, menu items, icons) and `kind: "input"` (text fields, textareas, search boxes), and `null` otherwise.
- Draw a yellow rectangle onto the full-resolution JPEG in `uploadScreenshots` using `sharp().composite()` with an SVG overlay.
- Persist `highlight` on the `Screenshot` Mongo record (optional field, for future overlay-mode use).
- Unit tests for the SVG helper and the assignment dedup path.

**Out of scope:**
- Curved arrows, "Click X" text labels, or any annotation richer than the rectangle.
- Overlay-mode rendering (rectangle as SVG/CSS in the viewer instead of baked).
- Upload-time toggle for "is this an app demo" — the LLM decides per-frame via null bbox.
- Backfill of prior screenshot-mode SOPs.
- Clip-mode, Loom, PDF, silent-path changes.
- Mobile-specific gesture rendering (tap circles, swipe paths). Mobile taps reuse the click rectangle.

## 3. Data shape changes

**3.1 Zod schema (`src/lib/schemas.ts`).**

```ts
export const BBox = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export const Highlight = z.object({
  kind: z.enum(["click", "input"]),
  bbox: BBox,
});

export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    description: z.string().nullable(),
    highlight: Highlight.nullable(),
  })),
});
```

`bbox` is normalized to `[0,1]` against the image the LLM was shown (the downscaled frame, max edge 1280 px from §5 of the screenshots-per-step spec). `downscaleToMaxEdge` preserves aspect ratio, so normalized coordinates map 1:1 onto the original frame — we multiply by the original's pixel dimensions at draw time and get the right rectangle.

The existing `ZodNullable` support in `src/lib/openrouter.ts` (added during sub-step descriptions work) handles the new nullable field. No converter changes needed.

**3.2 Mongo (`src/lib/mongo.ts`).** One new optional field on `Screenshot`:

```ts
export interface Screenshot {
  frameId: string;
  r2Key: string;
  t: number;
  order: number;
  description?: string;
  highlight?: { kind: "click" | "input"; bbox: { x: number; y: number; w: number; h: number } };
  highlightError?: string;   // set if rectangle drawing fails per-frame; upload still proceeds
}
```

Absent fields render as no rectangle (back-compatible with existing screenshot-mode rows).

## 4. Prompt update

Append to `config.ai.prompts.screenshotPickSystem` in `src/config/index.ts`, after the existing description guidance:

```
For each picked frame, also return a "highlight":
- If the frame shows the user clicking, tapping, or selecting a specific UI element of a web or mobile app (button, link, tab, menu item, icon), return { "kind": "click", "bbox": { x, y, w, h } } where x/y/w/h are normalized 0..1 against the image you see, tightly bounding the target element.
- If the frame shows the user typing into a specific text field, textarea, or search box, return { "kind": "input", "bbox": { ... } } bounding that field.
- If the frame is not a UI interaction, or the target element is unclear, return "highlight": null.

Coordinates are normalized to the image you see in this prompt (not the original video resolution). x and y are the top-left of the rectangle.

Be conservative: only return a bbox when the target is unambiguous. Prefer null over a guess.
```

In `assignScreenshots.ts`, the user-text reminder line currently reads:

```
Return JSON: { "picks": [{ "index": <bucket index>, "description": "<short caption or null>" }] }
```

Change to:

```
Return JSON: { "picks": [{ "index": <bucket index>, "description": "<short caption or null>", "highlight": { "kind": "click"|"input", "bbox": { "x": <0..1>, "y": <0..1>, "w": <0..1>, "h": <0..1> } } | null }] }
```

## 5. Pipeline plumbing

**5.1 `assignScreenshots.ts`.** Extend the `Pick` type:

```ts
export type Pick = {
  poolId: string;
  description: string | null;
  highlight: { kind: "click" | "input"; bbox: { x: number; y: number; w: number; h: number } } | null;
};
```

`bucketFramesByStep` unchanged. `resolveCrossStepDedup` unchanged in logic — `highlight` rides along on the `Pick` alongside `description`. `pickForStep` maps each LLM result entry to a `Pick` with the new field. Validation happens during draw (§5.2), not here, so a malformed bbox does not block the screenshot from being assigned.

**5.2 `uploadScreenshots.ts`.** Currently does `fs.promises.readFile(frame.localPath)` and `putObject(r2Key, buf, "image/jpeg")` — **no sharp pass today**. The extension is additive: only invoke sharp when `pick.highlight` is non-null. Un-highlighted frames keep the original byte-perfect upload path (no re-encode, no quality loss).

```ts
async function buildUploadBuffer(localPath: string, highlight: Pick["highlight"]): Promise<{ buf: Buffer; error: string | null }> {
  if (!highlight) {
    return { buf: await fs.promises.readFile(localPath), error: null };
  }
  try {
    const meta = await sharp(localPath).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) {
      return { buf: await fs.promises.readFile(localPath), error: "missing image metadata" };
    }
    const svg = rectSvg(W, H, highlight.bbox);
    if (!svg) {
      return { buf: await fs.promises.readFile(localPath), error: "bbox out of range" };
    }
    const buf = await sharp(localPath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buf, error: null };
  } catch (e) {
    return { buf: await fs.promises.readFile(localPath), error: e instanceof Error ? e.message : String(e) };
  }
}
```

The record push becomes:

```ts
const { buf, error: highlightError } = await buildUploadBuffer(frame.localPath, pick.highlight);
await putObject(r2Key, buf, "image/jpeg");

const desc = pick.description?.trim();
records.push({
  frameId,
  r2Key,
  t: frame.t,
  order,
  ...(desc ? { description: desc } : {}),
  ...(pick.highlight && !highlightError ? { highlight: pick.highlight } : {}),
  ...(highlightError ? { highlightError } : {}),
});
```

If drawing fails, the un-annotated original JPEG is still uploaded — the screenshot is not lost. The error is surfaced on the doc for debugging but the task succeeds.

**Sharp + SVG composite note.** The SVG returned by `rectSvg` carries explicit `width="${W}" height="${H}"` matching the underlying raster, so sharp does not consult a density / DPI default when rasterizing — the overlay lands at 1:1 with the base image.

**5.3 `rectSvg(W, H, bbox)` helper** — pure, unit-testable. Returns an SVG string (or `null` if bbox is degenerate / out of range) with one `<rect>` rendered against a `W × H` viewBox.

```ts
export function rectSvg(W: number, H: number, bbox: { x: number; y: number; w: number; h: number }): string | null {
  // Reject degenerate or wildly out-of-range bboxes before clamping
  if (bbox.w < 0.005 || bbox.h < 0.005) return null;
  if (bbox.x + bbox.w > 1.05 || bbox.y + bbox.h > 1.05) return null;
  if (bbox.x < -0.05 || bbox.y < -0.05) return null;
  const x = clamp01(bbox.x);
  const y = clamp01(bbox.y);
  // Clip width/height to the remaining space so a rect with x=0.9, w=0.2 ends at the right edge instead of overshooting
  const w = Math.min(1 - x, Math.max(0, bbox.w));
  const h = Math.min(1 - y, Math.max(0, bbox.h));
  const stroke = Math.max(4, Math.round(H * 0.005));
  // SVG strokes are centered on the path edge. Insetting by stroke/2 keeps the outer edge of the stroke aligned with the bbox the LLM picked, rather than overhanging it. (It does not protect against canvas-edge clipping; sharp will clip strokes that extend past the SVG viewBox regardless.)
  const px = Math.round(x * W) + Math.round(stroke / 2);
  const py = Math.round(y * H) + Math.round(stroke / 2);
  const pw = Math.max(1, Math.round(w * W) - stroke);
  const ph = Math.max(1, Math.round(h * H) - stroke);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#F5C518" stroke-width="${stroke}" rx="6" ry="6"/></svg>`;
}
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
```

Stroke colour `#F5C518` matches the Guidde yellow. `rx`/`ry` give the rectangle a small corner radius matching the reference. The `0.005` degenerate-size floor (~5 px at 1080p) and `1.05` overshoot tolerance are deliberate, modest values — tune later if the LLM systematically returns boxes outside these bounds.

**5.4 `processSopScreenshots.ts`.** No changes — types flow through the existing call to `runUploadScreenshots`.

**5.5 SOP API (`src/app/api/sop/[id]/route.ts`).** Include `highlight` in each screenshot entry alongside `description`. The viewer doesn't use it yet (rectangle is baked), but exposing it keeps the API symmetric with Mongo for future overlay-mode work.

```ts
screenshots: (s.screenshots ?? []).map(ss => ({
  frameId: ss.frameId,
  url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
  t: ss.t,
  order: ss.order,
  description: ss.description,
  highlight: ss.highlight,
})),
```

## 6. Viewer

No code changes. The `<img>` tag in `StepCardScreenshots.tsx` renders the JPEG, which already has the yellow rectangle baked in. The optional `highlight` field on the response is unused for now.

If the user later decides to switch to overlay mode, the change is local to `StepCardScreenshots.tsx` and `uploadScreenshots.ts` (stop baking, render SVG over `<img>`). The Mongo and API shapes already support it.

## 7. Coordinate handling, edge cases

- **Scale path.** LLM sees the image after `downscaleToMaxEdge(1280)`. It returns normalized bbox. `uploadScreenshots` draws on the **original** (un-downscaled) frame JPEG. Multiplying normalized coords by the original `W × H` preserves rectangle position.
- **Bad bbox.** Strongly negative origins (`x < -0.05`) or `x+w > 1.05` → treat highlight as null, record `highlightError`. Mild overshoot is absorbed by clipping `w` to `1 - x`. Never crashes the upload.
- **Tiny bbox.** `w < 0.005` or `h < 0.005` rejected as degenerate (likely model error).
- **Edge-touching bbox.** A bbox flush against the right or bottom edge gets its `w`/`h` clipped to `1 - x` / `1 - y`, so the rectangle is fully inside the canvas.
- **Mobile.** Tap targets reuse `kind: "click"`. The prompt explicitly mentions "tapping". No separate gesture rendering for the POC.

## 8. Testing

**8.1 Unit tests.**

- `src/trigger/stages/uploadScreenshots.test.ts` (NEW — currently no tests on this file). Test `rectSvg` in isolation:
  - Normal case: `rectSvg(1920, 1080, { x: 0.1, y: 0.2, w: 0.3, h: 0.05 })` returns an SVG containing `<rect ... width="..." stroke="#F5C518" ...>` with expected pixel-scaled width/height.
  - Degenerate case: `w: 0.001` returns `null`.
  - Out-of-range case: `x: 0.9, w: 0.5` (sum 1.4 > 1.05) returns `null`.
  - Mild-overshoot clip: `x: 0.9, w: 0.15` (sum 1.05, within tolerance) renders with `w` clipped to `0.1` so the rect ends at the right edge.
  - Strong-negative reject: `x: -0.2` returns `null`.
  - Test `buildUploadBuffer` with a small fixture PNG/JPEG (placed under `src/trigger/stages/__fixtures__/`):
    - `highlight: null` → returns the raw file bytes unchanged (byte-equality check).
    - `highlight` with a valid bbox → returns a different buffer (sharp re-encoded) and no error.
    - `highlight` with a degenerate bbox → returns raw file bytes and `error: "bbox out of range"`.
- `src/trigger/stages/assignScreenshots.test.ts`. Update the existing `resolveCrossStepDedup` and timestamp-order tests to thread `highlight: null` through the `Pick` fixtures. Add one case: a `Pick` with a non-null `highlight` survives dedup unchanged. (Logic is field-agnostic; the test just guards against accidental shape regressions.)

**8.2 End-to-end smoke.**

- Re-run `samples/3.mp4` (Vietnamese cooking video — no UI interactions). Expect: pipeline succeeds, all screenshots have `highlight: undefined`, no yellow rectangles drawn. This proves the prompt does not hallucinate boxes on non-app content.
- Run `samples/hubspot_crm.mp4` (CRM app demo). Expect: most screenshots have `highlight` populated with `kind: "click"` and rectangles drawn around buttons / form fields. Visually verify in the viewer that rectangles sit on the right elements.

## 9. Out of scope (explicit)

- Curved arrows and "Click X" text labels.
- Overlay-mode rendering (rectangle as SVG/CSS in viewer).
- Upload-time toggle for "is this an app demo".
- Backfill of prior screenshot-mode SOPs.
- Clip-mode, Loom, PDF, silent-path changes.
- Mobile gesture-specific rendering (tap pulse, swipe paths).
- User-edit UI for adjusting bbox.
