import {
  defineConfig
} from "../../../chunk-5C4WVIZW.mjs";
import "../../../chunk-SZ6GL6S4.mjs";
import "../../../chunk-E6JKZSLS.mjs";
import {
  init_esm
} from "../../../chunk-3VTTNDYQ.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: "proj_vrlpycnuckmgaizuxikz",
  runtime: "node",
  logLevel: "info",
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: { maxAttempts: 1, minTimeoutInMs: 1e3, maxTimeoutInMs: 1e4, factor: 2, randomize: true }
  },
  dirs: ["./src/trigger"],
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
