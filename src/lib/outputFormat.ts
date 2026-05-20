import type { OutputFormatChoice } from "./schemas";
export type { OutputFormatChoice };

export type GatedAppType = "web" | "mobile" | "desktop" | "physical";
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
