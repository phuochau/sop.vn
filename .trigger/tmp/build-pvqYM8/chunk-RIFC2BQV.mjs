import {
  __commonJS,
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@smithy/property-provider/dist-cjs/index.js
var require_dist_cjs = __commonJS({
  "node_modules/@smithy/property-provider/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var ProviderError = class _ProviderError extends Error {
      static {
        __name(this, "ProviderError");
      }
      name = "ProviderError";
      tryNextLink;
      constructor(message, options = true) {
        let logger;
        let tryNextLink = true;
        if (typeof options === "boolean") {
          logger = void 0;
          tryNextLink = options;
        } else if (options != null && typeof options === "object") {
          logger = options.logger;
          tryNextLink = options.tryNextLink ?? true;
        }
        super(message);
        this.tryNextLink = tryNextLink;
        Object.setPrototypeOf(this, _ProviderError.prototype);
        logger?.debug?.(`@smithy/property-provider ${tryNextLink ? "->" : "(!)"} ${message}`);
      }
      static from(error, options = true) {
        return Object.assign(new this(error.message, options), error);
      }
    };
    var CredentialsProviderError = class _CredentialsProviderError extends ProviderError {
      static {
        __name(this, "CredentialsProviderError");
      }
      name = "CredentialsProviderError";
      constructor(message, options = true) {
        super(message, options);
        Object.setPrototypeOf(this, _CredentialsProviderError.prototype);
      }
    };
    var TokenProviderError = class _TokenProviderError extends ProviderError {
      static {
        __name(this, "TokenProviderError");
      }
      name = "TokenProviderError";
      constructor(message, options = true) {
        super(message, options);
        Object.setPrototypeOf(this, _TokenProviderError.prototype);
      }
    };
    var chain = /* @__PURE__ */ __name((...providers) => async () => {
      if (providers.length === 0) {
        throw new ProviderError("No providers in chain");
      }
      let lastProviderError;
      for (const provider of providers) {
        try {
          const credentials = await provider();
          return credentials;
        } catch (err) {
          lastProviderError = err;
          if (err?.tryNextLink) {
            continue;
          }
          throw err;
        }
      }
      throw lastProviderError;
    }, "chain");
    var fromStatic = /* @__PURE__ */ __name((staticValue) => () => Promise.resolve(staticValue), "fromStatic");
    var memoize = /* @__PURE__ */ __name((provider, isExpired, requiresRefresh) => {
      let resolved;
      let pending;
      let hasResult;
      let isConstant = false;
      const coalesceProvider = /* @__PURE__ */ __name(async () => {
        if (!pending) {
          pending = provider();
        }
        try {
          resolved = await pending;
          hasResult = true;
          isConstant = false;
        } finally {
          pending = void 0;
        }
        return resolved;
      }, "coalesceProvider");
      if (isExpired === void 0) {
        return async (options) => {
          if (!hasResult || options?.forceRefresh) {
            resolved = await coalesceProvider();
          }
          return resolved;
        };
      }
      return async (options) => {
        if (!hasResult || options?.forceRefresh) {
          resolved = await coalesceProvider();
        }
        if (isConstant) {
          return resolved;
        }
        if (requiresRefresh && !requiresRefresh(resolved)) {
          isConstant = true;
          return resolved;
        }
        if (isExpired(resolved)) {
          await coalesceProvider();
          return resolved;
        }
        return resolved;
      };
    }, "memoize");
    exports.CredentialsProviderError = CredentialsProviderError;
    exports.ProviderError = ProviderError;
    exports.TokenProviderError = TokenProviderError;
    exports.chain = chain;
    exports.fromStatic = fromStatic;
    exports.memoize = memoize;
  }
});

export {
  require_dist_cjs
};
//# sourceMappingURL=chunk-RIFC2BQV.mjs.map
