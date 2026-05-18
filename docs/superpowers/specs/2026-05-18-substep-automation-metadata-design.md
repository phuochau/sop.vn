# Sub-Step Automation Metadata — Design

**Date:** 2026-05-18
**Status:** Approved

## Problem

Each sub-step of a generated SOP currently carries only human-facing fields:
`verb`, `description`, `screenName`, `elementCaption`, a highlight `point`, and
`time`. Nothing is structured for a machine to act on.

The goal: attach **automation metadata** to every actionable sub-step so that,
in a future project, an AI automation agent (Playwright-style, MCP-driven, or
otherwise) can read the SOP and reproduce the workflow. The agent is assumed to
be capable — it reads the intent like an end user and locates elements itself.
The metadata's job is to give it a precise, machine-readable description of
*what* to do and *on what element*, not a brittle script.

## Constraints

- The pipeline only ever sees **video frames**, never the live DOM. All metadata
  is VLM-inferred from pixels. We therefore emit a **semantic intent descriptor**
  — not CSS selectors, not locators, not a replayable script.
- No recorder PII or secrets may be baked into a stored SOP. Typed values are
  captured as **parameterized placeholders** with a masked example only.
- The feature is **store-only**. No UI rendering, no export format, no
  automation runner — those are future projects.

## The Metadata Shape

A new optional `automation` object on each actionable sub-step, alongside the
existing human-facing fields (it does not replace them). The canonical
`AutomationMeta` TS type and its Zod schema are declared in `src/lib/schemas.ts`
and exported. `Screenshot` in `src/lib/mongo.ts` inlines the same field shape
rather than importing it — consistent with the existing precedent there, where
the `highlight` shape is inlined rather than referenced from `schemas.ts`.

```ts
type AutomationMeta = {
  action: "click" | "type" | "select" | "navigate";
  target: {
    text: string;       // visible text/label on or labeling the element ("" if none)
    role: string;       // button | textbox | dropdown | link | tab | checkbox | menuitem | ...
    location: string;   // region hint, e.g. "top-right nav bar", "inside the contact form"
  };
  inputValue?: {        // present only when action is "type" or "select"
    field: string;      // semantic field name, e.g. "email", "company name"
    valueType: "text" | "email" | "password" | "number" | "date" | "url" | "selection" | "other";
    example?: string;   // masked sample from the video, e.g. "j***@***.com" — never the literal
  };
  expectedOutcome?: string;  // short natural-language checkpoint, e.g. "the contact form opens"
};
```

Rules:

- **`action` is derived in code, not VLM-emitted.** It is a deterministic
  normalization of the sub-step's existing `verb`:
  `click→click`, `input→type`, `select→select`, `link→navigate`. A shared helper
  `verbToAutomationAction(verb)` performs the mapping. This keeps `automation`
  self-contained while guaranteeing it never disagrees with `verb`.
- **`view` sub-steps carry no `automation`.** They are non-actionable ("look at
  this screen") and an automation agent skips them. `view` is therefore absent
  from the `action` enum. (`view` sub-steps are also synthesized in
  `buildActionsForStep` from screen clusters — they never pass through the
  classifier, so they have no source for `automation` anyway.)
- The VLM (classifier) emits only the `target`, `inputValue`, and
  `expectedOutcome` fields. `action` is attached afterward in code.
- `inputValue` is present only for `type`/`select` actions; absent otherwise.
- `example` is **always masked** — emails/names/numbers partially redacted;
  passwords are never stored (`example` omitted, `valueType: "password"`).
- `expectedOutcome` is **optional and best-effort**. The VLM emits it when the
  candidate's frame window shows the result of the action; it is omitted
  otherwise. (`click`/`link` candidate windows are deliberately source-biased
  and may not include a clean after-frame — see `buildCandidateWindow` — so
  `expectedOutcome` is frequently absent for those.) It is a recovery hint, not
  a strict assertion.
- The whole `automation` object is **optional**. SOPs generated before this
  feature lack it; nothing breaks.

## How It Flows Through the Pipeline

The VLM portion of `automation` is produced by the classifier (the only stage
that sees the element with full visual context) and rides the existing rails to
storage. **No new VLM call** — the classifier already makes one vision call per
candidate; it now returns the `automation` fields in the same JSON response.

1. **`ClassifiedCandidate` schema** (`src/lib/schemas.ts`) — add an
   `automation` field carrying the VLM portion `{ target, inputValue?,
   expectedOutcome? }` (no `action`). The Zod field is **`.nullish()`**
   (optional + nullable): the VLM emits the object for kept candidates and
   `null` for `discard` candidates, and making it optional means existing
   hand-built classifier test fixtures continue to validate without edits.
   Zod shape:

   ```ts
   const AutomationFields = z.object({
     target: z.object({ text: z.string(), role: z.string(), location: z.string() }),
     inputValue: z.object({
       field: z.string(),
       valueType: z.enum(["text","email","password","number","date","url","selection","other"]),
       example: z.string().nullish(),
     }).nullish(),
     expectedOutcome: z.string().nullish(),
   });
   // on ClassifiedCandidate:  automation: AutomationFields.nullish()
   ```

   Zod cannot express "`inputValue` present only for type/select" — it is
   `.nullish()` in the schema and that invariant is enforced by the classifier
   prompt and by the assembly code in `buildActionsForStep` (step 5).
2. **`classifyStepWithLLM.ts`** — the candidate→record mapping is the spread
   `records.push({ ...cc, displayFramePath })` (lines ~203–206). Adding
   `automation` to `ClassifiedCandidate` makes it ride through this spread
   automatically — **no explicit copy needed**. The working type
   `ClassifiedActionRecord = ClassifiedCandidate & { displayFramePath }`
   inherits it.
3. **`canonicalizeActions.ts`** — the final `classified.map(c => ({ ...c,
   screenName, elementCaption }))` already spreads `...c`, so `automation` is
   **preserved automatically** with no code change. The stage is *not* extended
   to reconcile `automation` wording across the step (see "Decisions"). A
   regression test confirms `automation` survives the stage.
4. **`Action` type** (`src/lib/schemas.ts`) — add `automation?: AutomationMeta`
   (the full shape, including `action`). Also add the shared helper to
   `src/lib/schemas.ts` (where the `verb` and `Action` types already live).
   Its signature accepts only the four **actionable** verbs — `view` is never
   passed (callers invoke it only for classifier-derived element groups):

   ```ts
   function verbToAutomationAction(
     verb: "click" | "input" | "select" | "link",
   ): "click" | "type" | "select" | "navigate"
   ```
5. **`buildActionsForStep.ts`** — this stage dedups records sharing a
   `(screenName, elementCaption)` key into an `ElementGroup`. Note its existing
   verb logic: `anchor = sortedByTime[0]`, but the **group's effective verb** is
   `hasInput ? "input" : anchor.verb` — i.e. if *any* record in the group is an
   `input`, the whole group's `Action.verb` is promoted to `input`. The
   `automation` assembly must follow that same effective verb so `automation`
   never disagrees with `Action.verb`:
   - **`automation` source record:** the earliest-by-time record in the group
     whose `verb` equals the group's effective verb (when the effective verb is
     `input`, this is the first `input` record — the one that actually carries
     `inputValue`); fall back to the anchor if none matches.
   - **`action`:** `verbToAutomationAction(effectiveVerb)` — the same effective
     verb used for `Action.verb`.
   - If the source record's `automation` is null/absent, omit `Action.automation`.
   - The `ElementGroup` and `Pending` intermediate types use explicit field
     lists (no spread), so both must be extended to carry the assembled
     `automation`.
   - `view` actions (synthesized separately from `viewGroups`, not from
     classifier records) never get `automation`.
6. **`Screenshot` type** (`src/lib/mongo.ts`) — add `automation?:
   AutomationMeta`.
7. **`uploadScreenshots.ts`** (`runUploadScreenshots`) — the `Screenshot` record
   literal (`const rec: Screenshot = { ... }`, lines ~123–132) uses an explicit
   field list. Add `automation: action.automation` to it (omit when absent).
8. **Share API route** (`src/app/api/share/[token]/route.ts`) — the per-
   screenshot response object (lines ~27–32) is an explicit field whitelist.
   Add `automation: ss.automation` so the metadata reaches API consumers.

Flow: classifier → `ClassifiedCandidate.automation` → (spread) record →
(spread) canonicalize → `buildActionsForStep` assembles `Action.automation`
(+`action`) → `Screenshot.automation` → persisted on `Step.screenshots` →
share API response.

This is identical for the **speech and silent paths** — both converge on
`Action` before the classifier runs, so silent SOPs get automation metadata for
free.

## Prompt Changes

One prompt in `src/config/index.ts`: the **classifier system prompt**. Add an
"Automation metadata" block instructing the VLM, for each kept candidate, to
emit the `automation` object's VLM fields:

- `target.text` — the element's visible text/label;
- `target.role` — the control type (button, textbox, dropdown, link, tab, …);
- `target.location` — a short on-screen region hint;
- `inputValue` — for `input`/`select` candidates only: a semantic `field` name,
  a `valueType`, and a **masked** `example`. Explicit rule: never echo literal
  typed text — mask emails/names/numbers; never store passwords (omit `example`,
  set `valueType: "password"`);
- `expectedOutcome` — a one-line description of the result, emitted only when
  the candidate's frame window actually shows that result; omitted otherwise.

`discard` candidates emit `automation: null`.

**Language rule:** `automation.target.text` is a UI label the agent matches
against the real screen — the prompt instructs the VLM to keep it **verbatim in
the app's UI language as seen in the video**, never translated. `target.role`,
`target.location`, and `expectedOutcome` are written in the SOP's output
language (detected for speech, default for silent), consistent with the rest of
the classifier output. Because the canonicalize stage is not extended to touch
`automation`, there is no language conflict to reconcile.

## Decisions (resolved during review)

- **`action` derived, not VLM-emitted** — avoids a second verb vocabulary that
  could disagree with the existing `verb` field.
- **`view` dropped from the `action` enum** — `view` sub-steps are
  non-actionable and never pass through the classifier; they carry no
  `automation`.
- **`canonicalizeActions` not extended** — reconciling `automation` wording
  step-wide would require structural changes to `CanonicalizationOutput`, the
  LLM-fn type, and the reconciliation loop, and would conflict with the "keep
  `target.text` in UI language" rule (canonicalize translates to the output
  language). For a store-only POC, minor wording drift in `target.text` across
  steps is acceptable — an agent matches it against a live screen. YAGNI.

## Consumption Surface

Store-only. The metadata is persisted on `Screenshot` and returned by the share
API route as part of each screenshot object. No UI rendering, no export format,
no automation runner. A future agent/MCP consumer is a separate project — this
spec only makes the data exist and be correct.

## Testing

- `schemas.ts` — `AutomationFields` parses a valid object; `automation` is
  `.nullish()` so absent/null both validate (old records and existing
  hand-built classifier fixtures need no edits); `verbToAutomationAction`
  returns the correct mapping for each of the four actionable verbs.
- `classifyStepWithLLM.test.ts` — a stubbed VLM response carrying `automation`
  is mapped onto the record via the spread; a `discard` candidate yields
  `automation: null`/absent.
- `canonicalizeActions.test.ts` — a record with `automation` passes through the
  stage unchanged (regression: the spread preserves it).
- `buildActionsForStep.test.ts` — `automation` is carried onto the assembled
  `Action`; `action` matches the group's effective verb; a group containing an
  `input` record sources `automation` (and `inputValue`) from that `input`
  record, not the anchor; `view` actions have no `automation`.
- `uploadScreenshots.test.ts` — `automation` is copied from `Action` onto the
  persisted `Screenshot`.
- One E2E on `samples/hubspot_crm.mp4` confirming real runs produce sane
  `automation`: a spot-check of the produced actions for plausible `role`s and
  for `inputValue.example`s that are masked (no recorder PII appearing
  verbatim). Masking quality is a VLM-prompt property, not a deterministic
  assertion — the E2E is a sanity check, not a hard gate.

## Out of Scope

- Real DOM selectors / locators.
- A replayable Playwright (or other framework) script.
- UI rendering of the metadata.
- Any automation runner or agent that consumes the metadata.
- Cross-step normalization of `automation` wording in `canonicalizeActions`.
- `target` "nearby context / state" attributes (placeholder text, sibling
  headings, enabled/selected state) — considered and cut for leanness.
