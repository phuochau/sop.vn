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

---

## Task 1: Schema & types — add `point`

Adds the `Point` schema and the `point` field through the type layer. `point`
is a required-but-nullable key on `HighlightDecision` (mirroring `bbox`), so
every object literal that builds a `HighlightDecision` must gain `point`. This
task also fixes those literals so the project still compiles.

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/mongo.ts`
- Modify: `src/trigger/stages/locateHighlight.ts` (`coerceForViewVerb` literal)
- Modify: `src/trigger/stages/locateHighlight.test.ts` (existing test literals)
- Create: `src/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/schemas.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { HighlightDecision } from "./schemas";

test("HighlightDecision accepts a point and a null bbox", () => {
  const parsed = HighlightDecision.parse({
    highlight: "yes",
    point: { x: 0.5, y: 0.4 },
    bbox: null,
    elementCaption: null,
    noHighlightReason: null,
  });
  assert.deepEqual(parsed.point, { x: 0.5, y: 0.4 });
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
  point: Point.nullable(),   // primary geometry — set by the new locator
  bbox: BBox.nullable(),     // deprecated; kept so old records still validate
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

- [ ] **Step 5: Fix the `coerceForViewVerb` literal**

In `src/trigger/stages/locateHighlight.ts`, the `coerceForViewVerb` function
returns a `Decision` literal. Add `point: null` to it:

```ts
export function coerceForViewVerb(verb: SubStep["verb"], d: Decision): Decision {
  if (verb !== "view") return d;
  return {
    highlight: "no",
    point: null,
    bbox: null,
    elementCaption: null,
    noHighlightReason: "view_action",
  };
}
```

- [ ] **Step 6: Fix the existing test literals**

In `src/trigger/stages/locateHighlight.test.ts`, three object literals build a
`HighlightDecision` and now need `point`. Add `point: null` to each:
- the `coerceForViewVerb("view", { ... })` argument,
- the `input` object in the "leaves non-view verbs untouched" test,
- the object returned by the `highlighter` in the "returns highlighter output"
  test.

Example — the first becomes:

```ts
  const out = coerceForViewVerb("view", {
    highlight: "yes",
    point: null,
    bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    elementCaption: "should be ignored",
    noHighlightReason: null,
  });
```

Apply the same `point: null` addition to the other two literals.

- [ ] **Step 7: Run tests and typecheck**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: PASS — 2 tests.

Run: `npx tsx --test src/trigger/stages/locateHighlight.test.ts`
Expected: PASS — 4 tests (existing tests still green).

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "schemas|mongo|locateHighlight"`
Expected: no output (no type errors in these files).

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas.ts src/lib/mongo.ts src/lib/schemas.test.ts \
  src/trigger/stages/locateHighlight.ts src/trigger/stages/locateHighlight.test.ts
git commit -m "feat(highlight): add point field to highlight schema/types

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

test("parseUiTarsReply normalizes absolute pixels to 0-1", () => {
  const p = parseUiTarsReply("(960,540)", 1920, 1080);
  assert.deepEqual(p, { x: 0.5, y: 0.5 });
});

test("parseUiTarsReply clamps out-of-range coordinates", () => {
  const p = parseUiTarsReply("(2000,-50)", 1920, 1080);
  assert.deepEqual(p, { x: 1, y: 0 });
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
    framePath: "src/trigger/stages/__fixtures__/sample-1080p.jpg",
    intent: "Click Save", verb: "click", frameW: 960, frameH: 540,
    model: "test/model", fetcher: fakeFetch,
  });
  assert.deepEqual(r.point, { x: 0.5, y: 0.5 });
});

test("qwenPoint maps an injected vision response", async () => {
  const fakeVision = (async () => ({ found: "yes", x: 250, y: 750 })) as never;
  const r = await qwenPoint({
    framePath: "src/trigger/stages/__fixtures__/sample-1080p.jpg",
    intent: "Click Save", verb: "click", model: "test/model", visionFn: fakeVision,
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

In `src/config/index.ts`, inside the `ai:` object, after the `visionModel`
line, add:

```ts
    pointPrimaryModel: "bytedance/ui-tars-1.5-7b",
    pointFallbackModel: "qwen/qwen3-vl-32b-instruct",
```

- [ ] **Step 2: Write the failing test**

Append to `src/trigger/stages/locateHighlight.test.ts`:

```ts
import { pointFallbackHighlight } from "./locateHighlight";

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
Expected: FAIL — `pointFallbackHighlight` is not exported.

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
- `sharp` is already imported at the top of the file — reuse it.
- `config` is already imported.
- The `HighlighterFn` type and `runLocateHighlightWith` are unchanged — they
  still consume `defaultHighlighter` as the default.
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

Adds `circleSvg` and widens `buildBufferWithOptionalHighlight` to accept either
a point (circle) or a bbox (legacy rect).

**Files:**
- Modify: `src/trigger/stages/uploadScreenshots.ts`
- Modify: `src/trigger/stages/uploadScreenshots.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/trigger/stages/uploadScreenshots.test.ts`:

```ts
import { circleSvg, buildBufferWithOptionalHighlight } from "./uploadScreenshots";

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
  const { buf, error } = await buildBufferWithOptionalHighlight(
    "src/trigger/stages/__fixtures__/sample-1080p.jpg",
    { point: { x: 0.5, y: 0.5 } },
  );
  assert.equal(error, null);
  assert.ok(buf.length > 0);
});

test("buildBufferWithOptionalHighlight returns the frame unchanged for null geom", async () => {
  const { error } = await buildBufferWithOptionalHighlight(
    "src/trigger/stages/__fixtures__/sample-1080p.jpg",
    null,
  );
  assert.equal(error, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: FAIL — `circleSvg` is not exported / `buildBufferWithOptionalHighlight`
rejects the `{ point }` argument.

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
`buildBufferWithOptionalHighlight` call:

```ts
      const h = action.highlight;
      const geom: HighlightGeom = h?.point
        ? { point: h.point }
        : h?.bbox
          ? { bbox: h.bbox }
          : null;
      const { buf, error } = await buildBufferWithOptionalHighlight(action.displayFramePath, geom);
```

The rest of the loop (the `rec.highlight = action.highlight` assignment and
`rec.highlightError = error`) is unchanged.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: PASS — all tests (existing + 4 new).

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
highlight would be silently dropped.

**Files:**
- Modify: `src/trigger/stages/buildAction.ts`
- Modify: `src/trigger/stages/buildAction.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/trigger/stages/buildAction.test.ts`:

```ts
test("buildAction attaches a point highlight from the decision", () => {
  const action = buildAction({
    stepIndex: 0,
    order: 0,
    subStep: {
      intent: "Click Save", verb: "click", narrationSegmentIds: [],
      timeWindow: null, visualConfidence: "high",
    },
    verify: { match: "yes", reasoning: "" },
    highlight: {
      highlight: "yes",
      point: { x: 0.4, y: 0.6 },
      bbox: null,
      elementCaption: null,
      noHighlightReason: null,
    },
    framePath: "/x.jpg",
    frameTime: 1,
    pickedClusterLetter: "A",
  });
  assert.deepEqual(action.highlight, { kind: "click", point: { x: 0.4, y: 0.6 } });
});

test("buildAction attaches no highlight when the decision has neither point nor bbox", () => {
  const action = buildAction({
    stepIndex: 0,
    order: 0,
    subStep: {
      intent: "Presenter talks", verb: "click", narrationSegmentIds: [],
      timeWindow: null, visualConfidence: "high",
    },
    verify: { match: "yes", reasoning: "" },
    highlight: {
      highlight: "no",
      point: null,
      bbox: null,
      elementCaption: null,
      noHighlightReason: "no_specific_target",
    },
    framePath: "/x.jpg",
    frameTime: 1,
    pickedClusterLetter: "A",
  });
  assert.equal(action.highlight, undefined);
});
```

If `buildAction.test.ts` does not exist, create it with this header first:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { buildAction } from "./buildAction";
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/buildAction.test.ts`
Expected: FAIL — `action.highlight` is `undefined` (guard checks `bbox`, which
is null).

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
Expected: PASS — both new tests (and any pre-existing ones).

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
Expected: no output (the project compiles cleanly; pre-existing `node_modules`
declaration warnings, if any, are filtered out).

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
