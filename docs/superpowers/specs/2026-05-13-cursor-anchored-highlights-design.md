# Cursor-Anchored Click Highlights — Design

**Date:** 2026-05-13
**Status:** Approved (incremental fix on top of `2026-05-13-click-highlights-design.md`)

## 1. Problem

The vision LLM (Gemini 2.5 Flash) returns visually plausible but spatially wrong bboxes. Two failure modes observed on the HubSpot demo:

1. **Idle frames get a highlight.** Frames where the cursor is in whitespace (hover, post-click idle) receive a bbox over random nearby text.
2. **Bbox is far from the actual cursor.** The LLM picks an unrelated UI element instead of the one the cursor is on.

Both come from the same root cause: nothing anchors the LLM's bbox to the visible cursor.

## 2. Solution

Force cursor-first reasoning in the LLM, and validate server-side that the returned bbox actually contains the reported cursor. Single LLM call — no extra cost.

### 2.1 Schema change

Add a `cursor` field per pick. The LLM must report where it sees the cursor before producing a highlight.

```ts
export const Cursor = z.object({ x: z.number(), y: z.number() });

export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    description: z.string().nullable(),
    cursor: Cursor.nullable(),       // NEW — null if no cursor visible
    highlight: Highlight.nullable(), // null if no clear click/input target
  })),
});
```

Coordinates remain normalized 0..1 against the image as shown to the LLM (same frame as `highlight.bbox`).

### 2.2 Prompt change

Add to `screenshotPickSystem` (replacing the existing highlight paragraph):

> **Locate the cursor first.** Find the mouse cursor in the image. Report its tip point (where a click would land) as `"cursor": {"x": ..., "y": ...}` normalized 0..1.
>
> If you cannot see a cursor (it is hidden, off-screen, or this is a mobile/tap demo), set `"cursor": null` AND `"highlight": null`.
>
> If the cursor is visible but resting on empty whitespace, a background, or a non-interactive element, set `"highlight": null` (still report the cursor).
>
> Only return a `highlight` when the cursor is clearly resting on a specific interactive UI element (button, link, tab, menu item, icon, text field). The bbox **must contain the cursor point** and tightly bound that element. If unsure, return `"highlight": null`.

Keep `kind: "click" | "input"` as before.

### 2.3 Server-side validation

In `assignScreenshots.ts`, after parsing the LLM response, drop the highlight (set to `null`) when:

- `cursor` is null, OR
- the bbox does not contain `cursor` within a small margin (5% of bbox dimensions to absorb minor LLM imprecision).

Validator:

```ts
function bboxContainsCursor(bbox: BBox, cursor: Cursor, marginFrac = 0.05): boolean {
  const mx = bbox.w * marginFrac;
  const my = bbox.h * marginFrac;
  return (
    cursor.x >= bbox.x - mx &&
    cursor.x <= bbox.x + bbox.w + mx &&
    cursor.y >= bbox.y - my &&
    cursor.y <= bbox.y + bbox.h + my
  );
}
```

Log dropped highlights at `info` level so we can monitor false-positive rate.

The `cursor` field itself is **not persisted to Mongo** — it's only used for validation, then discarded. This keeps the Screenshot interface unchanged.

## 3. Out of scope

- Detecting the cursor with CV/template matching (deferred — LLM self-report is enough as long as we validate the bbox against it)
- Frame-diff click gating (deferred follow-up if false positives persist after this fix)
- Mobile tap detection (set highlight=null on these frames; cursor=null naturally handles it)
- Confidence scores

## 4. Acceptance

- All existing unit tests still pass
- New unit tests for `bboxContainsCursor` and the assign-stage validator behavior
- Smoke test on `samples/hubspot_crm.mp4`: spot-check screenshots; rectangles align with cursor or are absent on idle frames
