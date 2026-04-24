import {
  require_dist_cjs as require_dist_cjs2
} from "./chunk-IIMKTLY7.mjs";
import {
  require_dist_cjs
} from "./chunk-RIFC2BQV.mjs";
import {
  __commonJS,
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@smithy/node-config-provider/dist-cjs/index.js
var require_dist_cjs3 = __commonJS({
  "node_modules/@smithy/node-config-provider/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var propertyProvider = require_dist_cjs();
    var sharedIniFileLoader = require_dist_cjs2();
    function getSelectorName(functionString) {
      try {
        const constants = new Set(Array.from(functionString.match(/([A-Z_]){3,}/g) ?? []));
        constants.delete("CONFIG");
        constants.delete("CONFIG_PREFIX_SEPARATOR");
        constants.delete("ENV");
        return [...constants].join(", ");
      } catch (e) {
        return functionString;
      }
    }
    __name(getSelectorName, "getSelectorName");
    var fromEnv = /* @__PURE__ */ __name((envVarSelector, options) => async () => {
      try {
        const config = envVarSelector(process.env, options);
        if (config === void 0) {
          throw new Error();
        }
        return config;
      } catch (e) {
        throw new propertyProvider.CredentialsProviderError(e.message || `Not found in ENV: ${getSelectorName(envVarSelector.toString())}`, { logger: options?.logger });
      }
    }, "fromEnv");
    var fromSharedConfigFiles = /* @__PURE__ */ __name((configSelector, { preferredFile = "config", ...init } = {}) => async () => {
      const profile = sharedIniFileLoader.getProfileName(init);
      const { configFile, credentialsFile } = await sharedIniFileLoader.loadSharedConfigFiles(init);
      const profileFromCredentials = credentialsFile[profile] || {};
      const profileFromConfig = configFile[profile] || {};
      const mergedProfile = preferredFile === "config" ? { ...profileFromCredentials, ...profileFromConfig } : { ...profileFromConfig, ...profileFromCredentials };
      try {
        const cfgFile = preferredFile === "config" ? configFile : credentialsFile;
        const configValue = configSelector(mergedProfile, cfgFile);
        if (configValue === void 0) {
          throw new Error();
        }
        return configValue;
      } catch (e) {
        throw new propertyProvider.CredentialsProviderError(e.message || `Not found in config files w/ profile [${profile}]: ${getSelectorName(configSelector.toString())}`, { logger: init.logger });
      }
    }, "fromSharedConfigFiles");
    var isFunction = /* @__PURE__ */ __name((func) => typeof func === "function", "isFunction");
    var fromStatic = /* @__PURE__ */ __name((defaultValue) => isFunction(defaultValue) ? async () => await defaultValue() : propertyProvider.fromStatic(defaultValue), "fromStatic");
    var loadConfig = /* @__PURE__ */ __name(({ environmentVariableSelector, configFileSelector, default: defaultValue }, configuration = {}) => {
      const { signingName, logger } = configuration;
      const envOptions = { signingName, logger };
      return propertyProvider.memoize(propertyProvider.chain(fromEnv(environmentVariableSelector, envOptions), fromSharedConfigFiles(configFileSelector, configuration), fromStatic(defaultValue)));
    }, "loadConfig");
    exports.loadConfig = loadConfig;
  }
});

export {
  require_dist_cjs3 as require_dist_cjs
};
//# sourceMappingURL=chunk-HVKOIMR6.mjs.map
