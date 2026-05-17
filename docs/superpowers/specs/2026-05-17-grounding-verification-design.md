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

1. `mkdtemp` a temp dir (mirrors `runLocateHighlight`'s pattern).
2. Render the yellow circle at `point` onto `framePath` (reuse
   `buildBufferWithOptionalHighlight` from `uploadScreenshots.ts` with a
   `{ point }` geom — it already composites `circleSvg` via `sharp`) and write
   the buffer to a file inside the temp dir.
3. Call `llmJsonVision` with the rendered image, `model`, the `GroundingCheck`
   schema, `maxRetries: config.ai.maxRetries` (= 1), and the user message
   defined below.
4. Return `true` for `onElement: "yes"`, `false` for `"no"`.
5. **Fail-open:** if the verifier call throws (outage, or parse failure after
   the 1 retry), return `true` — never lose a highlight because the *critic*
   failed.
6. `rm` the temp dir, recursive, in a `finally`.

`framePath` passed in is the downscaled (≤1280px) copy `runLocateHighlight`
created — `pointFallbackHighlight` already receives that path as `args.framePath`
— so no extra resizing is needed. `verifyGroundedPoint` does NOT depend on
`runLocateHighlight`'s tmpdir surviving: it reads `framePath` and writes its own
temp dir; it must run **awaited inside `pointFallbackHighlight`** (which is
itself awaited by `runLocateHighlight` before that tmpdir is removed), so the
`framePath` read completes before cleanup.

**Verifier user message** (`llmJsonVision` requires a `userText`; the system
prompt is the language-only template):
```
Target element: "${caption}". A yellow circle has been drawn on the screenshot.
Is the centre of that circle on the target element? Answer strict JSON.
```

`caption` source: `pointFallbackHighlight` receives `args.intent`, which
`highlightActions` sets to `action.description`. For element actions
`description` equals the canonical `elementCaption` (set by `buildActionsForStep`).
So `verifyGroundedPoint` is called with `caption: args.intent` — **no new
plumbing through `HighlightFn` / `HighlighterFn` is needed.**

### Modified: `pointFallbackHighlight` in `locateHighlight.ts`

The fallback chain becomes a verify-and-retry loop. Crucially, per grounder it
records **three** distinct outcomes — `errored` (threw), `point` (a returned
point, possibly null), and `verified` — because the final no-highlight reason
still depends on the throw-vs-null distinction:

```
results = []                            # one entry per grounder, in order
for grounder in [uiTars, qwen]:
    errored = false; point = null
    try: point = ground(grounder)       # may return a point or null
    except: errored = true
    if point is not null:
        if verify(point): return yesDecision(point)      # PASSED — accept, stop
    results.push({ errored, point })     # record for the fallbacks below

# no grounder passed verification — best-effort, then no-highlight:
firstPoint = first results entry whose point is not null   # UI-TARS preferred (order)
if firstPoint exists: return yesDecision(firstPoint)        # unverified best-effort
# nothing was ever grounded:
allErrored = every results entry has errored == true
return no-highlight with reason:
    "grounding_unavailable" if allErrored else "no_specific_target"
```

**Full decision table** (UI-TARS row × Qwen column; cell = outcome):

| UI-TARS \ Qwen | threw | found nothing | point fails verify | point passes verify |
|---|---|---|---|---|
| **threw** | no-highlight `grounding_unavailable` | no-highlight `no_specific_target` | use Qwen point (best-effort) | use Qwen point |
| **found nothing** | no-highlight `no_specific_target` | no-highlight `no_specific_target` | use Qwen point (best-effort) | use Qwen point |
| **point fails verify** | use UI-TARS point (best-effort) | use UI-TARS point (best-effort) | use UI-TARS point (best-effort) | use Qwen point |
| **point passes verify** | use UI-TARS point | use UI-TARS point | use UI-TARS point | use UI-TARS point |

Reading the table: a verified point always wins; UI-TARS is verified first, so
a passing UI-TARS point short-circuits before Qwen is called at all. When no
point verifies, the earliest grounder that *returned* a point wins (UI-TARS
preferred). No-highlight only when neither grounder returned any point, and the
reason is `grounding_unavailable` iff *both* threw.

Behaviour notes:
- **Common case (~96%)** — UI-TARS grounds, verification passes: one UI-TARS
  call + one verify call. No Qwen call.
- **Miss case (~4%)** — UI-TARS point fails verification: one Qwen call + a
  second verify call. If Qwen passes, its point is used; else the UI-TARS point
  is kept as best-effort — **no regression vs today**, where that point would
  have been used unconditionally.
- A point is verified **at most once** — each grounder yields one point,
  verified immediately; the loop never re-verifies.
- The verifier is **injectable** (a `verify` dependency alongside the existing
  `GroundDeps`) so tests run without network. `verify` has the signature of a
  bound `verifyGroundedPoint` — `(point, framePath, caption) => Promise<boolean>`.

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
- `ai.prompts.verifyHighlightSystem(lang)` — a `(lang) => string` function
  matching the existing prompt shape. Content: the model is shown a screenshot
  with a yellow circle drawn on it; it must judge whether the circle's centre
  lands on the named UI element; output strict JSON `{ "onElement": "yes" |
  "no" }`. (`lang` is accepted for signature consistency with sibling prompts;
  the task is language-agnostic, so the body need not vary by language.)

## Cost & latency

- Verifier ≈ one `gemini-2.5-flash` vision call per **element** screenshot
  (~72/run — the baseline run had 84 screenshots total, of which ~12 are `view`
  actions that have no highlight and are skipped):
  ~1,300-token image + tiny output ≈ **$0.0004–0.0006/call** → **~$0.03–0.04/run**.
- Retries (the ~4–15% that fail): an extra Qwen ground (~$0.00013) + a second
  verify (~$0.0005) each → **+~$0.005** total.
- **Total verification cost ≈ +$0.035–0.05/run** ($0.22 → ~$0.26).
- The verify call runs inside `verifyGroundedPoint` → inside
  `pointFallbackHighlight` → inside `runLocateHighlight` → inside
  `highlightActions`, which the pipeline wraps in `withStage("highlight")`.
  `withStage` uses `AsyncLocalStorage`; the verify call is awaited within that
  async chain, so `llmJsonVision`'s `recordOpenRouterUsage` → `recordCost`
  reads the active `"highlight"` stage. Verification cost auto-attributes to
  the `highlight` stage in `aiCost.byStage` — no new stage wrapper needed.
- Latency: ~72 extra sequential vision calls add roughly 2–4 min wall-clock.
  Acceptable for this POC; parallelising the highlight stage is a separate,
  optional optimisation and is **not** in scope here.

## Error handling

- **Verifier throws / unparseable** (after `maxRetries: 1`) → `verifyGroundedPoint`
  returns `true` (fail-open) — degrade to today's no-verification behaviour,
  never drop a highlight because the critic failed.
- **Grounder throws** → recorded as `errored` for that grounder; the loop moves
  on (see the decision table).
- **Both grounders fail to produce a point** → unchanged no-highlight decision,
  with `grounding_unavailable` iff both threw, else `no_specific_target`.
- **Temp dir** always removed (recursive) in a `finally`.

## Risks

- **Verifier false-negative** (rejects a correct point) — worst case it triggers
  a needless Qwen call and, if neither passes, the original UI-TARS point is
  still kept. No accuracy regression, only marginal extra cost.
- **Verifier false-positive** (accepts a wrong point) — the residual the pass
  cannot catch; realistic ceiling is ~98%, not 100%. Accepted.
- **Latency** — addressed above; accepted for the POC.

## Testing

- `verifyHighlight.test.ts` — injected fake `visionFn`, real (small) fixture
  image on disk so the `sharp` composite runs:
  - verifier returns `{onElement:"yes"}` → `verifyGroundedPoint` returns `true`;
  - returns `{onElement:"no"}` → returns `false`;
  - `visionFn` throws → returns `true` (fail-open);
  - the temp dir created by the call no longer exists afterwards (capture the
    path the implementation uses, or assert no stray `highlight-verify-*` dirs
    remain in `os.tmpdir()`).
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
