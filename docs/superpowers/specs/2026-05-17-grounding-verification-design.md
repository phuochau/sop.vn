# Grounding Verification Pass — Design

**Date:** 2026-05-17
**Status:** Approved direction (user requested build), ready for implementation plan
**Goal:** Raise screenshot accuracy past ~96% by catching mis-placed highlight
circles — a reflection (generator → verifier → retry) loop on the grounding step.

---

## Problem

The pipeline is at ~96% sampled accuracy (25/26). Classification and captioning
are effectively solved — every sampled screenshot showed the right screen with a
correct Vietnamese caption. The **one** residual failure mode is **UI-TARS
point-grounding precision**: on dense screens (a contacts table, a deal board)
the grounder occasionally locks onto a plausible-but-wrong element — e.g. it put
the highlight circle on an email cell instead of the Import button.

The current grounder (`pointFallbackHighlight` in
`src/trigger/stages/locateHighlight.ts`) is a plain fallback chain with **no
verification**:

1. UI-TARS (`config.ai.pointPrimaryModel`) → pixel coordinates.
2. Qwen3-VL (`config.ai.pointFallbackModel`) — only if UI-TARS *throws or
   returns no point*.
3. Whatever comes back is accepted and drawn. No check.

The weak point is step 3: UI-TARS's first answer is final, even when it is
confidently wrong.

## Solution: a verification (reflection) loop

Treat the grounded point as a *proposal*, not the answer. After a grounder
returns a point, render the circle and ask a cheap vision model one yes/no
question: *is the circle on the right element?* On "no", try the next grounder;
keep a point that passes.

The key asymmetry: producing an exact point is hard (needs UI-TARS); judging
"is this circle on «Import button»?" is easy discrimination that a cheap VLM
does reliably. A cheap verifier can therefore police an occasionally-sloppy
locator cost-effectively.

### Scope

**In scope:** verification of the grounded *point* (the highlight circle).

**Explicitly out of scope — deferred:** verification of *frame selection*
(whether the chosen `displayFrameIndex` shows the right screen). The 26-shot
sample had zero wrong-frame misses — frame selection is currently clean — and
verifying it would need the per-event frame *window* retained past the classify
stage (plumbing) for no measurable current gain. Documented here as a future
extension; not built now.

## Architecture

### New module: `src/trigger/stages/verifyHighlight.ts`

```
verifyGroundedPoint({ framePath, point, caption, model, visionFn? }): Promise<boolean>
```

1. Render the yellow circle at `point` onto `framePath` (reuse
   `buildBufferWithOptionalHighlight` from `uploadScreenshots.ts` with a
   `{ point }` geom — it already composites `circleSvg` via `sharp`).
2. Write the rendered buffer to a temp file.
3. Call `llmJsonVision` with the rendered image, `config.ai.verifyModel`, and a
   `GroundingCheck` schema → `{ onElement: "yes" | "no" }`.
4. Return `true` for "yes", `false` for "no".
5. **Fail-open:** if the verifier call throws (outage, parse failure after
   retries), return `true` — never lose a highlight because the *critic* failed.
6. Always clean up the temp file (`finally`).

`framePath` passed in is already the downscaled (≤1280px) copy that
`runLocateHighlight` produced, so no extra resizing is needed.

### Modified: `pointFallbackHighlight` in `locateHighlight.ts`

The fallback chain becomes a verify-and-retry loop:

```
for grounder in [uiTars, qwen]:
    point = ground(grounder)            # null if it throws or finds nothing
    if point is null: continue
    if verify(point): return yesDecision(point)   # passed — accept
    remember point as a fallback candidate
# no grounder passed verification:
if any fallback candidate: return yesDecision(first candidate)   # best-effort
return no-highlight (no_specific_target / grounding_unavailable as today)
```

Behaviour notes:
- **Common case (~96%)** — UI-TARS grounds, verification passes: one UI-TARS
  call + one verify call. No Qwen call.
- **Miss case (~4%)** — UI-TARS point fails verification: one Qwen call + a
  second verify call. If Qwen passes, its point is used; if neither passes, the
  UI-TARS point is kept as best-effort (no regression vs today — today that
  point would have been used unconditionally).
- The `no-highlight` reasons (`grounding_unavailable` when both grounders threw,
  `no_specific_target` when both found nothing) are unchanged.
- The verifier is **injectable** (a `verify` dependency alongside the existing
  `GroundDeps`) so tests run without network.

### New schema: `GroundingCheck` in `src/lib/schemas.ts`

```typescript
export const GroundingCheck = z.object({
  onElement: z.enum(["yes", "no"]),
});
```

Expressible with the `zodToJsonSchemaLike` subset (`ZodObject` + `ZodEnum`).

### New config

`src/config/index.ts`:
- `ai.verifyModel: "google/gemini-2.5-flash"` — the cheap critic VLM.
- `ai.prompts.verifyHighlightSystem(lang)` — instructs the model: a yellow
  circle has been drawn on the screenshot; answer whether its centre is on the
  named UI element; output strict JSON `{ "onElement": "yes" | "no" }`.

## Cost & latency

- Verifier ≈ one `gemini-2.5-flash` vision call per element screenshot (~72/run):
  ~1,300-token image + tiny output ≈ **$0.0004–0.0006/call** → **~$0.03–0.04/run**.
- Retries (the ~4–15% that fail): an extra Qwen ground (~$0.00013) + a second
  verify (~$0.0005) each → **+~$0.005** total.
- **Total verification cost ≈ +$0.035–0.05/run** ($0.22 → ~$0.26).
- The verify calls run inside `highlightActions`, which the pipeline already
  wraps in `withStage("highlight")`, and `llmJsonVision` records OpenRouter
  usage — so verification cost auto-attributes to the `highlight` stage in
  `aiCost.byStage`. No new stage wrapper needed.
- Latency: ~72 extra sequential vision calls add roughly 2–4 min wall-clock.
  Acceptable for this POC; parallelising the highlight stage is a separate,
  optional optimisation and is **not** in scope here.

## Error handling

- **Verifier throws / unparseable** → `verifyGroundedPoint` returns `true`
  (fail-open) — degrade to today's no-verification behaviour, never drop a
  highlight because the critic failed.
- **Grounder throws** → unchanged: that grounder contributes no candidate; the
  loop moves on.
- **Both grounders fail to produce a point** → unchanged no-highlight decision.
- **Temp file** always removed in a `finally`.

## Risks

- **Verifier false-negative** (rejects a correct point) — worst case it triggers
  a needless Qwen call and, if neither passes, the original UI-TARS point is
  still kept. No accuracy regression, only marginal extra cost.
- **Verifier false-positive** (accepts a wrong point) — the residual the pass
  cannot catch; realistic ceiling is ~98%, not 100%. Accepted.
- **Latency** — addressed above; accepted for the POC.

## Testing

- `verifyHighlight.test.ts` — injected fake `visionFn`:
  - verifier returns `{onElement:"yes"}` → `verifyGroundedPoint` returns `true`;
  - returns `{onElement:"no"}` → returns `false`;
  - `visionFn` throws → returns `true` (fail-open);
  - temp file is cleaned up (assert the temp dir is gone after the call).
- `locateHighlight.test.ts` — extend with injected `verify`:
  - UI-TARS point passes verification → used, Qwen never called;
  - UI-TARS point fails, Qwen point passes → Qwen point used;
  - both points fail verification → UI-TARS point kept as best-effort;
  - UI-TARS throws, Qwen point passes → Qwen point used (existing fallback still
    works alongside verification).
- Typecheck: `npx tsc --noEmit -p tsconfig.json`.
- E2E: re-run the untrimmed HubSpot video; compare sampled accuracy + cost
  against `stable-2026-05-17-caption-canonicalization` (84 screenshots, ~96%,
  $0.2229). Expect accuracy ≥ baseline and cost ≈ $0.26.

## Future work (not in this plan)

Frame-selection verification — extend the verifier (or add a sibling) to also
check the chosen display frame shows the expected `screenName`, retrying with a
different window frame on failure. Requires retaining each event's frame window
past `classifyStepWithLLM`. Low current yield (frame selection samples clean);
revisit only if a regression appears.
