# Caption Canonicalization & Step-Wide Dedup — Design

**Date:** 2026-05-17
**Status:** Approved, ready for implementation plan
**Goal:** Raise screenshot-pipeline accuracy from ~85–90% by removing redundant
duplicate screenshots and fixing inconsistent / wrong-language element captions.

---

## Problem

The screenshots pipeline classifies each detected click-event candidate with
`maxCandidatesPerCall: 1` — one candidate per LLM vision call. This was the fix
that got accuracy to ~90% (batching ~100+ images mis-mapped candidate→image).

The side effect: **every candidate is classified in complete isolation.** The
model never sees the other candidates in a step, so it cannot:

1. **Keep captions consistent.** The same button gets different captions across
   candidates — e.g. `"more dropdown"` vs `"nút xem thêm"`; `"contacts link"`
   appears 3× with varying casing. (Failure mode #1 — duplicates.)
2. **Keep one output language.** Output language is `vi`, but ~60% of captions
   came back in English (`"Get started free button"`, `"Save button"`,
   `"email icon"`). (Failure mode #2 — language.)

Evidence: classifier `decisions.json` from the full untrimmed HubSpot run
(SOP `6a099771add795c5188ceacc`). Per-step duplicate clusters observed:
`"Companies link"` ×4, `"contacts link"` ×3, `"View Companies link/button"` ×3,
`"Import button"` ×2.

Verified NON-issues (investigated, no fix needed):
- Over-dropped events (`verb: null`): sampled discards were all correct —
  presenter talking-head (`not_a_ui`), loading spinners (`animation`).
- Wrong-frame-within-window (e.g. `"more dropdown"` showing the Import page) —
  real but separate; addressed by Phase 2 (visual verification), out of scope.

## Existing pipeline (relevant slice)

```
classifyAndRemap  →  buildActionsForStep  →  collapseDuplicateActions  →  highlightActions  →  uploadScreenshots
(per step, in the processSopScreenshots step loop)
```

- `classifyAndRemap` returns `ClassifiedActionRecord[]` — each has `verb`,
  `screenName`, `elementCaption`, `displayFramePath`.
- `buildActionsForStep` groups survivors by `(normalizeScreenName,
  normalizeElementId)` but only collapses records **within `dedupWindowSec` (4s)**
  of a cluster anchor. Far-apart repeats of the same element survive as separate
  actions. Produces `Action[]` with `description = elementCaption`; `screenName`
  is used only in the dedup key and then **discarded**.
- `Action` type (`src/lib/schemas.ts:105`) carries `verb`, `description`,
  `displayFramePath`, `time` — **no `screenName`, no `elementCaption`**.
- `collapseDuplicateActions` collapses adjacent same-verb actions whose display
  frames are perceptually near-identical (CV multi-fires). Text-blind.
- `uploadScreenshots` writes `description` + `verb` to the `Screenshot` doc. The
  `Screenshot` type declares `screenName?` / `elementCaption?` but nothing
  populates them — dead schema.

## Solution overview

Add a **text-only reconciliation pass** after classification, then make the
existing dedup step-wide instead of time-windowed.

```
classifyAndRemap → canonicalizeActions → buildActionsForStep → collapseDuplicateActions → highlightActions → uploadScreenshots
                   ^^^ NEW                ^^^ MODIFIED
```

### Stage A — `canonicalizeActions` (new stage)

A text-only LLM pass over one step's surviving classified records. No images, so
it is cheap (~$0.001–0.002 per step via `llmJson`).

**Input:** the step's `ClassifiedActionRecord[]` and the output `language`.
**Output:** the same records with `screenName` and `elementCaption` rewritten to
canonical form.

The LLM receives a JSON array of `{ index, screenName, elementCaption, verb }`
for every record whose `decision === "action"` and whose `screenName` /
`elementCaption` are non-null. It returns `{ index, screenName, elementCaption }`
for each, applying these rules (encoded in the system prompt):

- Translate every `screenName` and `elementCaption` to `language`. Keep brand /
  product / technical terms (e.g. "HubSpot", "CRM", "CSV") in their original
  form.
- When two captions clearly refer to the **same element** (synonyms, mixed
  language, casing differences), output the **identical** canonical string for
  both. Do NOT merge captions for genuinely different elements, even if similar.
- Normalize casing and whitespace; keep captions short and reusable (an element
  name, not a sentence).

`canonicalizeActions` maps the LLM output back onto the records by `index`.
Records the LLM omits, or that fail validation, keep their original values
(fail-safe — never lose a record). Discarded records pass through untouched.

The pipeline wraps the call in `withStage("canonicalize")` so its cost lands in
the per-run `aiCost` breakdown.

### Stage B — step-wide dedup in `buildActionsForStep` (modified)

After canonicalization, every repeat of one element shares an identical
`(screenName, elementCaption)` key. Change the dedup so **all records sharing a
key collapse into one action**, regardless of time gap — drop the
`dedupWindowSec` time-window cluster splitting.

- Keying stays `(normalizeScreenName, normalizeElementId)` — `normalizeScreenName`
  still separates the same-named element on different screens (e.g. a "Skip"
  button on consecutive wizard screens), so cross-screen actions are never
  merged.
- The earliest record (by event time) anchors; later ones collapse into it.
- `input`-verb precedence within a cluster is preserved (existing behaviour).
- The `dedupWindowSec` config key becomes unused — remove it from
  `src/config/index.ts` and the `classify` config object.

`collapseDuplicateActions` still runs afterward unchanged — it catches CV
multi-fires whose canonical captions legitimately differ but whose frames are
near-identical. The two are complementary: Stage B is text-keyed, collapse is
frame-keyed.

### Action / Screenshot threading

Thread `screenName` and `elementCaption` through to the persisted doc so the
`Screenshot.screenName` / `Screenshot.elementCaption` fields stop being dead
schema (and Phase 2 / the UI can use them):

- Add `screenName: string` and `elementCaption: string` to the `Action` type.
  For `view` actions (no element), set `screenName` to the screen's functional
  name if available else `""`, and `elementCaption` to `""`.
- `buildActionsForStep` populates both on every `Action` it emits (it already
  has the values on its input records).
- `collapseDuplicateActions` carries both through unchanged (`{ ...a, order }`
  already preserves them).
- `uploadScreenshots` writes `screenName` and `elementCaption` onto the
  `Screenshot` doc alongside the existing `description` / `verb`.

`description` keeps its current meaning (the caption shown to users) — it equals
`elementCaption` for element actions and the fixed view-caption for `view`
actions. No UI change required; this only fills the previously-empty fields.

## Error handling

- **Canonicalize LLM call fails** (after `llmJson` retries): catch in
  `canonicalizeActions`, log a warning, return the input records unchanged. The
  pipeline proceeds with raw captions — degraded, not broken.
- **LLM omits an index or returns malformed entry:** that record keeps its
  original `screenName` / `elementCaption`.
- **LLM returns an unknown index:** ignored.
- Stage B is pure/in-memory — no new failure modes; if canonicalization was
  skipped it simply collapses fewer duplicates (current behaviour, minus the
  time window).

## Risks

- **Over-merge:** if canonicalize maps two genuinely different elements to one
  caption, Stage B collapses two real actions → a lost step. Mitigated by the
  explicit prompt rule ("do NOT merge different elements") and by `screenName`
  keying. Accepted risk; measured by the post-implementation accuracy re-run.
- **Under-merge:** if canonicalize leaves captions distinct, Stage B simply
  collapses less — no regression vs today.

## Testing

- `canonicalizeActions.test.ts` — unit tests with an injected fake LLM:
  - synonyms / mixed-language captions → identical canonical strings;
  - distinct elements → kept distinct;
  - LLM omits an index → that record keeps original values;
  - LLM throws → returns input unchanged;
  - discarded (`decision: "discard"`) records pass through untouched.
- `buildActionsForStep.test.ts` — extend / add:
  - two same-`(screen, element)` records 30s apart → one action;
  - same element name on two different `screenName`s → two actions;
  - `input` verb precedence preserved across a collapsed cluster.
- Typecheck: `npx tsc --noEmit -p tsconfig.json`.
- Full-pipeline e2e: re-run the untrimmed HubSpot video, compare screenshot
  count + sampled accuracy against the `stable-2026-05-17-screenshots-90` run
  (85 screenshots, ~87% sampled accuracy, $0.2078).

## Out of scope — Phase 2 (visual verification)

Failure mode #3 (a chosen display frame that does not actually show the
captioned element — e.g. `"more dropdown"` showing the Import page) needs a
per-screenshot vision check with the ability to retry against a different window
frame. That requires retaining each candidate's frame window past the classify
stage — a separate subsystem with its own spec. Documented here; not built now.

## Config changes

`src/config/index.ts`, `screenshots.classify`:
- Remove `dedupWindowSec` (unused after Stage B).
- No new tuning knobs required for Stage A/B.

A new `canonicalizeSystem(lang)` prompt is added under `config.ai.prompts`.
