# Sub-Step Automation Metadata — Design

**Date:** 2026-05-18
**Status:** Approved

## Problem

Each sub-step of a generated SOP currently carries only human-facing fields:
`verb`, `description`, `screenName`, `elementCaption`, a highlight `point`, and
`time`. Nothing is structured for a machine to act on.

The goal: attach **automation metadata** to every sub-step so that, in a future
project, an AI automation agent (Playwright-style, MCP-driven, or otherwise) can
read the SOP and reproduce the workflow. The agent is assumed to be capable — it
reads the intent like an end user and locates elements itself. The metadata's
job is to give it a precise, machine-readable description of *what* to do and
*on what element*, not a brittle script.

## Constraints

- The pipeline only ever sees **video frames**, never the live DOM. All metadata
  is VLM-inferred from pixels. We therefore emit a **semantic intent descriptor**
  — not CSS selectors, not locators, not a replayable script.
- No recorder PII or secrets may be baked into a stored SOP. Typed values are
  captured as **parameterized placeholders** with a masked example only.
- The feature is **store-only**. No UI rendering, no export format, no
  automation runner — those are future projects.

## The Metadata Shape

A new optional `automation` object on each sub-step, alongside the existing
human-facing fields (it does not replace them):

```ts
automation: {
  action: "click" | "type" | "select" | "navigate" | "view";
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
}
```

Rules:

- `action` is the normalized verb: `click`→`click`, `input`→`type`,
  `select`→`select`, `link`→`navigate`, `view`→`view`.
- `inputValue` is present only for `type`/`select` actions; `null`/absent
  otherwise.
- `example` is **always masked** — emails/names/numbers partially redacted,
  passwords never stored at all (`example` omitted, `valueType: "password"`).
- `expectedOutcome` is a short hint derived from the after-frame. It is a
  recovery anchor, not a strict assertion.
- The whole `automation` object is **optional**. SOPs generated before this
  feature lack it; nothing breaks.

## How It Flows Through the Pipeline

The `automation` object is produced by the classifier (the only stage that sees
the element with full visual context) and rides the existing rails to storage.
**No new VLM call** — the classifier already makes one vision call per candidate
and returns `verb`/`screenName`/`elementCaption`; it now returns `automation` in
the same JSON response.

1. **`ClassifiedCandidate` schema** (`src/lib/schemas.ts`) — add `automation`,
   nullable. `discard` candidates emit `automation: null`.
2. **`classifyStepWithLLM.ts`** — the candidate→record mapping (where
   `verb`/`screenName`/`elementCaption` are copied, ~line 212) also copies
   `automation`.
3. **`Action` type** (`src/lib/schemas.ts`) — add `automation?`.
   `buildActionsForStep` threads it through.
4. **`canonicalizeActions`** — already a text-only step-wide pass that normalizes
   captions. Extended to also reconcile `automation.target.text` and
   `automation.target.role` into consistent wording across the step. Fail-safe:
   on LLM error the raw `automation` is kept (same policy as today).
5. **`Screenshot` type** (`src/lib/mongo.ts`) — add `automation?`.
   `uploadScreenshots` copies it from `Action` onto the persisted `Screenshot`.

Flow: classifier → `Action.automation` → canonicalize normalizes →
`Screenshot.automation` → persisted on `Step.screenshots`.

This is identical for the **speech and silent paths** — both converge on
`Action` before the classifier runs, so silent SOPs get automation metadata for
free.

## Prompt Changes

Both in `src/config/index.ts`:

- **Classifier system prompt** — add an "Automation metadata" block: for each
  kept candidate, emit `automation` — read the element's visible `text`,
  classify its `role`, describe its on-screen `location`; for `type`/`select`
  actions emit `inputValue` with a semantic `field`, `valueType`, and a
  **masked** `example`. Explicit rule: never echo literal typed text — mask
  emails/names/numbers; never store passwords (omit `example`,
  `valueType: "password"`). Emit a one-line `expectedOutcome` from the
  after-frame. `discard` candidates emit `automation: null`.
- **Canonicalize prompt** — extended to also reconcile
  `automation.target.text`/`role` across the step.

**Language rule:** `automation.target.text` is a UI label the agent matches
against the real screen — it is kept in the **app's UI language as seen in the
video**, never translated. `role`, `location`, and `expectedOutcome` follow the
SOP's output language (detected for speech, default for silent), consistent with
the rest of the pipeline.

## Consumption Surface

Store-only. The metadata is persisted on `Screenshot` and returned by the share
API route (`src/app/share/[token]/route.ts`) as part of each screenshot object.
No UI rendering, no export format, no automation runner. A future agent/MCP
consumer is a separate project — this spec only makes the data exist and be
correct.

## Testing

- `schemas.ts` — `automation` parses when present; absence is valid (old
  records still validate).
- `classifyStepWithLLM.test.ts` — stubbed VLM response carrying `automation` is
  mapped onto the record; a `discard` candidate yields `automation` null.
- `canonicalizeActions.test.ts` — divergent `target.text` across actions is
  normalized; on LLM error the raw `automation` is preserved.
- `uploadScreenshots.test.ts` — `automation` is copied from `Action` to the
  persisted `Screenshot`.
- One E2E on `samples/hubspot_crm.mp4` confirming real runs produce sane
  `automation`: correct `role`s, masked `inputValue.example`s, no leaked literal
  values.

## Out of Scope

- Real DOM selectors / locators.
- A replayable Playwright (or other framework) script.
- UI rendering of the metadata.
- Any automation runner or agent that consumes the metadata.
- `target` "nearby context / state" attributes (placeholder text, sibling
  headings, enabled/selected state) — considered and cut for leanness.
