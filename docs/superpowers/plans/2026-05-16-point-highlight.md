# Point-Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `locateHighlight` stage's loose bounding-box highlight with a precise point highlight — a yellow "click here" circle, located by UI-TARS with a Qwen3-VL fallback.

**Architecture:** A new `src/lib/grounding.ts` exposes two click-point grounders (UI-TARS via plain-text completion, Qwen3-VL via JSON). The `locateHighlight` stage's `defaultHighlighter` is rewritten to a fallback chain (UI-TARS → Qwen3-VL → no-highlight) producing a normalized `point`. `uploadScreenshots` gains a circle renderer. The `bbox` field stays in the schema, deprecated-in-place, so old records still render.

**Tech Stack:** TypeScript, Zod, `sharp` (image compositing), `node:test` + `node:assert`, OpenRouter (vision models).

**Reference:** Design spec — `docs/superpowers/specs/2026-05-16-point-highlight-design.md`. Validated prototypes — `scripts/bbox-proto/uitars.ts`, `scripts/bbox-proto/pointGrounding.ts`.

**Conventions:**
- Run a test file: `npx tsx --test path/to/file.test.ts`
- Typecheck: `npx tsc --noEmit -p tsconfig.json`
- Commits go directly to `master` (project convention). Never use `--no-verify`.
- The import alias `@/` maps to `src/`.

**Schema-design note:** `HighlightDecision.point` is an **optional** nullable key
(`Point.nullable().optional()`), not a required one. This is a deliberate
refinement of the spec's `Point.nullable()`: an optional key means none of the
existing `HighlightDecision` object literals (in `coerceForViewVerb` and the
existing test files) need editing — they simply omit `point`. Only the new
locator code sets it. `HighlightDecision` is no longer passed to an LLM after
Task 3, so the `ZodOptional` it introduces is never JSON-schema-converted.

---

## Task 1: Schema & types — add the optional `point`

Adds the `Point` schema and threads an **optional** `point` field through the
type layer. Because `point` is optional, no existing object literal breaks.

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/mongo.ts`
- Create: `src/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/schemas.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { HighlightDecision } from "./schemas";

test("HighlightDecision accepts a point", () => {
  const parsed = HighlightDecision.parse({
    highlight: "yes",
    point: { x: 0.5, y: 0.4 },
    bbox: null,
    elementCaption: null,
    noHighlightReason: null,
  });
  assert.deepEqual(parsed.point, { x: 0.5, y: 0.4 });
});

test("HighlightDecision allows point to be omitted (optional key)", () => {
  const parsed = HighlightDecision.parse({
    highlight: "no",
    bbox: null,
    elementCaption: null,
    noHighlightReason: "view_action",
  });
  assert.equal(parsed.point ?? null, null);
});

test("HighlightDecision accepts the grounding_unavailable reason", () => {
  const parsed = HighlightDecision.parse({
    highlight: "no",
    point: null,
    bbox: null,
    elementCaption: null,
    noHighlightReason: "grounding_unavailable",
  });
  assert.equal(parsed.noHighlightReason, "grounding_unavailable");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: FAIL — `point` is an unrecognized key / `grounding_unavailable` not in enum.

- [ ] **Step 3: Update `src/lib/schemas.ts`**

Add the `Point` schema directly after the `BBox` schema (after its closing `});`):

```ts
export const Point = z.object({
  x: z.number(),
  y: z.number(),
});
```

Replace the whole `HighlightDecision` definition with:

```ts
export const HighlightDecision = z.object({
  highlight: z.enum(["yes", "no"]),
  point: Point.nullable().optional(),   // primary geometry — set by the new locator
  bbox: BBox.nullable(),                // deprecated; kept so old records validate
  elementCaption: z.string().nullable(),
  noHighlightReason: z
    .enum(["view_action", "no_specific_target", "non_ui_frame", "grounding_unavailable"])
    .nullable(),
});
```

In the `Action` type, replace the `highlight?` member with:

```ts
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
```

- [ ] **Step 4: Update `src/lib/mongo.ts`**

In the `Screenshot` interface, replace the `highlight?` member with:

```ts
  highlight?: {          // optional highlight target, baked into the JPEG
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
```

- [ ] **Step 5: Run the test and typecheck**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: PASS — 3 tests.

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "schemas|mongo"`
Expected: no output. (No other file is edited, so nothing else can break.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts src/lib/mongo.ts src/lib/schemas.test.ts
git commit -m "feat(highlight): add optional point field to highlight schema/types

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Grounding clients — `src/lib/grounding.ts`

The two click-point grounders. Coordinate math is in pure functions
(`parseUiTarsReply`, `qwenToPoint`) so it is exhaustively testable; the IO
wrappers are thin and accept an injectable dependency for tests.

**Files:**
- Create: `src/lib/grounding.ts`
- Create: `src/lib/grounding.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/grounding.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { parseUiTarsReply, qwenToPoint, uiTarsPoint, qwenPoint } from "./grounding";

const FIXTURE = "src/trigger/stages/__fixtures__/sample-1080p.jpg";

test("parseUiTarsReply normalizes absolute pixels to 0-1", () => {
  assert.deepEqual(parseUiTarsReply("(960,540)", 1920, 1080), { x: 0.5, y: 0.5 });
});

test("parseUiTarsReply clamps out-of-range coordinates", () => {
  assert.deepEqual(parseUiTarsReply("(2000,-50)", 1920, 1080), { x: 1, y: 0 });
});

test("parseUiTarsReply returns null when no coordinates present", () => {
  assert.equal(parseUiTarsReply("I cannot find it", 1920, 1080), null);
});

test("qwenToPoint converts a 0-1000 reply to a 0-1 point", () => {
  assert.deepEqual(qwenToPoint({ found: "yes", x: 500, y: 250 }), { x: 0.5, y: 0.25 });
});

test("qwenToPoint returns null when found=no", () => {
  assert.equal(qwenToPoint({ found: "no", x: null, y: null }), null);
});

test("uiTarsPoint parses an injected fetch response", async () => {
  const fakeFetch = (async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: "(480,270)" } }] }),
  })) as unknown as typeof fetch;
  const r = await uiTarsPoint({
    framePath: FIXTURE, intent: "Click Save", verb: "click",
    frameW: 960, frameH: 540, model: "test/model", fetcher: fakeFetch,
  });
  assert.deepEqual(r.point, { x: 0.5, y: 0.5 });
});

test("qwenPoint maps an injected vision response", async () => {
  const fakeVision = (async () => ({ found: "yes", x: 250, y: 750 })) as unknown as typeof import("@/lib/openrouter").llmJsonVision;
  const r = await qwenPoint({
    framePath: FIXTURE, intent: "Click Save", verb: "click",
    model: "test/model", visionFn: fakeVision,
  });
  assert.deepEqual(r.point, { x: 0.25, y: 0.75 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/grounding.test.ts`
Expected: FAIL — `Cannot find module './grounding'`.

- [ ] **Step 3: Create `src/lib/grounding.ts`**

```ts
/**
 * Point grounding clients for the highlight locator.
 *
 * Primary: UI-TARS — a GUI-grounding model. It does NOT support structured
 * JSON output (it ignores response_format and replies in prose), so it is
 * called as a plain chat completion and its free-form "(x,y)" reply — absolute
 * pixels of the image it received — is parsed by regex.
 *
 * Fallback: Qwen3-VL — a standard JSON-capable VLM, used when UI-TARS is
 * unavailable. Coordinates come back on a 0-1000 normalized scale.
 *
 * Both return a frame-normalized point in 0-1, or null when no element is found.
 */
import fs from "node:fs";
import { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";

export type Point = { x: number; y: number }; // 0-1, normalized to the frame

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// --- UI-TARS (primary) ---------------------------------------------------

function uiTarsSystem(verb: string): string {
  return [
    "Locate the single UI element the user interacts with for this step and",
    "output the point to click.",
    `Action verb: ${verb}`,
    "Output ONLY the click coordinates as (x,y) in absolute pixels.",
  ].join("\n");
}

/**
 * Parse a UI-TARS free-form reply (e.g. "(965,393)") into a frame-normalized
 * point. UI-TARS returns ABSOLUTE pixels of the image it was given.
 */
export function parseUiTarsReply(
  raw: string,
  frameW: number,
  frameH: number,
): Point | null {
  const nums = (raw.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  if (nums.length < 2 || frameW <= 0 || frameH <= 0) return null;
  return { x: clamp01(nums[0] / frameW), y: clamp01(nums[1] / frameH) };
}

export async function uiTarsPoint(args: {
  framePath: string;
  intent: string;
  verb: string;
  frameW: number;
  frameH: number;
  model: string;
  fetcher?: typeof fetch;
}): Promise<{ point: Point | null; raw: string }> {
  const fetcher = args.fetcher ?? fetch;
  const b64 = (await fs.promises.readFile(args.framePath)).toString("base64");
  const body = {
    model: args.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `${uiTarsSystem(args.verb)}\nStep intent: ${args.intent}` },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
        ],
      },
    ],
    temperature: 0,
  };
  const res = await fetcher(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
      "X-Title": "SOP.vn",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`UI-TARS ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  return { point: parseUiTarsReply(raw, args.frameW, args.frameH), raw };
}

// --- Qwen3-VL (fallback) -------------------------------------------------

export const PointOutput = z.object({
  found: z.enum(["yes", "no"]),
  x: z.number().nullable(),
  y: z.number().nullable(),
});
export type PointOutput = z.infer<typeof PointOutput>;

function qwenSystem(verb: string): string {
  return [
    "You locate ONE UI element in an app screenshot and return the point to",
    "click on it.",
    "Return x,y in NORMALIZED coordinates on a 0-1000 scale (0 = left/top edge,",
    "1000 = right/bottom edge). Aim for the centre of the element.",
    `Action verb: ${verb}`,
    "If no specific element matches, return found=no with x=null, y=null.",
  ].join("\n");
}

/** Convert a Qwen3-VL 0-1000 reply to a frame-normalized point. */
export function qwenToPoint(out: PointOutput): Point | null {
  if (out.found !== "yes" || out.x === null || out.y === null) return null;
  return { x: clamp01(out.x / 1000), y: clamp01(out.y / 1000) };
}

export async function qwenPoint(args: {
  framePath: string;
  intent: string;
  verb: string;
  model: string;
  visionFn?: typeof llmJsonVision;
}): Promise<{ point: Point | null }> {
  const visionFn = args.visionFn ?? llmJsonVision;
  const out = await visionFn({
    model: args.model,
    system: qwenSystem(args.verb),
    userText: `Intent: ${args.intent}\nVerb: ${args.verb}`,
    imagePaths: [args.framePath],
    schema: PointOutput,
    schemaName: "point_grounding",
    temperature: 0.0,
  });
  return { point: qwenToPoint(out) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/lib/grounding.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "grounding"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/grounding.ts src/lib/grounding.test.ts
git commit -m "feat(highlight): add UI-TARS + Qwen3-VL point grounding clients

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Config + fallback-chain highlighter

Adds the two model IDs to config and rewrites `defaultHighlighter` as a
fallback chain. The chain logic is extracted into `pointFallbackHighlight`,
which accepts injectable grounders so the chain is testable without network.

**Files:**
- Modify: `src/config/index.ts`
- Modify: `src/trigger/stages/locateHighlight.ts`
- Modify: `src/trigger/stages/locateHighlight.test.ts`

- [ ] **Step 1: Add model IDs to config**

In `src/config/index.ts`, inside the `ai:` object, directly after the
`visionModel: "google/gemini-2.5-flash",` line, add:

```ts
    pointPrimaryModel: "bytedance/ui-tars-1.5-7b",
    pointFallbackModel: "qwen/qwen3-vl-32b-instruct",
```

- [ ] **Step 2: Write the failing test**

In `src/trigger/stages/locateHighlight.test.ts`, add `pointFallbackHighlight`
to the **existing** import from `./locateHighlight` so the line reads:

```ts
import { coerceForViewVerb, type HighlighterFn, pointFallbackHighlight, runLocateHighlightWith } from "./locateHighlight";
```

Then append these tests at the end of the file:

```ts
const okFrame = "src/trigger/stages/__fixtures__/sample-1080p.jpg";

test("pointFallbackHighlight uses the UI-TARS point when found", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: { x: 0.4, y: 0.6 }, raw: "(x,y)" }),
      qwen: async () => { throw new Error("should not be called"); },
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.4, y: 0.6 });
  assert.equal(out.bbox, null);
});

test("pointFallbackHighlight falls back to Qwen when UI-TARS finds nothing", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: null, raw: "no" }),
      qwen: async () => ({ point: { x: 0.7, y: 0.2 } }),
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.7, y: 0.2 });
});

test("pointFallbackHighlight falls back to Qwen when UI-TARS throws", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => { throw new Error("provider down"); },
      qwen: async () => ({ point: { x: 0.3, y: 0.3 } }),
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.3, y: 0.3 });
});

test("pointFallbackHighlight reports no_specific_target when both find nothing", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: null, raw: "no" }),
      qwen: async () => ({ point: null }),
    },
  );
  assert.equal(out.highlight, "no");
  assert.equal(out.noHighlightReason, "no_specific_target");
});

test("pointFallbackHighlight reports grounding_unavailable when both throw", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => { throw new Error("down"); },
      qwen: async () => { throw new Error("down"); },
    },
  );
  assert.equal(out.highlight, "no");
  assert.equal(out.noHighlightReason, "grounding_unavailable");
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/locateHighlight.test.ts`
Expected: FAIL — `pointFallbackHighlight` is not exported by `./locateHighlight`.

- [ ] **Step 4: Rewrite the highlighter in `src/trigger/stages/locateHighlight.ts`**

Add this import next to the existing imports:

```ts
import { uiTarsPoint, qwenPoint } from "@/lib/grounding";
```

**Remove the now-unused import** — the old `defaultHighlighter` was the only
consumer of `llmJsonVision`, so delete this line:

```ts
import { llmJsonVision } from "@/lib/openrouter";
```

(Keep the `HighlightDecision`, `SubStepPlan`, `config`, `sharp`, `fs`, `os`,
`path` and `z` imports — they are all still used.)

Replace the entire `defaultHighlighter` function with the chain below. (The old
body used `llmJsonVision` + `config.ai.visionModel` + the `locateHighlightSystem`
prompt — all of that goes away.)

```ts
type GroundDeps = {
  uiTars: typeof uiTarsPoint;
  qwen: typeof qwenPoint;
};
const defaultGroundDeps: GroundDeps = { uiTars: uiTarsPoint, qwen: qwenPoint };

function yesDecision(point: { x: number; y: number }): Decision {
  return {
    highlight: "yes",
    point,
    bbox: null,
    elementCaption: null,
    noHighlightReason: null,
  };
}

/**
 * Fallback chain: UI-TARS (primary) -> Qwen3-VL (fallback) -> no-highlight.
 * A grounder "fails" if it throws OR returns no point. If both throw, the
 * reason is `grounding_unavailable` (outage); if both simply find nothing it
 * is `no_specific_target`.
 */
export async function pointFallbackHighlight(
  args: { intent: string; verb: SubStep["verb"]; framePath: string },
  deps: GroundDeps = defaultGroundDeps,
): Promise<Decision> {
  const meta = await sharp(args.framePath).metadata();
  const frameW = meta.width ?? 0;
  const frameH = meta.height ?? 0;

  let uiTarsErrored = false;
  try {
    const r = await deps.uiTars({
      framePath: args.framePath, intent: args.intent, verb: args.verb,
      frameW, frameH, model: config.ai.pointPrimaryModel,
    });
    if (r.point) return yesDecision(r.point);
  } catch {
    uiTarsErrored = true;
  }

  let qwenErrored = false;
  try {
    const r = await deps.qwen({
      framePath: args.framePath, intent: args.intent, verb: args.verb,
      model: config.ai.pointFallbackModel,
    });
    if (r.point) return yesDecision(r.point);
  } catch {
    qwenErrored = true;
  }

  return {
    highlight: "no",
    point: null,
    bbox: null,
    elementCaption: null,
    noHighlightReason:
      uiTarsErrored && qwenErrored ? "grounding_unavailable" : "no_specific_target",
  };
}

const defaultHighlighter: HighlighterFn = (args) =>
  pointFallbackHighlight({ intent: args.intent, verb: args.verb, framePath: args.framePath });
```

Notes for the implementer:
- `sharp`, `config`, `SubStep` (`type SubStep = z.infer<typeof SubStepPlan>`),
  `Decision` (`type Decision = z.infer<typeof HighlightDecision>`) and
  `HighlighterFn` are all already declared at the top of the file — reuse them.
- `runLocateHighlightWith` is unchanged — it still falls back to
  `defaultHighlighter`. A `const` referenced inside a function body that runs
  later is fine regardless of declaration order.
- `defaultHighlighter` ignores `args.language` (the grounders work visually).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/locateHighlight.test.ts`
Expected: PASS — 9 tests (4 original + 5 new).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "locateHighlight|config/index"`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/config/index.ts src/trigger/stages/locateHighlight.ts \
  src/trigger/stages/locateHighlight.test.ts
git commit -m "feat(highlight): UI-TARS -> Qwen3-VL fallback-chain highlighter

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Circle renderer in `uploadScreenshots`

Adds `circleSvg` and widens `buildBufferWithOptionalHighlight` to accept a
highlight geometry — point (circle) or bbox (legacy rect). The signature change
means the two existing bbox-passing tests must be updated to the new shape.

**Files:**
- Modify: `src/trigger/stages/uploadScreenshots.ts`
- Modify: `src/trigger/stages/uploadScreenshots.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/trigger/stages/uploadScreenshots.test.ts`, add `circleSvg` to the
**existing** `import { rectSvg } from "./uploadScreenshots"` line so it reads:

```ts
import { rectSvg, circleSvg } from "./uploadScreenshots";
```

(`buildBufferWithOptionalHighlight` is already imported lower in the file —
do not import it again.)

Update the two existing tests that pass a **bare bbox** so the bbox is wrapped:
- In "buildBufferWithOptionalHighlight returns re-encoded bytes when bbox is
  valid", change the 2nd argument from `{ x: 0.1, y: 0.1, w: 0.2, h: 0.1 }` to
  `{ bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 } }`.
- In "buildBufferWithOptionalHighlight falls back to raw on degenerate bbox...",
  change `{ x: 0.1, y: 0.1, w: 0.001, h: 0.1 }` to
  `{ bbox: { x: 0.1, y: 0.1, w: 0.001, h: 0.1 } }`.
- The "...returns raw bytes when bbox is null" test passes `null` — leave it.

Then append these new tests at the end of the file:

```ts
test("circleSvg places a marker at the normalized point", () => {
  const svg = circleSvg(1000, 500, { x: 0.5, y: 0.5 });
  assert.ok(svg.includes('cx="500"'));
  assert.ok(svg.includes('cy="250"'));
  assert.ok(svg.includes("#F5C518"));
});

test("circleSvg clamps an out-of-range point into the frame", () => {
  const svg = circleSvg(1000, 500, { x: 1.4, y: -0.2 });
  assert.ok(svg.includes('cx="1000"'));
  assert.ok(svg.includes('cy="0"'));
});

test("buildBufferWithOptionalHighlight draws a circle for a point geom", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildBufferWithOptionalHighlight(FIXTURE, {
    point: { x: 0.5, y: 0.5 },
  });
  assert.equal(error, null);
  assert.ok(!buf.equals(raw), "should differ from raw (circle composited)");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: FAIL — `circleSvg` is not exported; `buildBufferWithOptionalHighlight`
rejects the `{ point }` / `{ bbox }` argument shapes.

- [ ] **Step 3: Add `circleSvg` to `src/trigger/stages/uploadScreenshots.ts`**

Add directly after the existing `clamp01` function:

```ts
/** SVG "click here" marker — soft halo, bold ring, centre dot — at a point. */
export function circleSvg(
  W: number,
  H: number,
  point: { x: number; y: number },
): string {
  const cx = Math.round(clamp01(point.x) * W);
  const cy = Math.round(clamp01(point.y) * H);
  const ring = Math.max(14, Math.round(W * 0.016));
  const halo = Math.round(ring * 1.85);
  const dot = Math.max(4, Math.round(W * 0.004));
  const stroke = Math.max(4, Math.round(H * 0.005));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<circle cx="${cx}" cy="${cy}" r="${halo}" fill="#F5C518" fill-opacity="0.12" ` +
    `stroke="#F5C518" stroke-width="3" stroke-opacity="0.45"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${ring}" fill="#F5C518" fill-opacity="0.15" ` +
    `stroke="#F5C518" stroke-width="${stroke}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${dot}" fill="#F5C518"/>` +
    `</svg>`
  );
}
```

- [ ] **Step 4: Widen `buildBufferWithOptionalHighlight`**

Replace the whole `buildBufferWithOptionalHighlight` function with:

```ts
export type HighlightGeom =
  | { point: { x: number; y: number } }
  | { bbox: { x: number; y: number; w: number; h: number } }
  | null;

export async function buildBufferWithOptionalHighlight(
  localPath: string,
  geom: HighlightGeom,
): Promise<{ buf: Buffer; error: string | null }> {
  if (!geom) {
    return { buf: await fs.promises.readFile(localPath), error: null };
  }
  try {
    const meta = await sharp(localPath).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) {
      return { buf: await fs.promises.readFile(localPath), error: "missing image metadata" };
    }
    let svg: string | null;
    if ("point" in geom) {
      svg = circleSvg(W, H, geom.point);
    } else {
      svg = rectSvg(W, H, geom.bbox);
      if (!svg) return { buf: await fs.promises.readFile(localPath), error: "bbox out of range" };
    }
    const buf = await sharp(localPath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buf, error: null };
  } catch (e) {
    return {
      buf: await fs.promises.readFile(localPath),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
```

- [ ] **Step 5: Update the call site in `runUploadScreenshots`**

In `runUploadScreenshots`, replace the `bboxForOverlay` line and the
`buildBufferWithOptionalHighlight` call with:

```ts
      const h = action.highlight;
      const geom: HighlightGeom = h?.point
        ? { point: h.point }
        : h?.bbox
          ? { bbox: h.bbox }
          : null;
      const { buf, error } = await buildBufferWithOptionalHighlight(action.displayFramePath, geom);
```

The rest of the loop (`rec.highlight = action.highlight` and
`rec.highlightError = error`) is unchanged.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: PASS — 12 tests (6 `rectSvg` + 3 `buildBufferWithOptionalHighlight` +
3 new).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "uploadScreenshots"`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/trigger/stages/uploadScreenshots.ts src/trigger/stages/uploadScreenshots.test.ts
git commit -m "feat(highlight): circle renderer for point highlights

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `buildAction` guard — carry the point through

The current guard attaches the highlight only when `args.highlight.bbox` is
truthy. The new locator sets `bbox = null`, so without this change every point
highlight would be silently dropped. The existing `buildAction.test.ts` tests
assert the old bbox behaviour, so the test file is replaced wholesale with
point-based tests.

**Files:**
- Modify: `src/trigger/stages/buildAction.ts`
- Modify: `src/trigger/stages/buildAction.test.ts`

- [ ] **Step 1: Replace `src/trigger/stages/buildAction.test.ts` entirely**

Overwrite the file with:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { buildAction } from "./buildAction";

const subStep = {
  intent: "Click the Sign up button.",
  verb: "click" as const,
  narrationSegmentIds: [0],
  timeWindow: null,
  visualConfidence: "high" as const,
};

test("buildAction composes a click action with a point highlight", () => {
  const a = buildAction({
    stepIndex: 1, order: 2, subStep,
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes", point: { x: 0.4, y: 0.6 },
      bbox: null, elementCaption: null, noHighlightReason: null,
    },
    framePath: "/frame.jpg", frameTime: 12.5, pickedClusterLetter: "A",
  });
  assert.equal(a.stepIndex, 1);
  assert.equal(a.verb, "click");
  assert.equal(a.description, "Click the Sign up button.");
  assert.equal(a.time, 12.5);
  assert.deepEqual(a.highlight, { kind: "click", point: { x: 0.4, y: 0.6 } });
  assert.equal(a.verifyMatch, "yes");
  assert.equal(a.pickedClusterLetter, "A");
});

test("buildAction omits highlight when highlight.highlight === no", () => {
  const a = buildAction({
    stepIndex: 0, order: 0, subStep,
    verify: { match: "yes", reasoning: "ok" },
    highlight: { highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "no_specific_target" },
    framePath: "/x.jpg", frameTime: 0, pickedClusterLetter: "A",
  });
  assert.equal(a.highlight, undefined);
});

test("buildAction omits highlight when the decision has a null point", () => {
  const a = buildAction({
    stepIndex: 0, order: 0, subStep,
    verify: { match: "yes", reasoning: "ok" },
    highlight: { highlight: "yes", point: null, bbox: null, elementCaption: null, noHighlightReason: null },
    framePath: "/x.jpg", frameTime: 0, pickedClusterLetter: "A",
  });
  assert.equal(a.highlight, undefined);
});

test("buildAction coerces select/link verbs to highlight.kind: click", () => {
  const a = buildAction({
    stepIndex: 0, order: 0,
    subStep: { ...subStep, verb: "select" },
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes", point: { x: 0.2, y: 0.3 },
      bbox: null, elementCaption: null, noHighlightReason: null,
    },
    framePath: "/x.jpg", frameTime: 5, pickedClusterLetter: "A",
  });
  assert.equal(a.highlight?.kind, "click");
});

test("buildAction keeps highlight.kind: input for input verb", () => {
  const a = buildAction({
    stepIndex: 0, order: 0,
    subStep: { ...subStep, verb: "input" },
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes", point: { x: 0.2, y: 0.3 },
      bbox: null, elementCaption: null, noHighlightReason: null,
    },
    framePath: "/x.jpg", frameTime: 5, pickedClusterLetter: "A",
  });
  assert.equal(a.highlight?.kind, "input");
});

test("buildAction supports view verb with no highlight", () => {
  const a = buildAction({
    stepIndex: 0, order: 0,
    subStep: { ...subStep, verb: "view", intent: "View the dashboard." },
    verify: { match: "yes", reasoning: "ok" },
    highlight: { highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "view_action" },
    framePath: "/x.jpg", frameTime: 5, pickedClusterLetter: "A",
  });
  assert.equal(a.verb, "view");
  assert.equal(a.highlight, undefined);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/buildAction.test.ts`
Expected: FAIL — the "composes a click action with a point highlight" test
fails: `a.highlight` is `undefined` because the guard still checks `bbox`,
which is null.

- [ ] **Step 3: Update the guard in `src/trigger/stages/buildAction.ts`**

Replace the `if (...) { base.highlight = {...}; }` block with:

```ts
  if (args.highlight.highlight === "yes" && args.highlight.point && args.subStep.verb !== "view") {
    base.highlight = {
      kind: coerceHighlightKind(args.subStep.verb),
      point: args.highlight.point,
    };
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/buildAction.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "buildAction"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/buildAction.ts src/trigger/stages/buildAction.test.ts
git commit -m "feat(highlight): carry the point through buildAction

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Full integration check

No new code — verify the whole project compiles and every touched test passes
together.

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -vE "node_modules" | head -30`
Expected: no output (the project compiles cleanly; `node_modules` declaration
warnings, if any, are filtered out).

- [ ] **Step 2: Run every touched test file**

Run:
```bash
npx tsx --test \
  src/lib/schemas.test.ts \
  src/lib/grounding.test.ts \
  src/trigger/stages/locateHighlight.test.ts \
  src/trigger/stages/uploadScreenshots.test.ts \
  src/trigger/stages/buildAction.test.ts
```
Expected: all tests pass, `# fail 0`.

- [ ] **Step 3: Confirm the data path by reading the code**

Trace and confirm by eye:
- `runLocateHighlight` → downscales → `pointFallbackHighlight` → `Decision`
  with `point`.
- `buildAction` → `Action.highlight = { kind, point }`.
- `runUploadScreenshots` → builds `{ point }` geom → `circleSvg` → JPEG.

No code change expected; this step is a deliberate read-through.

- [ ] **Step 4: Commit (only if Steps 1-2 required any fix)**

If a fix was needed:
```bash
git add -A
git commit -m "fix(highlight): integration fixes for point-highlight wiring

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```
Otherwise no commit — the feature is complete.

---

## Out of scope (per the design spec)

- `src/trigger/lib/cropEvent.ts` (`padBbox`) — not in the highlight path.
- The Zod `Highlight` schema and `ScreenshotPicksOutput` in `schemas.ts` — a
  separate screenshot-picking path; unchanged.
- Removing the deprecated `bbox` field, `elementCaption`, and the unused
  `config.ai.prompts.locateHighlightSystem` prompt — deferred.
- Migrating previously-stored SOPs — `bbox` stays in the schema so they validate.
- Animated/pulsing markers — the static circle ships first.
