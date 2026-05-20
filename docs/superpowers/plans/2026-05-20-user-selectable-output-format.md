# User-selectable Output Format — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user choose `Auto`, `Screenshots`, or `Clips` at upload time, and run the existing clip pipeline for app/web SOPs when `Clips` is chosen. Physical recordings stay clips-only.

**Architecture:** Add an `outputFormat` field set at upload, resolve a single `effectiveOutputFormat` per SOP after analyze using a pure resolver, persist both, and key the orchestrator's clip-vs-screenshots branch on the resolved value. The SOP viewer keeps its existing per-step inference (renderer picked from whichever step field is populated) — no viewer rendering changes; only a coercion notice is added when a `screenshots` choice was coerced to `clips`.

**Tech Stack:** TypeScript, Zod, Next.js (App Router), trigger.dev v4, MongoDB, React 19. Tests run with Node's built-in test runner via `npx tsx --test <file>`. Type-check with `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-05-20-user-selectable-output-format-design.md`

---

## File Structure

- `src/lib/schemas.ts` — add `OutputFormatChoice` and `EffectiveOutputFormat` Zod enums and an `OutputFormatCoerced` object schema.
- `src/lib/mongo.ts` — extend `SopDoc` with `outputFormat`, `effectiveOutputFormat`, `outputFormatCoerced`.
- `src/lib/outputFormat.ts` — new file: pure `resolveOutputFormat` function.
- `src/lib/outputFormat.test.ts` — new file: resolver truth-table tests.
- `src/app/api/upload/commit/route.ts` — accept optional `outputFormat`; persist on SOP at commit.
- `src/app/api/ingest/loom/route.ts` — accept optional `outputFormat`; persist on SOP at insert.
- `src/components/UploadZone.tsx` — segmented control + state + payload wiring (file + Loom flows).
- `src/trigger/processSopScreenshots.ts` — replace the `isPhysical` branch with a `resolveOutputFormat` call; persist `effectiveOutputFormat` (+ optional coerced) and key the existing clip/screenshots branches on it.
- `src/app/sop/[id]/page.tsx` — show coercion notice when `outputFormatCoerced` is set.
- `src/app/share/[token]/page.tsx` — same notice.

---

## Task 1: Add output-format schemas

**Files:**
- Modify: `src/lib/schemas.ts` (end of file)
- Test: `src/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/schemas.test.ts`. Extend the existing import from `./schemas` to include `OutputFormatChoice`, `EffectiveOutputFormat`, and `OutputFormatCoerced`.

```ts
test("OutputFormatChoice accepts auto, screenshots, clips", () => {
  assert.equal(OutputFormatChoice.parse("auto"), "auto");
  assert.equal(OutputFormatChoice.parse("screenshots"), "screenshots");
  assert.equal(OutputFormatChoice.parse("clips"), "clips");
});

test("OutputFormatChoice rejects unknown values", () => {
  assert.throws(() => OutputFormatChoice.parse("video"));
});

test("EffectiveOutputFormat accepts screenshots and clips only", () => {
  assert.equal(EffectiveOutputFormat.parse("screenshots"), "screenshots");
  assert.equal(EffectiveOutputFormat.parse("clips"), "clips");
  assert.throws(() => EffectiveOutputFormat.parse("auto"));
});

test("OutputFormatCoerced parses the physical_detected shape", () => {
  const parsed = OutputFormatCoerced.parse({
    from: "screenshots",
    to: "clips",
    reason: "physical_detected",
  });
  assert.equal(parsed.reason, "physical_detected");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: FAIL — `OutputFormatChoice`/`EffectiveOutputFormat`/`OutputFormatCoerced` are not exported.

- [ ] **Step 3: Add the schemas**

Append to `src/lib/schemas.ts`:

```ts
export const OutputFormatChoice = z.enum(["auto", "screenshots", "clips"]);
export type OutputFormatChoice = z.infer<typeof OutputFormatChoice>;

export const EffectiveOutputFormat = z.enum(["screenshots", "clips"]);
export type EffectiveOutputFormat = z.infer<typeof EffectiveOutputFormat>;

export const OutputFormatCoerced = z.object({
  from: z.literal("screenshots"),
  to: z.literal("clips"),
  reason: z.literal("physical_detected"),
});
export type OutputFormatCoerced = z.infer<typeof OutputFormatCoerced>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m "feat(output-format): add OutputFormatChoice/Effective/Coerced schemas"
```

---

## Task 2: Extend `SopDoc` with output-format fields

**Files:**
- Modify: `src/lib/mongo.ts:98-127` (`SopDoc` interface)

- [ ] **Step 1: Add the fields to `SopDoc`**

Inside the `SopDoc` interface, just after the existing `industry?: string;` line, insert:

```ts
  outputFormat?: "auto" | "screenshots" | "clips"; // user's choice at upload (legacy rows lack it)
  effectiveOutputFormat?: "screenshots" | "clips"; // resolved after analyze
  outputFormatCoerced?: { from: "screenshots"; to: "clips"; reason: "physical_detected" };
```

Keep them optional — legacy rows pre-date the feature.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/mongo.ts
git commit -m "feat(output-format): extend SopDoc with outputFormat fields"
```

---

## Task 3: Write the `resolveOutputFormat` resolver

**Files:**
- Create: `src/lib/outputFormat.ts`
- Test: `src/lib/outputFormat.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/outputFormat.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { resolveOutputFormat } from "./outputFormat";

test("auto + web returns screenshots", () => {
  const r = resolveOutputFormat("auto", "web");
  assert.equal(r.effective, "screenshots");
  assert.equal(r.coerced, undefined);
});

test("auto + mobile returns screenshots", () => {
  assert.equal(resolveOutputFormat("auto", "mobile").effective, "screenshots");
});

test("auto + desktop returns screenshots", () => {
  assert.equal(resolveOutputFormat("auto", "desktop").effective, "screenshots");
});

test("auto + physical returns clips", () => {
  const r = resolveOutputFormat("auto", "physical");
  assert.equal(r.effective, "clips");
  assert.equal(r.coerced, undefined);
});

test("screenshots + web returns screenshots", () => {
  assert.equal(resolveOutputFormat("screenshots", "web").effective, "screenshots");
});

test("screenshots + physical coerces to clips with physical_detected reason", () => {
  const r = resolveOutputFormat("screenshots", "physical");
  assert.equal(r.effective, "clips");
  assert.deepEqual(r.coerced, {
    from: "screenshots",
    to: "clips",
    reason: "physical_detected",
  });
});

test("clips + web returns clips, no coercion", () => {
  const r = resolveOutputFormat("clips", "web");
  assert.equal(r.effective, "clips");
  assert.equal(r.coerced, undefined);
});

test("clips + physical returns clips, no coercion", () => {
  const r = resolveOutputFormat("clips", "physical");
  assert.equal(r.effective, "clips");
  assert.equal(r.coerced, undefined);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/lib/outputFormat.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the resolver**

Create `src/lib/outputFormat.ts`:

```ts
export type GatedAppType = "web" | "mobile" | "desktop" | "physical";
export type OutputFormatChoice = "auto" | "screenshots" | "clips";
export type EffectiveOutputFormat = "screenshots" | "clips";

export interface ResolveResult {
  effective: EffectiveOutputFormat;
  coerced?: { from: "screenshots"; to: "clips"; reason: "physical_detected" };
}

export function resolveOutputFormat(
  choice: OutputFormatChoice,
  appType: GatedAppType,
): ResolveResult {
  if (appType === "physical") {
    if (choice === "screenshots") {
      return {
        effective: "clips",
        coerced: { from: "screenshots", to: "clips", reason: "physical_detected" },
      };
    }
    return { effective: "clips" };
  }
  // web | mobile | desktop
  if (choice === "clips") return { effective: "clips" };
  return { effective: "screenshots" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/lib/outputFormat.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/outputFormat.ts src/lib/outputFormat.test.ts
git commit -m "feat(output-format): add resolveOutputFormat with truth-table tests"
```

---

## Task 4: Accept `outputFormat` in upload-commit API

**Files:**
- Modify: `src/app/api/upload/commit/route.ts`

- [ ] **Step 1: Update Zod body schema + persist field**

Replace the `Body` schema and the `col.updateOne` `$set` in `src/app/api/upload/commit/route.ts`:

```ts
const Body = z.object({
  sopId: z.string().length(24),
  defaultLanguage: z.enum(["vi", "en"]).default("vi"),
  outputFormat: z.enum(["auto", "screenshots", "clips"]).default("auto"),
});
```

And in the `updateOne` call:

```ts
  const res = await col.updateOne(
    { _id, status: "uploading" },
    { $set: {
        status: "transcribing",
        defaultLanguage: parsed.data.defaultLanguage,
        outputFormat: parsed.data.outputFormat,
        updatedAt: new Date(),
    } },
  );
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/commit/route.ts
git commit -m "feat(output-format): accept outputFormat on /api/upload/commit"
```

---

## Task 5: Accept `outputFormat` in Loom-ingest API

**Files:**
- Modify: `src/app/api/ingest/loom/route.ts`

- [ ] **Step 1: Update Zod body schema + persist on insert**

Update the `Body` schema and the `insertOne` call in `src/app/api/ingest/loom/route.ts`:

```ts
const Body = z.object({
  url: z.string().min(1),
  defaultLanguage: z.enum(["vi", "en"]).default("vi"),
  outputFormat: z.enum(["auto", "screenshots", "clips"]).default("auto"),
});
```

Add `outputFormat: parsed.data.outputFormat,` to the `sops().insertOne({ ... })` payload, placed just after `defaultLanguage: parsed.data.defaultLanguage,`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ingest/loom/route.ts
git commit -m "feat(output-format): accept outputFormat on /api/ingest/loom"
```

---

## Task 6: Add segmented control to `UploadZone`

**Files:**
- Modify: `src/components/UploadZone.tsx`

- [ ] **Step 1: Add state + control**

Near the existing `useState` block (after `language`):

```tsx
  const [outputFormat, setOutputFormat] = useState<"auto" | "screenshots" | "clips">("auto");
```

Render the control below the language picker (or near it — match existing layout patterns in the file). Use the same plain-Tailwind segmented look the file uses for `language` (look at how `language` toggle is rendered to mirror style). Minimum markup:

```tsx
<div className="flex items-center gap-2">
  <span className="text-[12px] text-[#666666]">Output:</span>
  {(["auto", "screenshots", "clips"] as const).map((v) => (
    <button
      key={v}
      type="button"
      onClick={() => setOutputFormat(v)}
      className={
        "px-3 py-1 rounded-md text-[12px] border " +
        (outputFormat === v
          ? "bg-black text-white border-black"
          : "bg-white text-[#333] border-[#E5E5E5]")
      }
      title={
        v === "auto"
          ? "Tự động chọn theo loại video"
          : v === "screenshots"
          ? "Sinh ảnh chụp màn hình từng bước"
          : "Sinh video clip ngắn cho từng bước"
      }
    >
      {v === "auto" ? "Tự động" : v === "screenshots" ? "Ảnh" : "Video"}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Wire into commit + Loom payloads**

In `submitFile`, change the `fetch("/api/upload/commit", ...)` body to:

```ts
body: JSON.stringify({ sopId: init.sopId, defaultLanguage: language, outputFormat }),
```

In `submitLoomUrl`, change the `fetch("/api/ingest/loom", ...)` body to:

```ts
body: JSON.stringify({ url, defaultLanguage: language, outputFormat }),
```

- [ ] **Step 3: Type-check + smoke**

Run: `npx tsc --noEmit`
Expected: PASS.

Start dev server (`npm run dev`), open the upload page, confirm:
1. The segmented control renders and defaults to `Tự động` (Auto).
2. Clicking each option toggles the active styling.

- [ ] **Step 4: Commit**

```bash
git add src/components/UploadZone.tsx
git commit -m "feat(output-format): add segmented Auto/Screenshots/Clips control to UploadZone"
```

---

## Task 7: Switch orchestrator to use `resolveOutputFormat`

**Files:**
- Modify: `src/trigger/processSopScreenshots.ts:114-128` (the `isPhysical` block + `$set` write) and the existing `if (isPhysical)` branch lower in the file (~line 214).

- [ ] **Step 1: Read `outputFormat` from the SOP doc already in scope**

The orchestrator already fetches the SOP at `runPipeline` line 67 as `const doc = await (await sops()).findOne({ _id });`. Add this line just before the resolver call (anywhere after `analysis` is computed and before the `$set` write):

```ts
const userChoice = doc.outputFormat ?? "auto";
```

No extra findOne — reuse `doc`.

- [ ] **Step 2: Replace the `isPhysical` derivation with the resolver**

Replace these lines in `src/trigger/processSopScreenshots.ts` (the existing `isPhysical` and the `$set` of `category/domainSummary/appType/industry`):

```ts
      const isPhysical = analysis.appType === "physical";
      if (!isPhysical && !decideAppGate(analysis.appUIFrameCount, analysis.totalFrames)) {
        logger.info("rejected: not an app recording", {
          sopId: _id.toHexString(),
          appUIFrameCount: analysis.appUIFrameCount,
          totalFrames: analysis.totalFrames,
        });
        return fail(_id, "not_an_app");
      }
      const { category, domainSummary, appType, industry } = analysis;
      await (await sops()).updateOne(
        { _id },
        { $set: { category, domainSummary, appType, industry, updatedAt: new Date() } },
      );
```

with:

```ts
      const isPhysical = analysis.appType === "physical";
      if (!isPhysical && !decideAppGate(analysis.appUIFrameCount, analysis.totalFrames)) {
        logger.info("rejected: not an app recording", {
          sopId: _id.toHexString(),
          appUIFrameCount: analysis.appUIFrameCount,
          totalFrames: analysis.totalFrames,
        });
        return fail(_id, "not_an_app");
      }
      const { category, domainSummary, appType, industry } = analysis;
      const { effective: effectiveOutputFormat, coerced: outputFormatCoerced } =
        resolveOutputFormat(userChoice, appType as "web" | "mobile" | "desktop" | "physical");
      await (await sops()).updateOne(
        { _id },
        { $set: {
            category, domainSummary, appType, industry,
            effectiveOutputFormat,
            ...(outputFormatCoerced ? { outputFormatCoerced } : {}),
            updatedAt: new Date(),
        } },
      );
```

Add at the top of the file (with other imports):

```ts
import { resolveOutputFormat } from "@/lib/outputFormat";
```

`appType` is narrowed by the preceding `analysis.appType === "none"` check + the gate; the cast above documents that.

- [ ] **Step 3: Replace the `if (isPhysical)` branch with `effectiveOutputFormat`**

Find the existing `if (isPhysical) {` block around line 214 and change the condition:

```ts
if (effectiveOutputFormat === "clips") {
```

Everything inside the block (runExtractClips → runUploadClips → composeClipSteps) stays the same. The `else` branch (existing screenshots path) is unchanged.

Remove the now-unused `const isPhysical = …` line *if* it isn't referenced elsewhere — check with grep first:

```bash
grep -n "isPhysical" src/trigger/processSopScreenshots.ts
```

If only the original two references remain (rejection log + the branch), drop the `const isPhysical = …` line entirely after both sites are migrated. If anything else references it, leave it.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Run existing orchestrator-adjacent tests**

Run: `npx tsx --test src/trigger/stages/extractClips.test.ts src/trigger/stages/uploadClips.test.ts`
Expected: PASS (no behavior change in those stages).

- [ ] **Step 6: Commit**

```bash
git add src/trigger/processSopScreenshots.ts
git commit -m "feat(output-format): branch orchestrator on resolveOutputFormat"
```

---

## Task 8: Surface coercion notice on SOP view

**Files:**
- Modify: `src/app/sop/[id]/page.tsx`
- Modify: `src/app/share/[token]/page.tsx`

- [ ] **Step 1: Render notice on the owner SOP page**

In `src/app/sop/[id]/page.tsx`, locate the existing info banner (the `<div className="flex items-center gap-2.5 rounded-xl bg-[#F3F4F6] px-4 py-3">` near line 115). Immediately after that block, add:

```tsx
{sop.outputFormatCoerced && (
  <div className="flex items-center gap-2.5 rounded-xl bg-[#FEF3C7] px-4 py-3">
    <Info className="w-3.5 h-3.5 text-[#92400E] shrink-0" strokeWidth={2} />
    <p className="text-[12px] text-[#92400E]">
      Video này được nhận diện là quay thực tế, nên hệ thống đã tạo video clip thay vì ảnh chụp màn hình.
    </p>
  </div>
)}
```

`Info` is already imported in this file (`import { Info } from "lucide-react";` — verify with grep; if not, add it).

- [ ] **Step 2: Render the same notice on the share page**

In `src/app/share/[token]/page.tsx`, apply the same change — locate the equivalent info banner (this file mirrors the SOP page structure; commit `355f851` introduced the per-step renderer here too) and add the same conditional block immediately after.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual smoke**

Start dev server. Seed (or update) one SOP document so it has:

```json
{ "outputFormatCoerced": { "from": "screenshots", "to": "clips", "reason": "physical_detected" } }
```

Visit `/sop/<id>` and `/share/<token>` and confirm the amber notice renders. Remove the field; refresh; confirm the notice disappears.

- [ ] **Step 5: Commit**

```bash
git add src/app/sop/\[id\]/page.tsx src/app/share/\[token\]/page.tsx
git commit -m "feat(output-format): show coercion notice when screenshots was coerced to clips"
```

---

## Task 9: End-to-end smoke

**Files:** none (manual verification).

- [ ] **Step 1: Auto + app/web recording → screenshots**

Upload a small web-recording video with `Output: Tự động`. After processing, the SOP page should render `StepCardScreenshots` for each step. In MongoDB, the SOP doc should have:

```
outputFormat: "auto", effectiveOutputFormat: "screenshots"
```

and no `outputFormatCoerced`.

- [ ] **Step 2: Clips + app/web recording → clips (new path)**

Upload the same kind of video with `Output: Video`. Steps should render `StepCardClips`. SOP doc:

```
outputFormat: "clips", effectiveOutputFormat: "clips"
```

- [ ] **Step 3: Screenshots + physical recording → coerced clips + notice**

Upload a physical recording with `Output: Ảnh`. Steps should render `StepCardClips`. SOP doc should include:

```
outputFormat: "screenshots", effectiveOutputFormat: "clips",
outputFormatCoerced: { from: "screenshots", to: "clips", reason: "physical_detected" }
```

The amber notice should render on `/sop/<id>` and on the share page.

- [ ] **Step 4: No commit needed**

Smoke verification only. If any step fails, file a follow-up task before declaring the feature done.

---

## Self-Review Notes

- Spec coverage: every section (matrix, UI, API, data model, resolver, orchestrator, viewer, processing page, testing, edge cases) is covered by Tasks 1–8; Task 9 covers the integration smoke called for in the spec's testing section.
- The spec's "viewer reads `effectiveOutputFormat` for new SOPs" is satisfied indirectly: the viewer continues to use per-step inference (already correct for both new and old SOPs) and only adds the coercion notice. This is a deliberate YAGNI — the per-step inference is already the spec's documented fallback path and works for all rows.
- No backfill required; legacy SOPs have all output-format fields optional.
- No new statuses; existing `building-clips`/`uploading-clips` already cover the app/web + clips path because they live in the shared clip stages.
