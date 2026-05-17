import { logger } from "@trigger.dev/sdk/v3";
import { maskedDHash } from "@/trigger/lib/screenId";
import { hammingDistance } from "@/trigger/lib/perceptualHash";
import type { Action } from "@/lib/schemas";

/**
 * Collapse adjacent actions that are CV multi-fires of ONE real action.
 *
 * The click-event detector often fires several times across a single click
 * (the click highlight, then the transition). Those become separate actions
 * with the same displayed screen. The `canonicalizeActions` pass unifies most
 * caption text so the text-keyed dedup in `buildActionsForStep` catches the
 * obvious repeats; this pass is the frame-keyed backstop for CV multi-fires
 * whose captions still differ but whose *display frames* are near-identical.
 *
 * Two actions are treated as the same action when they are close in time,
 * share a verb, and their display frames are within `hammingThreshold` of each
 * other (a tight threshold — only true duplicates, not merely same-template
 * screens). The earliest of each run is kept; `order` is renumbered.
 */
export async function collapseDuplicateActions(args: {
  actions: Action[];
  gapSec: number;
  hammingThreshold: number;
  /** Injectable for tests; defaults to `maskedDHash`. Returns null on failure. */
  hashFn?: (path: string) => Promise<string | null>;
}): Promise<Action[]> {
  const { actions, gapSec, hammingThreshold } = args;
  if (actions.length <= 1) return actions;

  const hashFn = args.hashFn ?? (async (p: string) => {
    try { return await maskedDHash(p); } catch { return null; }
  });

  const sorted = [...actions].sort((a, b) => a.time - b.time);
  const hashCache = new Map<string, string | null>();
  const hashOf = async (p: string): Promise<string | null> => {
    if (hashCache.has(p)) return hashCache.get(p)!;
    const h = await hashFn(p);
    hashCache.set(p, h);
    return h;
  };

  const kept: Action[] = [];
  let anchor: Action | null = null;
  let anchorHash: string | null = null;
  for (const a of sorted) {
    const h = await hashOf(a.displayFramePath);
    const isDuplicate =
      anchor !== null &&
      anchorHash !== null &&
      h !== null &&
      a.verb === anchor.verb &&
      a.time - anchor.time <= gapSec &&
      hammingDistance(h, anchorHash) <= hammingThreshold;
    if (isDuplicate) {
      logger.info("pipeline.action.collapsed_duplicate", {
        keptTime: anchor!.time,
        droppedTime: a.time,
        verb: a.verb,
      });
      continue;
    }
    anchor = a;
    anchorHash = h;
    kept.push(a);
  }

  return kept.map((a, order) => ({ ...a, order }));
}
