import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg, additionalFiles } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_vrlpycnuckmgaizuxikz",
  runtime: "node",
  logLevel: "info",
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: { maxAttempts: 1, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2, randomize: true },
  },
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      ffmpeg(),
      // Bundle Be Vietnam Pro fonts so renderPdf.tsx can load them in deployed workers.
      additionalFiles({ files: ["public/fonts/*.ttf"] }),
    ],
  },
});
