import {
  FromStringShapeDeserializer,
  HttpBindingProtocol,
  HttpInterceptingShapeDeserializer,
  HttpInterceptingShapeSerializer,
  LazyJsonString,
  NormalizedSchema,
  NumericValue,
  RpcProtocol,
  SerdeContext,
  TypeRegistry,
  _parseEpochTimestamp,
  collectBody,
  dateToUtcString,
  deref,
  determineTimestampFormat,
  endpoints_exports,
  extendedEncodeURIComponent,
  import_uuid,
  init_endpoints,
  init_protocols,
  init_schema,
  init_serde,
  nv,
  parseEpochTimestamp,
  parseRfc3339DateTimeWithOffset,
  parseRfc7231DateTime,
  requestBuilder,
  require_dist_cjs as require_dist_cjs8,
  require_dist_cjs2 as require_dist_cjs9,
  require_dist_cjs5 as require_dist_cjs10,
  require_dist_cjs7 as require_dist_cjs11,
  require_dist_cjs8 as require_dist_cjs13,
  require_dist_cjs9 as require_dist_cjs14,
  serde_exports
} from "./chunk-TYTCKKP3.mjs";
import {
  require_dist_cjs as require_dist_cjs2
} from "./chunk-AJILZ5WZ.mjs";
import {
  require_dist_cjs as require_dist_cjs5,
  require_dist_cjs2 as require_dist_cjs6,
  require_dist_cjs3 as require_dist_cjs7
} from "./chunk-TPR7ISAF.mjs";
import {
  client_exports,
  init_client,
  require_dist_cjs as require_dist_cjs3,
  require_dist_cjs2 as require_dist_cjs4,
  setCredentialFeature
} from "./chunk-IAJ5C443.mjs";
import {
  require_dist_cjs as require_dist_cjs17
} from "./chunk-HVKOIMR6.mjs";
import {
  require_dist_cjs as require_dist_cjs12
} from "./chunk-Q4T5MCLT.mjs";
import {
  require_dist_cjs as require_dist_cjs16
} from "./chunk-IIMKTLY7.mjs";
import {
  require_dist_cjs
} from "./chunk-YPLDPGBH.mjs";
import {
  require_dist_cjs as require_dist_cjs15
} from "./chunk-RIFC2BQV.mjs";
import {
  __commonJS,
  __esm,
  __export,
  __name,
  __require,
  __toCommonJS,
  __toESM,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@aws-sdk/middleware-host-header/dist-cjs/index.js
var require_dist_cjs18 = __commonJS({
  "node_modules/@aws-sdk/middleware-host-header/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var protocolHttp = require_dist_cjs2();
    function resolveHostHeaderConfig(input) {
      return input;
    }
    __name(resolveHostHeaderConfig, "resolveHostHeaderConfig");
    var hostHeaderMiddleware = /* @__PURE__ */ __name((options) => (next) => async (args) => {
      if (!protocolHttp.HttpRequest.isInstance(args.request))
        return next(args);
      const { request } = args;
      const { handlerProtocol = "" } = options.requestHandler.metadata || {};
      if (handlerProtocol.indexOf("h2") >= 0 && !request.headers[":authority"]) {
        delete request.headers["host"];
        request.headers[":authority"] = request.hostname + (request.port ? ":" + request.port : "");
      } else if (!request.headers["host"]) {
        let host = request.hostname;
        if (request.port != null)
          host += `:${request.port}`;
        request.headers["host"] = host;
      }
      return next(args);
    }, "hostHeaderMiddleware");
    var hostHeaderMiddlewareOptions = {
      name: "hostHeaderMiddleware",
      step: "build",
      priority: "low",
      tags: ["HOST"],
      override: true
    };
    var getHostHeaderPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(hostHeaderMiddleware(options), hostHeaderMiddlewareOptions);
      }, "applyToStack")
    }), "getHostHeaderPlugin");
    exports.getHostHeaderPlugin = getHostHeaderPlugin;
    exports.hostHeaderMiddleware = hostHeaderMiddleware;
    exports.hostHeaderMiddlewareOptions = hostHeaderMiddlewareOptions;
    exports.resolveHostHeaderConfig = resolveHostHeaderConfig;
  }
});

// node_modules/@aws-sdk/middleware-logger/dist-cjs/index.js
var require_dist_cjs19 = __commonJS({
  "node_modules/@aws-sdk/middleware-logger/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var loggerMiddleware = /* @__PURE__ */ __name(() => (next, context) => async (args) => {
      try {
        const response = await next(args);
        const { clientName, commandName, logger, dynamoDbDocumentClientOptions = {} } = context;
        const { overrideInputFilterSensitiveLog, overrideOutputFilterSensitiveLog } = dynamoDbDocumentClientOptions;
        const inputFilterSensitiveLog = overrideInputFilterSensitiveLog ?? context.inputFilterSensitiveLog;
        const outputFilterSensitiveLog = overrideOutputFilterSensitiveLog ?? context.outputFilterSensitiveLog;
        const { $metadata, ...outputWithoutMetadata } = response.output;
        logger?.info?.({
          clientName,
          commandName,
          input: inputFilterSensitiveLog(args.input),
          output: outputFilterSensitiveLog(outputWithoutMetadata),
          metadata: $metadata
        });
        return response;
      } catch (error) {
        const { clientName, commandName, logger, dynamoDbDocumentClientOptions = {} } = context;
        const { overrideInputFilterSensitiveLog } = dynamoDbDocumentClientOptions;
        const inputFilterSensitiveLog = overrideInputFilterSensitiveLog ?? context.inputFilterSensitiveLog;
        logger?.error?.({
          clientName,
          commandName,
          input: inputFilterSensitiveLog(args.input),
          error,
          metadata: error.$metadata
        });
        throw error;
      }
    }, "loggerMiddleware");
    var loggerMiddlewareOptions = {
      name: "loggerMiddleware",
      tags: ["LOGGER"],
      step: "initialize",
      override: true
    };
    var getLoggerPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(loggerMiddleware(), loggerMiddlewareOptions);
      }, "applyToStack")
    }), "getLoggerPlugin");
    exports.getLoggerPlugin = getLoggerPlugin;
    exports.loggerMiddleware = loggerMiddleware;
    exports.loggerMiddlewareOptions = loggerMiddlewareOptions;
  }
});

// node_modules/@aws/lambda-invoke-store/dist-es/invoke-store.js
var invoke_store_exports = {};
__export(invoke_store_exports, {
  InvokeStore: () => InvokeStore,
  InvokeStoreBase: () => InvokeStoreBase
});
var PROTECTED_KEYS, NO_GLOBAL_AWS_LAMBDA, InvokeStoreBase, InvokeStoreSingle, InvokeStoreMulti, InvokeStore;
var init_invoke_store = __esm({
  "node_modules/@aws/lambda-invoke-store/dist-es/invoke-store.js"() {
    init_esm();
    PROTECTED_KEYS = {
      REQUEST_ID: Symbol.for("_AWS_LAMBDA_REQUEST_ID"),
      X_RAY_TRACE_ID: Symbol.for("_AWS_LAMBDA_X_RAY_TRACE_ID"),
      TENANT_ID: Symbol.for("_AWS_LAMBDA_TENANT_ID")
    };
    NO_GLOBAL_AWS_LAMBDA = ["true", "1"].includes(process.env?.AWS_LAMBDA_NODEJS_NO_GLOBAL_AWSLAMBDA ?? "");
    if (!NO_GLOBAL_AWS_LAMBDA) {
      globalThis.awslambda = globalThis.awslambda || {};
    }
    InvokeStoreBase = class {
      static {
        __name(this, "InvokeStoreBase");
      }
      static PROTECTED_KEYS = PROTECTED_KEYS;
      isProtectedKey(key) {
        return Object.values(PROTECTED_KEYS).includes(key);
      }
      getRequestId() {
        return this.get(PROTECTED_KEYS.REQUEST_ID) ?? "-";
      }
      getXRayTraceId() {
        return this.get(PROTECTED_KEYS.X_RAY_TRACE_ID);
      }
      getTenantId() {
        return this.get(PROTECTED_KEYS.TENANT_ID);
      }
    };
    InvokeStoreSingle = class extends InvokeStoreBase {
      static {
        __name(this, "InvokeStoreSingle");
      }
      currentContext;
      getContext() {
        return this.currentContext;
      }
      hasContext() {
        return this.currentContext !== void 0;
      }
      get(key) {
        return this.currentContext?.[key];
      }
      set(key, value) {
        if (this.isProtectedKey(key)) {
          throw new Error(`Cannot modify protected Lambda context field: ${String(key)}`);
        }
        this.currentContext = this.currentContext || {};
        this.currentContext[key] = value;
      }
      run(context, fn) {
        this.currentContext = context;
        return fn();
      }
    };
    InvokeStoreMulti = class _InvokeStoreMulti extends InvokeStoreBase {
      static {
        __name(this, "InvokeStoreMulti");
      }
      als;
      static async create() {
        const instance = new _InvokeStoreMulti();
        const asyncHooks = await import("node:async_hooks");
        instance.als = new asyncHooks.AsyncLocalStorage();
        return instance;
      }
      getContext() {
        return this.als.getStore();
      }
      hasContext() {
        return this.als.getStore() !== void 0;
      }
      get(key) {
        return this.als.getStore()?.[key];
      }
      set(key, value) {
        if (this.isProtectedKey(key)) {
          throw new Error(`Cannot modify protected Lambda context field: ${String(key)}`);
        }
        const store = this.als.getStore();
        if (!store) {
          throw new Error("No context available");
        }
        store[key] = value;
      }
      run(context, fn) {
        return this.als.run(context, fn);
      }
    };
    (function(InvokeStore2) {
      let instance = null;
      async function getInstanceAsync(forceInvokeStoreMulti) {
        if (!instance) {
          instance = (async () => {
            const isMulti = forceInvokeStoreMulti === true || "AWS_LAMBDA_MAX_CONCURRENCY" in process.env;
            const newInstance = isMulti ? await InvokeStoreMulti.create() : new InvokeStoreSingle();
            if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda?.InvokeStore) {
              return globalThis.awslambda.InvokeStore;
            } else if (!NO_GLOBAL_AWS_LAMBDA && globalThis.awslambda) {
              globalThis.awslambda.InvokeStore = newInstance;
              return newInstance;
            } else {
              return newInstance;
            }
          })();
        }
        return instance;
      }
      __name(getInstanceAsync, "getInstanceAsync");
      InvokeStore2.getInstanceAsync = getInstanceAsync;
      InvokeStore2._testing = process.env.AWS_LAMBDA_BENCHMARK_MODE === "1" ? {
        reset: /* @__PURE__ */ __name(() => {
          instance = null;
          if (globalThis.awslambda?.InvokeStore) {
            delete globalThis.awslambda.InvokeStore;
          }
          globalThis.awslambda = { InvokeStore: void 0 };
        }, "reset")
      } : void 0;
    })(InvokeStore || (InvokeStore = {}));
  }
});

// node_modules/@aws-sdk/middleware-recursion-detection/dist-cjs/recursionDetectionMiddleware.js
var require_recursionDetectionMiddleware = __commonJS({
  "node_modules/@aws-sdk/middleware-recursion-detection/dist-cjs/recursionDetectionMiddleware.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.recursionDetectionMiddleware = void 0;
    var lambda_invoke_store_1 = (init_invoke_store(), __toCommonJS(invoke_store_exports));
    var protocol_http_1 = require_dist_cjs2();
    var TRACE_ID_HEADER_NAME = "X-Amzn-Trace-Id";
    var ENV_LAMBDA_FUNCTION_NAME = "AWS_LAMBDA_FUNCTION_NAME";
    var ENV_TRACE_ID = "_X_AMZN_TRACE_ID";
    var recursionDetectionMiddleware = /* @__PURE__ */ __name(() => (next) => async (args) => {
      const { request } = args;
      if (!protocol_http_1.HttpRequest.isInstance(request)) {
        return next(args);
      }
      const traceIdHeader = Object.keys(request.headers ?? {}).find((h) => h.toLowerCase() === TRACE_ID_HEADER_NAME.toLowerCase()) ?? TRACE_ID_HEADER_NAME;
      if (request.headers.hasOwnProperty(traceIdHeader)) {
        return next(args);
      }
      const functionName = process.env[ENV_LAMBDA_FUNCTION_NAME];
      const traceIdFromEnv = process.env[ENV_TRACE_ID];
      const invokeStore = await lambda_invoke_store_1.InvokeStore.getInstanceAsync();
      const traceIdFromInvokeStore = invokeStore?.getXRayTraceId();
      const traceId = traceIdFromInvokeStore ?? traceIdFromEnv;
      const nonEmptyString = /* @__PURE__ */ __name((str) => typeof str === "string" && str.length > 0, "nonEmptyString");
      if (nonEmptyString(functionName) && nonEmptyString(traceId)) {
        request.headers[TRACE_ID_HEADER_NAME] = traceId;
      }
      return next({
        ...args,
        request
      });
    }, "recursionDetectionMiddleware");
    exports.recursionDetectionMiddleware = recursionDetectionMiddleware;
  }
});

// node_modules/@aws-sdk/middleware-recursion-detection/dist-cjs/index.js
var require_dist_cjs20 = __commonJS({
  "node_modules/@aws-sdk/middleware-recursion-detection/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var recursionDetectionMiddleware = require_recursionDetectionMiddleware();
    var recursionDetectionMiddlewareOptions = {
      step: "build",
      tags: ["RECURSION_DETECTION"],
      name: "recursionDetectionMiddleware",
      override: true,
      priority: "low"
    };
    var getRecursionDetectionPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(recursionDetectionMiddleware.recursionDetectionMiddleware(), recursionDetectionMiddlewareOptions);
      }, "applyToStack")
    }), "getRecursionDetectionPlugin");
    exports.getRecursionDetectionPlugin = getRecursionDetectionPlugin;
    Object.prototype.hasOwnProperty.call(recursionDetectionMiddleware, "__proto__") && !Object.prototype.hasOwnProperty.call(exports, "__proto__") && Object.defineProperty(exports, "__proto__", {
      enumerable: true,
      value: recursionDetectionMiddleware["__proto__"]
    });
    Object.keys(recursionDetectionMiddleware).forEach(function(k) {
      if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = recursionDetectionMiddleware[k];
    });
  }
});

// node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/resolveAuthOptions.js
var resolveAuthOptions;
var init_resolveAuthOptions = __esm({
  "node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/resolveAuthOptions.js"() {
    init_esm();
    resolveAuthOptions = /* @__PURE__ */ __name((candidateAuthOptions, authSchemePreference) => {
      if (!authSchemePreference || authSchemePreference.length === 0) {
        return candidateAuthOptions;
      }
      const preferredAuthOptions = [];
      for (const preferredSchemeName of authSchemePreference) {
        for (const candidateAuthOption of candidateAuthOptions) {
          const candidateAuthSchemeName = candidateAuthOption.schemeId.split("#")[1];
          if (candidateAuthSchemeName === preferredSchemeName) {
            preferredAuthOptions.push(candidateAuthOption);
          }
        }
      }
      for (const candidateAuthOption of candidateAuthOptions) {
        if (!preferredAuthOptions.find(({ schemeId }) => schemeId === candidateAuthOption.schemeId)) {
          preferredAuthOptions.push(candidateAuthOption);
        }
      }
      return preferredAuthOptions;
    }, "resolveAuthOptions");
  }
});

// node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/httpAuthSchemeMiddleware.js
function convertHttpAuthSchemesToMap(httpAuthSchemes) {
  const map = /* @__PURE__ */ new Map();
  for (const scheme of httpAuthSchemes) {
    map.set(scheme.schemeId, scheme);
  }
  return map;
}
var import_util_middleware, httpAuthSchemeMiddleware;
var init_httpAuthSchemeMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/httpAuthSchemeMiddleware.js"() {
    init_esm();
    import_util_middleware = __toESM(require_dist_cjs11());
    init_resolveAuthOptions();
    __name(convertHttpAuthSchemesToMap, "convertHttpAuthSchemesToMap");
    httpAuthSchemeMiddleware = /* @__PURE__ */ __name((config, mwOptions) => (next, context) => async (args) => {
      const options = config.httpAuthSchemeProvider(await mwOptions.httpAuthSchemeParametersProvider(config, context, args.input));
      const authSchemePreference = config.authSchemePreference ? await config.authSchemePreference() : [];
      const resolvedOptions = resolveAuthOptions(options, authSchemePreference);
      const authSchemes = convertHttpAuthSchemesToMap(config.httpAuthSchemes);
      const smithyContext = (0, import_util_middleware.getSmithyContext)(context);
      const failureReasons = [];
      for (const option of resolvedOptions) {
        const scheme = authSchemes.get(option.schemeId);
        if (!scheme) {
          failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` was not enabled for this service.`);
          continue;
        }
        const identityProvider = scheme.identityProvider(await mwOptions.identityProviderConfigProvider(config));
        if (!identityProvider) {
          failureReasons.push(`HttpAuthScheme \`${option.schemeId}\` did not have an IdentityProvider configured.`);
          continue;
        }
        const { identityProperties = {}, signingProperties = {} } = option.propertiesExtractor?.(config, context) || {};
        option.identityProperties = Object.assign(option.identityProperties || {}, identityProperties);
        option.signingProperties = Object.assign(option.signingProperties || {}, signingProperties);
        smithyContext.selectedHttpAuthScheme = {
          httpAuthOption: option,
          identity: await identityProvider(option.identityProperties),
          signer: scheme.signer
        };
        break;
      }
      if (!smithyContext.selectedHttpAuthScheme) {
        throw new Error(failureReasons.join("\n"));
      }
      return next(args);
    }, "httpAuthSchemeMiddleware");
  }
});

// node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/getHttpAuthSchemeEndpointRuleSetPlugin.js
var httpAuthSchemeEndpointRuleSetMiddlewareOptions, getHttpAuthSchemeEndpointRuleSetPlugin;
var init_getHttpAuthSchemeEndpointRuleSetPlugin = __esm({
  "node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/getHttpAuthSchemeEndpointRuleSetPlugin.js"() {
    init_esm();
    init_httpAuthSchemeMiddleware();
    httpAuthSchemeEndpointRuleSetMiddlewareOptions = {
      step: "serialize",
      tags: ["HTTP_AUTH_SCHEME"],
      name: "httpAuthSchemeMiddleware",
      override: true,
      relation: "before",
      toMiddleware: "endpointV2Middleware"
    };
    getHttpAuthSchemeEndpointRuleSetPlugin = /* @__PURE__ */ __name((config, { httpAuthSchemeParametersProvider, identityProviderConfigProvider }) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.addRelativeTo(httpAuthSchemeMiddleware(config, {
          httpAuthSchemeParametersProvider,
          identityProviderConfigProvider
        }), httpAuthSchemeEndpointRuleSetMiddlewareOptions);
      }, "applyToStack")
    }), "getHttpAuthSchemeEndpointRuleSetPlugin");
  }
});

// node_modules/@smithy/core/dist-es/middleware-http-signing/httpSigningMiddleware.js
var import_protocol_http, import_util_middleware2, defaultErrorHandler, defaultSuccessHandler, httpSigningMiddleware;
var init_httpSigningMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/middleware-http-signing/httpSigningMiddleware.js"() {
    init_esm();
    import_protocol_http = __toESM(require_dist_cjs2());
    import_util_middleware2 = __toESM(require_dist_cjs11());
    defaultErrorHandler = /* @__PURE__ */ __name((signingProperties) => (error) => {
      throw error;
    }, "defaultErrorHandler");
    defaultSuccessHandler = /* @__PURE__ */ __name((httpResponse, signingProperties) => {
    }, "defaultSuccessHandler");
    httpSigningMiddleware = /* @__PURE__ */ __name((config) => (next, context) => async (args) => {
      if (!import_protocol_http.HttpRequest.isInstance(args.request)) {
        return next(args);
      }
      const smithyContext = (0, import_util_middleware2.getSmithyContext)(context);
      const scheme = smithyContext.selectedHttpAuthScheme;
      if (!scheme) {
        throw new Error(`No HttpAuthScheme was selected: unable to sign request`);
      }
      const { httpAuthOption: { signingProperties = {} }, identity, signer } = scheme;
      const output = await next({
        ...args,
        request: await signer.sign(args.request, identity, signingProperties)
      }).catch((signer.errorHandler || defaultErrorHandler)(signingProperties));
      (signer.successHandler || defaultSuccessHandler)(output.response, signingProperties);
      return output;
    }, "httpSigningMiddleware");
  }
});

// node_modules/@smithy/core/dist-es/middleware-http-signing/getHttpSigningMiddleware.js
var httpSigningMiddlewareOptions, getHttpSigningPlugin;
var init_getHttpSigningMiddleware = __esm({
  "node_modules/@smithy/core/dist-es/middleware-http-signing/getHttpSigningMiddleware.js"() {
    init_esm();
    init_httpSigningMiddleware();
    httpSigningMiddlewareOptions = {
      step: "finalizeRequest",
      tags: ["HTTP_SIGNING"],
      name: "httpSigningMiddleware",
      aliases: ["apiKeyMiddleware", "tokenMiddleware", "awsAuthMiddleware"],
      override: true,
      relation: "after",
      toMiddleware: "retryMiddleware"
    };
    getHttpSigningPlugin = /* @__PURE__ */ __name((config) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.addRelativeTo(httpSigningMiddleware(config), httpSigningMiddlewareOptions);
      }, "applyToStack")
    }), "getHttpSigningPlugin");
  }
});

// node_modules/@smithy/core/dist-es/util-identity-and-auth/DefaultIdentityProviderConfig.js
var DefaultIdentityProviderConfig;
var init_DefaultIdentityProviderConfig = __esm({
  "node_modules/@smithy/core/dist-es/util-identity-and-auth/DefaultIdentityProviderConfig.js"() {
    init_esm();
    DefaultIdentityProviderConfig = class {
      static {
        __name(this, "DefaultIdentityProviderConfig");
      }
      authSchemes = /* @__PURE__ */ new Map();
      constructor(config) {
        for (const key in config) {
          const value = config[key];
          if (value !== void 0) {
            this.authSchemes.set(key, value);
          }
        }
      }
      getIdentityProvider(schemeId) {
        return this.authSchemes.get(schemeId);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/getSmithyContext.js
var import_types, getSmithyContext3;
var init_getSmithyContext = __esm({
  "node_modules/@smithy/core/dist-es/getSmithyContext.js"() {
    init_esm();
    import_types = __toESM(require_dist_cjs());
    getSmithyContext3 = /* @__PURE__ */ __name((context) => context[import_types.SMITHY_CONTEXT_KEY] || (context[import_types.SMITHY_CONTEXT_KEY] = {}), "getSmithyContext");
  }
});

// node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/getHttpAuthSchemePlugin.js
var httpAuthSchemeMiddlewareOptions, getHttpAuthSchemePlugin;
var init_getHttpAuthSchemePlugin = __esm({
  "node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/getHttpAuthSchemePlugin.js"() {
    init_esm();
    init_httpAuthSchemeMiddleware();
    httpAuthSchemeMiddlewareOptions = {
      step: "serialize",
      tags: ["HTTP_AUTH_SCHEME"],
      name: "httpAuthSchemeMiddleware",
      override: true,
      relation: "before",
      toMiddleware: "serializerMiddleware"
    };
    getHttpAuthSchemePlugin = /* @__PURE__ */ __name((config, { httpAuthSchemeParametersProvider, identityProviderConfigProvider }) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.addRelativeTo(httpAuthSchemeMiddleware(config, {
          httpAuthSchemeParametersProvider,
          identityProviderConfigProvider
        }), httpAuthSchemeMiddlewareOptions);
      }, "applyToStack")
    }), "getHttpAuthSchemePlugin");
  }
});

// node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/index.js
var init_middleware_http_auth_scheme = __esm({
  "node_modules/@smithy/core/dist-es/middleware-http-auth-scheme/index.js"() {
    init_esm();
    init_httpAuthSchemeMiddleware();
    init_getHttpAuthSchemeEndpointRuleSetPlugin();
    init_getHttpAuthSchemePlugin();
  }
});

// node_modules/@smithy/core/dist-es/middleware-http-signing/index.js
var init_middleware_http_signing = __esm({
  "node_modules/@smithy/core/dist-es/middleware-http-signing/index.js"() {
    init_esm();
    init_httpSigningMiddleware();
    init_getHttpSigningMiddleware();
  }
});

// node_modules/@smithy/core/dist-es/normalizeProvider.js
var normalizeProvider;
var init_normalizeProvider = __esm({
  "node_modules/@smithy/core/dist-es/normalizeProvider.js"() {
    init_esm();
    normalizeProvider = /* @__PURE__ */ __name((input) => {
      if (typeof input === "function")
        return input;
      const promisified = Promise.resolve(input);
      return () => promisified;
    }, "normalizeProvider");
  }
});

// node_modules/@smithy/core/dist-es/pagination/createPaginator.js
function createPaginator(ClientCtor, CommandCtor, inputTokenName, outputTokenName, pageSizeTokenName) {
  return /* @__PURE__ */ __name(async function* paginateOperation(config, input, ...additionalArguments) {
    const _input = input;
    let token = config.startingToken ?? _input[inputTokenName];
    let hasNext = true;
    let page;
    while (hasNext) {
      _input[inputTokenName] = token;
      if (pageSizeTokenName) {
        _input[pageSizeTokenName] = _input[pageSizeTokenName] ?? config.pageSize;
      }
      if (config.client instanceof ClientCtor) {
        page = await makePagedClientRequest(CommandCtor, config.client, input, config.withCommand, ...additionalArguments);
      } else {
        throw new Error(`Invalid client, expected instance of ${ClientCtor.name}`);
      }
      yield page;
      const prevToken = token;
      token = get(page, outputTokenName);
      hasNext = !!(token && (!config.stopOnSameToken || token !== prevToken));
    }
    return void 0;
  }, "paginateOperation");
}
var makePagedClientRequest, get;
var init_createPaginator = __esm({
  "node_modules/@smithy/core/dist-es/pagination/createPaginator.js"() {
    init_esm();
    makePagedClientRequest = /* @__PURE__ */ __name(async (CommandCtor, client, input, withCommand = (_) => _, ...args) => {
      let command = new CommandCtor(input);
      command = withCommand(command) ?? command;
      return await client.send(command, ...args);
    }, "makePagedClientRequest");
    __name(createPaginator, "createPaginator");
    get = /* @__PURE__ */ __name((fromObject, path) => {
      let cursor2 = fromObject;
      const pathComponents = path.split(".");
      for (const step of pathComponents) {
        if (!cursor2 || typeof cursor2 !== "object") {
          return void 0;
        }
        cursor2 = cursor2[step];
      }
      return cursor2;
    }, "get");
  }
});

// node_modules/@smithy/core/dist-es/request-builder/requestBuilder.js
var init_requestBuilder = __esm({
  "node_modules/@smithy/core/dist-es/request-builder/requestBuilder.js"() {
    init_esm();
    init_protocols();
  }
});

// node_modules/@smithy/core/dist-es/setFeature.js
function setFeature(context, feature, value) {
  if (!context.__smithy_context) {
    context.__smithy_context = {
      features: {}
    };
  } else if (!context.__smithy_context.features) {
    context.__smithy_context.features = {};
  }
  context.__smithy_context.features[feature] = value;
}
var init_setFeature = __esm({
  "node_modules/@smithy/core/dist-es/setFeature.js"() {
    init_esm();
    __name(setFeature, "setFeature");
  }
});

// node_modules/@smithy/core/dist-es/util-identity-and-auth/httpAuthSchemes/httpApiKeyAuth.js
var import_protocol_http2, import_types2, HttpApiKeyAuthSigner;
var init_httpApiKeyAuth = __esm({
  "node_modules/@smithy/core/dist-es/util-identity-and-auth/httpAuthSchemes/httpApiKeyAuth.js"() {
    init_esm();
    import_protocol_http2 = __toESM(require_dist_cjs2());
    import_types2 = __toESM(require_dist_cjs());
    HttpApiKeyAuthSigner = class {
      static {
        __name(this, "HttpApiKeyAuthSigner");
      }
      async sign(httpRequest, identity, signingProperties) {
        if (!signingProperties) {
          throw new Error("request could not be signed with `apiKey` since the `name` and `in` signer properties are missing");
        }
        if (!signingProperties.name) {
          throw new Error("request could not be signed with `apiKey` since the `name` signer property is missing");
        }
        if (!signingProperties.in) {
          throw new Error("request could not be signed with `apiKey` since the `in` signer property is missing");
        }
        if (!identity.apiKey) {
          throw new Error("request could not be signed with `apiKey` since the `apiKey` is not defined");
        }
        const clonedRequest = import_protocol_http2.HttpRequest.clone(httpRequest);
        if (signingProperties.in === import_types2.HttpApiKeyAuthLocation.QUERY) {
          clonedRequest.query[signingProperties.name] = identity.apiKey;
        } else if (signingProperties.in === import_types2.HttpApiKeyAuthLocation.HEADER) {
          clonedRequest.headers[signingProperties.name] = signingProperties.scheme ? `${signingProperties.scheme} ${identity.apiKey}` : identity.apiKey;
        } else {
          throw new Error("request can only be signed with `apiKey` locations `query` or `header`, but found: `" + signingProperties.in + "`");
        }
        return clonedRequest;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/util-identity-and-auth/httpAuthSchemes/httpBearerAuth.js
var import_protocol_http3, HttpBearerAuthSigner;
var init_httpBearerAuth = __esm({
  "node_modules/@smithy/core/dist-es/util-identity-and-auth/httpAuthSchemes/httpBearerAuth.js"() {
    init_esm();
    import_protocol_http3 = __toESM(require_dist_cjs2());
    HttpBearerAuthSigner = class {
      static {
        __name(this, "HttpBearerAuthSigner");
      }
      async sign(httpRequest, identity, signingProperties) {
        const clonedRequest = import_protocol_http3.HttpRequest.clone(httpRequest);
        if (!identity.token) {
          throw new Error("request could not be signed with `token` since the `token` is not defined");
        }
        clonedRequest.headers["Authorization"] = `Bearer ${identity.token}`;
        return clonedRequest;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/util-identity-and-auth/httpAuthSchemes/noAuth.js
var NoAuthSigner;
var init_noAuth = __esm({
  "node_modules/@smithy/core/dist-es/util-identity-and-auth/httpAuthSchemes/noAuth.js"() {
    init_esm();
    NoAuthSigner = class {
      static {
        __name(this, "NoAuthSigner");
      }
      async sign(httpRequest, identity, signingProperties) {
        return httpRequest;
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/util-identity-and-auth/httpAuthSchemes/index.js
var init_httpAuthSchemes = __esm({
  "node_modules/@smithy/core/dist-es/util-identity-and-auth/httpAuthSchemes/index.js"() {
    init_esm();
    init_httpApiKeyAuth();
    init_httpBearerAuth();
    init_noAuth();
  }
});

// node_modules/@smithy/core/dist-es/util-identity-and-auth/memoizeIdentityProvider.js
var createIsIdentityExpiredFunction, EXPIRATION_MS, isIdentityExpired, doesIdentityRequireRefresh, memoizeIdentityProvider;
var init_memoizeIdentityProvider = __esm({
  "node_modules/@smithy/core/dist-es/util-identity-and-auth/memoizeIdentityProvider.js"() {
    init_esm();
    createIsIdentityExpiredFunction = /* @__PURE__ */ __name((expirationMs) => /* @__PURE__ */ __name(function isIdentityExpired2(identity) {
      return doesIdentityRequireRefresh(identity) && identity.expiration.getTime() - Date.now() < expirationMs;
    }, "isIdentityExpired"), "createIsIdentityExpiredFunction");
    EXPIRATION_MS = 3e5;
    isIdentityExpired = createIsIdentityExpiredFunction(EXPIRATION_MS);
    doesIdentityRequireRefresh = /* @__PURE__ */ __name((identity) => identity.expiration !== void 0, "doesIdentityRequireRefresh");
    memoizeIdentityProvider = /* @__PURE__ */ __name((provider, isExpired, requiresRefresh) => {
      if (provider === void 0) {
        return void 0;
      }
      const normalizedProvider = typeof provider !== "function" ? async () => Promise.resolve(provider) : provider;
      let resolved;
      let pending;
      let hasResult;
      let isConstant = false;
      const coalesceProvider = /* @__PURE__ */ __name(async (options) => {
        if (!pending) {
          pending = normalizedProvider(options);
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
            resolved = await coalesceProvider(options);
          }
          return resolved;
        };
      }
      return async (options) => {
        if (!hasResult || options?.forceRefresh) {
          resolved = await coalesceProvider(options);
        }
        if (isConstant) {
          return resolved;
        }
        if (!requiresRefresh(resolved)) {
          isConstant = true;
          return resolved;
        }
        if (isExpired(resolved)) {
          await coalesceProvider(options);
          return resolved;
        }
        return resolved;
      };
    }, "memoizeIdentityProvider");
  }
});

// node_modules/@smithy/core/dist-es/util-identity-and-auth/index.js
var init_util_identity_and_auth = __esm({
  "node_modules/@smithy/core/dist-es/util-identity-and-auth/index.js"() {
    init_esm();
    init_DefaultIdentityProviderConfig();
    init_httpAuthSchemes();
    init_memoizeIdentityProvider();
  }
});

// node_modules/@smithy/core/dist-es/index.js
var dist_es_exports = {};
__export(dist_es_exports, {
  DefaultIdentityProviderConfig: () => DefaultIdentityProviderConfig,
  EXPIRATION_MS: () => EXPIRATION_MS,
  HttpApiKeyAuthSigner: () => HttpApiKeyAuthSigner,
  HttpBearerAuthSigner: () => HttpBearerAuthSigner,
  NoAuthSigner: () => NoAuthSigner,
  createIsIdentityExpiredFunction: () => createIsIdentityExpiredFunction,
  createPaginator: () => createPaginator,
  doesIdentityRequireRefresh: () => doesIdentityRequireRefresh,
  getHttpAuthSchemeEndpointRuleSetPlugin: () => getHttpAuthSchemeEndpointRuleSetPlugin,
  getHttpAuthSchemePlugin: () => getHttpAuthSchemePlugin,
  getHttpSigningPlugin: () => getHttpSigningPlugin,
  getSmithyContext: () => getSmithyContext3,
  httpAuthSchemeEndpointRuleSetMiddlewareOptions: () => httpAuthSchemeEndpointRuleSetMiddlewareOptions,
  httpAuthSchemeMiddleware: () => httpAuthSchemeMiddleware,
  httpAuthSchemeMiddlewareOptions: () => httpAuthSchemeMiddlewareOptions,
  httpSigningMiddleware: () => httpSigningMiddleware,
  httpSigningMiddlewareOptions: () => httpSigningMiddlewareOptions,
  isIdentityExpired: () => isIdentityExpired,
  memoizeIdentityProvider: () => memoizeIdentityProvider,
  normalizeProvider: () => normalizeProvider,
  requestBuilder: () => requestBuilder,
  setFeature: () => setFeature
});
var init_dist_es = __esm({
  "node_modules/@smithy/core/dist-es/index.js"() {
    init_esm();
    init_getSmithyContext();
    init_middleware_http_auth_scheme();
    init_middleware_http_signing();
    init_normalizeProvider();
    init_createPaginator();
    init_requestBuilder();
    init_setFeature();
    init_util_identity_and_auth();
  }
});

// node_modules/@smithy/util-endpoints/dist-cjs/index.js
var require_dist_cjs21 = __commonJS({
  "node_modules/@smithy/util-endpoints/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var types = require_dist_cjs();
    var BinaryDecisionDiagram = class _BinaryDecisionDiagram {
      static {
        __name(this, "BinaryDecisionDiagram");
      }
      nodes;
      root;
      conditions;
      results;
      constructor(bdd, root, conditions, results) {
        this.nodes = bdd;
        this.root = root;
        this.conditions = conditions;
        this.results = results;
      }
      static from(bdd, root, conditions, results) {
        return new _BinaryDecisionDiagram(bdd, root, conditions, results);
      }
    };
    var EndpointCache = class {
      static {
        __name(this, "EndpointCache");
      }
      capacity;
      data = /* @__PURE__ */ new Map();
      parameters = [];
      constructor({ size, params }) {
        this.capacity = size ?? 50;
        if (params) {
          this.parameters = params;
        }
      }
      get(endpointParams, resolver) {
        const key = this.hash(endpointParams);
        if (key === false) {
          return resolver();
        }
        if (!this.data.has(key)) {
          if (this.data.size > this.capacity + 10) {
            const keys = this.data.keys();
            let i = 0;
            while (true) {
              const { value, done } = keys.next();
              this.data.delete(value);
              if (done || ++i > 10) {
                break;
              }
            }
          }
          this.data.set(key, resolver());
        }
        return this.data.get(key);
      }
      size() {
        return this.data.size;
      }
      hash(endpointParams) {
        let buffer = "";
        const { parameters } = this;
        if (parameters.length === 0) {
          return false;
        }
        for (const param of parameters) {
          const val = String(endpointParams[param] ?? "");
          if (val.includes("|;")) {
            return false;
          }
          buffer += val + "|;";
        }
        return buffer;
      }
    };
    var EndpointError = class extends Error {
      static {
        __name(this, "EndpointError");
      }
      constructor(message) {
        super(message);
        this.name = "EndpointError";
      }
    };
    var debugId = "endpoints";
    function toDebugString(input) {
      if (typeof input !== "object" || input == null) {
        return input;
      }
      if ("ref" in input) {
        return `$${toDebugString(input.ref)}`;
      }
      if ("fn" in input) {
        return `${input.fn}(${(input.argv || []).map(toDebugString).join(", ")})`;
      }
      return JSON.stringify(input, null, 2);
    }
    __name(toDebugString, "toDebugString");
    var customEndpointFunctions = {};
    var booleanEquals = /* @__PURE__ */ __name((value1, value2) => value1 === value2, "booleanEquals");
    function coalesce(...args) {
      for (const arg of args) {
        if (arg != null) {
          return arg;
        }
      }
      return void 0;
    }
    __name(coalesce, "coalesce");
    var getAttrPathList = /* @__PURE__ */ __name((path) => {
      const parts = path.split(".");
      const pathList = [];
      for (const part of parts) {
        const squareBracketIndex = part.indexOf("[");
        if (squareBracketIndex !== -1) {
          if (part.indexOf("]") !== part.length - 1) {
            throw new EndpointError(`Path: '${path}' does not end with ']'`);
          }
          const arrayIndex = part.slice(squareBracketIndex + 1, -1);
          if (Number.isNaN(parseInt(arrayIndex))) {
            throw new EndpointError(`Invalid array index: '${arrayIndex}' in path: '${path}'`);
          }
          if (squareBracketIndex !== 0) {
            pathList.push(part.slice(0, squareBracketIndex));
          }
          pathList.push(arrayIndex);
        } else {
          pathList.push(part);
        }
      }
      return pathList;
    }, "getAttrPathList");
    var getAttr = /* @__PURE__ */ __name((value, path) => getAttrPathList(path).reduce((acc, index) => {
      if (typeof acc !== "object") {
        throw new EndpointError(`Index '${index}' in '${path}' not found in '${JSON.stringify(value)}'`);
      } else if (Array.isArray(acc)) {
        const i = parseInt(index);
        return acc[i < 0 ? acc.length + i : i];
      }
      return acc[index];
    }, value), "getAttr");
    var isSet = /* @__PURE__ */ __name((value) => value != null, "isSet");
    var VALID_HOST_LABEL_REGEX = new RegExp(`^(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$`);
    var isValidHostLabel = /* @__PURE__ */ __name((value, allowSubDomains = false) => {
      if (!allowSubDomains) {
        return VALID_HOST_LABEL_REGEX.test(value);
      }
      const labels = value.split(".");
      for (const label of labels) {
        if (!isValidHostLabel(label)) {
          return false;
        }
      }
      return true;
    }, "isValidHostLabel");
    function ite(condition, trueValue, falseValue) {
      return condition ? trueValue : falseValue;
    }
    __name(ite, "ite");
    var not = /* @__PURE__ */ __name((value) => !value, "not");
    var IP_V4_REGEX = new RegExp(`^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$`);
    var isIpAddress = /* @__PURE__ */ __name((value) => IP_V4_REGEX.test(value) || value.startsWith("[") && value.endsWith("]"), "isIpAddress");
    var DEFAULT_PORTS = {
      [types.EndpointURLScheme.HTTP]: 80,
      [types.EndpointURLScheme.HTTPS]: 443
    };
    var parseURL = /* @__PURE__ */ __name((value) => {
      const whatwgURL = (() => {
        try {
          if (value instanceof URL) {
            return value;
          }
          if (typeof value === "object" && "hostname" in value) {
            const { hostname: hostname2, port, protocol: protocol2 = "", path = "", query = {} } = value;
            const url = new URL(`${protocol2}//${hostname2}${port ? `:${port}` : ""}${path}`);
            url.search = Object.entries(query).map(([k, v]) => `${k}=${v}`).join("&");
            return url;
          }
          return new URL(value);
        } catch (error) {
          return null;
        }
      })();
      if (!whatwgURL) {
        console.error(`Unable to parse ${JSON.stringify(value)} as a whatwg URL.`);
        return null;
      }
      const urlString = whatwgURL.href;
      const { host, hostname, pathname, protocol, search } = whatwgURL;
      if (search) {
        return null;
      }
      const scheme = protocol.slice(0, -1);
      if (!Object.values(types.EndpointURLScheme).includes(scheme)) {
        return null;
      }
      const isIp = isIpAddress(hostname);
      const inputContainsDefaultPort = urlString.includes(`${host}:${DEFAULT_PORTS[scheme]}`) || typeof value === "string" && value.includes(`${host}:${DEFAULT_PORTS[scheme]}`);
      const authority = `${host}${inputContainsDefaultPort ? `:${DEFAULT_PORTS[scheme]}` : ``}`;
      return {
        scheme,
        authority,
        path: pathname,
        normalizedPath: pathname.endsWith("/") ? pathname : `${pathname}/`,
        isIp
      };
    }, "parseURL");
    function split(value, delimiter, limit) {
      if (limit === 1) {
        return [value];
      }
      if (value === "") {
        return [""];
      }
      const parts = value.split(delimiter);
      if (limit === 0) {
        return parts;
      }
      return parts.slice(0, limit - 1).concat(parts.slice(1).join(delimiter));
    }
    __name(split, "split");
    var stringEquals = /* @__PURE__ */ __name((value1, value2) => value1 === value2, "stringEquals");
    var substring = /* @__PURE__ */ __name((input, start, stop, reverse) => {
      if (input == null || start >= stop || input.length < stop || /[^\u0000-\u007f]/.test(input)) {
        return null;
      }
      if (!reverse) {
        return input.substring(start, stop);
      }
      return input.substring(input.length - stop, input.length - start);
    }, "substring");
    var uriEncode = /* @__PURE__ */ __name((value) => encodeURIComponent(value).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`), "uriEncode");
    var endpointFunctions = {
      booleanEquals,
      coalesce,
      getAttr,
      isSet,
      isValidHostLabel,
      ite,
      not,
      parseURL,
      split,
      stringEquals,
      substring,
      uriEncode
    };
    var evaluateTemplate = /* @__PURE__ */ __name((template, options) => {
      const evaluatedTemplateArr = [];
      const { referenceRecord, endpointParams } = options;
      let currentIndex = 0;
      while (currentIndex < template.length) {
        const openingBraceIndex = template.indexOf("{", currentIndex);
        if (openingBraceIndex === -1) {
          evaluatedTemplateArr.push(template.slice(currentIndex));
          break;
        }
        evaluatedTemplateArr.push(template.slice(currentIndex, openingBraceIndex));
        const closingBraceIndex = template.indexOf("}", openingBraceIndex);
        if (closingBraceIndex === -1) {
          evaluatedTemplateArr.push(template.slice(openingBraceIndex));
          break;
        }
        if (template[openingBraceIndex + 1] === "{" && template[closingBraceIndex + 1] === "}") {
          evaluatedTemplateArr.push(template.slice(openingBraceIndex + 1, closingBraceIndex));
          currentIndex = closingBraceIndex + 2;
        }
        const parameterName = template.substring(openingBraceIndex + 1, closingBraceIndex);
        if (parameterName.includes("#")) {
          const [refName, attrName] = parameterName.split("#");
          evaluatedTemplateArr.push(getAttr(referenceRecord[refName] ?? endpointParams[refName], attrName));
        } else {
          evaluatedTemplateArr.push(referenceRecord[parameterName] ?? endpointParams[parameterName]);
        }
        currentIndex = closingBraceIndex + 1;
      }
      return evaluatedTemplateArr.join("");
    }, "evaluateTemplate");
    var getReferenceValue = /* @__PURE__ */ __name(({ ref }, options) => {
      return options.referenceRecord[ref] ?? options.endpointParams[ref];
    }, "getReferenceValue");
    var evaluateExpression = /* @__PURE__ */ __name((obj, keyName, options) => {
      if (typeof obj === "string") {
        return evaluateTemplate(obj, options);
      } else if (obj["fn"]) {
        return group$2.callFunction(obj, options);
      } else if (obj["ref"]) {
        return getReferenceValue(obj, options);
      }
      throw new EndpointError(`'${keyName}': ${String(obj)} is not a string, function or reference.`);
    }, "evaluateExpression");
    var callFunction = /* @__PURE__ */ __name(({ fn, argv }, options) => {
      const evaluatedArgs = Array(argv.length);
      for (let i = 0; i < evaluatedArgs.length; ++i) {
        const arg = argv[i];
        if (typeof arg === "boolean" || typeof arg === "number") {
          evaluatedArgs[i] = arg;
        } else {
          evaluatedArgs[i] = group$2.evaluateExpression(arg, "arg", options);
        }
      }
      const namespaceSeparatorIndex = fn.indexOf(".");
      if (namespaceSeparatorIndex !== -1) {
        const namespaceFunctions = customEndpointFunctions[fn.slice(0, namespaceSeparatorIndex)];
        const customFunction = namespaceFunctions?.[fn.slice(namespaceSeparatorIndex + 1)];
        if (typeof customFunction === "function") {
          return customFunction(...evaluatedArgs);
        }
      }
      const callable = endpointFunctions[fn];
      if (typeof callable === "function") {
        return callable(...evaluatedArgs);
      }
      throw new Error(`function ${fn} not loaded in endpointFunctions.`);
    }, "callFunction");
    var group$2 = {
      evaluateExpression,
      callFunction
    };
    var evaluateCondition = /* @__PURE__ */ __name((condition, options) => {
      const { assign } = condition;
      if (assign && assign in options.referenceRecord) {
        throw new EndpointError(`'${assign}' is already defined in Reference Record.`);
      }
      const value = callFunction(condition, options);
      options.logger?.debug?.(`${debugId} evaluateCondition: ${toDebugString(condition)} = ${toDebugString(value)}`);
      const result = value === "" ? true : !!value;
      if (assign != null) {
        return { result, toAssign: { name: assign, value } };
      }
      return { result };
    }, "evaluateCondition");
    var getEndpointHeaders = /* @__PURE__ */ __name((headers, options) => Object.entries(headers ?? {}).reduce((acc, [headerKey, headerVal]) => {
      acc[headerKey] = headerVal.map((headerValEntry) => {
        const processedExpr = evaluateExpression(headerValEntry, "Header value entry", options);
        if (typeof processedExpr !== "string") {
          throw new EndpointError(`Header '${headerKey}' value '${processedExpr}' is not a string`);
        }
        return processedExpr;
      });
      return acc;
    }, {}), "getEndpointHeaders");
    var getEndpointProperties = /* @__PURE__ */ __name((properties, options) => Object.entries(properties).reduce((acc, [propertyKey, propertyVal]) => {
      acc[propertyKey] = group$1.getEndpointProperty(propertyVal, options);
      return acc;
    }, {}), "getEndpointProperties");
    var getEndpointProperty = /* @__PURE__ */ __name((property, options) => {
      if (Array.isArray(property)) {
        return property.map((propertyEntry) => getEndpointProperty(propertyEntry, options));
      }
      switch (typeof property) {
        case "string":
          return evaluateTemplate(property, options);
        case "object":
          if (property === null) {
            throw new EndpointError(`Unexpected endpoint property: ${property}`);
          }
          return group$1.getEndpointProperties(property, options);
        case "boolean":
          return property;
        default:
          throw new EndpointError(`Unexpected endpoint property type: ${typeof property}`);
      }
    }, "getEndpointProperty");
    var group$1 = {
      getEndpointProperty,
      getEndpointProperties
    };
    var getEndpointUrl = /* @__PURE__ */ __name((endpointUrl, options) => {
      const expression = evaluateExpression(endpointUrl, "Endpoint URL", options);
      if (typeof expression === "string") {
        try {
          return new URL(expression);
        } catch (error) {
          console.error(`Failed to construct URL with ${expression}`, error);
          throw error;
        }
      }
      throw new EndpointError(`Endpoint URL must be a string, got ${typeof expression}`);
    }, "getEndpointUrl");
    var RESULT = 1e8;
    var decideEndpoint = /* @__PURE__ */ __name((bdd, options) => {
      const { nodes, root, results, conditions } = bdd;
      let ref = root;
      const referenceRecord = {};
      const closure = {
        referenceRecord,
        endpointParams: options.endpointParams,
        logger: options.logger
      };
      while (ref !== 1 && ref !== -1 && ref < RESULT) {
        const node_i = 3 * (Math.abs(ref) - 1);
        const [condition_i, highRef, lowRef] = [nodes[node_i], nodes[node_i + 1], nodes[node_i + 2]];
        const [fn, argv, assign] = conditions[condition_i];
        const evaluation = evaluateCondition({ fn, assign, argv }, closure);
        if (evaluation.toAssign) {
          const { name, value } = evaluation.toAssign;
          referenceRecord[name] = value;
        }
        ref = ref >= 0 === evaluation.result ? highRef : lowRef;
      }
      if (ref >= RESULT) {
        const result = results[ref - RESULT];
        if (result[0] === -1) {
          const [, errorExpression] = result;
          throw new EndpointError(evaluateExpression(errorExpression, "Error", closure));
        }
        const [url, properties, headers] = result;
        return {
          url: getEndpointUrl(url, closure),
          properties: getEndpointProperties(properties, closure),
          headers: getEndpointHeaders(headers ?? {}, closure)
        };
      }
      throw new EndpointError(`No matching endpoint.`);
    }, "decideEndpoint");
    var evaluateConditions = /* @__PURE__ */ __name((conditions = [], options) => {
      const conditionsReferenceRecord = {};
      const conditionOptions = {
        ...options,
        referenceRecord: { ...options.referenceRecord }
      };
      let didAssign = false;
      for (const condition of conditions) {
        const { result, toAssign } = evaluateCondition(condition, conditionOptions);
        if (!result) {
          return { result };
        }
        if (toAssign) {
          didAssign = true;
          conditionsReferenceRecord[toAssign.name] = toAssign.value;
          conditionOptions.referenceRecord[toAssign.name] = toAssign.value;
          options.logger?.debug?.(`${debugId} assign: ${toAssign.name} := ${toDebugString(toAssign.value)}`);
        }
      }
      if (didAssign) {
        return { result: true, referenceRecord: conditionsReferenceRecord };
      }
      return { result: true };
    }, "evaluateConditions");
    var evaluateEndpointRule = /* @__PURE__ */ __name((endpointRule, options) => {
      const { conditions, endpoint } = endpointRule;
      const { result, referenceRecord } = evaluateConditions(conditions, options);
      if (!result) {
        return;
      }
      const endpointRuleOptions = referenceRecord ? {
        ...options,
        referenceRecord: { ...options.referenceRecord, ...referenceRecord }
      } : options;
      const { url, properties, headers } = endpoint;
      options.logger?.debug?.(`${debugId} Resolving endpoint from template: ${toDebugString(endpoint)}`);
      const endpointToReturn = { url: getEndpointUrl(url, endpointRuleOptions) };
      if (headers != null) {
        endpointToReturn.headers = getEndpointHeaders(headers, endpointRuleOptions);
      }
      if (properties != null) {
        endpointToReturn.properties = getEndpointProperties(properties, endpointRuleOptions);
      }
      return endpointToReturn;
    }, "evaluateEndpointRule");
    var evaluateErrorRule = /* @__PURE__ */ __name((errorRule, options) => {
      const { conditions, error } = errorRule;
      const { result, referenceRecord } = evaluateConditions(conditions, options);
      if (!result) {
        return;
      }
      const errorRuleOptions = referenceRecord ? {
        ...options,
        referenceRecord: { ...options.referenceRecord, ...referenceRecord }
      } : options;
      throw new EndpointError(evaluateExpression(error, "Error", errorRuleOptions));
    }, "evaluateErrorRule");
    var evaluateRules = /* @__PURE__ */ __name((rules, options) => {
      for (const rule of rules) {
        if (rule.type === "endpoint") {
          const endpointOrUndefined = evaluateEndpointRule(rule, options);
          if (endpointOrUndefined) {
            return endpointOrUndefined;
          }
        } else if (rule.type === "error") {
          evaluateErrorRule(rule, options);
        } else if (rule.type === "tree") {
          const endpointOrUndefined = group.evaluateTreeRule(rule, options);
          if (endpointOrUndefined) {
            return endpointOrUndefined;
          }
        } else {
          throw new EndpointError(`Unknown endpoint rule: ${rule}`);
        }
      }
      throw new EndpointError(`Rules evaluation failed`);
    }, "evaluateRules");
    var evaluateTreeRule = /* @__PURE__ */ __name((treeRule, options) => {
      const { conditions, rules } = treeRule;
      const { result, referenceRecord } = evaluateConditions(conditions, options);
      if (!result) {
        return;
      }
      const treeRuleOptions = referenceRecord ? { ...options, referenceRecord: { ...options.referenceRecord, ...referenceRecord } } : options;
      return group.evaluateRules(rules, treeRuleOptions);
    }, "evaluateTreeRule");
    var group = {
      evaluateRules,
      evaluateTreeRule
    };
    var resolveEndpoint = /* @__PURE__ */ __name((ruleSetObject, options) => {
      const { endpointParams, logger } = options;
      const { parameters, rules } = ruleSetObject;
      options.logger?.debug?.(`${debugId} Initial EndpointParams: ${toDebugString(endpointParams)}`);
      for (const paramKey in parameters) {
        const parameter = parameters[paramKey];
        const endpointParam = endpointParams[paramKey];
        if (endpointParam == null && parameter.default != null) {
          endpointParams[paramKey] = parameter.default;
          continue;
        }
        if (parameter.required && endpointParam == null) {
          throw new EndpointError(`Missing required parameter: '${paramKey}'`);
        }
      }
      const endpoint = evaluateRules(rules, { endpointParams, logger, referenceRecord: {} });
      options.logger?.debug?.(`${debugId} Resolved endpoint: ${toDebugString(endpoint)}`);
      return endpoint;
    }, "resolveEndpoint");
    exports.BinaryDecisionDiagram = BinaryDecisionDiagram;
    exports.EndpointCache = EndpointCache;
    exports.EndpointError = EndpointError;
    exports.customEndpointFunctions = customEndpointFunctions;
    exports.decideEndpoint = decideEndpoint;
    exports.isIpAddress = isIpAddress;
    exports.isValidHostLabel = isValidHostLabel;
    exports.resolveEndpoint = resolveEndpoint;
  }
});

// node_modules/@aws-sdk/util-endpoints/dist-cjs/index.js
var require_dist_cjs22 = __commonJS({
  "node_modules/@aws-sdk/util-endpoints/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var utilEndpoints = require_dist_cjs21();
    var urlParser = require_dist_cjs12();
    var isVirtualHostableS3Bucket = /* @__PURE__ */ __name((value, allowSubDomains = false) => {
      if (allowSubDomains) {
        for (const label of value.split(".")) {
          if (!isVirtualHostableS3Bucket(label)) {
            return false;
          }
        }
        return true;
      }
      if (!utilEndpoints.isValidHostLabel(value)) {
        return false;
      }
      if (value.length < 3 || value.length > 63) {
        return false;
      }
      if (value !== value.toLowerCase()) {
        return false;
      }
      if (utilEndpoints.isIpAddress(value)) {
        return false;
      }
      return true;
    }, "isVirtualHostableS3Bucket");
    var ARN_DELIMITER = ":";
    var RESOURCE_DELIMITER = "/";
    var parseArn = /* @__PURE__ */ __name((value) => {
      const segments = value.split(ARN_DELIMITER);
      if (segments.length < 6)
        return null;
      const [arn, partition2, service, region, accountId, ...resourcePath] = segments;
      if (arn !== "arn" || partition2 === "" || service === "" || resourcePath.join(ARN_DELIMITER) === "")
        return null;
      const resourceId = resourcePath.map((resource) => resource.split(RESOURCE_DELIMITER)).flat();
      return {
        partition: partition2,
        service,
        region,
        accountId,
        resourceId
      };
    }, "parseArn");
    var partitions = [
      {
        id: "aws",
        outputs: {
          dnsSuffix: "amazonaws.com",
          dualStackDnsSuffix: "api.aws",
          implicitGlobalRegion: "us-east-1",
          name: "aws",
          supportsDualStack: true,
          supportsFIPS: true
        },
        regionRegex: "^(us|eu|ap|sa|ca|me|af|il|mx)\\-\\w+\\-\\d+$",
        regions: {
          "af-south-1": {
            description: "Africa (Cape Town)"
          },
          "ap-east-1": {
            description: "Asia Pacific (Hong Kong)"
          },
          "ap-east-2": {
            description: "Asia Pacific (Taipei)"
          },
          "ap-northeast-1": {
            description: "Asia Pacific (Tokyo)"
          },
          "ap-northeast-2": {
            description: "Asia Pacific (Seoul)"
          },
          "ap-northeast-3": {
            description: "Asia Pacific (Osaka)"
          },
          "ap-south-1": {
            description: "Asia Pacific (Mumbai)"
          },
          "ap-south-2": {
            description: "Asia Pacific (Hyderabad)"
          },
          "ap-southeast-1": {
            description: "Asia Pacific (Singapore)"
          },
          "ap-southeast-2": {
            description: "Asia Pacific (Sydney)"
          },
          "ap-southeast-3": {
            description: "Asia Pacific (Jakarta)"
          },
          "ap-southeast-4": {
            description: "Asia Pacific (Melbourne)"
          },
          "ap-southeast-5": {
            description: "Asia Pacific (Malaysia)"
          },
          "ap-southeast-6": {
            description: "Asia Pacific (New Zealand)"
          },
          "ap-southeast-7": {
            description: "Asia Pacific (Thailand)"
          },
          "aws-global": {
            description: "aws global region"
          },
          "ca-central-1": {
            description: "Canada (Central)"
          },
          "ca-west-1": {
            description: "Canada West (Calgary)"
          },
          "eu-central-1": {
            description: "Europe (Frankfurt)"
          },
          "eu-central-2": {
            description: "Europe (Zurich)"
          },
          "eu-north-1": {
            description: "Europe (Stockholm)"
          },
          "eu-south-1": {
            description: "Europe (Milan)"
          },
          "eu-south-2": {
            description: "Europe (Spain)"
          },
          "eu-west-1": {
            description: "Europe (Ireland)"
          },
          "eu-west-2": {
            description: "Europe (London)"
          },
          "eu-west-3": {
            description: "Europe (Paris)"
          },
          "il-central-1": {
            description: "Israel (Tel Aviv)"
          },
          "me-central-1": {
            description: "Middle East (UAE)"
          },
          "me-south-1": {
            description: "Middle East (Bahrain)"
          },
          "mx-central-1": {
            description: "Mexico (Central)"
          },
          "sa-east-1": {
            description: "South America (Sao Paulo)"
          },
          "us-east-1": {
            description: "US East (N. Virginia)"
          },
          "us-east-2": {
            description: "US East (Ohio)"
          },
          "us-west-1": {
            description: "US West (N. California)"
          },
          "us-west-2": {
            description: "US West (Oregon)"
          }
        }
      },
      {
        id: "aws-cn",
        outputs: {
          dnsSuffix: "amazonaws.com.cn",
          dualStackDnsSuffix: "api.amazonwebservices.com.cn",
          implicitGlobalRegion: "cn-northwest-1",
          name: "aws-cn",
          supportsDualStack: true,
          supportsFIPS: true
        },
        regionRegex: "^cn\\-\\w+\\-\\d+$",
        regions: {
          "aws-cn-global": {
            description: "aws-cn global region"
          },
          "cn-north-1": {
            description: "China (Beijing)"
          },
          "cn-northwest-1": {
            description: "China (Ningxia)"
          }
        }
      },
      {
        id: "aws-eusc",
        outputs: {
          dnsSuffix: "amazonaws.eu",
          dualStackDnsSuffix: "api.amazonwebservices.eu",
          implicitGlobalRegion: "eusc-de-east-1",
          name: "aws-eusc",
          supportsDualStack: true,
          supportsFIPS: true
        },
        regionRegex: "^eusc\\-(de)\\-\\w+\\-\\d+$",
        regions: {
          "eusc-de-east-1": {
            description: "AWS European Sovereign Cloud (Germany)"
          }
        }
      },
      {
        id: "aws-iso",
        outputs: {
          dnsSuffix: "c2s.ic.gov",
          dualStackDnsSuffix: "api.aws.ic.gov",
          implicitGlobalRegion: "us-iso-east-1",
          name: "aws-iso",
          supportsDualStack: true,
          supportsFIPS: true
        },
        regionRegex: "^us\\-iso\\-\\w+\\-\\d+$",
        regions: {
          "aws-iso-global": {
            description: "aws-iso global region"
          },
          "us-iso-east-1": {
            description: "US ISO East"
          },
          "us-iso-west-1": {
            description: "US ISO WEST"
          }
        }
      },
      {
        id: "aws-iso-b",
        outputs: {
          dnsSuffix: "sc2s.sgov.gov",
          dualStackDnsSuffix: "api.aws.scloud",
          implicitGlobalRegion: "us-isob-east-1",
          name: "aws-iso-b",
          supportsDualStack: true,
          supportsFIPS: true
        },
        regionRegex: "^us\\-isob\\-\\w+\\-\\d+$",
        regions: {
          "aws-iso-b-global": {
            description: "aws-iso-b global region"
          },
          "us-isob-east-1": {
            description: "US ISOB East (Ohio)"
          },
          "us-isob-west-1": {
            description: "US ISOB West"
          }
        }
      },
      {
        id: "aws-iso-e",
        outputs: {
          dnsSuffix: "cloud.adc-e.uk",
          dualStackDnsSuffix: "api.cloud-aws.adc-e.uk",
          implicitGlobalRegion: "eu-isoe-west-1",
          name: "aws-iso-e",
          supportsDualStack: true,
          supportsFIPS: true
        },
        regionRegex: "^eu\\-isoe\\-\\w+\\-\\d+$",
        regions: {
          "aws-iso-e-global": {
            description: "aws-iso-e global region"
          },
          "eu-isoe-west-1": {
            description: "EU ISOE West"
          }
        }
      },
      {
        id: "aws-iso-f",
        outputs: {
          dnsSuffix: "csp.hci.ic.gov",
          dualStackDnsSuffix: "api.aws.hci.ic.gov",
          implicitGlobalRegion: "us-isof-south-1",
          name: "aws-iso-f",
          supportsDualStack: true,
          supportsFIPS: true
        },
        regionRegex: "^us\\-isof\\-\\w+\\-\\d+$",
        regions: {
          "aws-iso-f-global": {
            description: "aws-iso-f global region"
          },
          "us-isof-east-1": {
            description: "US ISOF EAST"
          },
          "us-isof-south-1": {
            description: "US ISOF SOUTH"
          }
        }
      },
      {
        id: "aws-us-gov",
        outputs: {
          dnsSuffix: "amazonaws.com",
          dualStackDnsSuffix: "api.aws",
          implicitGlobalRegion: "us-gov-west-1",
          name: "aws-us-gov",
          supportsDualStack: true,
          supportsFIPS: true
        },
        regionRegex: "^us\\-gov\\-\\w+\\-\\d+$",
        regions: {
          "aws-us-gov-global": {
            description: "aws-us-gov global region"
          },
          "us-gov-east-1": {
            description: "AWS GovCloud (US-East)"
          },
          "us-gov-west-1": {
            description: "AWS GovCloud (US-West)"
          }
        }
      }
    ];
    var version = "1.1";
    var partitionsInfo = {
      partitions,
      version
    };
    var selectedPartitionsInfo = partitionsInfo;
    var selectedUserAgentPrefix = "";
    var partition = /* @__PURE__ */ __name((value) => {
      const { partitions: partitions2 } = selectedPartitionsInfo;
      for (const partition2 of partitions2) {
        const { regions, outputs } = partition2;
        for (const [region, regionData] of Object.entries(regions)) {
          if (region === value) {
            return {
              ...outputs,
              ...regionData
            };
          }
        }
      }
      for (const partition2 of partitions2) {
        const { regionRegex, outputs } = partition2;
        if (new RegExp(regionRegex).test(value)) {
          return {
            ...outputs
          };
        }
      }
      const DEFAULT_PARTITION = partitions2.find((partition2) => partition2.id === "aws");
      if (!DEFAULT_PARTITION) {
        throw new Error("Provided region was not found in the partition array or regex, and default partition with id 'aws' doesn't exist.");
      }
      return {
        ...DEFAULT_PARTITION.outputs
      };
    }, "partition");
    var setPartitionInfo = /* @__PURE__ */ __name((partitionsInfo2, userAgentPrefix = "") => {
      selectedPartitionsInfo = partitionsInfo2;
      selectedUserAgentPrefix = userAgentPrefix;
    }, "setPartitionInfo");
    var useDefaultPartitionInfo = /* @__PURE__ */ __name(() => {
      setPartitionInfo(partitionsInfo, "");
    }, "useDefaultPartitionInfo");
    var getUserAgentPrefix = /* @__PURE__ */ __name(() => selectedUserAgentPrefix, "getUserAgentPrefix");
    var awsEndpointFunctions = {
      isVirtualHostableS3Bucket,
      parseArn,
      partition
    };
    utilEndpoints.customEndpointFunctions.aws = awsEndpointFunctions;
    var resolveDefaultAwsRegionalEndpointsConfig = /* @__PURE__ */ __name((input) => {
      if (typeof input.endpointProvider !== "function") {
        throw new Error("@aws-sdk/util-endpoint - endpointProvider and endpoint missing in config for this client.");
      }
      const { endpoint } = input;
      if (endpoint === void 0) {
        input.endpoint = async () => {
          return toEndpointV1(input.endpointProvider({
            Region: typeof input.region === "function" ? await input.region() : input.region,
            UseDualStack: typeof input.useDualstackEndpoint === "function" ? await input.useDualstackEndpoint() : input.useDualstackEndpoint,
            UseFIPS: typeof input.useFipsEndpoint === "function" ? await input.useFipsEndpoint() : input.useFipsEndpoint,
            Endpoint: void 0
          }, { logger: input.logger }));
        };
      }
      return input;
    }, "resolveDefaultAwsRegionalEndpointsConfig");
    var toEndpointV1 = /* @__PURE__ */ __name((endpoint) => urlParser.parseUrl(endpoint.url), "toEndpointV1");
    exports.EndpointError = utilEndpoints.EndpointError;
    exports.isIpAddress = utilEndpoints.isIpAddress;
    exports.resolveEndpoint = utilEndpoints.resolveEndpoint;
    exports.awsEndpointFunctions = awsEndpointFunctions;
    exports.getUserAgentPrefix = getUserAgentPrefix;
    exports.partition = partition;
    exports.resolveDefaultAwsRegionalEndpointsConfig = resolveDefaultAwsRegionalEndpointsConfig;
    exports.setPartitionInfo = setPartitionInfo;
    exports.toEndpointV1 = toEndpointV1;
    exports.useDefaultPartitionInfo = useDefaultPartitionInfo;
  }
});

// node_modules/@aws-sdk/middleware-user-agent/dist-cjs/index.js
var require_dist_cjs23 = __commonJS({
  "node_modules/@aws-sdk/middleware-user-agent/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var core = (init_dist_es(), __toCommonJS(dist_es_exports));
    var utilEndpoints = require_dist_cjs22();
    var protocolHttp = require_dist_cjs2();
    var client = (init_client(), __toCommonJS(client_exports));
    var utilRetry = require_dist_cjs4();
    var DEFAULT_UA_APP_ID = void 0;
    function isValidUserAgentAppId(appId) {
      if (appId === void 0) {
        return true;
      }
      return typeof appId === "string" && appId.length <= 50;
    }
    __name(isValidUserAgentAppId, "isValidUserAgentAppId");
    function resolveUserAgentConfig(input) {
      const normalizedAppIdProvider = core.normalizeProvider(input.userAgentAppId ?? DEFAULT_UA_APP_ID);
      const { customUserAgent } = input;
      return Object.assign(input, {
        customUserAgent: typeof customUserAgent === "string" ? [[customUserAgent]] : customUserAgent,
        userAgentAppId: /* @__PURE__ */ __name(async () => {
          const appId = await normalizedAppIdProvider();
          if (!isValidUserAgentAppId(appId)) {
            const logger = input.logger?.constructor?.name === "NoOpLogger" || !input.logger ? console : input.logger;
            if (typeof appId !== "string") {
              logger?.warn("userAgentAppId must be a string or undefined.");
            } else if (appId.length > 50) {
              logger?.warn("The provided userAgentAppId exceeds the maximum length of 50 characters.");
            }
          }
          return appId;
        }, "userAgentAppId")
      });
    }
    __name(resolveUserAgentConfig, "resolveUserAgentConfig");
    var ACCOUNT_ID_ENDPOINT_REGEX = /\d{12}\.ddb/;
    async function checkFeatures(context, config, args) {
      const request = args.request;
      if (request?.headers?.["smithy-protocol"] === "rpc-v2-cbor") {
        client.setFeature(context, "PROTOCOL_RPC_V2_CBOR", "M");
      }
      if (typeof config.retryStrategy === "function") {
        const retryStrategy = await config.retryStrategy();
        if (typeof retryStrategy.mode === "string") {
          switch (retryStrategy.mode) {
            case utilRetry.RETRY_MODES.ADAPTIVE:
              client.setFeature(context, "RETRY_MODE_ADAPTIVE", "F");
              break;
            case utilRetry.RETRY_MODES.STANDARD:
              client.setFeature(context, "RETRY_MODE_STANDARD", "E");
              break;
          }
        }
      }
      if (typeof config.accountIdEndpointMode === "function") {
        const endpointV2 = context.endpointV2;
        if (String(endpointV2?.url?.hostname).match(ACCOUNT_ID_ENDPOINT_REGEX)) {
          client.setFeature(context, "ACCOUNT_ID_ENDPOINT", "O");
        }
        switch (await config.accountIdEndpointMode?.()) {
          case "disabled":
            client.setFeature(context, "ACCOUNT_ID_MODE_DISABLED", "Q");
            break;
          case "preferred":
            client.setFeature(context, "ACCOUNT_ID_MODE_PREFERRED", "P");
            break;
          case "required":
            client.setFeature(context, "ACCOUNT_ID_MODE_REQUIRED", "R");
            break;
        }
      }
      const identity = context.__smithy_context?.selectedHttpAuthScheme?.identity;
      if (identity?.$source) {
        const credentials = identity;
        if (credentials.accountId) {
          client.setFeature(context, "RESOLVED_ACCOUNT_ID", "T");
        }
        for (const [key, value] of Object.entries(credentials.$source ?? {})) {
          client.setFeature(context, key, value);
        }
      }
    }
    __name(checkFeatures, "checkFeatures");
    var USER_AGENT = "user-agent";
    var X_AMZ_USER_AGENT = "x-amz-user-agent";
    var SPACE = " ";
    var UA_NAME_SEPARATOR = "/";
    var UA_NAME_ESCAPE_REGEX = /[^!$%&'*+\-.^_`|~\w]/g;
    var UA_VALUE_ESCAPE_REGEX = /[^!$%&'*+\-.^_`|~\w#]/g;
    var UA_ESCAPE_CHAR = "-";
    var BYTE_LIMIT = 1024;
    function encodeFeatures(features) {
      let buffer = "";
      for (const key in features) {
        const val = features[key];
        if (buffer.length + val.length + 1 <= BYTE_LIMIT) {
          if (buffer.length) {
            buffer += "," + val;
          } else {
            buffer += val;
          }
          continue;
        }
        break;
      }
      return buffer;
    }
    __name(encodeFeatures, "encodeFeatures");
    var userAgentMiddleware = /* @__PURE__ */ __name((options) => (next, context) => async (args) => {
      const { request } = args;
      if (!protocolHttp.HttpRequest.isInstance(request)) {
        return next(args);
      }
      const { headers } = request;
      const userAgent = context?.userAgent?.map(escapeUserAgent) || [];
      const defaultUserAgent = (await options.defaultUserAgentProvider()).map(escapeUserAgent);
      await checkFeatures(context, options, args);
      const awsContext = context;
      defaultUserAgent.push(`m/${encodeFeatures(Object.assign({}, context.__smithy_context?.features, awsContext.__aws_sdk_context?.features))}`);
      const customUserAgent = options?.customUserAgent?.map(escapeUserAgent) || [];
      const appId = await options.userAgentAppId();
      if (appId) {
        defaultUserAgent.push(escapeUserAgent([`app`, `${appId}`]));
      }
      const prefix = utilEndpoints.getUserAgentPrefix();
      const sdkUserAgentValue = (prefix ? [prefix] : []).concat([...defaultUserAgent, ...userAgent, ...customUserAgent]).join(SPACE);
      const normalUAValue = [
        ...defaultUserAgent.filter((section) => section.startsWith("aws-sdk-")),
        ...customUserAgent
      ].join(SPACE);
      if (options.runtime !== "browser") {
        if (normalUAValue) {
          headers[X_AMZ_USER_AGENT] = headers[X_AMZ_USER_AGENT] ? `${headers[USER_AGENT]} ${normalUAValue}` : normalUAValue;
        }
        headers[USER_AGENT] = sdkUserAgentValue;
      } else {
        headers[X_AMZ_USER_AGENT] = sdkUserAgentValue;
      }
      return next({
        ...args,
        request
      });
    }, "userAgentMiddleware");
    var escapeUserAgent = /* @__PURE__ */ __name((userAgentPair) => {
      const name = userAgentPair[0].split(UA_NAME_SEPARATOR).map((part) => part.replace(UA_NAME_ESCAPE_REGEX, UA_ESCAPE_CHAR)).join(UA_NAME_SEPARATOR);
      const version = userAgentPair[1]?.replace(UA_VALUE_ESCAPE_REGEX, UA_ESCAPE_CHAR);
      const prefixSeparatorIndex = name.indexOf(UA_NAME_SEPARATOR);
      const prefix = name.substring(0, prefixSeparatorIndex);
      let uaName = name.substring(prefixSeparatorIndex + 1);
      if (prefix === "api") {
        uaName = uaName.toLowerCase();
      }
      return [prefix, uaName, version].filter((item) => item && item.length > 0).reduce((acc, item, index) => {
        switch (index) {
          case 0:
            return item;
          case 1:
            return `${acc}/${item}`;
          default:
            return `${acc}#${item}`;
        }
      }, "");
    }, "escapeUserAgent");
    var getUserAgentMiddlewareOptions = {
      name: "getUserAgentMiddleware",
      step: "build",
      priority: "low",
      tags: ["SET_USER_AGENT", "USER_AGENT"],
      override: true
    };
    var getUserAgentPlugin = /* @__PURE__ */ __name((config) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(userAgentMiddleware(config), getUserAgentMiddlewareOptions);
      }, "applyToStack")
    }), "getUserAgentPlugin");
    exports.DEFAULT_UA_APP_ID = DEFAULT_UA_APP_ID;
    exports.getUserAgentMiddlewareOptions = getUserAgentMiddlewareOptions;
    exports.getUserAgentPlugin = getUserAgentPlugin;
    exports.resolveUserAgentConfig = resolveUserAgentConfig;
    exports.userAgentMiddleware = userAgentMiddleware;
  }
});

// node_modules/@smithy/util-config-provider/dist-cjs/index.js
var require_dist_cjs24 = __commonJS({
  "node_modules/@smithy/util-config-provider/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var booleanSelector = /* @__PURE__ */ __name((obj, key, type) => {
      if (!(key in obj))
        return void 0;
      if (obj[key] === "true")
        return true;
      if (obj[key] === "false")
        return false;
      throw new Error(`Cannot load ${type} "${key}". Expected "true" or "false", got ${obj[key]}.`);
    }, "booleanSelector");
    var numberSelector = /* @__PURE__ */ __name((obj, key, type) => {
      if (!(key in obj))
        return void 0;
      const numberValue = parseInt(obj[key], 10);
      if (Number.isNaN(numberValue)) {
        throw new TypeError(`Cannot load ${type} '${key}'. Expected number, got '${obj[key]}'.`);
      }
      return numberValue;
    }, "numberSelector");
    exports.SelectorType = void 0;
    (function(SelectorType) {
      SelectorType["ENV"] = "env";
      SelectorType["CONFIG"] = "shared config entry";
    })(exports.SelectorType || (exports.SelectorType = {}));
    exports.booleanSelector = booleanSelector;
    exports.numberSelector = numberSelector;
  }
});

// node_modules/@smithy/config-resolver/dist-cjs/index.js
var require_dist_cjs25 = __commonJS({
  "node_modules/@smithy/config-resolver/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var utilConfigProvider = require_dist_cjs24();
    var utilMiddleware = require_dist_cjs11();
    var utilEndpoints = require_dist_cjs21();
    var ENV_USE_DUALSTACK_ENDPOINT = "AWS_USE_DUALSTACK_ENDPOINT";
    var CONFIG_USE_DUALSTACK_ENDPOINT = "use_dualstack_endpoint";
    var DEFAULT_USE_DUALSTACK_ENDPOINT = false;
    var NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => utilConfigProvider.booleanSelector(env, ENV_USE_DUALSTACK_ENDPOINT, utilConfigProvider.SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => utilConfigProvider.booleanSelector(profile, CONFIG_USE_DUALSTACK_ENDPOINT, utilConfigProvider.SelectorType.CONFIG), "configFileSelector"),
      default: false
    };
    var nodeDualstackConfigSelectors = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => utilConfigProvider.booleanSelector(env, ENV_USE_DUALSTACK_ENDPOINT, utilConfigProvider.SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => utilConfigProvider.booleanSelector(profile, CONFIG_USE_DUALSTACK_ENDPOINT, utilConfigProvider.SelectorType.CONFIG), "configFileSelector"),
      default: void 0
    };
    var ENV_USE_FIPS_ENDPOINT = "AWS_USE_FIPS_ENDPOINT";
    var CONFIG_USE_FIPS_ENDPOINT = "use_fips_endpoint";
    var DEFAULT_USE_FIPS_ENDPOINT = false;
    var NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => utilConfigProvider.booleanSelector(env, ENV_USE_FIPS_ENDPOINT, utilConfigProvider.SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => utilConfigProvider.booleanSelector(profile, CONFIG_USE_FIPS_ENDPOINT, utilConfigProvider.SelectorType.CONFIG), "configFileSelector"),
      default: false
    };
    var nodeFipsConfigSelectors = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => utilConfigProvider.booleanSelector(env, ENV_USE_FIPS_ENDPOINT, utilConfigProvider.SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => utilConfigProvider.booleanSelector(profile, CONFIG_USE_FIPS_ENDPOINT, utilConfigProvider.SelectorType.CONFIG), "configFileSelector"),
      default: void 0
    };
    var resolveCustomEndpointsConfig = /* @__PURE__ */ __name((input) => {
      const { tls, endpoint, urlParser, useDualstackEndpoint } = input;
      return Object.assign(input, {
        tls: tls ?? true,
        endpoint: utilMiddleware.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint),
        isCustomEndpoint: true,
        useDualstackEndpoint: utilMiddleware.normalizeProvider(useDualstackEndpoint ?? false)
      });
    }, "resolveCustomEndpointsConfig");
    var getEndpointFromRegion = /* @__PURE__ */ __name(async (input) => {
      const { tls = true } = input;
      const region = await input.region();
      const dnsHostRegex = new RegExp(/^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])$/);
      if (!dnsHostRegex.test(region)) {
        throw new Error("Invalid region in client config");
      }
      const useDualstackEndpoint = await input.useDualstackEndpoint();
      const useFipsEndpoint = await input.useFipsEndpoint();
      const { hostname } = await input.regionInfoProvider(region, { useDualstackEndpoint, useFipsEndpoint }) ?? {};
      if (!hostname) {
        throw new Error("Cannot resolve hostname from client config");
      }
      return input.urlParser(`${tls ? "https:" : "http:"}//${hostname}`);
    }, "getEndpointFromRegion");
    var resolveEndpointsConfig = /* @__PURE__ */ __name((input) => {
      const useDualstackEndpoint = utilMiddleware.normalizeProvider(input.useDualstackEndpoint ?? false);
      const { endpoint, useFipsEndpoint, urlParser, tls } = input;
      return Object.assign(input, {
        tls: tls ?? true,
        endpoint: endpoint ? utilMiddleware.normalizeProvider(typeof endpoint === "string" ? urlParser(endpoint) : endpoint) : () => getEndpointFromRegion({ ...input, useDualstackEndpoint, useFipsEndpoint }),
        isCustomEndpoint: !!endpoint,
        useDualstackEndpoint
      });
    }, "resolveEndpointsConfig");
    var REGION_ENV_NAME = "AWS_REGION";
    var REGION_INI_NAME = "region";
    var NODE_REGION_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => env[REGION_ENV_NAME], "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => profile[REGION_INI_NAME], "configFileSelector"),
      default: /* @__PURE__ */ __name(() => {
        throw new Error("Region is missing");
      }, "default")
    };
    var NODE_REGION_CONFIG_FILE_OPTIONS = {
      preferredFile: "credentials"
    };
    var validRegions = /* @__PURE__ */ new Set();
    var checkRegion = /* @__PURE__ */ __name((region, check = utilEndpoints.isValidHostLabel) => {
      if (!validRegions.has(region) && !check(region)) {
        if (region === "*") {
          console.warn(`@smithy/config-resolver WARN - Please use the caller region instead of "*". See "sigv4a" in https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md.`);
        } else {
          throw new Error(`Region not accepted: region="${region}" is not a valid hostname component.`);
        }
      } else {
        validRegions.add(region);
      }
    }, "checkRegion");
    var isFipsRegion = /* @__PURE__ */ __name((region) => typeof region === "string" && (region.startsWith("fips-") || region.endsWith("-fips")), "isFipsRegion");
    var getRealRegion = /* @__PURE__ */ __name((region) => isFipsRegion(region) ? ["fips-aws-global", "aws-fips"].includes(region) ? "us-east-1" : region.replace(/fips-(dkr-|prod-)?|-fips/, "") : region, "getRealRegion");
    var resolveRegionConfig = /* @__PURE__ */ __name((input) => {
      const { region, useFipsEndpoint } = input;
      if (!region) {
        throw new Error("Region is missing");
      }
      return Object.assign(input, {
        region: /* @__PURE__ */ __name(async () => {
          const providedRegion = typeof region === "function" ? await region() : region;
          const realRegion = getRealRegion(providedRegion);
          checkRegion(realRegion);
          return realRegion;
        }, "region"),
        useFipsEndpoint: /* @__PURE__ */ __name(async () => {
          const providedRegion = typeof region === "string" ? region : await region();
          if (isFipsRegion(providedRegion)) {
            return true;
          }
          return typeof useFipsEndpoint !== "function" ? Promise.resolve(!!useFipsEndpoint) : useFipsEndpoint();
        }, "useFipsEndpoint")
      });
    }, "resolveRegionConfig");
    var getHostnameFromVariants = /* @__PURE__ */ __name((variants = [], { useFipsEndpoint, useDualstackEndpoint }) => variants.find(({ tags }) => useFipsEndpoint === tags.includes("fips") && useDualstackEndpoint === tags.includes("dualstack"))?.hostname, "getHostnameFromVariants");
    var getResolvedHostname = /* @__PURE__ */ __name((resolvedRegion, { regionHostname, partitionHostname }) => regionHostname ? regionHostname : partitionHostname ? partitionHostname.replace("{region}", resolvedRegion) : void 0, "getResolvedHostname");
    var getResolvedPartition = /* @__PURE__ */ __name((region, { partitionHash }) => Object.keys(partitionHash || {}).find((key) => partitionHash[key].regions.includes(region)) ?? "aws", "getResolvedPartition");
    var getResolvedSigningRegion = /* @__PURE__ */ __name((hostname, { signingRegion, regionRegex, useFipsEndpoint }) => {
      if (signingRegion) {
        return signingRegion;
      } else if (useFipsEndpoint) {
        const regionRegexJs = regionRegex.replace("\\\\", "\\").replace(/^\^/g, "\\.").replace(/\$$/g, "\\.");
        const regionRegexmatchArray = hostname.match(regionRegexJs);
        if (regionRegexmatchArray) {
          return regionRegexmatchArray[0].slice(1, -1);
        }
      }
    }, "getResolvedSigningRegion");
    var getRegionInfo = /* @__PURE__ */ __name((region, { useFipsEndpoint = false, useDualstackEndpoint = false, signingService, regionHash, partitionHash }) => {
      const partition = getResolvedPartition(region, { partitionHash });
      const resolvedRegion = region in regionHash ? region : partitionHash[partition]?.endpoint ?? region;
      const hostnameOptions = { useFipsEndpoint, useDualstackEndpoint };
      const regionHostname = getHostnameFromVariants(regionHash[resolvedRegion]?.variants, hostnameOptions);
      const partitionHostname = getHostnameFromVariants(partitionHash[partition]?.variants, hostnameOptions);
      const hostname = getResolvedHostname(resolvedRegion, { regionHostname, partitionHostname });
      if (hostname === void 0) {
        throw new Error(`Endpoint resolution failed for: ${{ resolvedRegion, useFipsEndpoint, useDualstackEndpoint }}`);
      }
      const signingRegion = getResolvedSigningRegion(hostname, {
        signingRegion: regionHash[resolvedRegion]?.signingRegion,
        regionRegex: partitionHash[partition].regionRegex,
        useFipsEndpoint
      });
      return {
        partition,
        signingService,
        hostname,
        ...signingRegion && { signingRegion },
        ...regionHash[resolvedRegion]?.signingService && {
          signingService: regionHash[resolvedRegion].signingService
        }
      };
    }, "getRegionInfo");
    exports.CONFIG_USE_DUALSTACK_ENDPOINT = CONFIG_USE_DUALSTACK_ENDPOINT;
    exports.CONFIG_USE_FIPS_ENDPOINT = CONFIG_USE_FIPS_ENDPOINT;
    exports.DEFAULT_USE_DUALSTACK_ENDPOINT = DEFAULT_USE_DUALSTACK_ENDPOINT;
    exports.DEFAULT_USE_FIPS_ENDPOINT = DEFAULT_USE_FIPS_ENDPOINT;
    exports.ENV_USE_DUALSTACK_ENDPOINT = ENV_USE_DUALSTACK_ENDPOINT;
    exports.ENV_USE_FIPS_ENDPOINT = ENV_USE_FIPS_ENDPOINT;
    exports.NODE_REGION_CONFIG_FILE_OPTIONS = NODE_REGION_CONFIG_FILE_OPTIONS;
    exports.NODE_REGION_CONFIG_OPTIONS = NODE_REGION_CONFIG_OPTIONS;
    exports.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS;
    exports.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS;
    exports.REGION_ENV_NAME = REGION_ENV_NAME;
    exports.REGION_INI_NAME = REGION_INI_NAME;
    exports.getRegionInfo = getRegionInfo;
    exports.nodeDualstackConfigSelectors = nodeDualstackConfigSelectors;
    exports.nodeFipsConfigSelectors = nodeFipsConfigSelectors;
    exports.resolveCustomEndpointsConfig = resolveCustomEndpointsConfig;
    exports.resolveEndpointsConfig = resolveEndpointsConfig;
    exports.resolveRegionConfig = resolveRegionConfig;
  }
});

// node_modules/@smithy/middleware-content-length/dist-cjs/index.js
var require_dist_cjs26 = __commonJS({
  "node_modules/@smithy/middleware-content-length/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var protocolHttp = require_dist_cjs2();
    var CONTENT_LENGTH_HEADER = "content-length";
    function contentLengthMiddleware(bodyLengthChecker) {
      return (next) => async (args) => {
        const request = args.request;
        if (protocolHttp.HttpRequest.isInstance(request)) {
          const { body, headers } = request;
          if (body && Object.keys(headers).map((str) => str.toLowerCase()).indexOf(CONTENT_LENGTH_HEADER) === -1) {
            try {
              const length = bodyLengthChecker(body);
              request.headers = {
                ...request.headers,
                [CONTENT_LENGTH_HEADER]: String(length)
              };
            } catch (error) {
            }
          }
        }
        return next({
          ...args,
          request
        });
      };
    }
    __name(contentLengthMiddleware, "contentLengthMiddleware");
    var contentLengthMiddlewareOptions = {
      step: "build",
      tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
      name: "contentLengthMiddleware",
      override: true
    };
    var getContentLengthPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(contentLengthMiddleware(options.bodyLengthChecker), contentLengthMiddlewareOptions);
      }, "applyToStack")
    }), "getContentLengthPlugin");
    exports.contentLengthMiddleware = contentLengthMiddleware;
    exports.contentLengthMiddlewareOptions = contentLengthMiddlewareOptions;
    exports.getContentLengthPlugin = getContentLengthPlugin;
  }
});

// node_modules/@smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointUrlConfig.js
var require_getEndpointUrlConfig = __commonJS({
  "node_modules/@smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointUrlConfig.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getEndpointUrlConfig = void 0;
    var shared_ini_file_loader_1 = require_dist_cjs16();
    var ENV_ENDPOINT_URL = "AWS_ENDPOINT_URL";
    var CONFIG_ENDPOINT_URL = "endpoint_url";
    var getEndpointUrlConfig = /* @__PURE__ */ __name((serviceId) => ({
      environmentVariableSelector: /* @__PURE__ */ __name((env) => {
        const serviceSuffixParts = serviceId.split(" ").map((w) => w.toUpperCase());
        const serviceEndpointUrl = env[[ENV_ENDPOINT_URL, ...serviceSuffixParts].join("_")];
        if (serviceEndpointUrl)
          return serviceEndpointUrl;
        const endpointUrl = env[ENV_ENDPOINT_URL];
        if (endpointUrl)
          return endpointUrl;
        return void 0;
      }, "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile, config) => {
        if (config && profile.services) {
          const servicesSection = config[["services", profile.services].join(shared_ini_file_loader_1.CONFIG_PREFIX_SEPARATOR)];
          if (servicesSection) {
            const servicePrefixParts = serviceId.split(" ").map((w) => w.toLowerCase());
            const endpointUrl2 = servicesSection[[servicePrefixParts.join("_"), CONFIG_ENDPOINT_URL].join(shared_ini_file_loader_1.CONFIG_PREFIX_SEPARATOR)];
            if (endpointUrl2)
              return endpointUrl2;
          }
        }
        const endpointUrl = profile[CONFIG_ENDPOINT_URL];
        if (endpointUrl)
          return endpointUrl;
        return void 0;
      }, "configFileSelector"),
      default: void 0
    }), "getEndpointUrlConfig");
    exports.getEndpointUrlConfig = getEndpointUrlConfig;
  }
});

// node_modules/@smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointFromConfig.js
var require_getEndpointFromConfig = __commonJS({
  "node_modules/@smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointFromConfig.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getEndpointFromConfig = void 0;
    var node_config_provider_1 = require_dist_cjs17();
    var getEndpointUrlConfig_1 = require_getEndpointUrlConfig();
    var getEndpointFromConfig = /* @__PURE__ */ __name(async (serviceId) => (0, node_config_provider_1.loadConfig)((0, getEndpointUrlConfig_1.getEndpointUrlConfig)(serviceId ?? ""))(), "getEndpointFromConfig");
    exports.getEndpointFromConfig = getEndpointFromConfig;
  }
});

// node_modules/@smithy/middleware-serde/dist-cjs/index.js
var require_dist_cjs27 = __commonJS({
  "node_modules/@smithy/middleware-serde/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var protocolHttp = require_dist_cjs2();
    var endpoints = (init_endpoints(), __toCommonJS(endpoints_exports));
    var deserializerMiddleware = /* @__PURE__ */ __name((options, deserializer) => (next, context) => async (args) => {
      const { response } = await next(args);
      try {
        const parsed = await deserializer(response, options);
        return {
          response,
          output: parsed
        };
      } catch (error) {
        Object.defineProperty(error, "$response", {
          value: response,
          enumerable: false,
          writable: false,
          configurable: false
        });
        if (!("$metadata" in error)) {
          const hint = `Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.`;
          try {
            error.message += "\n  " + hint;
          } catch (e) {
            if (!context.logger || context.logger?.constructor?.name === "NoOpLogger") {
              console.warn(hint);
            } else {
              context.logger?.warn?.(hint);
            }
          }
          if (typeof error.$responseBodyText !== "undefined") {
            if (error.$response) {
              error.$response.body = error.$responseBodyText;
            }
          }
          try {
            if (protocolHttp.HttpResponse.isInstance(response)) {
              const { headers = {} } = response;
              const headerEntries = Object.entries(headers);
              error.$metadata = {
                httpStatusCode: response.statusCode,
                requestId: findHeader(/^x-[\w-]+-request-?id$/, headerEntries),
                extendedRequestId: findHeader(/^x-[\w-]+-id-2$/, headerEntries),
                cfId: findHeader(/^x-[\w-]+-cf-id$/, headerEntries)
              };
            }
          } catch (e) {
          }
        }
        throw error;
      }
    }, "deserializerMiddleware");
    var findHeader = /* @__PURE__ */ __name((pattern, headers) => {
      return (headers.find(([k]) => {
        return k.match(pattern);
      }) || [void 0, void 0])[1];
    }, "findHeader");
    var serializerMiddleware = /* @__PURE__ */ __name((options, serializer) => (next, context) => async (args) => {
      const endpointConfig = options;
      const endpoint = context.endpointV2 ? async () => endpoints.toEndpointV1(context.endpointV2) : endpointConfig.endpoint;
      if (!endpoint) {
        throw new Error("No valid endpoint provider available.");
      }
      const request = await serializer(args.input, { ...options, endpoint });
      return next({
        ...args,
        request
      });
    }, "serializerMiddleware");
    var deserializerMiddlewareOption = {
      name: "deserializerMiddleware",
      step: "deserialize",
      tags: ["DESERIALIZER"],
      override: true
    };
    var serializerMiddlewareOption = {
      name: "serializerMiddleware",
      step: "serialize",
      tags: ["SERIALIZER"],
      override: true
    };
    function getSerdePlugin(config, serializer, deserializer) {
      return {
        applyToStack: /* @__PURE__ */ __name((commandStack) => {
          commandStack.add(deserializerMiddleware(config, deserializer), deserializerMiddlewareOption);
          commandStack.add(serializerMiddleware(config, serializer), serializerMiddlewareOption);
        }, "applyToStack")
      };
    }
    __name(getSerdePlugin, "getSerdePlugin");
    exports.deserializerMiddleware = deserializerMiddleware;
    exports.deserializerMiddlewareOption = deserializerMiddlewareOption;
    exports.getSerdePlugin = getSerdePlugin;
    exports.serializerMiddleware = serializerMiddleware;
    exports.serializerMiddlewareOption = serializerMiddlewareOption;
  }
});

// node_modules/@smithy/middleware-endpoint/dist-cjs/index.js
var require_dist_cjs28 = __commonJS({
  "node_modules/@smithy/middleware-endpoint/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var core = (init_dist_es(), __toCommonJS(dist_es_exports));
    var utilMiddleware = require_dist_cjs11();
    var getEndpointFromConfig = require_getEndpointFromConfig();
    var urlParser = require_dist_cjs12();
    var middlewareSerde = require_dist_cjs27();
    var resolveParamsForS3 = /* @__PURE__ */ __name(async (endpointParams) => {
      const bucket = endpointParams?.Bucket || "";
      if (typeof endpointParams.Bucket === "string") {
        endpointParams.Bucket = bucket.replace(/#/g, encodeURIComponent("#")).replace(/\?/g, encodeURIComponent("?"));
      }
      if (isArnBucketName(bucket)) {
        if (endpointParams.ForcePathStyle === true) {
          throw new Error("Path-style addressing cannot be used with ARN buckets");
        }
      } else if (!isDnsCompatibleBucketName(bucket) || bucket.indexOf(".") !== -1 && !String(endpointParams.Endpoint).startsWith("http:") || bucket.toLowerCase() !== bucket || bucket.length < 3) {
        endpointParams.ForcePathStyle = true;
      }
      if (endpointParams.DisableMultiRegionAccessPoints) {
        endpointParams.disableMultiRegionAccessPoints = true;
        endpointParams.DisableMRAP = true;
      }
      return endpointParams;
    }, "resolveParamsForS3");
    var DOMAIN_PATTERN = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/;
    var IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
    var DOTS_PATTERN = /\.\./;
    var isDnsCompatibleBucketName = /* @__PURE__ */ __name((bucketName) => DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName), "isDnsCompatibleBucketName");
    var isArnBucketName = /* @__PURE__ */ __name((bucketName) => {
      const [arn, partition, service, , , bucket] = bucketName.split(":");
      const isArn = arn === "arn" && bucketName.split(":").length >= 6;
      const isValidArn = Boolean(isArn && partition && service && bucket);
      if (isArn && !isValidArn) {
        throw new Error(`Invalid ARN: ${bucketName} was an invalid ARN.`);
      }
      return isValidArn;
    }, "isArnBucketName");
    var createConfigValueProvider = /* @__PURE__ */ __name((configKey, canonicalEndpointParamKey, config, isClientContextParam = false) => {
      const configProvider = /* @__PURE__ */ __name(async () => {
        let configValue;
        if (isClientContextParam) {
          const clientContextParams = config.clientContextParams;
          const nestedValue = clientContextParams?.[configKey];
          configValue = nestedValue ?? config[configKey] ?? config[canonicalEndpointParamKey];
        } else {
          configValue = config[configKey] ?? config[canonicalEndpointParamKey];
        }
        if (typeof configValue === "function") {
          return configValue();
        }
        return configValue;
      }, "configProvider");
      if (configKey === "credentialScope" || canonicalEndpointParamKey === "CredentialScope") {
        return async () => {
          const credentials = typeof config.credentials === "function" ? await config.credentials() : config.credentials;
          const configValue = credentials?.credentialScope ?? credentials?.CredentialScope;
          return configValue;
        };
      }
      if (configKey === "accountId" || canonicalEndpointParamKey === "AccountId") {
        return async () => {
          const credentials = typeof config.credentials === "function" ? await config.credentials() : config.credentials;
          const configValue = credentials?.accountId ?? credentials?.AccountId;
          return configValue;
        };
      }
      if (configKey === "endpoint" || canonicalEndpointParamKey === "endpoint") {
        return async () => {
          if (config.isCustomEndpoint === false) {
            return void 0;
          }
          const endpoint = await configProvider();
          if (endpoint && typeof endpoint === "object") {
            if ("url" in endpoint) {
              return endpoint.url.href;
            }
            if ("hostname" in endpoint) {
              const { protocol, hostname, port, path } = endpoint;
              return `${protocol}//${hostname}${port ? ":" + port : ""}${path}`;
            }
          }
          return endpoint;
        };
      }
      return configProvider;
    }, "createConfigValueProvider");
    var toEndpointV1 = /* @__PURE__ */ __name((endpoint) => {
      if (typeof endpoint === "object") {
        if ("url" in endpoint) {
          const v1Endpoint = urlParser.parseUrl(endpoint.url);
          if (endpoint.headers) {
            v1Endpoint.headers = {};
            for (const [name, values] of Object.entries(endpoint.headers)) {
              v1Endpoint.headers[name.toLowerCase()] = values.join(", ");
            }
          }
          return v1Endpoint;
        }
        return endpoint;
      }
      return urlParser.parseUrl(endpoint);
    }, "toEndpointV1");
    var getEndpointFromInstructions = /* @__PURE__ */ __name(async (commandInput, instructionsSupplier, clientConfig, context) => {
      if (!clientConfig.isCustomEndpoint) {
        let endpointFromConfig;
        if (clientConfig.serviceConfiguredEndpoint) {
          endpointFromConfig = await clientConfig.serviceConfiguredEndpoint();
        } else {
          endpointFromConfig = await getEndpointFromConfig.getEndpointFromConfig(clientConfig.serviceId);
        }
        if (endpointFromConfig) {
          clientConfig.endpoint = () => Promise.resolve(toEndpointV1(endpointFromConfig));
          clientConfig.isCustomEndpoint = true;
        }
      }
      const endpointParams = await resolveParams(commandInput, instructionsSupplier, clientConfig);
      if (typeof clientConfig.endpointProvider !== "function") {
        throw new Error("config.endpointProvider is not set.");
      }
      const endpoint = clientConfig.endpointProvider(endpointParams, context);
      if (clientConfig.isCustomEndpoint && clientConfig.endpoint) {
        const customEndpoint = await clientConfig.endpoint();
        if (customEndpoint?.headers) {
          endpoint.headers ??= {};
          for (const [name, value] of Object.entries(customEndpoint.headers)) {
            endpoint.headers[name] = Array.isArray(value) ? value : [value];
          }
        }
      }
      return endpoint;
    }, "getEndpointFromInstructions");
    var resolveParams = /* @__PURE__ */ __name(async (commandInput, instructionsSupplier, clientConfig) => {
      const endpointParams = {};
      const instructions = instructionsSupplier?.getEndpointParameterInstructions?.() || {};
      for (const [name, instruction] of Object.entries(instructions)) {
        switch (instruction.type) {
          case "staticContextParams":
            endpointParams[name] = instruction.value;
            break;
          case "contextParams":
            endpointParams[name] = commandInput[instruction.name];
            break;
          case "clientContextParams":
          case "builtInParams":
            endpointParams[name] = await createConfigValueProvider(instruction.name, name, clientConfig, instruction.type !== "builtInParams")();
            break;
          case "operationContextParams":
            endpointParams[name] = instruction.get(commandInput);
            break;
          default:
            throw new Error("Unrecognized endpoint parameter instruction: " + JSON.stringify(instruction));
        }
      }
      if (Object.keys(instructions).length === 0) {
        Object.assign(endpointParams, clientConfig);
      }
      if (String(clientConfig.serviceId).toLowerCase() === "s3") {
        await resolveParamsForS3(endpointParams);
      }
      return endpointParams;
    }, "resolveParams");
    var endpointMiddleware = /* @__PURE__ */ __name(({ config, instructions }) => {
      return (next, context) => async (args) => {
        if (config.isCustomEndpoint) {
          core.setFeature(context, "ENDPOINT_OVERRIDE", "N");
        }
        const endpoint = await getEndpointFromInstructions(args.input, {
          getEndpointParameterInstructions() {
            return instructions;
          }
        }, { ...config }, context);
        context.endpointV2 = endpoint;
        context.authSchemes = endpoint.properties?.authSchemes;
        const authScheme = context.authSchemes?.[0];
        if (authScheme) {
          context["signing_region"] = authScheme.signingRegion;
          context["signing_service"] = authScheme.signingName;
          const smithyContext = utilMiddleware.getSmithyContext(context);
          const httpAuthOption = smithyContext?.selectedHttpAuthScheme?.httpAuthOption;
          if (httpAuthOption) {
            httpAuthOption.signingProperties = Object.assign(httpAuthOption.signingProperties || {}, {
              signing_region: authScheme.signingRegion,
              signingRegion: authScheme.signingRegion,
              signing_service: authScheme.signingName,
              signingName: authScheme.signingName,
              signingRegionSet: authScheme.signingRegionSet
            }, authScheme.properties);
          }
        }
        return next({
          ...args
        });
      };
    }, "endpointMiddleware");
    var endpointMiddlewareOptions = {
      step: "serialize",
      tags: ["ENDPOINT_PARAMETERS", "ENDPOINT_V2", "ENDPOINT"],
      name: "endpointV2Middleware",
      override: true,
      relation: "before",
      toMiddleware: middlewareSerde.serializerMiddlewareOption.name
    };
    var getEndpointPlugin = /* @__PURE__ */ __name((config, instructions) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.addRelativeTo(endpointMiddleware({
          config,
          instructions
        }), endpointMiddlewareOptions);
      }, "applyToStack")
    }), "getEndpointPlugin");
    var resolveEndpointConfig = /* @__PURE__ */ __name((input) => {
      const tls = input.tls ?? true;
      const { endpoint, useDualstackEndpoint, useFipsEndpoint } = input;
      const customEndpointProvider = endpoint != null ? async () => toEndpointV1(await utilMiddleware.normalizeProvider(endpoint)()) : void 0;
      const isCustomEndpoint = !!endpoint;
      const resolvedConfig = Object.assign(input, {
        endpoint: customEndpointProvider,
        tls,
        isCustomEndpoint,
        useDualstackEndpoint: utilMiddleware.normalizeProvider(useDualstackEndpoint ?? false),
        useFipsEndpoint: utilMiddleware.normalizeProvider(useFipsEndpoint ?? false)
      });
      let configuredEndpointPromise = void 0;
      resolvedConfig.serviceConfiguredEndpoint = async () => {
        if (input.serviceId && !configuredEndpointPromise) {
          configuredEndpointPromise = getEndpointFromConfig.getEndpointFromConfig(input.serviceId);
        }
        return configuredEndpointPromise;
      };
      return resolvedConfig;
    }, "resolveEndpointConfig");
    var resolveEndpointRequiredConfig = /* @__PURE__ */ __name((input) => {
      const { endpoint } = input;
      if (endpoint === void 0) {
        input.endpoint = async () => {
          throw new Error("@smithy/middleware-endpoint: (default endpointRuleSet) endpoint is not set - you must configure an endpoint.");
        };
      }
      return input;
    }, "resolveEndpointRequiredConfig");
    exports.endpointMiddleware = endpointMiddleware;
    exports.endpointMiddlewareOptions = endpointMiddlewareOptions;
    exports.getEndpointFromInstructions = getEndpointFromInstructions;
    exports.getEndpointPlugin = getEndpointPlugin;
    exports.resolveEndpointConfig = resolveEndpointConfig;
    exports.resolveEndpointRequiredConfig = resolveEndpointRequiredConfig;
    exports.resolveParams = resolveParams;
    exports.toEndpointV1 = toEndpointV1;
  }
});

// node_modules/@smithy/middleware-retry/dist-cjs/isStreamingPayload/isStreamingPayload.js
var require_isStreamingPayload = __commonJS({
  "node_modules/@smithy/middleware-retry/dist-cjs/isStreamingPayload/isStreamingPayload.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isStreamingPayload = void 0;
    var stream_1 = __require("stream");
    var isStreamingPayload = /* @__PURE__ */ __name((request) => request?.body instanceof stream_1.Readable || typeof ReadableStream !== "undefined" && request?.body instanceof ReadableStream, "isStreamingPayload");
    exports.isStreamingPayload = isStreamingPayload;
  }
});

// node_modules/@smithy/middleware-retry/dist-cjs/index.js
var require_dist_cjs29 = __commonJS({
  "node_modules/@smithy/middleware-retry/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var utilRetry = require_dist_cjs4();
    var protocolHttp = require_dist_cjs2();
    var serviceErrorClassification = require_dist_cjs3();
    var uuid = require_dist_cjs13();
    var utilMiddleware = require_dist_cjs11();
    var smithyClient = require_dist_cjs14();
    var isStreamingPayload = require_isStreamingPayload();
    var serde = (init_serde(), __toCommonJS(serde_exports));
    var asSdkError = /* @__PURE__ */ __name((error) => {
      if (error instanceof Error)
        return error;
      if (error instanceof Object)
        return Object.assign(new Error(), error);
      if (typeof error === "string")
        return new Error(error);
      return new Error(`AWS SDK error wrapper for ${error}`);
    }, "asSdkError");
    var getDefaultRetryQuota = /* @__PURE__ */ __name((initialRetryTokens, options) => {
      const MAX_CAPACITY = initialRetryTokens;
      const noRetryIncrement = utilRetry.NO_RETRY_INCREMENT;
      const retryCost = utilRetry.RETRY_COST;
      const timeoutRetryCost = utilRetry.TIMEOUT_RETRY_COST;
      let availableCapacity = initialRetryTokens;
      const getCapacityAmount = /* @__PURE__ */ __name((error) => error.name === "TimeoutError" ? timeoutRetryCost : retryCost, "getCapacityAmount");
      const hasRetryTokens = /* @__PURE__ */ __name((error) => getCapacityAmount(error) <= availableCapacity, "hasRetryTokens");
      const retrieveRetryTokens = /* @__PURE__ */ __name((error) => {
        if (!hasRetryTokens(error)) {
          throw new Error("No retry token available");
        }
        const capacityAmount = getCapacityAmount(error);
        availableCapacity -= capacityAmount;
        return capacityAmount;
      }, "retrieveRetryTokens");
      const releaseRetryTokens = /* @__PURE__ */ __name((capacityReleaseAmount) => {
        availableCapacity += capacityReleaseAmount ?? noRetryIncrement;
        availableCapacity = Math.min(availableCapacity, MAX_CAPACITY);
      }, "releaseRetryTokens");
      return Object.freeze({
        hasRetryTokens,
        retrieveRetryTokens,
        releaseRetryTokens
      });
    }, "getDefaultRetryQuota");
    var defaultDelayDecider = /* @__PURE__ */ __name((delayBase, attempts) => Math.floor(Math.min(utilRetry.MAXIMUM_RETRY_DELAY, Math.random() * 2 ** attempts * delayBase)), "defaultDelayDecider");
    var defaultRetryDecider = /* @__PURE__ */ __name((error) => {
      if (!error) {
        return false;
      }
      return serviceErrorClassification.isRetryableByTrait(error) || serviceErrorClassification.isClockSkewError(error) || serviceErrorClassification.isThrottlingError(error) || serviceErrorClassification.isTransientError(error);
    }, "defaultRetryDecider");
    var StandardRetryStrategy = class {
      static {
        __name(this, "StandardRetryStrategy");
      }
      maxAttemptsProvider;
      retryDecider;
      delayDecider;
      retryQuota;
      mode = utilRetry.RETRY_MODES.STANDARD;
      constructor(maxAttemptsProvider, options) {
        this.maxAttemptsProvider = maxAttemptsProvider;
        this.retryDecider = options?.retryDecider ?? defaultRetryDecider;
        this.delayDecider = options?.delayDecider ?? defaultDelayDecider;
        this.retryQuota = options?.retryQuota ?? getDefaultRetryQuota(utilRetry.INITIAL_RETRY_TOKENS);
      }
      shouldRetry(error, attempts, maxAttempts) {
        return attempts < maxAttempts && this.retryDecider(error) && this.retryQuota.hasRetryTokens(error);
      }
      async getMaxAttempts() {
        let maxAttempts;
        try {
          maxAttempts = await this.maxAttemptsProvider();
        } catch (error) {
          maxAttempts = utilRetry.DEFAULT_MAX_ATTEMPTS;
        }
        return maxAttempts;
      }
      async retry(next, args, options) {
        let retryTokenAmount;
        let attempts = 0;
        let totalDelay = 0;
        const maxAttempts = await this.getMaxAttempts();
        const { request } = args;
        if (protocolHttp.HttpRequest.isInstance(request)) {
          request.headers[utilRetry.INVOCATION_ID_HEADER] = uuid.v4();
        }
        while (true) {
          try {
            if (protocolHttp.HttpRequest.isInstance(request)) {
              request.headers[utilRetry.REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
            }
            if (options?.beforeRequest) {
              await options.beforeRequest();
            }
            const { response, output } = await next(args);
            if (options?.afterRequest) {
              options.afterRequest(response);
            }
            this.retryQuota.releaseRetryTokens(retryTokenAmount);
            output.$metadata.attempts = attempts + 1;
            output.$metadata.totalRetryDelay = totalDelay;
            return { response, output };
          } catch (e) {
            const err = asSdkError(e);
            attempts++;
            if (this.shouldRetry(err, attempts, maxAttempts)) {
              retryTokenAmount = this.retryQuota.retrieveRetryTokens(err);
              const delayFromDecider = this.delayDecider(serviceErrorClassification.isThrottlingError(err) ? utilRetry.THROTTLING_RETRY_DELAY_BASE : utilRetry.DEFAULT_RETRY_DELAY_BASE, attempts);
              const delayFromResponse = getDelayFromRetryAfterHeader(err.$response);
              const delay = Math.max(delayFromResponse || 0, delayFromDecider);
              totalDelay += delay;
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            if (!err.$metadata) {
              err.$metadata = {};
            }
            err.$metadata.attempts = attempts;
            err.$metadata.totalRetryDelay = totalDelay;
            throw err;
          }
        }
      }
    };
    var getDelayFromRetryAfterHeader = /* @__PURE__ */ __name((response) => {
      if (!protocolHttp.HttpResponse.isInstance(response))
        return;
      const retryAfterHeaderName = Object.keys(response.headers).find((key) => key.toLowerCase() === "retry-after");
      if (!retryAfterHeaderName)
        return;
      const retryAfter = response.headers[retryAfterHeaderName];
      const retryAfterSeconds = Number(retryAfter);
      if (!Number.isNaN(retryAfterSeconds))
        return retryAfterSeconds * 1e3;
      const retryAfterDate = new Date(retryAfter);
      return retryAfterDate.getTime() - Date.now();
    }, "getDelayFromRetryAfterHeader");
    var AdaptiveRetryStrategy = class extends StandardRetryStrategy {
      static {
        __name(this, "AdaptiveRetryStrategy");
      }
      rateLimiter;
      constructor(maxAttemptsProvider, options) {
        const { rateLimiter, ...superOptions } = options ?? {};
        super(maxAttemptsProvider, superOptions);
        this.rateLimiter = rateLimiter ?? new utilRetry.DefaultRateLimiter();
        this.mode = utilRetry.RETRY_MODES.ADAPTIVE;
      }
      async retry(next, args) {
        return super.retry(next, args, {
          beforeRequest: /* @__PURE__ */ __name(async () => {
            return this.rateLimiter.getSendToken();
          }, "beforeRequest"),
          afterRequest: /* @__PURE__ */ __name((response) => {
            this.rateLimiter.updateClientSendingRate(response);
          }, "afterRequest")
        });
      }
    };
    var ENV_MAX_ATTEMPTS = "AWS_MAX_ATTEMPTS";
    var CONFIG_MAX_ATTEMPTS = "max_attempts";
    var NODE_MAX_ATTEMPT_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => {
        const value = env[ENV_MAX_ATTEMPTS];
        if (!value)
          return void 0;
        const maxAttempt = parseInt(value);
        if (Number.isNaN(maxAttempt)) {
          throw new Error(`Environment variable ${ENV_MAX_ATTEMPTS} mast be a number, got "${value}"`);
        }
        return maxAttempt;
      }, "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => {
        const value = profile[CONFIG_MAX_ATTEMPTS];
        if (!value)
          return void 0;
        const maxAttempt = parseInt(value);
        if (Number.isNaN(maxAttempt)) {
          throw new Error(`Shared config file entry ${CONFIG_MAX_ATTEMPTS} mast be a number, got "${value}"`);
        }
        return maxAttempt;
      }, "configFileSelector"),
      default: utilRetry.DEFAULT_MAX_ATTEMPTS
    };
    var resolveRetryConfig = /* @__PURE__ */ __name((input) => {
      const { retryStrategy, retryMode } = input;
      const maxAttempts = utilMiddleware.normalizeProvider(input.maxAttempts ?? utilRetry.DEFAULT_MAX_ATTEMPTS);
      let controller = retryStrategy ? Promise.resolve(retryStrategy) : void 0;
      const getDefault = /* @__PURE__ */ __name(async () => await utilMiddleware.normalizeProvider(retryMode)() === utilRetry.RETRY_MODES.ADAPTIVE ? new utilRetry.AdaptiveRetryStrategy(maxAttempts) : new utilRetry.StandardRetryStrategy(maxAttempts), "getDefault");
      return Object.assign(input, {
        maxAttempts,
        retryStrategy: /* @__PURE__ */ __name(() => controller ??= getDefault(), "retryStrategy")
      });
    }, "resolveRetryConfig");
    var ENV_RETRY_MODE = "AWS_RETRY_MODE";
    var CONFIG_RETRY_MODE = "retry_mode";
    var NODE_RETRY_MODE_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => env[ENV_RETRY_MODE], "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => profile[CONFIG_RETRY_MODE], "configFileSelector"),
      default: utilRetry.DEFAULT_RETRY_MODE
    };
    var omitRetryHeadersMiddleware = /* @__PURE__ */ __name(() => (next) => async (args) => {
      const { request } = args;
      if (protocolHttp.HttpRequest.isInstance(request)) {
        delete request.headers[utilRetry.INVOCATION_ID_HEADER];
        delete request.headers[utilRetry.REQUEST_HEADER];
      }
      return next(args);
    }, "omitRetryHeadersMiddleware");
    var omitRetryHeadersMiddlewareOptions = {
      name: "omitRetryHeadersMiddleware",
      tags: ["RETRY", "HEADERS", "OMIT_RETRY_HEADERS"],
      relation: "before",
      toMiddleware: "awsAuthMiddleware",
      override: true
    };
    var getOmitRetryHeadersPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.addRelativeTo(omitRetryHeadersMiddleware(), omitRetryHeadersMiddlewareOptions);
      }, "applyToStack")
    }), "getOmitRetryHeadersPlugin");
    function parseRetryAfterHeader(response, logger) {
      if (!protocolHttp.HttpResponse.isInstance(response)) {
        return;
      }
      for (const header of Object.keys(response.headers)) {
        const h = header.toLowerCase();
        if (h === "retry-after") {
          const retryAfter = response.headers[header];
          let retryAfterSeconds = NaN;
          if (retryAfter.endsWith("GMT")) {
            try {
              const date = serde.parseRfc7231DateTime(retryAfter);
              retryAfterSeconds = (date.getTime() - Date.now()) / 1e3;
            } catch (e) {
              logger?.trace?.("Failed to parse retry-after header");
              logger?.trace?.(e);
            }
          } else if (retryAfter.match(/ GMT, ((\d+)|(\d+\.\d+))$/)) {
            retryAfterSeconds = Number(retryAfter.match(/ GMT, ([\d.]+)$/)?.[1]);
          } else if (retryAfter.match(/^((\d+)|(\d+\.\d+))$/)) {
            retryAfterSeconds = Number(retryAfter);
          } else if (Date.parse(retryAfter) >= Date.now()) {
            retryAfterSeconds = (Date.parse(retryAfter) - Date.now()) / 1e3;
          }
          if (isNaN(retryAfterSeconds)) {
            return;
          }
          return new Date(Date.now() + retryAfterSeconds * 1e3);
        } else if (h === "x-amz-retry-after") {
          const v = response.headers[header];
          const backoffMilliseconds = Number(v);
          if (isNaN(backoffMilliseconds)) {
            logger?.trace?.(`Failed to parse x-amz-retry-after=${v}`);
            return;
          }
          return new Date(Date.now() + backoffMilliseconds);
        }
      }
    }
    __name(parseRetryAfterHeader, "parseRetryAfterHeader");
    function getRetryAfterHint(response, logger) {
      return parseRetryAfterHeader(response, logger);
    }
    __name(getRetryAfterHint, "getRetryAfterHint");
    var retryMiddleware = /* @__PURE__ */ __name((options) => (next, context) => async (args) => {
      let retryStrategy = await options.retryStrategy();
      const maxAttempts = await options.maxAttempts();
      if (isRetryStrategyV2(retryStrategy)) {
        retryStrategy = retryStrategy;
        let retryToken = await retryStrategy.acquireInitialRetryToken((context["partition_id"] ?? "") + (context.__retryLongPoll ? ":longpoll" : ""));
        let lastError = new Error();
        let attempts = 0;
        let totalRetryDelay = 0;
        const { request } = args;
        const isRequest = protocolHttp.HttpRequest.isInstance(request);
        if (isRequest) {
          request.headers[utilRetry.INVOCATION_ID_HEADER] = uuid.v4();
        }
        while (true) {
          try {
            if (isRequest) {
              request.headers[utilRetry.REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
            }
            const { response, output } = await next(args);
            retryStrategy.recordSuccess(retryToken);
            output.$metadata.attempts = attempts + 1;
            output.$metadata.totalRetryDelay = totalRetryDelay;
            return { response, output };
          } catch (e) {
            const retryErrorInfo = getRetryErrorInfo(e, options.logger);
            lastError = asSdkError(e);
            if (isRequest && isStreamingPayload.isStreamingPayload(request)) {
              (context.logger instanceof smithyClient.NoOpLogger ? console : context.logger)?.warn("An error was encountered in a non-retryable streaming request.");
              throw lastError;
            }
            try {
              retryToken = await retryStrategy.refreshRetryTokenForRetry(retryToken, retryErrorInfo);
            } catch (refreshError) {
              if (typeof refreshError.$backoff === "number") {
                await cooldown(refreshError.$backoff);
              }
              if (!lastError.$metadata) {
                lastError.$metadata = {};
              }
              lastError.$metadata.attempts = attempts + 1;
              lastError.$metadata.totalRetryDelay = totalRetryDelay;
              throw lastError;
            }
            attempts = retryToken.getRetryCount();
            const delay = retryToken.getRetryDelay();
            totalRetryDelay += delay;
            await cooldown(delay);
          }
        }
      } else {
        retryStrategy = retryStrategy;
        if (retryStrategy?.mode) {
          context.userAgent = [...context.userAgent || [], ["cfg/retry-mode", retryStrategy.mode]];
        }
        return retryStrategy.retry(next, args);
      }
    }, "retryMiddleware");
    var cooldown = /* @__PURE__ */ __name((ms) => new Promise((resolve) => setTimeout(resolve, ms)), "cooldown");
    var isRetryStrategyV2 = /* @__PURE__ */ __name((retryStrategy) => typeof retryStrategy.acquireInitialRetryToken !== "undefined" && typeof retryStrategy.refreshRetryTokenForRetry !== "undefined" && typeof retryStrategy.recordSuccess !== "undefined", "isRetryStrategyV2");
    var getRetryErrorInfo = /* @__PURE__ */ __name((error, logger) => {
      const errorInfo = {
        error,
        errorType: getRetryErrorType(error)
      };
      const retryAfterHint = parseRetryAfterHeader(error.$response, logger);
      if (retryAfterHint) {
        errorInfo.retryAfterHint = retryAfterHint;
      }
      return errorInfo;
    }, "getRetryErrorInfo");
    var getRetryErrorType = /* @__PURE__ */ __name((error) => {
      if (serviceErrorClassification.isThrottlingError(error))
        return "THROTTLING";
      if (serviceErrorClassification.isTransientError(error))
        return "TRANSIENT";
      if (serviceErrorClassification.isServerError(error))
        return "SERVER_ERROR";
      return "CLIENT_ERROR";
    }, "getRetryErrorType");
    var retryMiddlewareOptions = {
      name: "retryMiddleware",
      tags: ["RETRY"],
      step: "finalizeRequest",
      priority: "high",
      override: true
    };
    var getRetryPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(retryMiddleware(options), retryMiddlewareOptions);
      }, "applyToStack")
    }), "getRetryPlugin");
    exports.AdaptiveRetryStrategy = AdaptiveRetryStrategy;
    exports.CONFIG_MAX_ATTEMPTS = CONFIG_MAX_ATTEMPTS;
    exports.CONFIG_RETRY_MODE = CONFIG_RETRY_MODE;
    exports.ENV_MAX_ATTEMPTS = ENV_MAX_ATTEMPTS;
    exports.ENV_RETRY_MODE = ENV_RETRY_MODE;
    exports.NODE_MAX_ATTEMPT_CONFIG_OPTIONS = NODE_MAX_ATTEMPT_CONFIG_OPTIONS;
    exports.NODE_RETRY_MODE_CONFIG_OPTIONS = NODE_RETRY_MODE_CONFIG_OPTIONS;
    exports.StandardRetryStrategy = StandardRetryStrategy;
    exports.defaultDelayDecider = defaultDelayDecider;
    exports.defaultRetryDecider = defaultRetryDecider;
    exports.getOmitRetryHeadersPlugin = getOmitRetryHeadersPlugin;
    exports.getRetryAfterHint = getRetryAfterHint;
    exports.getRetryPlugin = getRetryPlugin;
    exports.omitRetryHeadersMiddleware = omitRetryHeadersMiddleware;
    exports.omitRetryHeadersMiddlewareOptions = omitRetryHeadersMiddlewareOptions;
    exports.resolveRetryConfig = resolveRetryConfig;
    exports.retryMiddleware = retryMiddleware;
    exports.retryMiddlewareOptions = retryMiddlewareOptions;
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getDateHeader.js
var import_protocol_http4, getDateHeader;
var init_getDateHeader = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getDateHeader.js"() {
    init_esm();
    import_protocol_http4 = __toESM(require_dist_cjs2());
    getDateHeader = /* @__PURE__ */ __name((response) => import_protocol_http4.HttpResponse.isInstance(response) ? response.headers?.date ?? response.headers?.Date : void 0, "getDateHeader");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getSkewCorrectedDate.js
var getSkewCorrectedDate;
var init_getSkewCorrectedDate = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getSkewCorrectedDate.js"() {
    init_esm();
    getSkewCorrectedDate = /* @__PURE__ */ __name((systemClockOffset) => new Date(Date.now() + systemClockOffset), "getSkewCorrectedDate");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/isClockSkewed.js
var isClockSkewed;
var init_isClockSkewed = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/isClockSkewed.js"() {
    init_esm();
    init_getSkewCorrectedDate();
    isClockSkewed = /* @__PURE__ */ __name((clockTime, systemClockOffset) => Math.abs(getSkewCorrectedDate(systemClockOffset).getTime() - clockTime) >= 3e5, "isClockSkewed");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getUpdatedSystemClockOffset.js
var getUpdatedSystemClockOffset;
var init_getUpdatedSystemClockOffset = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getUpdatedSystemClockOffset.js"() {
    init_esm();
    init_isClockSkewed();
    getUpdatedSystemClockOffset = /* @__PURE__ */ __name((clockTime, currentSystemClockOffset) => {
      const clockTimeInMs = Date.parse(clockTime);
      if (isClockSkewed(clockTimeInMs, currentSystemClockOffset)) {
        return clockTimeInMs - Date.now();
      }
      return currentSystemClockOffset;
    }, "getUpdatedSystemClockOffset");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/index.js
var init_utils = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/index.js"() {
    init_esm();
    init_getDateHeader();
    init_getSkewCorrectedDate();
    init_getUpdatedSystemClockOffset();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4Signer.js
var import_protocol_http5, throwSigningPropertyError, validateSigningProperties, AwsSdkSigV4Signer, AWSSDKSigV4Signer;
var init_AwsSdkSigV4Signer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4Signer.js"() {
    init_esm();
    import_protocol_http5 = __toESM(require_dist_cjs2());
    init_utils();
    throwSigningPropertyError = /* @__PURE__ */ __name((name, property) => {
      if (!property) {
        throw new Error(`Property \`${name}\` is not resolved for AWS SDK SigV4Auth`);
      }
      return property;
    }, "throwSigningPropertyError");
    validateSigningProperties = /* @__PURE__ */ __name(async (signingProperties) => {
      const context = throwSigningPropertyError("context", signingProperties.context);
      const config = throwSigningPropertyError("config", signingProperties.config);
      const authScheme = context.endpointV2?.properties?.authSchemes?.[0];
      const signerFunction = throwSigningPropertyError("signer", config.signer);
      const signer = await signerFunction(authScheme);
      const signingRegion = signingProperties?.signingRegion;
      const signingRegionSet = signingProperties?.signingRegionSet;
      const signingName = signingProperties?.signingName;
      return {
        config,
        signer,
        signingRegion,
        signingRegionSet,
        signingName
      };
    }, "validateSigningProperties");
    AwsSdkSigV4Signer = class {
      static {
        __name(this, "AwsSdkSigV4Signer");
      }
      async sign(httpRequest, identity, signingProperties) {
        if (!import_protocol_http5.HttpRequest.isInstance(httpRequest)) {
          throw new Error("The request is not an instance of `HttpRequest` and cannot be signed");
        }
        const validatedProps = await validateSigningProperties(signingProperties);
        const { config, signer } = validatedProps;
        let { signingRegion, signingName } = validatedProps;
        const handlerExecutionContext = signingProperties.context;
        if (handlerExecutionContext?.authSchemes?.length ?? 0 > 1) {
          const [first, second] = handlerExecutionContext.authSchemes;
          if (first?.name === "sigv4a" && second?.name === "sigv4") {
            signingRegion = second?.signingRegion ?? signingRegion;
            signingName = second?.signingName ?? signingName;
          }
        }
        const signedRequest = await signer.sign(httpRequest, {
          signingDate: getSkewCorrectedDate(config.systemClockOffset),
          signingRegion,
          signingService: signingName
        });
        return signedRequest;
      }
      errorHandler(signingProperties) {
        return (error) => {
          const serverTime = error.ServerTime ?? getDateHeader(error.$response);
          if (serverTime) {
            const config = throwSigningPropertyError("config", signingProperties.config);
            const initialSystemClockOffset = config.systemClockOffset;
            config.systemClockOffset = getUpdatedSystemClockOffset(serverTime, config.systemClockOffset);
            const clockSkewCorrected = config.systemClockOffset !== initialSystemClockOffset;
            if (clockSkewCorrected && error.$metadata) {
              error.$metadata.clockSkewCorrected = true;
            }
          }
          throw error;
        };
      }
      successHandler(httpResponse, signingProperties) {
        const dateHeader = getDateHeader(httpResponse);
        if (dateHeader) {
          const config = throwSigningPropertyError("config", signingProperties.config);
          config.systemClockOffset = getUpdatedSystemClockOffset(dateHeader, config.systemClockOffset);
        }
      }
    };
    AWSSDKSigV4Signer = AwsSdkSigV4Signer;
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4ASigner.js
var import_protocol_http6, AwsSdkSigV4ASigner;
var init_AwsSdkSigV4ASigner = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/AwsSdkSigV4ASigner.js"() {
    init_esm();
    import_protocol_http6 = __toESM(require_dist_cjs2());
    init_utils();
    init_AwsSdkSigV4Signer();
    AwsSdkSigV4ASigner = class extends AwsSdkSigV4Signer {
      static {
        __name(this, "AwsSdkSigV4ASigner");
      }
      async sign(httpRequest, identity, signingProperties) {
        if (!import_protocol_http6.HttpRequest.isInstance(httpRequest)) {
          throw new Error("The request is not an instance of `HttpRequest` and cannot be signed");
        }
        const { config, signer, signingRegion, signingRegionSet, signingName } = await validateSigningProperties(signingProperties);
        const configResolvedSigningRegionSet = await config.sigv4aSigningRegionSet?.();
        const multiRegionOverride = (configResolvedSigningRegionSet ?? signingRegionSet ?? [signingRegion]).join(",");
        const signedRequest = await signer.sign(httpRequest, {
          signingDate: getSkewCorrectedDate(config.systemClockOffset),
          signingRegion: multiRegionOverride,
          signingService: signingName
        });
        return signedRequest;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getArrayForCommaSeparatedString.js
var getArrayForCommaSeparatedString;
var init_getArrayForCommaSeparatedString = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getArrayForCommaSeparatedString.js"() {
    init_esm();
    getArrayForCommaSeparatedString = /* @__PURE__ */ __name((str) => typeof str === "string" && str.length > 0 ? str.split(",").map((item) => item.trim()) : [], "getArrayForCommaSeparatedString");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getBearerTokenEnvKey.js
var getBearerTokenEnvKey;
var init_getBearerTokenEnvKey = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/utils/getBearerTokenEnvKey.js"() {
    init_esm();
    getBearerTokenEnvKey = /* @__PURE__ */ __name((signingName) => `AWS_BEARER_TOKEN_${signingName.replace(/[\s-]/g, "_").toUpperCase()}`, "getBearerTokenEnvKey");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/NODE_AUTH_SCHEME_PREFERENCE_OPTIONS.js
var NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY, NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY, NODE_AUTH_SCHEME_PREFERENCE_OPTIONS;
var init_NODE_AUTH_SCHEME_PREFERENCE_OPTIONS = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/NODE_AUTH_SCHEME_PREFERENCE_OPTIONS.js"() {
    init_esm();
    init_getArrayForCommaSeparatedString();
    init_getBearerTokenEnvKey();
    NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY = "AWS_AUTH_SCHEME_PREFERENCE";
    NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY = "auth_scheme_preference";
    NODE_AUTH_SCHEME_PREFERENCE_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env, options) => {
        if (options?.signingName) {
          const bearerTokenKey = getBearerTokenEnvKey(options.signingName);
          if (bearerTokenKey in env)
            return ["httpBearerAuth"];
        }
        if (!(NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY in env))
          return void 0;
        return getArrayForCommaSeparatedString(env[NODE_AUTH_SCHEME_PREFERENCE_ENV_KEY]);
      }, "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => {
        if (!(NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY in profile))
          return void 0;
        return getArrayForCommaSeparatedString(profile[NODE_AUTH_SCHEME_PREFERENCE_CONFIG_KEY]);
      }, "configFileSelector"),
      default: []
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4AConfig.js
var import_property_provider, resolveAwsSdkSigV4AConfig, NODE_SIGV4A_CONFIG_OPTIONS;
var init_resolveAwsSdkSigV4AConfig = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4AConfig.js"() {
    init_esm();
    init_dist_es();
    import_property_provider = __toESM(require_dist_cjs15());
    resolveAwsSdkSigV4AConfig = /* @__PURE__ */ __name((config) => {
      config.sigv4aSigningRegionSet = normalizeProvider(config.sigv4aSigningRegionSet);
      return config;
    }, "resolveAwsSdkSigV4AConfig");
    NODE_SIGV4A_CONFIG_OPTIONS = {
      environmentVariableSelector(env) {
        if (env.AWS_SIGV4A_SIGNING_REGION_SET) {
          return env.AWS_SIGV4A_SIGNING_REGION_SET.split(",").map((_) => _.trim());
        }
        throw new import_property_provider.ProviderError("AWS_SIGV4A_SIGNING_REGION_SET not set in env.", {
          tryNextLink: true
        });
      },
      configFileSelector(profile) {
        if (profile.sigv4a_signing_region_set) {
          return (profile.sigv4a_signing_region_set ?? "").split(",").map((_) => _.trim());
        }
        throw new import_property_provider.ProviderError("sigv4a_signing_region_set not set in profile.", {
          tryNextLink: true
        });
      },
      default: void 0
    };
  }
});

// node_modules/@smithy/signature-v4/dist-cjs/index.js
var require_dist_cjs30 = __commonJS({
  "node_modules/@smithy/signature-v4/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var utilHexEncoding = require_dist_cjs10();
    var utilUtf8 = require_dist_cjs7();
    var isArrayBuffer = require_dist_cjs5();
    var protocolHttp = require_dist_cjs2();
    var utilMiddleware = require_dist_cjs11();
    var utilUriEscape = require_dist_cjs9();
    var ALGORITHM_QUERY_PARAM = "X-Amz-Algorithm";
    var CREDENTIAL_QUERY_PARAM = "X-Amz-Credential";
    var AMZ_DATE_QUERY_PARAM = "X-Amz-Date";
    var SIGNED_HEADERS_QUERY_PARAM = "X-Amz-SignedHeaders";
    var EXPIRES_QUERY_PARAM = "X-Amz-Expires";
    var SIGNATURE_QUERY_PARAM = "X-Amz-Signature";
    var TOKEN_QUERY_PARAM = "X-Amz-Security-Token";
    var REGION_SET_PARAM = "X-Amz-Region-Set";
    var AUTH_HEADER = "authorization";
    var AMZ_DATE_HEADER = AMZ_DATE_QUERY_PARAM.toLowerCase();
    var DATE_HEADER = "date";
    var GENERATED_HEADERS = [AUTH_HEADER, AMZ_DATE_HEADER, DATE_HEADER];
    var SIGNATURE_HEADER = SIGNATURE_QUERY_PARAM.toLowerCase();
    var SHA256_HEADER = "x-amz-content-sha256";
    var TOKEN_HEADER = TOKEN_QUERY_PARAM.toLowerCase();
    var HOST_HEADER = "host";
    var ALWAYS_UNSIGNABLE_HEADERS = {
      authorization: true,
      "cache-control": true,
      connection: true,
      expect: true,
      from: true,
      "keep-alive": true,
      "max-forwards": true,
      pragma: true,
      referer: true,
      te: true,
      trailer: true,
      "transfer-encoding": true,
      upgrade: true,
      "user-agent": true,
      "x-amzn-trace-id": true
    };
    var PROXY_HEADER_PATTERN = /^proxy-/;
    var SEC_HEADER_PATTERN = /^sec-/;
    var UNSIGNABLE_PATTERNS = [/^proxy-/i, /^sec-/i];
    var ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256";
    var ALGORITHM_IDENTIFIER_V4A = "AWS4-ECDSA-P256-SHA256";
    var EVENT_ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256-PAYLOAD";
    var UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
    var MAX_CACHE_SIZE = 50;
    var KEY_TYPE_IDENTIFIER = "aws4_request";
    var MAX_PRESIGNED_TTL = 60 * 60 * 24 * 7;
    var signingKeyCache = {};
    var cacheQueue = [];
    var createScope = /* @__PURE__ */ __name((shortDate, region, service) => `${shortDate}/${region}/${service}/${KEY_TYPE_IDENTIFIER}`, "createScope");
    var getSigningKey = /* @__PURE__ */ __name(async (sha256Constructor, credentials, shortDate, region, service) => {
      const credsHash = await hmac(sha256Constructor, credentials.secretAccessKey, credentials.accessKeyId);
      const cacheKey = `${shortDate}:${region}:${service}:${utilHexEncoding.toHex(credsHash)}:${credentials.sessionToken}`;
      if (cacheKey in signingKeyCache) {
        return signingKeyCache[cacheKey];
      }
      cacheQueue.push(cacheKey);
      while (cacheQueue.length > MAX_CACHE_SIZE) {
        delete signingKeyCache[cacheQueue.shift()];
      }
      let key = `AWS4${credentials.secretAccessKey}`;
      for (const signable of [shortDate, region, service, KEY_TYPE_IDENTIFIER]) {
        key = await hmac(sha256Constructor, key, signable);
      }
      return signingKeyCache[cacheKey] = key;
    }, "getSigningKey");
    var clearCredentialCache = /* @__PURE__ */ __name(() => {
      cacheQueue.length = 0;
      Object.keys(signingKeyCache).forEach((cacheKey) => {
        delete signingKeyCache[cacheKey];
      });
    }, "clearCredentialCache");
    var hmac = /* @__PURE__ */ __name((ctor, secret, data2) => {
      const hash = new ctor(secret);
      hash.update(utilUtf8.toUint8Array(data2));
      return hash.digest();
    }, "hmac");
    var getCanonicalHeaders = /* @__PURE__ */ __name(({ headers }, unsignableHeaders, signableHeaders) => {
      const canonical = {};
      for (const headerName of Object.keys(headers).sort()) {
        if (headers[headerName] == void 0) {
          continue;
        }
        const canonicalHeaderName = headerName.toLowerCase();
        if (canonicalHeaderName in ALWAYS_UNSIGNABLE_HEADERS || unsignableHeaders?.has(canonicalHeaderName) || PROXY_HEADER_PATTERN.test(canonicalHeaderName) || SEC_HEADER_PATTERN.test(canonicalHeaderName)) {
          if (!signableHeaders || signableHeaders && !signableHeaders.has(canonicalHeaderName)) {
            continue;
          }
        }
        canonical[canonicalHeaderName] = headers[headerName].trim().replace(/\s+/g, " ");
      }
      return canonical;
    }, "getCanonicalHeaders");
    var getPayloadHash = /* @__PURE__ */ __name(async ({ headers, body }, hashConstructor) => {
      for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase() === SHA256_HEADER) {
          return headers[headerName];
        }
      }
      if (body == void 0) {
        return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      } else if (typeof body === "string" || ArrayBuffer.isView(body) || isArrayBuffer.isArrayBuffer(body)) {
        const hashCtor = new hashConstructor();
        hashCtor.update(utilUtf8.toUint8Array(body));
        return utilHexEncoding.toHex(await hashCtor.digest());
      }
      return UNSIGNED_PAYLOAD;
    }, "getPayloadHash");
    var HeaderFormatter = class {
      static {
        __name(this, "HeaderFormatter");
      }
      format(headers) {
        const chunks = [];
        for (const headerName of Object.keys(headers)) {
          const bytes = utilUtf8.fromUtf8(headerName);
          chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
        }
        const out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
        let position = 0;
        for (const chunk of chunks) {
          out.set(chunk, position);
          position += chunk.byteLength;
        }
        return out;
      }
      formatHeaderValue(header) {
        switch (header.type) {
          case "boolean":
            return Uint8Array.from([header.value ? 0 : 1]);
          case "byte":
            return Uint8Array.from([2, header.value]);
          case "short":
            const shortView = new DataView(new ArrayBuffer(3));
            shortView.setUint8(0, 3);
            shortView.setInt16(1, header.value, false);
            return new Uint8Array(shortView.buffer);
          case "integer":
            const intView = new DataView(new ArrayBuffer(5));
            intView.setUint8(0, 4);
            intView.setInt32(1, header.value, false);
            return new Uint8Array(intView.buffer);
          case "long":
            const longBytes = new Uint8Array(9);
            longBytes[0] = 5;
            longBytes.set(header.value.bytes, 1);
            return longBytes;
          case "binary":
            const binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
            binView.setUint8(0, 6);
            binView.setUint16(1, header.value.byteLength, false);
            const binBytes = new Uint8Array(binView.buffer);
            binBytes.set(header.value, 3);
            return binBytes;
          case "string":
            const utf8Bytes = utilUtf8.fromUtf8(header.value);
            const strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
            strView.setUint8(0, 7);
            strView.setUint16(1, utf8Bytes.byteLength, false);
            const strBytes = new Uint8Array(strView.buffer);
            strBytes.set(utf8Bytes, 3);
            return strBytes;
          case "timestamp":
            const tsBytes = new Uint8Array(9);
            tsBytes[0] = 8;
            tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
            return tsBytes;
          case "uuid":
            if (!UUID_PATTERN.test(header.value)) {
              throw new Error(`Invalid UUID received: ${header.value}`);
            }
            const uuidBytes = new Uint8Array(17);
            uuidBytes[0] = 9;
            uuidBytes.set(utilHexEncoding.fromHex(header.value.replace(/\-/g, "")), 1);
            return uuidBytes;
        }
      }
    };
    var HEADER_VALUE_TYPE;
    (function(HEADER_VALUE_TYPE2) {
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["boolTrue"] = 0] = "boolTrue";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["boolFalse"] = 1] = "boolFalse";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["byte"] = 2] = "byte";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["short"] = 3] = "short";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["integer"] = 4] = "integer";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["long"] = 5] = "long";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["byteArray"] = 6] = "byteArray";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["string"] = 7] = "string";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["timestamp"] = 8] = "timestamp";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["uuid"] = 9] = "uuid";
    })(HEADER_VALUE_TYPE || (HEADER_VALUE_TYPE = {}));
    var UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    var Int64 = class _Int64 {
      static {
        __name(this, "Int64");
      }
      bytes;
      constructor(bytes) {
        this.bytes = bytes;
        if (bytes.byteLength !== 8) {
          throw new Error("Int64 buffers must be exactly 8 bytes");
        }
      }
      static fromNumber(number) {
        if (number > 9223372036854776e3 || number < -9223372036854776e3) {
          throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
        }
        const bytes = new Uint8Array(8);
        for (let i = 7, remaining = Math.abs(Math.round(number)); i > -1 && remaining > 0; i--, remaining /= 256) {
          bytes[i] = remaining;
        }
        if (number < 0) {
          negate(bytes);
        }
        return new _Int64(bytes);
      }
      valueOf() {
        const bytes = this.bytes.slice(0);
        const negative = bytes[0] & 128;
        if (negative) {
          negate(bytes);
        }
        return parseInt(utilHexEncoding.toHex(bytes), 16) * (negative ? -1 : 1);
      }
      toString() {
        return String(this.valueOf());
      }
    };
    function negate(bytes) {
      for (let i = 0; i < 8; i++) {
        bytes[i] ^= 255;
      }
      for (let i = 7; i > -1; i--) {
        bytes[i]++;
        if (bytes[i] !== 0)
          break;
      }
    }
    __name(negate, "negate");
    var hasHeader = /* @__PURE__ */ __name((soughtHeader, headers) => {
      soughtHeader = soughtHeader.toLowerCase();
      for (const headerName of Object.keys(headers)) {
        if (soughtHeader === headerName.toLowerCase()) {
          return true;
        }
      }
      return false;
    }, "hasHeader");
    var moveHeadersToQuery = /* @__PURE__ */ __name((request, options = {}) => {
      const { headers, query = {} } = protocolHttp.HttpRequest.clone(request);
      for (const name of Object.keys(headers)) {
        const lname = name.toLowerCase();
        if (lname.slice(0, 6) === "x-amz-" && !options.unhoistableHeaders?.has(lname) || options.hoistableHeaders?.has(lname)) {
          query[name] = headers[name];
          delete headers[name];
        }
      }
      return {
        ...request,
        headers,
        query
      };
    }, "moveHeadersToQuery");
    var prepareRequest = /* @__PURE__ */ __name((request) => {
      request = protocolHttp.HttpRequest.clone(request);
      for (const headerName of Object.keys(request.headers)) {
        if (GENERATED_HEADERS.indexOf(headerName.toLowerCase()) > -1) {
          delete request.headers[headerName];
        }
      }
      return request;
    }, "prepareRequest");
    var getCanonicalQuery = /* @__PURE__ */ __name(({ query = {} }) => {
      const keys = [];
      const serialized = {};
      for (const key of Object.keys(query)) {
        if (key.toLowerCase() === SIGNATURE_HEADER) {
          continue;
        }
        const encodedKey = utilUriEscape.escapeUri(key);
        keys.push(encodedKey);
        const value = query[key];
        if (typeof value === "string") {
          serialized[encodedKey] = `${encodedKey}=${utilUriEscape.escapeUri(value)}`;
        } else if (Array.isArray(value)) {
          serialized[encodedKey] = value.slice(0).reduce((encoded, value2) => encoded.concat([`${encodedKey}=${utilUriEscape.escapeUri(value2)}`]), []).sort().join("&");
        }
      }
      return keys.sort().map((key) => serialized[key]).filter((serialized2) => serialized2).join("&");
    }, "getCanonicalQuery");
    var iso8601 = /* @__PURE__ */ __name((time) => toDate(time).toISOString().replace(/\.\d{3}Z$/, "Z"), "iso8601");
    var toDate = /* @__PURE__ */ __name((time) => {
      if (typeof time === "number") {
        return new Date(time * 1e3);
      }
      if (typeof time === "string") {
        if (Number(time)) {
          return new Date(Number(time) * 1e3);
        }
        return new Date(time);
      }
      return time;
    }, "toDate");
    var SignatureV4Base = class {
      static {
        __name(this, "SignatureV4Base");
      }
      service;
      regionProvider;
      credentialProvider;
      sha256;
      uriEscapePath;
      applyChecksum;
      constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true }) {
        this.service = service;
        this.sha256 = sha256;
        this.uriEscapePath = uriEscapePath;
        this.applyChecksum = typeof applyChecksum === "boolean" ? applyChecksum : true;
        this.regionProvider = utilMiddleware.normalizeProvider(region);
        this.credentialProvider = utilMiddleware.normalizeProvider(credentials);
      }
      createCanonicalRequest(request, canonicalHeaders, payloadHash) {
        const sortedHeaders = Object.keys(canonicalHeaders).sort();
        return `${request.method}
${this.getCanonicalPath(request)}
${getCanonicalQuery(request)}
${sortedHeaders.map((name) => `${name}:${canonicalHeaders[name]}`).join("\n")}

${sortedHeaders.join(";")}
${payloadHash}`;
      }
      async createStringToSign(longDate, credentialScope, canonicalRequest, algorithmIdentifier) {
        const hash = new this.sha256();
        hash.update(utilUtf8.toUint8Array(canonicalRequest));
        const hashedRequest = await hash.digest();
        return `${algorithmIdentifier}
${longDate}
${credentialScope}
${utilHexEncoding.toHex(hashedRequest)}`;
      }
      getCanonicalPath({ path }) {
        if (this.uriEscapePath) {
          const normalizedPathSegments = [];
          for (const pathSegment of path.split("/")) {
            if (pathSegment?.length === 0)
              continue;
            if (pathSegment === ".")
              continue;
            if (pathSegment === "..") {
              normalizedPathSegments.pop();
            } else {
              normalizedPathSegments.push(pathSegment);
            }
          }
          const normalizedPath = `${path?.startsWith("/") ? "/" : ""}${normalizedPathSegments.join("/")}${normalizedPathSegments.length > 0 && path?.endsWith("/") ? "/" : ""}`;
          const doubleEncoded = utilUriEscape.escapeUri(normalizedPath);
          return doubleEncoded.replace(/%2F/g, "/");
        }
        return path;
      }
      validateResolvedCredentials(credentials) {
        if (typeof credentials !== "object" || typeof credentials.accessKeyId !== "string" || typeof credentials.secretAccessKey !== "string") {
          throw new Error("Resolved credential object is not valid");
        }
      }
      formatDate(now) {
        const longDate = iso8601(now).replace(/[\-:]/g, "");
        return {
          longDate,
          shortDate: longDate.slice(0, 8)
        };
      }
      getCanonicalHeaderList(headers) {
        return Object.keys(headers).sort().join(";");
      }
    };
    var SignatureV42 = class extends SignatureV4Base {
      static {
        __name(this, "SignatureV4");
      }
      headerFormatter = new HeaderFormatter();
      constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true }) {
        super({
          applyChecksum,
          credentials,
          region,
          service,
          sha256,
          uriEscapePath
        });
      }
      async presign(originalRequest, options = {}) {
        const { signingDate = /* @__PURE__ */ new Date(), expiresIn = 3600, unsignableHeaders, unhoistableHeaders, signableHeaders, hoistableHeaders, signingRegion, signingService } = options;
        const credentials = await this.credentialProvider();
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? await this.regionProvider();
        const { longDate, shortDate } = this.formatDate(signingDate);
        if (expiresIn > MAX_PRESIGNED_TTL) {
          return Promise.reject("Signature version 4 presigned URLs must have an expiration date less than one week in the future");
        }
        const scope = createScope(shortDate, region, signingService ?? this.service);
        const request = moveHeadersToQuery(prepareRequest(originalRequest), { unhoistableHeaders, hoistableHeaders });
        if (credentials.sessionToken) {
          request.query[TOKEN_QUERY_PARAM] = credentials.sessionToken;
        }
        request.query[ALGORITHM_QUERY_PARAM] = ALGORITHM_IDENTIFIER;
        request.query[CREDENTIAL_QUERY_PARAM] = `${credentials.accessKeyId}/${scope}`;
        request.query[AMZ_DATE_QUERY_PARAM] = longDate;
        request.query[EXPIRES_QUERY_PARAM] = expiresIn.toString(10);
        const canonicalHeaders = getCanonicalHeaders(request, unsignableHeaders, signableHeaders);
        request.query[SIGNED_HEADERS_QUERY_PARAM] = this.getCanonicalHeaderList(canonicalHeaders);
        request.query[SIGNATURE_QUERY_PARAM] = await this.getSignature(longDate, scope, this.getSigningKey(credentials, region, shortDate, signingService), this.createCanonicalRequest(request, canonicalHeaders, await getPayloadHash(originalRequest, this.sha256)));
        return request;
      }
      async sign(toSign, options) {
        if (typeof toSign === "string") {
          return this.signString(toSign, options);
        } else if (toSign.headers && toSign.payload) {
          return this.signEvent(toSign, options);
        } else if (toSign.message) {
          return this.signMessage(toSign, options);
        } else {
          return this.signRequest(toSign, options);
        }
      }
      async signEvent({ headers, payload: payload2 }, { signingDate = /* @__PURE__ */ new Date(), priorSignature, signingRegion, signingService, eventStreamCredentials }) {
        const region = signingRegion ?? await this.regionProvider();
        const { shortDate, longDate } = this.formatDate(signingDate);
        const scope = createScope(shortDate, region, signingService ?? this.service);
        const hashedPayload = await getPayloadHash({ headers: {}, body: payload2 }, this.sha256);
        const hash = new this.sha256();
        hash.update(headers);
        const hashedHeaders = utilHexEncoding.toHex(await hash.digest());
        const stringToSign = [
          EVENT_ALGORITHM_IDENTIFIER,
          longDate,
          scope,
          priorSignature,
          hashedHeaders,
          hashedPayload
        ].join("\n");
        return this.signString(stringToSign, {
          signingDate,
          signingRegion: region,
          signingService,
          eventStreamCredentials
        });
      }
      async signMessage(signableMessage, { signingDate = /* @__PURE__ */ new Date(), signingRegion, signingService, eventStreamCredentials }) {
        const promise = this.signEvent({
          headers: this.headerFormatter.format(signableMessage.message.headers),
          payload: signableMessage.message.body
        }, {
          signingDate,
          signingRegion,
          signingService,
          priorSignature: signableMessage.priorSignature,
          eventStreamCredentials
        });
        return promise.then((signature) => {
          return { message: signableMessage.message, signature };
        });
      }
      async signString(stringToSign, { signingDate = /* @__PURE__ */ new Date(), signingRegion, signingService, eventStreamCredentials } = {}) {
        const credentials = eventStreamCredentials ?? await this.credentialProvider();
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? await this.regionProvider();
        const { shortDate } = this.formatDate(signingDate);
        const hash = new this.sha256(await this.getSigningKey(credentials, region, shortDate, signingService));
        hash.update(utilUtf8.toUint8Array(stringToSign));
        return utilHexEncoding.toHex(await hash.digest());
      }
      async signRequest(requestToSign, { signingDate = /* @__PURE__ */ new Date(), signableHeaders, unsignableHeaders, signingRegion, signingService } = {}) {
        const credentials = await this.credentialProvider();
        this.validateResolvedCredentials(credentials);
        const region = signingRegion ?? await this.regionProvider();
        const request = prepareRequest(requestToSign);
        const { longDate, shortDate } = this.formatDate(signingDate);
        const scope = createScope(shortDate, region, signingService ?? this.service);
        request.headers[AMZ_DATE_HEADER] = longDate;
        if (credentials.sessionToken) {
          request.headers[TOKEN_HEADER] = credentials.sessionToken;
        }
        const payloadHash = await getPayloadHash(request, this.sha256);
        if (!hasHeader(SHA256_HEADER, request.headers) && this.applyChecksum) {
          request.headers[SHA256_HEADER] = payloadHash;
        }
        const canonicalHeaders = getCanonicalHeaders(request, unsignableHeaders, signableHeaders);
        const signature = await this.getSignature(longDate, scope, this.getSigningKey(credentials, region, shortDate, signingService), this.createCanonicalRequest(request, canonicalHeaders, payloadHash));
        request.headers[AUTH_HEADER] = `${ALGORITHM_IDENTIFIER} Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${this.getCanonicalHeaderList(canonicalHeaders)}, Signature=${signature}`;
        return request;
      }
      async getSignature(longDate, credentialScope, keyPromise, canonicalRequest) {
        const stringToSign = await this.createStringToSign(longDate, credentialScope, canonicalRequest, ALGORITHM_IDENTIFIER);
        const hash = new this.sha256(await keyPromise);
        hash.update(utilUtf8.toUint8Array(stringToSign));
        return utilHexEncoding.toHex(await hash.digest());
      }
      getSigningKey(credentials, region, shortDate, service) {
        return getSigningKey(this.sha256, credentials, shortDate, region, service || this.service);
      }
    };
    var signatureV4aContainer = {
      SignatureV4a: null
    };
    exports.ALGORITHM_IDENTIFIER = ALGORITHM_IDENTIFIER;
    exports.ALGORITHM_IDENTIFIER_V4A = ALGORITHM_IDENTIFIER_V4A;
    exports.ALGORITHM_QUERY_PARAM = ALGORITHM_QUERY_PARAM;
    exports.ALWAYS_UNSIGNABLE_HEADERS = ALWAYS_UNSIGNABLE_HEADERS;
    exports.AMZ_DATE_HEADER = AMZ_DATE_HEADER;
    exports.AMZ_DATE_QUERY_PARAM = AMZ_DATE_QUERY_PARAM;
    exports.AUTH_HEADER = AUTH_HEADER;
    exports.CREDENTIAL_QUERY_PARAM = CREDENTIAL_QUERY_PARAM;
    exports.DATE_HEADER = DATE_HEADER;
    exports.EVENT_ALGORITHM_IDENTIFIER = EVENT_ALGORITHM_IDENTIFIER;
    exports.EXPIRES_QUERY_PARAM = EXPIRES_QUERY_PARAM;
    exports.GENERATED_HEADERS = GENERATED_HEADERS;
    exports.HOST_HEADER = HOST_HEADER;
    exports.KEY_TYPE_IDENTIFIER = KEY_TYPE_IDENTIFIER;
    exports.MAX_CACHE_SIZE = MAX_CACHE_SIZE;
    exports.MAX_PRESIGNED_TTL = MAX_PRESIGNED_TTL;
    exports.PROXY_HEADER_PATTERN = PROXY_HEADER_PATTERN;
    exports.REGION_SET_PARAM = REGION_SET_PARAM;
    exports.SEC_HEADER_PATTERN = SEC_HEADER_PATTERN;
    exports.SHA256_HEADER = SHA256_HEADER;
    exports.SIGNATURE_HEADER = SIGNATURE_HEADER;
    exports.SIGNATURE_QUERY_PARAM = SIGNATURE_QUERY_PARAM;
    exports.SIGNED_HEADERS_QUERY_PARAM = SIGNED_HEADERS_QUERY_PARAM;
    exports.SignatureV4 = SignatureV42;
    exports.SignatureV4Base = SignatureV4Base;
    exports.TOKEN_HEADER = TOKEN_HEADER;
    exports.TOKEN_QUERY_PARAM = TOKEN_QUERY_PARAM;
    exports.UNSIGNABLE_PATTERNS = UNSIGNABLE_PATTERNS;
    exports.UNSIGNED_PAYLOAD = UNSIGNED_PAYLOAD;
    exports.clearCredentialCache = clearCredentialCache;
    exports.createScope = createScope;
    exports.getCanonicalHeaders = getCanonicalHeaders;
    exports.getCanonicalQuery = getCanonicalQuery;
    exports.getPayloadHash = getPayloadHash;
    exports.getSigningKey = getSigningKey;
    exports.hasHeader = hasHeader;
    exports.moveHeadersToQuery = moveHeadersToQuery;
    exports.prepareRequest = prepareRequest;
    exports.signatureV4aContainer = signatureV4aContainer;
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4Config.js
function normalizeCredentialProvider(config, { credentials, credentialDefaultProvider }) {
  let credentialsProvider;
  if (credentials) {
    if (!credentials?.memoized) {
      credentialsProvider = memoizeIdentityProvider(credentials, isIdentityExpired, doesIdentityRequireRefresh);
    } else {
      credentialsProvider = credentials;
    }
  } else {
    if (credentialDefaultProvider) {
      credentialsProvider = normalizeProvider(credentialDefaultProvider(Object.assign({}, config, {
        parentClientConfig: config
      })));
    } else {
      credentialsProvider = /* @__PURE__ */ __name(async () => {
        throw new Error("@aws-sdk/core::resolveAwsSdkSigV4Config - `credentials` not provided and no credentialDefaultProvider was configured.");
      }, "credentialsProvider");
    }
  }
  credentialsProvider.memoized = true;
  return credentialsProvider;
}
function bindCallerConfig(config, credentialsProvider) {
  if (credentialsProvider.configBound) {
    return credentialsProvider;
  }
  const fn = /* @__PURE__ */ __name(async (options) => credentialsProvider({ ...options, callerClientConfig: config }), "fn");
  fn.memoized = credentialsProvider.memoized;
  fn.configBound = true;
  return fn;
}
var import_signature_v4, resolveAwsSdkSigV4Config, resolveAWSSDKSigV4Config;
var init_resolveAwsSdkSigV4Config = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/resolveAwsSdkSigV4Config.js"() {
    init_esm();
    init_client();
    init_dist_es();
    import_signature_v4 = __toESM(require_dist_cjs30());
    resolveAwsSdkSigV4Config = /* @__PURE__ */ __name((config) => {
      let inputCredentials = config.credentials;
      let isUserSupplied = !!config.credentials;
      let resolvedCredentials = void 0;
      Object.defineProperty(config, "credentials", {
        set(credentials) {
          if (credentials && credentials !== inputCredentials && credentials !== resolvedCredentials) {
            isUserSupplied = true;
          }
          inputCredentials = credentials;
          const memoizedProvider = normalizeCredentialProvider(config, {
            credentials: inputCredentials,
            credentialDefaultProvider: config.credentialDefaultProvider
          });
          const boundProvider = bindCallerConfig(config, memoizedProvider);
          if (isUserSupplied && !boundProvider.attributed) {
            const isCredentialObject = typeof inputCredentials === "object" && inputCredentials !== null;
            resolvedCredentials = /* @__PURE__ */ __name(async (options) => {
              const creds = await boundProvider(options);
              const attributedCreds = creds;
              if (isCredentialObject && (!attributedCreds.$source || Object.keys(attributedCreds.$source).length === 0)) {
                return setCredentialFeature(attributedCreds, "CREDENTIALS_CODE", "e");
              }
              return attributedCreds;
            }, "resolvedCredentials");
            resolvedCredentials.memoized = boundProvider.memoized;
            resolvedCredentials.configBound = boundProvider.configBound;
            resolvedCredentials.attributed = true;
          } else {
            resolvedCredentials = boundProvider;
          }
        },
        get() {
          return resolvedCredentials;
        },
        enumerable: true,
        configurable: true
      });
      config.credentials = inputCredentials;
      const { signingEscapePath = true, systemClockOffset = config.systemClockOffset || 0, sha256 } = config;
      let signer;
      if (config.signer) {
        signer = normalizeProvider(config.signer);
      } else if (config.regionInfoProvider) {
        signer = /* @__PURE__ */ __name(() => normalizeProvider(config.region)().then(async (region) => [
          await config.regionInfoProvider(region, {
            useFipsEndpoint: await config.useFipsEndpoint(),
            useDualstackEndpoint: await config.useDualstackEndpoint()
          }) || {},
          region
        ]).then(([regionInfo, region]) => {
          const { signingRegion, signingService } = regionInfo;
          config.signingRegion = config.signingRegion || signingRegion || region;
          config.signingName = config.signingName || signingService || config.serviceId;
          const params = {
            ...config,
            credentials: config.credentials,
            region: config.signingRegion,
            service: config.signingName,
            sha256,
            uriEscapePath: signingEscapePath
          };
          const SignerCtor = config.signerConstructor || import_signature_v4.SignatureV4;
          return new SignerCtor(params);
        }), "signer");
      } else {
        signer = /* @__PURE__ */ __name(async (authScheme) => {
          authScheme = Object.assign({}, {
            name: "sigv4",
            signingName: config.signingName || config.defaultSigningName,
            signingRegion: await normalizeProvider(config.region)(),
            properties: {}
          }, authScheme);
          const signingRegion = authScheme.signingRegion;
          const signingService = authScheme.signingName;
          config.signingRegion = config.signingRegion || signingRegion;
          config.signingName = config.signingName || signingService || config.serviceId;
          const params = {
            ...config,
            credentials: config.credentials,
            region: config.signingRegion,
            service: config.signingName,
            sha256,
            uriEscapePath: signingEscapePath
          };
          const SignerCtor = config.signerConstructor || import_signature_v4.SignatureV4;
          return new SignerCtor(params);
        }, "signer");
      }
      const resolvedConfig = Object.assign(config, {
        systemClockOffset,
        signingEscapePath,
        signer
      });
      return resolvedConfig;
    }, "resolveAwsSdkSigV4Config");
    resolveAWSSDKSigV4Config = resolveAwsSdkSigV4Config;
    __name(normalizeCredentialProvider, "normalizeCredentialProvider");
    __name(bindCallerConfig, "bindCallerConfig");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/index.js
var init_aws_sdk = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/aws_sdk/index.js"() {
    init_esm();
    init_AwsSdkSigV4Signer();
    init_AwsSdkSigV4ASigner();
    init_NODE_AUTH_SCHEME_PREFERENCE_OPTIONS();
    init_resolveAwsSdkSigV4AConfig();
    init_resolveAwsSdkSigV4Config();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/index.js
var httpAuthSchemes_exports = {};
__export(httpAuthSchemes_exports, {
  AWSSDKSigV4Signer: () => AWSSDKSigV4Signer,
  AwsSdkSigV4ASigner: () => AwsSdkSigV4ASigner,
  AwsSdkSigV4Signer: () => AwsSdkSigV4Signer,
  NODE_AUTH_SCHEME_PREFERENCE_OPTIONS: () => NODE_AUTH_SCHEME_PREFERENCE_OPTIONS,
  NODE_SIGV4A_CONFIG_OPTIONS: () => NODE_SIGV4A_CONFIG_OPTIONS,
  getBearerTokenEnvKey: () => getBearerTokenEnvKey,
  resolveAWSSDKSigV4Config: () => resolveAWSSDKSigV4Config,
  resolveAwsSdkSigV4AConfig: () => resolveAwsSdkSigV4AConfig,
  resolveAwsSdkSigV4Config: () => resolveAwsSdkSigV4Config,
  validateSigningProperties: () => validateSigningProperties
});
var init_httpAuthSchemes2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/httpAuthSchemes/index.js"() {
    init_esm();
    init_aws_sdk();
    init_getBearerTokenEnvKey();
  }
});

// node_modules/@aws-sdk/util-user-agent-node/dist-cjs/index.js
var require_dist_cjs31 = __commonJS({
  "node_modules/@aws-sdk/util-user-agent-node/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var node_os = __require("node:os");
    var node_process = __require("node:process");
    var utilConfigProvider = require_dist_cjs24();
    var promises = __require("node:fs/promises");
    var node_path = __require("node:path");
    var middlewareUserAgent = require_dist_cjs23();
    var getRuntimeUserAgentPair = /* @__PURE__ */ __name(() => {
      const runtimesToCheck = ["deno", "bun", "llrt"];
      for (const runtime of runtimesToCheck) {
        if (node_process.versions[runtime]) {
          return [`md/${runtime}`, node_process.versions[runtime]];
        }
      }
      return ["md/nodejs", node_process.versions.node];
    }, "getRuntimeUserAgentPair");
    var getNodeModulesParentDirs = /* @__PURE__ */ __name((dirname) => {
      const cwd = process.cwd();
      if (!dirname) {
        return [cwd];
      }
      const normalizedPath = node_path.normalize(dirname);
      const parts = normalizedPath.split(node_path.sep);
      const nodeModulesIndex = parts.indexOf("node_modules");
      const parentDir = nodeModulesIndex !== -1 ? parts.slice(0, nodeModulesIndex).join(node_path.sep) : normalizedPath;
      if (cwd === parentDir) {
        return [cwd];
      }
      return [parentDir, cwd];
    }, "getNodeModulesParentDirs");
    var SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/;
    var getSanitizedTypeScriptVersion = /* @__PURE__ */ __name((version = "") => {
      const match = version.match(SEMVER_REGEX);
      if (!match) {
        return void 0;
      }
      const [major, minor, patch, prerelease] = [match[1], match[2], match[3], match[4]];
      return prerelease ? `${major}.${minor}.${patch}-${prerelease}` : `${major}.${minor}.${patch}`;
    }, "getSanitizedTypeScriptVersion");
    var ALLOWED_PREFIXES = ["^", "~", ">=", "<=", ">", "<"];
    var ALLOWED_DIST_TAGS = ["latest", "beta", "dev", "rc", "insiders", "next"];
    var getSanitizedDevTypeScriptVersion = /* @__PURE__ */ __name((version = "") => {
      if (ALLOWED_DIST_TAGS.includes(version)) {
        return version;
      }
      const prefix = ALLOWED_PREFIXES.find((p) => version.startsWith(p)) ?? "";
      const sanitizedTypeScriptVersion = getSanitizedTypeScriptVersion(version.slice(prefix.length));
      if (!sanitizedTypeScriptVersion) {
        return void 0;
      }
      return `${prefix}${sanitizedTypeScriptVersion}`;
    }, "getSanitizedDevTypeScriptVersion");
    var tscVersion;
    var TS_PACKAGE_JSON = node_path.join("node_modules", "typescript", "package.json");
    var getTypeScriptUserAgentPair = /* @__PURE__ */ __name(async () => {
      if (tscVersion === null) {
        return void 0;
      } else if (typeof tscVersion === "string") {
        return ["md/tsc", tscVersion];
      }
      let isTypeScriptDetectionDisabled = false;
      try {
        isTypeScriptDetectionDisabled = utilConfigProvider.booleanSelector(process.env, "AWS_SDK_JS_TYPESCRIPT_DETECTION_DISABLED", utilConfigProvider.SelectorType.ENV) || false;
      } catch {
      }
      if (isTypeScriptDetectionDisabled) {
        tscVersion = null;
        return void 0;
      }
      const dirname = typeof __dirname !== "undefined" ? __dirname : void 0;
      const nodeModulesParentDirs = getNodeModulesParentDirs(dirname);
      let versionFromApp;
      for (const nodeModulesParentDir of nodeModulesParentDirs) {
        try {
          const appPackageJsonPath = node_path.join(nodeModulesParentDir, "package.json");
          const packageJson = await promises.readFile(appPackageJsonPath, "utf-8");
          const { dependencies, devDependencies } = JSON.parse(packageJson);
          const version = devDependencies?.typescript ?? dependencies?.typescript;
          if (typeof version !== "string") {
            continue;
          }
          versionFromApp = version;
          break;
        } catch {
        }
      }
      if (!versionFromApp) {
        tscVersion = null;
        return void 0;
      }
      let versionFromNodeModules;
      for (const nodeModulesParentDir of nodeModulesParentDirs) {
        try {
          const tsPackageJsonPath = node_path.join(nodeModulesParentDir, TS_PACKAGE_JSON);
          const packageJson = await promises.readFile(tsPackageJsonPath, "utf-8");
          const { version } = JSON.parse(packageJson);
          const sanitizedVersion2 = getSanitizedTypeScriptVersion(version);
          if (typeof sanitizedVersion2 !== "string") {
            continue;
          }
          versionFromNodeModules = sanitizedVersion2;
          break;
        } catch {
        }
      }
      if (versionFromNodeModules) {
        tscVersion = versionFromNodeModules;
        return ["md/tsc", tscVersion];
      }
      const sanitizedVersion = getSanitizedDevTypeScriptVersion(versionFromApp);
      if (typeof sanitizedVersion !== "string") {
        tscVersion = null;
        return void 0;
      }
      tscVersion = `dev_${sanitizedVersion}`;
      return ["md/tsc", tscVersion];
    }, "getTypeScriptUserAgentPair");
    var crtAvailability = {
      isCrtAvailable: false
    };
    var isCrtAvailable = /* @__PURE__ */ __name(() => {
      if (crtAvailability.isCrtAvailable) {
        return ["md/crt-avail"];
      }
      return null;
    }, "isCrtAvailable");
    var createDefaultUserAgentProvider = /* @__PURE__ */ __name(({ serviceId, clientVersion }) => {
      const runtimeUserAgentPair = getRuntimeUserAgentPair();
      return async (config) => {
        const sections = [
          ["aws-sdk-js", clientVersion],
          ["ua", "2.1"],
          [`os/${node_os.platform()}`, node_os.release()],
          ["lang/js"],
          runtimeUserAgentPair
        ];
        const typescriptUserAgentPair = await getTypeScriptUserAgentPair();
        if (typescriptUserAgentPair) {
          sections.push(typescriptUserAgentPair);
        }
        const crtAvailable = isCrtAvailable();
        if (crtAvailable) {
          sections.push(crtAvailable);
        }
        if (serviceId) {
          sections.push([`api/${serviceId}`, clientVersion]);
        }
        if (node_process.env.AWS_EXECUTION_ENV) {
          sections.push([`exec-env/${node_process.env.AWS_EXECUTION_ENV}`]);
        }
        const appId = await config?.userAgentAppId?.();
        const resolvedUserAgent = appId ? [...sections, [`app/${appId}`]] : [...sections];
        return resolvedUserAgent;
      };
    }, "createDefaultUserAgentProvider");
    var defaultUserAgent = createDefaultUserAgentProvider;
    var UA_APP_ID_ENV_NAME = "AWS_SDK_UA_APP_ID";
    var UA_APP_ID_INI_NAME = "sdk_ua_app_id";
    var UA_APP_ID_INI_NAME_DEPRECATED = "sdk-ua-app-id";
    var NODE_APP_ID_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => env[UA_APP_ID_ENV_NAME], "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => profile[UA_APP_ID_INI_NAME] ?? profile[UA_APP_ID_INI_NAME_DEPRECATED], "configFileSelector"),
      default: middlewareUserAgent.DEFAULT_UA_APP_ID
    };
    exports.NODE_APP_ID_CONFIG_OPTIONS = NODE_APP_ID_CONFIG_OPTIONS;
    exports.UA_APP_ID_ENV_NAME = UA_APP_ID_ENV_NAME;
    exports.UA_APP_ID_INI_NAME = UA_APP_ID_INI_NAME;
    exports.createDefaultUserAgentProvider = createDefaultUserAgentProvider;
    exports.crtAvailability = crtAvailability;
    exports.defaultUserAgent = defaultUserAgent;
  }
});

// node_modules/@smithy/hash-node/dist-cjs/index.js
var require_dist_cjs32 = __commonJS({
  "node_modules/@smithy/hash-node/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var utilBufferFrom = require_dist_cjs6();
    var utilUtf8 = require_dist_cjs7();
    var buffer = __require("buffer");
    var crypto = __require("crypto");
    var Hash = class {
      static {
        __name(this, "Hash");
      }
      algorithmIdentifier;
      secret;
      hash;
      constructor(algorithmIdentifier, secret) {
        this.algorithmIdentifier = algorithmIdentifier;
        this.secret = secret;
        this.reset();
      }
      update(toHash, encoding) {
        this.hash.update(utilUtf8.toUint8Array(castSourceData(toHash, encoding)));
      }
      digest() {
        return Promise.resolve(this.hash.digest());
      }
      reset() {
        this.hash = this.secret ? crypto.createHmac(this.algorithmIdentifier, castSourceData(this.secret)) : crypto.createHash(this.algorithmIdentifier);
      }
    };
    function castSourceData(toCast, encoding) {
      if (buffer.Buffer.isBuffer(toCast)) {
        return toCast;
      }
      if (typeof toCast === "string") {
        return utilBufferFrom.fromString(toCast, encoding);
      }
      if (ArrayBuffer.isView(toCast)) {
        return utilBufferFrom.fromArrayBuffer(toCast.buffer, toCast.byteOffset, toCast.byteLength);
      }
      return utilBufferFrom.fromArrayBuffer(toCast);
    }
    __name(castSourceData, "castSourceData");
    exports.Hash = Hash;
  }
});

// node_modules/@smithy/util-body-length-node/dist-cjs/index.js
var require_dist_cjs33 = __commonJS({
  "node_modules/@smithy/util-body-length-node/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var node_fs = __require("node:fs");
    var calculateBodyLength = /* @__PURE__ */ __name((body) => {
      if (!body) {
        return 0;
      }
      if (typeof body === "string") {
        return Buffer.byteLength(body);
      } else if (typeof body.byteLength === "number") {
        return body.byteLength;
      } else if (typeof body.size === "number") {
        return body.size;
      } else if (typeof body.start === "number" && typeof body.end === "number") {
        return body.end + 1 - body.start;
      } else if (body instanceof node_fs.ReadStream) {
        if (body.path != null) {
          return node_fs.lstatSync(body.path).size;
        } else if (typeof body.fd === "number") {
          return node_fs.fstatSync(body.fd).size;
        }
      }
      throw new Error(`Body Length computation failed for ${body}`);
    }, "calculateBodyLength");
    exports.calculateBodyLength = calculateBodyLength;
  }
});

// node_modules/@smithy/util-defaults-mode-node/dist-cjs/index.js
var require_dist_cjs34 = __commonJS({
  "node_modules/@smithy/util-defaults-mode-node/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var configResolver = require_dist_cjs25();
    var nodeConfigProvider = require_dist_cjs17();
    var propertyProvider = require_dist_cjs15();
    var AWS_EXECUTION_ENV = "AWS_EXECUTION_ENV";
    var AWS_REGION_ENV = "AWS_REGION";
    var AWS_DEFAULT_REGION_ENV = "AWS_DEFAULT_REGION";
    var ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
    var DEFAULTS_MODE_OPTIONS = ["in-region", "cross-region", "mobile", "standard", "legacy"];
    var IMDS_REGION_PATH = "/latest/meta-data/placement/region";
    var AWS_DEFAULTS_MODE_ENV = "AWS_DEFAULTS_MODE";
    var AWS_DEFAULTS_MODE_CONFIG = "defaults_mode";
    var NODE_DEFAULTS_MODE_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => {
        return env[AWS_DEFAULTS_MODE_ENV];
      }, "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => {
        return profile[AWS_DEFAULTS_MODE_CONFIG];
      }, "configFileSelector"),
      default: "legacy"
    };
    var resolveDefaultsModeConfig = /* @__PURE__ */ __name(({ region = nodeConfigProvider.loadConfig(configResolver.NODE_REGION_CONFIG_OPTIONS), defaultsMode = nodeConfigProvider.loadConfig(NODE_DEFAULTS_MODE_CONFIG_OPTIONS) } = {}) => propertyProvider.memoize(async () => {
      const mode = typeof defaultsMode === "function" ? await defaultsMode() : defaultsMode;
      switch (mode?.toLowerCase()) {
        case "auto":
          return resolveNodeDefaultsModeAuto(region);
        case "in-region":
        case "cross-region":
        case "mobile":
        case "standard":
        case "legacy":
          return Promise.resolve(mode?.toLocaleLowerCase());
        case void 0:
          return Promise.resolve("legacy");
        default:
          throw new Error(`Invalid parameter for "defaultsMode", expect ${DEFAULTS_MODE_OPTIONS.join(", ")}, got ${mode}`);
      }
    }), "resolveDefaultsModeConfig");
    var resolveNodeDefaultsModeAuto = /* @__PURE__ */ __name(async (clientRegion) => {
      if (clientRegion) {
        const resolvedRegion = typeof clientRegion === "function" ? await clientRegion() : clientRegion;
        const inferredRegion = await inferPhysicalRegion();
        if (!inferredRegion) {
          return "standard";
        }
        if (resolvedRegion === inferredRegion) {
          return "in-region";
        } else {
          return "cross-region";
        }
      }
      return "standard";
    }, "resolveNodeDefaultsModeAuto");
    var inferPhysicalRegion = /* @__PURE__ */ __name(async () => {
      if (process.env[AWS_EXECUTION_ENV] && (process.env[AWS_REGION_ENV] || process.env[AWS_DEFAULT_REGION_ENV])) {
        return process.env[AWS_REGION_ENV] ?? process.env[AWS_DEFAULT_REGION_ENV];
      }
      if (!process.env[ENV_IMDS_DISABLED]) {
        try {
          const { getInstanceMetadataEndpoint, httpRequest } = await import("./dist-cjs-HMVR4K7Y.mjs");
          const endpoint = await getInstanceMetadataEndpoint();
          return (await httpRequest({ ...endpoint, path: IMDS_REGION_PATH })).toString();
        } catch (e) {
        }
      }
    }, "inferPhysicalRegion");
    exports.resolveDefaultsModeConfig = resolveDefaultsModeConfig;
  }
});

// node_modules/@aws-sdk/region-config-resolver/dist-cjs/regionConfig/stsRegionDefaultResolver.js
var require_stsRegionDefaultResolver = __commonJS({
  "node_modules/@aws-sdk/region-config-resolver/dist-cjs/regionConfig/stsRegionDefaultResolver.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.warning = void 0;
    exports.stsRegionDefaultResolver = stsRegionDefaultResolver;
    var config_resolver_1 = require_dist_cjs25();
    var node_config_provider_1 = require_dist_cjs17();
    function stsRegionDefaultResolver(loaderConfig = {}) {
      return (0, node_config_provider_1.loadConfig)({
        ...config_resolver_1.NODE_REGION_CONFIG_OPTIONS,
        async default() {
          if (!exports.warning.silence) {
            console.warn("@aws-sdk - WARN - default STS region of us-east-1 used. See @aws-sdk/credential-providers README and set a region explicitly.");
          }
          return "us-east-1";
        }
      }, { ...config_resolver_1.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig });
    }
    __name(stsRegionDefaultResolver, "stsRegionDefaultResolver");
    exports.warning = {
      silence: false
    };
  }
});

// node_modules/@aws-sdk/region-config-resolver/dist-cjs/index.js
var require_dist_cjs35 = __commonJS({
  "node_modules/@aws-sdk/region-config-resolver/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var stsRegionDefaultResolver = require_stsRegionDefaultResolver();
    var configResolver = require_dist_cjs25();
    var getAwsRegionExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      return {
        setRegion(region) {
          runtimeConfig.region = region;
        },
        region() {
          return runtimeConfig.region;
        }
      };
    }, "getAwsRegionExtensionConfiguration");
    var resolveAwsRegionExtensionConfiguration = /* @__PURE__ */ __name((awsRegionExtensionConfiguration) => {
      return {
        region: awsRegionExtensionConfiguration.region()
      };
    }, "resolveAwsRegionExtensionConfiguration");
    exports.NODE_REGION_CONFIG_FILE_OPTIONS = configResolver.NODE_REGION_CONFIG_FILE_OPTIONS;
    exports.NODE_REGION_CONFIG_OPTIONS = configResolver.NODE_REGION_CONFIG_OPTIONS;
    exports.REGION_ENV_NAME = configResolver.REGION_ENV_NAME;
    exports.REGION_INI_NAME = configResolver.REGION_INI_NAME;
    exports.resolveRegionConfig = configResolver.resolveRegionConfig;
    exports.getAwsRegionExtensionConfiguration = getAwsRegionExtensionConfiguration;
    exports.resolveAwsRegionExtensionConfiguration = resolveAwsRegionExtensionConfiguration;
    Object.prototype.hasOwnProperty.call(stsRegionDefaultResolver, "__proto__") && !Object.prototype.hasOwnProperty.call(exports, "__proto__") && Object.defineProperty(exports, "__proto__", {
      enumerable: true,
      value: stsRegionDefaultResolver["__proto__"]
    });
    Object.keys(stsRegionDefaultResolver).forEach(function(k) {
      if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = stsRegionDefaultResolver[k];
    });
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/ProtocolLib.js
var import_smithy_client, ProtocolLib;
var init_ProtocolLib = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/ProtocolLib.js"() {
    init_esm();
    init_schema();
    import_smithy_client = __toESM(require_dist_cjs14());
    ProtocolLib = class {
      static {
        __name(this, "ProtocolLib");
      }
      queryCompat;
      errorRegistry;
      constructor(queryCompat = false) {
        this.queryCompat = queryCompat;
      }
      resolveRestContentType(defaultContentType, inputSchema) {
        const members = inputSchema.getMemberSchemas();
        const httpPayloadMember = Object.values(members).find((m) => {
          return !!m.getMergedTraits().httpPayload;
        });
        if (httpPayloadMember) {
          const mediaType = httpPayloadMember.getMergedTraits().mediaType;
          if (mediaType) {
            return mediaType;
          } else if (httpPayloadMember.isStringSchema()) {
            return "text/plain";
          } else if (httpPayloadMember.isBlobSchema()) {
            return "application/octet-stream";
          } else {
            return defaultContentType;
          }
        } else if (!inputSchema.isUnitSchema()) {
          const hasBody = Object.values(members).find((m) => {
            const { httpQuery, httpQueryParams, httpHeader, httpLabel, httpPrefixHeaders } = m.getMergedTraits();
            const noPrefixHeaders = httpPrefixHeaders === void 0;
            return !httpQuery && !httpQueryParams && !httpHeader && !httpLabel && noPrefixHeaders;
          });
          if (hasBody) {
            return defaultContentType;
          }
        }
      }
      async getErrorSchemaOrThrowBaseException(errorIdentifier, defaultNamespace, response, dataObject, metadata, getErrorSchema) {
        let errorName = errorIdentifier;
        if (errorIdentifier.includes("#")) {
          [, errorName] = errorIdentifier.split("#");
        }
        const errorMetadata = {
          $metadata: metadata,
          $fault: response.statusCode < 500 ? "client" : "server"
        };
        if (!this.errorRegistry) {
          throw new Error("@aws-sdk/core/protocols - error handler not initialized.");
        }
        try {
          const errorSchema = getErrorSchema?.(this.errorRegistry, errorName) ?? this.errorRegistry.getSchema(errorIdentifier);
          return { errorSchema, errorMetadata };
        } catch (e) {
          dataObject.message = dataObject.message ?? dataObject.Message ?? "UnknownError";
          const synthetic = this.errorRegistry;
          const baseExceptionSchema = synthetic.getBaseException();
          if (baseExceptionSchema) {
            const ErrorCtor = synthetic.getErrorCtor(baseExceptionSchema) ?? Error;
            throw this.decorateServiceException(Object.assign(new ErrorCtor({ name: errorName }), errorMetadata), dataObject);
          }
          const d = dataObject;
          const message = d?.message ?? d?.Message ?? d?.Error?.Message ?? d?.Error?.message;
          throw this.decorateServiceException(Object.assign(new Error(message), {
            name: errorName
          }, errorMetadata), dataObject);
        }
      }
      compose(composite, errorIdentifier, defaultNamespace) {
        let namespace = defaultNamespace;
        if (errorIdentifier.includes("#")) {
          [namespace] = errorIdentifier.split("#");
        }
        const staticRegistry = TypeRegistry.for(namespace);
        const defaultSyntheticRegistry = TypeRegistry.for("smithy.ts.sdk.synthetic." + defaultNamespace);
        composite.copyFrom(staticRegistry);
        composite.copyFrom(defaultSyntheticRegistry);
        this.errorRegistry = composite;
      }
      decorateServiceException(exception, additions = {}) {
        if (this.queryCompat) {
          const msg = exception.Message ?? additions.Message;
          const error = (0, import_smithy_client.decorateServiceException)(exception, additions);
          if (msg) {
            error.message = msg;
          }
          const errorObj = error.Error ?? {};
          errorObj.Type = error.Error?.Type;
          errorObj.Code = error.Error?.Code;
          errorObj.Message = error.Error?.message ?? error.Error?.Message ?? msg;
          error.Error = errorObj;
          const reqId = error.$metadata.requestId;
          if (reqId) {
            error.RequestId = reqId;
          }
          return error;
        }
        return (0, import_smithy_client.decorateServiceException)(exception, additions);
      }
      setQueryCompatError(output, response) {
        const queryErrorHeader = response.headers?.["x-amzn-query-error"];
        if (output !== void 0 && queryErrorHeader != null) {
          const [Code, Type] = queryErrorHeader.split(";");
          const keys = Object.keys(output);
          const Error2 = {
            Code,
            Type
          };
          output.Code = Code;
          output.Type = Type;
          for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            Error2[k === "message" ? "Message" : k] = output[k];
          }
          delete Error2.__type;
          output.Error = Error2;
        }
      }
      queryCompatOutput(queryCompatErrorData, errorData) {
        if (queryCompatErrorData.Error) {
          errorData.Error = queryCompatErrorData.Error;
        }
        if (queryCompatErrorData.Type) {
          errorData.Type = queryCompatErrorData.Type;
        }
        if (queryCompatErrorData.Code) {
          errorData.Code = queryCompatErrorData.Code;
        }
      }
      findQueryCompatibleError(registry, errorName) {
        try {
          return registry.getSchema(errorName);
        } catch (e) {
          return registry.find((schema) => NormalizedSchema.of(schema).getMergedTraits().awsQueryError?.[0] === errorName);
        }
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/ConfigurableSerdeContext.js
var SerdeContextConfig;
var init_ConfigurableSerdeContext = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/ConfigurableSerdeContext.js"() {
    init_esm();
    SerdeContextConfig = class {
      static {
        __name(this, "SerdeContextConfig");
      }
      serdeContext;
      setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/UnionSerde.js
var UnionSerde;
var init_UnionSerde = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/UnionSerde.js"() {
    init_esm();
    UnionSerde = class {
      static {
        __name(this, "UnionSerde");
      }
      from;
      to;
      keys;
      constructor(from, to) {
        this.from = from;
        this.to = to;
        const keys = Object.keys(this.from);
        const set = new Set(keys);
        set.delete("__type");
        this.keys = set;
      }
      mark(key) {
        this.keys.delete(key);
      }
      hasUnknown() {
        return this.keys.size === 1 && Object.keys(this.to).length === 0;
      }
      writeUnknown() {
        if (this.hasUnknown()) {
          const k = this.keys.values().next().value;
          const v = this.from[k];
          this.to.$unknown = [k, v];
        }
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/jsonReviver.js
function jsonReviver(key, value, context) {
  if (context?.source) {
    const numericString = context.source;
    if (typeof value === "number") {
      if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER || numericString !== String(value)) {
        const isFractional = numericString.includes(".");
        if (isFractional) {
          return new NumericValue(numericString, "bigDecimal");
        } else {
          return BigInt(numericString);
        }
      }
    }
  }
  return value;
}
var init_jsonReviver = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/jsonReviver.js"() {
    init_esm();
    init_serde();
    __name(jsonReviver, "jsonReviver");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/common.js
var import_smithy_client2, import_util_utf8, collectBodyString;
var init_common = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/common.js"() {
    init_esm();
    import_smithy_client2 = __toESM(require_dist_cjs14());
    import_util_utf8 = __toESM(require_dist_cjs7());
    collectBodyString = /* @__PURE__ */ __name((streamBody, context) => (0, import_smithy_client2.collectBody)(streamBody, context).then((body) => (context?.utf8Encoder ?? import_util_utf8.toUtf8)(body)), "collectBodyString");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/parseJsonBody.js
var parseJsonBody, parseJsonErrorBody, findKey, sanitizeErrorCode, loadRestJsonErrorCode;
var init_parseJsonBody = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/parseJsonBody.js"() {
    init_esm();
    init_common();
    parseJsonBody = /* @__PURE__ */ __name((streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
      if (encoded.length) {
        try {
          return JSON.parse(encoded);
        } catch (e) {
          if (e?.name === "SyntaxError") {
            Object.defineProperty(e, "$responseBodyText", {
              value: encoded
            });
          }
          throw e;
        }
      }
      return {};
    }), "parseJsonBody");
    parseJsonErrorBody = /* @__PURE__ */ __name(async (errorBody, context) => {
      const value = await parseJsonBody(errorBody, context);
      value.message = value.message ?? value.Message;
      return value;
    }, "parseJsonErrorBody");
    findKey = /* @__PURE__ */ __name((object, key) => Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase()), "findKey");
    sanitizeErrorCode = /* @__PURE__ */ __name((rawValue) => {
      let cleanValue = rawValue;
      if (typeof cleanValue === "number") {
        cleanValue = cleanValue.toString();
      }
      if (cleanValue.indexOf(",") >= 0) {
        cleanValue = cleanValue.split(",")[0];
      }
      if (cleanValue.indexOf(":") >= 0) {
        cleanValue = cleanValue.split(":")[0];
      }
      if (cleanValue.indexOf("#") >= 0) {
        cleanValue = cleanValue.split("#")[1];
      }
      return cleanValue;
    }, "sanitizeErrorCode");
    loadRestJsonErrorCode = /* @__PURE__ */ __name((output, data2) => {
      const headerKey = findKey(output.headers, "x-amzn-errortype");
      if (headerKey !== void 0) {
        return sanitizeErrorCode(output.headers[headerKey]);
      }
      if (data2 && typeof data2 === "object") {
        const codeKey = findKey(data2, "code");
        if (codeKey && data2[codeKey] !== void 0) {
          return sanitizeErrorCode(data2[codeKey]);
        }
        if (data2["__type"] !== void 0) {
          return sanitizeErrorCode(data2["__type"]);
        }
      }
    }, "loadRestJsonErrorCode");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/JsonShapeDeserializer.js
var import_util_base64, JsonShapeDeserializer;
var init_JsonShapeDeserializer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/JsonShapeDeserializer.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_serde();
    import_util_base64 = __toESM(require_dist_cjs8());
    init_ConfigurableSerdeContext();
    init_UnionSerde();
    init_jsonReviver();
    init_parseJsonBody();
    JsonShapeDeserializer = class extends SerdeContextConfig {
      static {
        __name(this, "JsonShapeDeserializer");
      }
      settings;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      async read(schema, data2) {
        return this._read(schema, typeof data2 === "string" ? JSON.parse(data2, jsonReviver) : await parseJsonBody(data2, this.serdeContext));
      }
      readObject(schema, data2) {
        return this._read(schema, data2);
      }
      _read(schema, value) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        if (isObject) {
          if (ns.isStructSchema()) {
            const record = value;
            const union = ns.isUnionSchema();
            const out = {};
            let nameMap = void 0;
            const { jsonName } = this.settings;
            if (jsonName) {
              nameMap = {};
            }
            let unionSerde;
            if (union) {
              unionSerde = new UnionSerde(record, out);
            }
            for (const [memberName, memberSchema] of ns.structIterator()) {
              let fromKey = memberName;
              if (jsonName) {
                fromKey = memberSchema.getMergedTraits().jsonName ?? fromKey;
                nameMap[fromKey] = memberName;
              }
              if (union) {
                unionSerde.mark(fromKey);
              }
              if (record[fromKey] != null) {
                out[memberName] = this._read(memberSchema, record[fromKey]);
              }
            }
            if (union) {
              unionSerde.writeUnknown();
            } else if (typeof record.__type === "string") {
              for (const k in record) {
                const v = record[k];
                const t = jsonName ? nameMap[k] ?? k : k;
                if (!(t in out)) {
                  out[t] = v;
                }
              }
            }
            return out;
          }
          if (Array.isArray(value) && ns.isListSchema()) {
            const listMember = ns.getValueSchema();
            const out = [];
            for (const item of value) {
              out.push(this._read(listMember, item));
            }
            return out;
          }
          if (ns.isMapSchema()) {
            const mapMember = ns.getValueSchema();
            const out = {};
            for (const _k in value) {
              out[_k] = this._read(mapMember, value[_k]);
            }
            return out;
          }
        }
        if (ns.isBlobSchema() && typeof value === "string") {
          return (0, import_util_base64.fromBase64)(value);
        }
        const mediaType = ns.getMergedTraits().mediaType;
        if (ns.isStringSchema() && typeof value === "string" && mediaType) {
          const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
          if (isJson) {
            return LazyJsonString.from(value);
          }
          return value;
        }
        if (ns.isTimestampSchema() && value != null) {
          const format = determineTimestampFormat(ns, this.settings);
          switch (format) {
            case 5:
              return parseRfc3339DateTimeWithOffset(value);
            case 6:
              return parseRfc7231DateTime(value);
            case 7:
              return parseEpochTimestamp(value);
            default:
              console.warn("Missing timestamp format, parsing value with Date constructor:", value);
              return new Date(value);
          }
        }
        if (ns.isBigIntegerSchema() && (typeof value === "number" || typeof value === "string")) {
          return BigInt(value);
        }
        if (ns.isBigDecimalSchema() && value != void 0) {
          if (value instanceof NumericValue) {
            return value;
          }
          const untyped = value;
          if (untyped.type === "bigDecimal" && "string" in untyped) {
            return new NumericValue(untyped.string, untyped.type);
          }
          return new NumericValue(String(value), "bigDecimal");
        }
        if (ns.isNumericSchema() && typeof value === "string") {
          switch (value) {
            case "Infinity":
              return Infinity;
            case "-Infinity":
              return -Infinity;
            case "NaN":
              return NaN;
          }
          return value;
        }
        if (ns.isDocumentSchema()) {
          if (isObject) {
            const out = Array.isArray(value) ? [] : {};
            for (const k in value) {
              const v = value[k];
              if (v instanceof NumericValue) {
                out[k] = v;
              } else {
                out[k] = this._read(ns, v);
              }
            }
            return out;
          } else {
            return structuredClone(value);
          }
        }
        return value;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/jsonReplacer.js
var NUMERIC_CONTROL_CHAR, JsonReplacer;
var init_jsonReplacer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/jsonReplacer.js"() {
    init_esm();
    init_serde();
    NUMERIC_CONTROL_CHAR = String.fromCharCode(925);
    JsonReplacer = class {
      static {
        __name(this, "JsonReplacer");
      }
      values = /* @__PURE__ */ new Map();
      counter = 0;
      stage = 0;
      createReplacer() {
        if (this.stage === 1) {
          throw new Error("@aws-sdk/core/protocols - JsonReplacer already created.");
        }
        if (this.stage === 2) {
          throw new Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
        }
        this.stage = 1;
        return (key, value) => {
          if (value instanceof NumericValue) {
            const v = `${NUMERIC_CONTROL_CHAR + "nv" + this.counter++}_` + value.string;
            this.values.set(`"${v}"`, value.string);
            return v;
          }
          if (typeof value === "bigint") {
            const s = value.toString();
            const v = `${NUMERIC_CONTROL_CHAR + "b" + this.counter++}_` + s;
            this.values.set(`"${v}"`, s);
            return v;
          }
          return value;
        };
      }
      replaceInJson(json) {
        if (this.stage === 0) {
          throw new Error("@aws-sdk/core/protocols - JsonReplacer not created yet.");
        }
        if (this.stage === 2) {
          throw new Error("@aws-sdk/core/protocols - JsonReplacer exhausted.");
        }
        this.stage = 2;
        if (this.counter === 0) {
          return json;
        }
        for (const [key, value] of this.values) {
          json = json.replace(key, value);
        }
        return json;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/JsonShapeSerializer.js
var import_util_base642, JsonShapeSerializer;
var init_JsonShapeSerializer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/JsonShapeSerializer.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_serde();
    import_util_base642 = __toESM(require_dist_cjs8());
    init_ConfigurableSerdeContext();
    init_jsonReplacer();
    JsonShapeSerializer = class extends SerdeContextConfig {
      static {
        __name(this, "JsonShapeSerializer");
      }
      settings;
      buffer;
      useReplacer = false;
      rootSchema;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      write(schema, value) {
        this.rootSchema = NormalizedSchema.of(schema);
        this.buffer = this._write(this.rootSchema, value);
      }
      flush() {
        const { rootSchema, useReplacer } = this;
        this.rootSchema = void 0;
        this.useReplacer = false;
        if (rootSchema?.isStructSchema() || rootSchema?.isDocumentSchema()) {
          if (!useReplacer) {
            return JSON.stringify(this.buffer);
          }
          const replacer = new JsonReplacer();
          return replacer.replaceInJson(JSON.stringify(this.buffer, replacer.createReplacer(), 0));
        }
        return this.buffer;
      }
      writeDiscriminatedDocument(schema, value) {
        this.write(schema, value);
        if (typeof this.buffer === "object") {
          this.buffer.__type = NormalizedSchema.of(schema).getName(true);
        }
      }
      _write(schema, value, container) {
        const isObject = value !== null && typeof value === "object";
        const ns = NormalizedSchema.of(schema);
        if (isObject) {
          if (ns.isStructSchema()) {
            const record = value;
            const out = {};
            const { jsonName } = this.settings;
            let nameMap = void 0;
            if (jsonName) {
              nameMap = {};
            }
            let outCount = 0;
            for (const [memberName, memberSchema] of ns.structIterator()) {
              const serializableValue = this._write(memberSchema, record[memberName], ns);
              if (serializableValue !== void 0) {
                let targetKey = memberName;
                if (jsonName) {
                  targetKey = memberSchema.getMergedTraits().jsonName ?? memberName;
                  nameMap[memberName] = targetKey;
                }
                out[targetKey] = serializableValue;
                outCount++;
              }
            }
            if (ns.isUnionSchema() && outCount === 0) {
              const { $unknown } = record;
              if (Array.isArray($unknown)) {
                const [k, v] = $unknown;
                out[k] = this._write(15, v);
              }
            } else if (typeof record.__type === "string") {
              for (const k in record) {
                const v = record[k];
                const targetKey = jsonName ? nameMap[k] ?? k : k;
                if (!(targetKey in out)) {
                  out[targetKey] = this._write(15, v);
                }
              }
            }
            return out;
          }
          if (Array.isArray(value) && ns.isListSchema()) {
            const listMember = ns.getValueSchema();
            const out = [];
            const sparse = !!ns.getMergedTraits().sparse;
            for (const item of value) {
              if (sparse || item != null) {
                out.push(this._write(listMember, item));
              }
            }
            return out;
          }
          if (ns.isMapSchema()) {
            const mapMember = ns.getValueSchema();
            const out = {};
            const sparse = !!ns.getMergedTraits().sparse;
            for (const _k in value) {
              const _v = value[_k];
              if (sparse || _v != null) {
                out[_k] = this._write(mapMember, _v);
              }
            }
            return out;
          }
          if (value instanceof Uint8Array && (ns.isBlobSchema() || ns.isDocumentSchema())) {
            if (ns === this.rootSchema) {
              return value;
            }
            return (this.serdeContext?.base64Encoder ?? import_util_base642.toBase64)(value);
          }
          if (value instanceof Date && (ns.isTimestampSchema() || ns.isDocumentSchema())) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
              case 5:
                return value.toISOString().replace(".000Z", "Z");
              case 6:
                return dateToUtcString(value);
              case 7:
                return value.getTime() / 1e3;
              default:
                console.warn("Missing timestamp format, using epoch seconds", value);
                return value.getTime() / 1e3;
            }
          }
          if (value instanceof NumericValue) {
            this.useReplacer = true;
          }
        }
        if (value === null && container?.isStructSchema()) {
          return void 0;
        }
        if (ns.isStringSchema()) {
          if (typeof value === "undefined" && ns.isIdempotencyToken()) {
            return (0, import_uuid.v4)();
          }
          const mediaType = ns.getMergedTraits().mediaType;
          if (value != null && mediaType) {
            const isJson = mediaType === "application/json" || mediaType.endsWith("+json");
            if (isJson) {
              return LazyJsonString.from(value);
            }
          }
          return value;
        }
        if (typeof value === "number" && ns.isNumericSchema()) {
          if (Math.abs(value) === Infinity || isNaN(value)) {
            return String(value);
          }
          return value;
        }
        if (typeof value === "string" && ns.isBlobSchema()) {
          if (ns === this.rootSchema) {
            return value;
          }
          return (this.serdeContext?.base64Encoder ?? import_util_base642.toBase64)(value);
        }
        if (typeof value === "bigint") {
          this.useReplacer = true;
        }
        if (ns.isDocumentSchema()) {
          if (isObject) {
            const out = Array.isArray(value) ? [] : {};
            for (const k in value) {
              const v = value[k];
              if (v instanceof NumericValue) {
                this.useReplacer = true;
                out[k] = v;
              } else {
                out[k] = this._write(ns, v);
              }
            }
            return out;
          } else {
            return structuredClone(value);
          }
        }
        return value;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/JsonCodec.js
var JsonCodec;
var init_JsonCodec = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/JsonCodec.js"() {
    init_esm();
    init_ConfigurableSerdeContext();
    init_JsonShapeDeserializer();
    init_JsonShapeSerializer();
    JsonCodec = class extends SerdeContextConfig {
      static {
        __name(this, "JsonCodec");
      }
      settings;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      createSerializer() {
        const serializer = new JsonShapeSerializer(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
      }
      createDeserializer() {
        const deserializer = new JsonShapeDeserializer(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsRestJsonProtocol.js
var AwsRestJsonProtocol;
var init_AwsRestJsonProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsRestJsonProtocol.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_ProtocolLib();
    init_JsonCodec();
    init_parseJsonBody();
    AwsRestJsonProtocol = class extends HttpBindingProtocol {
      static {
        __name(this, "AwsRestJsonProtocol");
      }
      serializer;
      deserializer;
      codec;
      mixin = new ProtocolLib();
      constructor({ defaultNamespace, errorTypeRegistries }) {
        super({
          defaultNamespace,
          errorTypeRegistries
        });
        const settings = {
          timestampFormat: {
            useTrait: true,
            default: 7
          },
          httpBindings: true,
          jsonName: true
        };
        this.codec = new JsonCodec(settings);
        this.serializer = new HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
        this.deserializer = new HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
      }
      getShapeId() {
        return "aws.protocols#restJson1";
      }
      getPayloadCodec() {
        return this.codec;
      }
      setSerdeContext(serdeContext) {
        this.codec.setSerdeContext(serdeContext);
        super.setSerdeContext(serdeContext);
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        const inputSchema = NormalizedSchema.of(operationSchema.input);
        if (!request.headers["content-type"]) {
          const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
          if (contentType) {
            request.headers["content-type"] = contentType;
          }
        }
        if (request.body == null && request.headers["content-type"] === this.getDefaultContentType()) {
          request.body = "{}";
        }
        return request;
      }
      async deserializeResponse(operationSchema, context, response) {
        const output = await super.deserializeResponse(operationSchema, context, response);
        const outputSchema = NormalizedSchema.of(operationSchema.output);
        for (const [name, member] of outputSchema.structIterator()) {
          if (member.getMemberTraits().httpPayload && !(name in output)) {
            output[name] = null;
          }
        }
        return output;
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor(message);
        await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
          const target = member.getMergedTraits().jsonName ?? name;
          output[name] = errorDeserializer.readObject(member, dataObject[target]);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output), dataObject);
      }
      getDefaultContentType() {
        return "application/json";
      }
    };
  }
});

// node_modules/fast-xml-parser/lib/fxp.cjs
var require_fxp = __commonJS({
  "node_modules/fast-xml-parser/lib/fxp.cjs"(exports, module) {
    init_esm();
    (() => {
      "use strict";
      var t = { d: /* @__PURE__ */ __name((e2, n2) => {
        for (var i2 in n2) t.o(n2, i2) && !t.o(e2, i2) && Object.defineProperty(e2, i2, { enumerable: true, get: n2[i2] });
      }, "d"), o: /* @__PURE__ */ __name((t2, e2) => Object.prototype.hasOwnProperty.call(t2, e2), "o"), r: /* @__PURE__ */ __name((t2) => {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(t2, "__esModule", { value: true });
      }, "r") }, e = {};
      t.r(e), t.d(e, { XMLBuilder: /* @__PURE__ */ __name(() => Bt, "XMLBuilder"), XMLParser: /* @__PURE__ */ __name(() => Tt, "XMLParser"), XMLValidator: /* @__PURE__ */ __name(() => Ut, "XMLValidator") });
      const n = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD", i = new RegExp("^[" + n + "][" + n + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
      function s(t2, e2) {
        const n2 = [];
        let i2 = e2.exec(t2);
        for (; i2; ) {
          const s2 = [];
          s2.startIndex = e2.lastIndex - i2[0].length;
          const r2 = i2.length;
          for (let t3 = 0; t3 < r2; t3++) s2.push(i2[t3]);
          n2.push(s2), i2 = e2.exec(t2);
        }
        return n2;
      }
      __name(s, "s");
      const r = /* @__PURE__ */ __name(function(t2) {
        return !(null == i.exec(t2));
      }, "r"), o = ["hasOwnProperty", "toString", "valueOf", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"], a = ["__proto__", "constructor", "prototype"], h = { allowBooleanAttributes: false, unpairedTags: [] };
      function l(t2, e2) {
        e2 = Object.assign({}, h, e2);
        const n2 = [];
        let i2 = false, s2 = false;
        "\uFEFF" === t2[0] && (t2 = t2.substr(1));
        for (let r2 = 0; r2 < t2.length; r2++) if ("<" === t2[r2] && "?" === t2[r2 + 1]) {
          if (r2 += 2, r2 = p(t2, r2), r2.err) return r2;
        } else {
          if ("<" !== t2[r2]) {
            if (u(t2[r2])) continue;
            return b("InvalidChar", "char '" + t2[r2] + "' is not expected.", w(t2, r2));
          }
          {
            let o2 = r2;
            if (r2++, "!" === t2[r2]) {
              r2 = c(t2, r2);
              continue;
            }
            {
              let a2 = false;
              "/" === t2[r2] && (a2 = true, r2++);
              let h2 = "";
              for (; r2 < t2.length && ">" !== t2[r2] && " " !== t2[r2] && "	" !== t2[r2] && "\n" !== t2[r2] && "\r" !== t2[r2]; r2++) h2 += t2[r2];
              if (h2 = h2.trim(), "/" === h2[h2.length - 1] && (h2 = h2.substring(0, h2.length - 1), r2--), !E(h2)) {
                let e3;
                return e3 = 0 === h2.trim().length ? "Invalid space after '<'." : "Tag '" + h2 + "' is an invalid name.", b("InvalidTag", e3, w(t2, r2));
              }
              const l2 = g(t2, r2);
              if (false === l2) return b("InvalidAttr", "Attributes for '" + h2 + "' have open quote.", w(t2, r2));
              let d2 = l2.value;
              if (r2 = l2.index, "/" === d2[d2.length - 1]) {
                const n3 = r2 - d2.length;
                d2 = d2.substring(0, d2.length - 1);
                const s3 = x(d2, e2);
                if (true !== s3) return b(s3.err.code, s3.err.msg, w(t2, n3 + s3.err.line));
                i2 = true;
              } else if (a2) {
                if (!l2.tagClosed) return b("InvalidTag", "Closing tag '" + h2 + "' doesn't have proper closing.", w(t2, r2));
                if (d2.trim().length > 0) return b("InvalidTag", "Closing tag '" + h2 + "' can't have attributes or invalid starting.", w(t2, o2));
                if (0 === n2.length) return b("InvalidTag", "Closing tag '" + h2 + "' has not been opened.", w(t2, o2));
                {
                  const e3 = n2.pop();
                  if (h2 !== e3.tagName) {
                    let n3 = w(t2, e3.tagStartPos);
                    return b("InvalidTag", "Expected closing tag '" + e3.tagName + "' (opened in line " + n3.line + ", col " + n3.col + ") instead of closing tag '" + h2 + "'.", w(t2, o2));
                  }
                  0 == n2.length && (s2 = true);
                }
              } else {
                const a3 = x(d2, e2);
                if (true !== a3) return b(a3.err.code, a3.err.msg, w(t2, r2 - d2.length + a3.err.line));
                if (true === s2) return b("InvalidXml", "Multiple possible root nodes found.", w(t2, r2));
                -1 !== e2.unpairedTags.indexOf(h2) || n2.push({ tagName: h2, tagStartPos: o2 }), i2 = true;
              }
              for (r2++; r2 < t2.length; r2++) if ("<" === t2[r2]) {
                if ("!" === t2[r2 + 1]) {
                  r2++, r2 = c(t2, r2);
                  continue;
                }
                if ("?" !== t2[r2 + 1]) break;
                if (r2 = p(t2, ++r2), r2.err) return r2;
              } else if ("&" === t2[r2]) {
                const e3 = N(t2, r2);
                if (-1 == e3) return b("InvalidChar", "char '&' is not expected.", w(t2, r2));
                r2 = e3;
              } else if (true === s2 && !u(t2[r2])) return b("InvalidXml", "Extra text at the end", w(t2, r2));
              "<" === t2[r2] && r2--;
            }
          }
        }
        return i2 ? 1 == n2.length ? b("InvalidTag", "Unclosed tag '" + n2[0].tagName + "'.", w(t2, n2[0].tagStartPos)) : !(n2.length > 0) || b("InvalidXml", "Invalid '" + JSON.stringify(n2.map((t3) => t3.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 }) : b("InvalidXml", "Start tag expected.", 1);
      }
      __name(l, "l");
      function u(t2) {
        return " " === t2 || "	" === t2 || "\n" === t2 || "\r" === t2;
      }
      __name(u, "u");
      function p(t2, e2) {
        const n2 = e2;
        for (; e2 < t2.length; e2++) if ("?" == t2[e2] || " " == t2[e2]) {
          const i2 = t2.substr(n2, e2 - n2);
          if (e2 > 5 && "xml" === i2) return b("InvalidXml", "XML declaration allowed only at the start of the document.", w(t2, e2));
          if ("?" == t2[e2] && ">" == t2[e2 + 1]) {
            e2++;
            break;
          }
          continue;
        }
        return e2;
      }
      __name(p, "p");
      function c(t2, e2) {
        if (t2.length > e2 + 5 && "-" === t2[e2 + 1] && "-" === t2[e2 + 2]) {
          for (e2 += 3; e2 < t2.length; e2++) if ("-" === t2[e2] && "-" === t2[e2 + 1] && ">" === t2[e2 + 2]) {
            e2 += 2;
            break;
          }
        } else if (t2.length > e2 + 8 && "D" === t2[e2 + 1] && "O" === t2[e2 + 2] && "C" === t2[e2 + 3] && "T" === t2[e2 + 4] && "Y" === t2[e2 + 5] && "P" === t2[e2 + 6] && "E" === t2[e2 + 7]) {
          let n2 = 1;
          for (e2 += 8; e2 < t2.length; e2++) if ("<" === t2[e2]) n2++;
          else if (">" === t2[e2] && (n2--, 0 === n2)) break;
        } else if (t2.length > e2 + 9 && "[" === t2[e2 + 1] && "C" === t2[e2 + 2] && "D" === t2[e2 + 3] && "A" === t2[e2 + 4] && "T" === t2[e2 + 5] && "A" === t2[e2 + 6] && "[" === t2[e2 + 7]) {
          for (e2 += 8; e2 < t2.length; e2++) if ("]" === t2[e2] && "]" === t2[e2 + 1] && ">" === t2[e2 + 2]) {
            e2 += 2;
            break;
          }
        }
        return e2;
      }
      __name(c, "c");
      const d = '"', f = "'";
      function g(t2, e2) {
        let n2 = "", i2 = "", s2 = false;
        for (; e2 < t2.length; e2++) {
          if (t2[e2] === d || t2[e2] === f) "" === i2 ? i2 = t2[e2] : i2 !== t2[e2] || (i2 = "");
          else if (">" === t2[e2] && "" === i2) {
            s2 = true;
            break;
          }
          n2 += t2[e2];
        }
        return "" === i2 && { value: n2, index: e2, tagClosed: s2 };
      }
      __name(g, "g");
      const m = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
      function x(t2, e2) {
        const n2 = s(t2, m), i2 = {};
        for (let t3 = 0; t3 < n2.length; t3++) {
          if (0 === n2[t3][1].length) return b("InvalidAttr", "Attribute '" + n2[t3][2] + "' has no space in starting.", v(n2[t3]));
          if (void 0 !== n2[t3][3] && void 0 === n2[t3][4]) return b("InvalidAttr", "Attribute '" + n2[t3][2] + "' is without value.", v(n2[t3]));
          if (void 0 === n2[t3][3] && !e2.allowBooleanAttributes) return b("InvalidAttr", "boolean attribute '" + n2[t3][2] + "' is not allowed.", v(n2[t3]));
          const s2 = n2[t3][2];
          if (!y(s2)) return b("InvalidAttr", "Attribute '" + s2 + "' is an invalid name.", v(n2[t3]));
          if (Object.prototype.hasOwnProperty.call(i2, s2)) return b("InvalidAttr", "Attribute '" + s2 + "' is repeated.", v(n2[t3]));
          i2[s2] = 1;
        }
        return true;
      }
      __name(x, "x");
      function N(t2, e2) {
        if (";" === t2[++e2]) return -1;
        if ("#" === t2[e2]) return function(t3, e3) {
          let n3 = /\d/;
          for ("x" === t3[e3] && (e3++, n3 = /[\da-fA-F]/); e3 < t3.length; e3++) {
            if (";" === t3[e3]) return e3;
            if (!t3[e3].match(n3)) break;
          }
          return -1;
        }(t2, ++e2);
        let n2 = 0;
        for (; e2 < t2.length; e2++, n2++) if (!(t2[e2].match(/\w/) && n2 < 20)) {
          if (";" === t2[e2]) break;
          return -1;
        }
        return e2;
      }
      __name(N, "N");
      function b(t2, e2, n2) {
        return { err: { code: t2, msg: e2, line: n2.line || n2, col: n2.col } };
      }
      __name(b, "b");
      function y(t2) {
        return r(t2);
      }
      __name(y, "y");
      function E(t2) {
        return r(t2);
      }
      __name(E, "E");
      function w(t2, e2) {
        const n2 = t2.substring(0, e2).split(/\r?\n/);
        return { line: n2.length, col: n2[n2.length - 1].length + 1 };
      }
      __name(w, "w");
      function v(t2) {
        return t2.startIndex + t2[1].length;
      }
      __name(v, "v");
      const S = /* @__PURE__ */ __name((t2) => o.includes(t2) ? "__" + t2 : t2, "S"), _ = { preserveOrder: false, attributeNamePrefix: "@_", attributesGroupName: false, textNodeName: "#text", ignoreAttributes: true, removeNSPrefix: false, allowBooleanAttributes: false, parseTagValue: true, parseAttributeValue: false, trimValues: true, cdataPropName: false, numberParseOptions: { hex: true, leadingZeros: true, eNotation: true }, tagValueProcessor: /* @__PURE__ */ __name(function(t2, e2) {
        return e2;
      }, "tagValueProcessor"), attributeValueProcessor: /* @__PURE__ */ __name(function(t2, e2) {
        return e2;
      }, "attributeValueProcessor"), stopNodes: [], alwaysCreateTextNode: false, isArray: /* @__PURE__ */ __name(() => false, "isArray"), commentPropName: false, unpairedTags: [], processEntities: true, htmlEntities: false, entityDecoder: null, ignoreDeclaration: false, ignorePiTags: false, transformTagName: false, transformAttributeName: false, updateTag: /* @__PURE__ */ __name(function(t2, e2, n2) {
        return t2;
      }, "updateTag"), captureMetaData: false, maxNestedTags: 100, strictReservedNames: true, jPath: true, onDangerousProperty: S };
      function A(t2, e2) {
        if ("string" != typeof t2) return;
        const n2 = t2.toLowerCase();
        if (o.some((t3) => n2 === t3.toLowerCase())) throw new Error(`[SECURITY] Invalid ${e2}: "${t2}" is a reserved JavaScript keyword that could cause prototype pollution`);
        if (a.some((t3) => n2 === t3.toLowerCase())) throw new Error(`[SECURITY] Invalid ${e2}: "${t2}" is a reserved JavaScript keyword that could cause prototype pollution`);
      }
      __name(A, "A");
      function T(t2, e2) {
        return "boolean" == typeof t2 ? { enabled: t2, maxEntitySize: 1e4, maxExpansionDepth: 1e4, maxTotalExpansions: 1 / 0, maxExpandedLength: 1e5, maxEntityCount: 1e3, allowedTags: null, tagFilter: null, appliesTo: "all" } : "object" == typeof t2 && null !== t2 ? { enabled: false !== t2.enabled, maxEntitySize: Math.max(1, t2.maxEntitySize ?? 1e4), maxExpansionDepth: Math.max(1, t2.maxExpansionDepth ?? 1e4), maxTotalExpansions: Math.max(1, t2.maxTotalExpansions ?? 1 / 0), maxExpandedLength: Math.max(1, t2.maxExpandedLength ?? 1e5), maxEntityCount: Math.max(1, t2.maxEntityCount ?? 1e3), allowedTags: t2.allowedTags ?? null, tagFilter: t2.tagFilter ?? null, appliesTo: t2.appliesTo ?? "all" } : T(true);
      }
      __name(T, "T");
      const C = /* @__PURE__ */ __name(function(t2) {
        const e2 = Object.assign({}, _, t2), n2 = [{ value: e2.attributeNamePrefix, name: "attributeNamePrefix" }, { value: e2.attributesGroupName, name: "attributesGroupName" }, { value: e2.textNodeName, name: "textNodeName" }, { value: e2.cdataPropName, name: "cdataPropName" }, { value: e2.commentPropName, name: "commentPropName" }];
        for (const { value: t3, name: e3 } of n2) t3 && A(t3, e3);
        return null === e2.onDangerousProperty && (e2.onDangerousProperty = S), e2.processEntities = T(e2.processEntities, e2.htmlEntities), e2.unpairedTagsSet = new Set(e2.unpairedTags), e2.stopNodes && Array.isArray(e2.stopNodes) && (e2.stopNodes = e2.stopNodes.map((t3) => "string" == typeof t3 && t3.startsWith("*.") ? ".." + t3.substring(2) : t3)), e2;
      }, "C");
      let P;
      P = "function" != typeof Symbol ? "@@xmlMetadata" : Symbol("XML Node Metadata");
      class O {
        static {
          __name(this, "O");
        }
        constructor(t2) {
          this.tagname = t2, this.child = [], this[":@"] = /* @__PURE__ */ Object.create(null);
        }
        add(t2, e2) {
          "__proto__" === t2 && (t2 = "#__proto__"), this.child.push({ [t2]: e2 });
        }
        addChild(t2, e2) {
          "__proto__" === t2.tagname && (t2.tagname = "#__proto__"), t2[":@"] && Object.keys(t2[":@"]).length > 0 ? this.child.push({ [t2.tagname]: t2.child, ":@": t2[":@"] }) : this.child.push({ [t2.tagname]: t2.child }), void 0 !== e2 && (this.child[this.child.length - 1][P] = { startIndex: e2 });
        }
        static getMetaDataSymbol() {
          return P;
        }
      }
      class $ {
        static {
          __name(this, "$");
        }
        constructor(t2) {
          this.suppressValidationErr = !t2, this.options = t2;
        }
        readDocType(t2, e2) {
          const n2 = /* @__PURE__ */ Object.create(null);
          let i2 = 0;
          if ("O" !== t2[e2 + 3] || "C" !== t2[e2 + 4] || "T" !== t2[e2 + 5] || "Y" !== t2[e2 + 6] || "P" !== t2[e2 + 7] || "E" !== t2[e2 + 8]) throw new Error("Invalid Tag instead of DOCTYPE");
          {
            e2 += 9;
            let s2 = 1, r2 = false, o2 = false, a2 = "";
            for (; e2 < t2.length; e2++) if ("<" !== t2[e2] || o2) if (">" === t2[e2]) {
              if (o2 ? "-" === t2[e2 - 1] && "-" === t2[e2 - 2] && (o2 = false, s2--) : s2--, 0 === s2) break;
            } else "[" === t2[e2] ? r2 = true : a2 += t2[e2];
            else {
              if (r2 && D(t2, "!ENTITY", e2)) {
                let s3, r3;
                if (e2 += 7, [s3, r3, e2] = this.readEntityExp(t2, e2 + 1, this.suppressValidationErr), -1 === r3.indexOf("&")) {
                  if (false !== this.options.enabled && null != this.options.maxEntityCount && i2 >= this.options.maxEntityCount) throw new Error(`Entity count (${i2 + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`);
                  n2[s3] = r3, i2++;
                }
              } else if (r2 && D(t2, "!ELEMENT", e2)) {
                e2 += 8;
                const { index: n3 } = this.readElementExp(t2, e2 + 1);
                e2 = n3;
              } else if (r2 && D(t2, "!ATTLIST", e2)) e2 += 8;
              else if (r2 && D(t2, "!NOTATION", e2)) {
                e2 += 9;
                const { index: n3 } = this.readNotationExp(t2, e2 + 1, this.suppressValidationErr);
                e2 = n3;
              } else {
                if (!D(t2, "!--", e2)) throw new Error("Invalid DOCTYPE");
                o2 = true;
              }
              s2++, a2 = "";
            }
            if (0 !== s2) throw new Error("Unclosed DOCTYPE");
          }
          return { entities: n2, i: e2 };
        }
        readEntityExp(t2, e2) {
          const n2 = e2 = I(t2, e2);
          for (; e2 < t2.length && !/\s/.test(t2[e2]) && '"' !== t2[e2] && "'" !== t2[e2]; ) e2++;
          let i2 = t2.substring(n2, e2);
          if (M(i2), e2 = I(t2, e2), !this.suppressValidationErr) {
            if ("SYSTEM" === t2.substring(e2, e2 + 6).toUpperCase()) throw new Error("External entities are not supported");
            if ("%" === t2[e2]) throw new Error("Parameter entities are not supported");
          }
          let s2 = "";
          if ([e2, s2] = this.readIdentifierVal(t2, e2, "entity"), false !== this.options.enabled && null != this.options.maxEntitySize && s2.length > this.options.maxEntitySize) throw new Error(`Entity "${i2}" size (${s2.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`);
          return [i2, s2, --e2];
        }
        readNotationExp(t2, e2) {
          const n2 = e2 = I(t2, e2);
          for (; e2 < t2.length && !/\s/.test(t2[e2]); ) e2++;
          let i2 = t2.substring(n2, e2);
          !this.suppressValidationErr && M(i2), e2 = I(t2, e2);
          const s2 = t2.substring(e2, e2 + 6).toUpperCase();
          if (!this.suppressValidationErr && "SYSTEM" !== s2 && "PUBLIC" !== s2) throw new Error(`Expected SYSTEM or PUBLIC, found "${s2}"`);
          e2 += s2.length, e2 = I(t2, e2);
          let r2 = null, o2 = null;
          if ("PUBLIC" === s2) [e2, r2] = this.readIdentifierVal(t2, e2, "publicIdentifier"), '"' !== t2[e2 = I(t2, e2)] && "'" !== t2[e2] || ([e2, o2] = this.readIdentifierVal(t2, e2, "systemIdentifier"));
          else if ("SYSTEM" === s2 && ([e2, o2] = this.readIdentifierVal(t2, e2, "systemIdentifier"), !this.suppressValidationErr && !o2)) throw new Error("Missing mandatory system identifier for SYSTEM notation");
          return { notationName: i2, publicIdentifier: r2, systemIdentifier: o2, index: --e2 };
        }
        readIdentifierVal(t2, e2, n2) {
          let i2 = "";
          const s2 = t2[e2];
          if ('"' !== s2 && "'" !== s2) throw new Error(`Expected quoted string, found "${s2}"`);
          const r2 = ++e2;
          for (; e2 < t2.length && t2[e2] !== s2; ) e2++;
          if (i2 = t2.substring(r2, e2), t2[e2] !== s2) throw new Error(`Unterminated ${n2} value`);
          return [++e2, i2];
        }
        readElementExp(t2, e2) {
          const n2 = e2 = I(t2, e2);
          for (; e2 < t2.length && !/\s/.test(t2[e2]); ) e2++;
          let i2 = t2.substring(n2, e2);
          if (!this.suppressValidationErr && !r(i2)) throw new Error(`Invalid element name: "${i2}"`);
          let s2 = "";
          if ("E" === t2[e2 = I(t2, e2)] && D(t2, "MPTY", e2)) e2 += 4;
          else if ("A" === t2[e2] && D(t2, "NY", e2)) e2 += 2;
          else if ("(" === t2[e2]) {
            const n3 = ++e2;
            for (; e2 < t2.length && ")" !== t2[e2]; ) e2++;
            if (s2 = t2.substring(n3, e2), ")" !== t2[e2]) throw new Error("Unterminated content model");
          } else if (!this.suppressValidationErr) throw new Error(`Invalid Element Expression, found "${t2[e2]}"`);
          return { elementName: i2, contentModel: s2.trim(), index: e2 };
        }
        readAttlistExp(t2, e2) {
          let n2 = e2 = I(t2, e2);
          for (; e2 < t2.length && !/\s/.test(t2[e2]); ) e2++;
          let i2 = t2.substring(n2, e2);
          for (M(i2), n2 = e2 = I(t2, e2); e2 < t2.length && !/\s/.test(t2[e2]); ) e2++;
          let s2 = t2.substring(n2, e2);
          if (!M(s2)) throw new Error(`Invalid attribute name: "${s2}"`);
          e2 = I(t2, e2);
          let r2 = "";
          if ("NOTATION" === t2.substring(e2, e2 + 8).toUpperCase()) {
            if (r2 = "NOTATION", "(" !== t2[e2 = I(t2, e2 += 8)]) throw new Error(`Expected '(', found "${t2[e2]}"`);
            e2++;
            let n3 = [];
            for (; e2 < t2.length && ")" !== t2[e2]; ) {
              const i3 = e2;
              for (; e2 < t2.length && "|" !== t2[e2] && ")" !== t2[e2]; ) e2++;
              let s3 = t2.substring(i3, e2);
              if (s3 = s3.trim(), !M(s3)) throw new Error(`Invalid notation name: "${s3}"`);
              n3.push(s3), "|" === t2[e2] && (e2++, e2 = I(t2, e2));
            }
            if (")" !== t2[e2]) throw new Error("Unterminated list of notations");
            e2++, r2 += " (" + n3.join("|") + ")";
          } else {
            const n3 = e2;
            for (; e2 < t2.length && !/\s/.test(t2[e2]); ) e2++;
            r2 += t2.substring(n3, e2);
            const i3 = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
            if (!this.suppressValidationErr && !i3.includes(r2.toUpperCase())) throw new Error(`Invalid attribute type: "${r2}"`);
          }
          e2 = I(t2, e2);
          let o2 = "";
          return "#REQUIRED" === t2.substring(e2, e2 + 8).toUpperCase() ? (o2 = "#REQUIRED", e2 += 8) : "#IMPLIED" === t2.substring(e2, e2 + 7).toUpperCase() ? (o2 = "#IMPLIED", e2 += 7) : [e2, o2] = this.readIdentifierVal(t2, e2, "ATTLIST"), { elementName: i2, attributeName: s2, attributeType: r2, defaultValue: o2, index: e2 };
        }
      }
      const I = /* @__PURE__ */ __name((t2, e2) => {
        for (; e2 < t2.length && /\s/.test(t2[e2]); ) e2++;
        return e2;
      }, "I");
      function D(t2, e2, n2) {
        for (let i2 = 0; i2 < e2.length; i2++) if (e2[i2] !== t2[n2 + i2 + 1]) return false;
        return true;
      }
      __name(D, "D");
      function M(t2) {
        if (r(t2)) return t2;
        throw new Error(`Invalid entity name ${t2}`);
      }
      __name(M, "M");
      const j = /^[-+]?0x[a-fA-F0-9]+$/, V = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/, L = { hex: true, leadingZeros: true, decimalPoint: ".", eNotation: true, infinity: "original" };
      const k = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
      class F {
        static {
          __name(this, "F");
        }
        constructor(t2) {
          this._matcher = t2;
        }
        get separator() {
          return this._matcher.separator;
        }
        getCurrentTag() {
          const t2 = this._matcher.path;
          return t2.length > 0 ? t2[t2.length - 1].tag : void 0;
        }
        getCurrentNamespace() {
          const t2 = this._matcher.path;
          return t2.length > 0 ? t2[t2.length - 1].namespace : void 0;
        }
        getAttrValue(t2) {
          const e2 = this._matcher.path;
          if (0 !== e2.length) return e2[e2.length - 1].values?.[t2];
        }
        hasAttr(t2) {
          const e2 = this._matcher.path;
          if (0 === e2.length) return false;
          const n2 = e2[e2.length - 1];
          return void 0 !== n2.values && t2 in n2.values;
        }
        getPosition() {
          const t2 = this._matcher.path;
          return 0 === t2.length ? -1 : t2[t2.length - 1].position ?? 0;
        }
        getCounter() {
          const t2 = this._matcher.path;
          return 0 === t2.length ? -1 : t2[t2.length - 1].counter ?? 0;
        }
        getIndex() {
          return this.getPosition();
        }
        getDepth() {
          return this._matcher.path.length;
        }
        toString(t2, e2 = true) {
          return this._matcher.toString(t2, e2);
        }
        toArray() {
          return this._matcher.path.map((t2) => t2.tag);
        }
        matches(t2) {
          return this._matcher.matches(t2);
        }
        matchesAny(t2) {
          return t2.matchesAny(this._matcher);
        }
      }
      class R {
        static {
          __name(this, "R");
        }
        constructor(t2 = {}) {
          this.separator = t2.separator || ".", this.path = [], this.siblingStacks = [], this._pathStringCache = null, this._view = new F(this);
        }
        push(t2, e2 = null, n2 = null) {
          this._pathStringCache = null, this.path.length > 0 && (this.path[this.path.length - 1].values = void 0);
          const i2 = this.path.length;
          this.siblingStacks[i2] || (this.siblingStacks[i2] = /* @__PURE__ */ new Map());
          const s2 = this.siblingStacks[i2], r2 = n2 ? `${n2}:${t2}` : t2, o2 = s2.get(r2) || 0;
          let a2 = 0;
          for (const t3 of s2.values()) a2 += t3;
          s2.set(r2, o2 + 1);
          const h2 = { tag: t2, position: a2, counter: o2 };
          null != n2 && (h2.namespace = n2), null != e2 && (h2.values = e2), this.path.push(h2);
        }
        pop() {
          if (0 === this.path.length) return;
          this._pathStringCache = null;
          const t2 = this.path.pop();
          return this.siblingStacks.length > this.path.length + 1 && (this.siblingStacks.length = this.path.length + 1), t2;
        }
        updateCurrent(t2) {
          if (this.path.length > 0) {
            const e2 = this.path[this.path.length - 1];
            null != t2 && (e2.values = t2);
          }
        }
        getCurrentTag() {
          return this.path.length > 0 ? this.path[this.path.length - 1].tag : void 0;
        }
        getCurrentNamespace() {
          return this.path.length > 0 ? this.path[this.path.length - 1].namespace : void 0;
        }
        getAttrValue(t2) {
          if (0 !== this.path.length) return this.path[this.path.length - 1].values?.[t2];
        }
        hasAttr(t2) {
          if (0 === this.path.length) return false;
          const e2 = this.path[this.path.length - 1];
          return void 0 !== e2.values && t2 in e2.values;
        }
        getPosition() {
          return 0 === this.path.length ? -1 : this.path[this.path.length - 1].position ?? 0;
        }
        getCounter() {
          return 0 === this.path.length ? -1 : this.path[this.path.length - 1].counter ?? 0;
        }
        getIndex() {
          return this.getPosition();
        }
        getDepth() {
          return this.path.length;
        }
        toString(t2, e2 = true) {
          const n2 = t2 || this.separator;
          if (n2 === this.separator && true === e2) {
            if (null !== this._pathStringCache) return this._pathStringCache;
            const t3 = this.path.map((t4) => t4.namespace ? `${t4.namespace}:${t4.tag}` : t4.tag).join(n2);
            return this._pathStringCache = t3, t3;
          }
          return this.path.map((t3) => e2 && t3.namespace ? `${t3.namespace}:${t3.tag}` : t3.tag).join(n2);
        }
        toArray() {
          return this.path.map((t2) => t2.tag);
        }
        reset() {
          this._pathStringCache = null, this.path = [], this.siblingStacks = [];
        }
        matches(t2) {
          const e2 = t2.segments;
          return 0 !== e2.length && (t2.hasDeepWildcard() ? this._matchWithDeepWildcard(e2) : this._matchSimple(e2));
        }
        _matchSimple(t2) {
          if (this.path.length !== t2.length) return false;
          for (let e2 = 0; e2 < t2.length; e2++) if (!this._matchSegment(t2[e2], this.path[e2], e2 === this.path.length - 1)) return false;
          return true;
        }
        _matchWithDeepWildcard(t2) {
          let e2 = this.path.length - 1, n2 = t2.length - 1;
          for (; n2 >= 0 && e2 >= 0; ) {
            const i2 = t2[n2];
            if ("deep-wildcard" === i2.type) {
              if (n2--, n2 < 0) return true;
              const i3 = t2[n2];
              let s2 = false;
              for (let t3 = e2; t3 >= 0; t3--) if (this._matchSegment(i3, this.path[t3], t3 === this.path.length - 1)) {
                e2 = t3 - 1, n2--, s2 = true;
                break;
              }
              if (!s2) return false;
            } else {
              if (!this._matchSegment(i2, this.path[e2], e2 === this.path.length - 1)) return false;
              e2--, n2--;
            }
          }
          return n2 < 0;
        }
        _matchSegment(t2, e2, n2) {
          if ("*" !== t2.tag && t2.tag !== e2.tag) return false;
          if (void 0 !== t2.namespace && "*" !== t2.namespace && t2.namespace !== e2.namespace) return false;
          if (void 0 !== t2.attrName) {
            if (!n2) return false;
            if (!e2.values || !(t2.attrName in e2.values)) return false;
            if (void 0 !== t2.attrValue && String(e2.values[t2.attrName]) !== String(t2.attrValue)) return false;
          }
          if (void 0 !== t2.position) {
            if (!n2) return false;
            const i2 = e2.counter ?? 0;
            if ("first" === t2.position && 0 !== i2) return false;
            if ("odd" === t2.position && i2 % 2 != 1) return false;
            if ("even" === t2.position && i2 % 2 != 0) return false;
            if ("nth" === t2.position && i2 !== t2.positionValue) return false;
          }
          return true;
        }
        matchesAny(t2) {
          return t2.matchesAny(this);
        }
        snapshot() {
          return { path: this.path.map((t2) => ({ ...t2 })), siblingStacks: this.siblingStacks.map((t2) => new Map(t2)) };
        }
        restore(t2) {
          this._pathStringCache = null, this.path = t2.path.map((t3) => ({ ...t3 })), this.siblingStacks = t2.siblingStacks.map((t3) => new Map(t3));
        }
        readOnly() {
          return this._view;
        }
      }
      class G {
        static {
          __name(this, "G");
        }
        constructor(t2, e2 = {}, n2) {
          this.pattern = t2, this.separator = e2.separator || ".", this.segments = this._parse(t2), this.data = n2, this._hasDeepWildcard = this.segments.some((t3) => "deep-wildcard" === t3.type), this._hasAttributeCondition = this.segments.some((t3) => void 0 !== t3.attrName), this._hasPositionSelector = this.segments.some((t3) => void 0 !== t3.position);
        }
        _parse(t2) {
          const e2 = [];
          let n2 = 0, i2 = "";
          for (; n2 < t2.length; ) t2[n2] === this.separator ? n2 + 1 < t2.length && t2[n2 + 1] === this.separator ? (i2.trim() && (e2.push(this._parseSegment(i2.trim())), i2 = ""), e2.push({ type: "deep-wildcard" }), n2 += 2) : (i2.trim() && e2.push(this._parseSegment(i2.trim())), i2 = "", n2++) : (i2 += t2[n2], n2++);
          return i2.trim() && e2.push(this._parseSegment(i2.trim())), e2;
        }
        _parseSegment(t2) {
          const e2 = { type: "tag" };
          let n2 = null, i2 = t2;
          const s2 = t2.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);
          if (s2 && (i2 = s2[1] + s2[3], s2[2])) {
            const t3 = s2[2].slice(1, -1);
            t3 && (n2 = t3);
          }
          let r2, o2, a2 = i2;
          if (i2.includes("::")) {
            const e3 = i2.indexOf("::");
            if (r2 = i2.substring(0, e3).trim(), a2 = i2.substring(e3 + 2).trim(), !r2) throw new Error(`Invalid namespace in pattern: ${t2}`);
          }
          let h2 = null;
          if (a2.includes(":")) {
            const t3 = a2.lastIndexOf(":"), e3 = a2.substring(0, t3).trim(), n3 = a2.substring(t3 + 1).trim();
            ["first", "last", "odd", "even"].includes(n3) || /^nth\(\d+\)$/.test(n3) ? (o2 = e3, h2 = n3) : o2 = a2;
          } else o2 = a2;
          if (!o2) throw new Error(`Invalid segment pattern: ${t2}`);
          if (e2.tag = o2, r2 && (e2.namespace = r2), n2) if (n2.includes("=")) {
            const t3 = n2.indexOf("=");
            e2.attrName = n2.substring(0, t3).trim(), e2.attrValue = n2.substring(t3 + 1).trim();
          } else e2.attrName = n2.trim();
          if (h2) {
            const t3 = h2.match(/^nth\((\d+)\)$/);
            t3 ? (e2.position = "nth", e2.positionValue = parseInt(t3[1], 10)) : e2.position = h2;
          }
          return e2;
        }
        get length() {
          return this.segments.length;
        }
        hasDeepWildcard() {
          return this._hasDeepWildcard;
        }
        hasAttributeCondition() {
          return this._hasAttributeCondition;
        }
        hasPositionSelector() {
          return this._hasPositionSelector;
        }
        toString() {
          return this.pattern;
        }
      }
      class B {
        static {
          __name(this, "B");
        }
        constructor() {
          this._byDepthAndTag = /* @__PURE__ */ new Map(), this._wildcardByDepth = /* @__PURE__ */ new Map(), this._deepWildcards = [], this._patterns = /* @__PURE__ */ new Set(), this._sealed = false;
        }
        add(t2) {
          if (this._sealed) throw new TypeError("ExpressionSet is sealed. Create a new ExpressionSet to add more expressions.");
          if (this._patterns.has(t2.pattern)) return this;
          if (this._patterns.add(t2.pattern), t2.hasDeepWildcard()) return this._deepWildcards.push(t2), this;
          const e2 = t2.length, n2 = t2.segments[t2.segments.length - 1], i2 = n2?.tag;
          if (i2 && "*" !== i2) {
            const n3 = `${e2}:${i2}`;
            this._byDepthAndTag.has(n3) || this._byDepthAndTag.set(n3, []), this._byDepthAndTag.get(n3).push(t2);
          } else this._wildcardByDepth.has(e2) || this._wildcardByDepth.set(e2, []), this._wildcardByDepth.get(e2).push(t2);
          return this;
        }
        addAll(t2) {
          for (const e2 of t2) this.add(e2);
          return this;
        }
        has(t2) {
          return this._patterns.has(t2.pattern);
        }
        get size() {
          return this._patterns.size;
        }
        seal() {
          return this._sealed = true, this;
        }
        get isSealed() {
          return this._sealed;
        }
        matchesAny(t2) {
          return null !== this.findMatch(t2);
        }
        findMatch(t2) {
          const e2 = t2.getDepth(), n2 = `${e2}:${t2.getCurrentTag()}`, i2 = this._byDepthAndTag.get(n2);
          if (i2) {
            for (let e3 = 0; e3 < i2.length; e3++) if (t2.matches(i2[e3])) return i2[e3];
          }
          const s2 = this._wildcardByDepth.get(e2);
          if (s2) {
            for (let e3 = 0; e3 < s2.length; e3++) if (t2.matches(s2[e3])) return s2[e3];
          }
          for (let e3 = 0; e3 < this._deepWildcards.length; e3++) if (t2.matches(this._deepWildcards[e3])) return this._deepWildcards[e3];
          return null;
        }
      }
      const U = { cent: "¢", pound: "£", curren: "¤", yen: "¥", euro: "€", dollar: "$", euro: "€", fnof: "ƒ", inr: "₹", af: "؋", birr: "ብር", peso: "₱", rub: "₽", won: "₩", yuan: "¥", cedil: "¸" }, W = { amp: "&", apos: "'", gt: ">", lt: "<", quot: '"' }, X = { nbsp: " ", copy: "©", reg: "®", trade: "™", mdash: "—", ndash: "–", hellip: "…", laquo: "«", raquo: "»", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", bull: "•", para: "¶", sect: "§", deg: "°", frac12: "½", frac14: "¼", frac34: "¾" }, Y = new Set("!?\\\\/[]$%{}^&*()<>|+");
      function z(t2) {
        if ("#" === t2[0]) throw new Error(`[EntityReplacer] Invalid character '#' in entity name: "${t2}"`);
        for (const e2 of t2) if (Y.has(e2)) throw new Error(`[EntityReplacer] Invalid character '${e2}' in entity name: "${t2}"`);
        return t2;
      }
      __name(z, "z");
      function q(...t2) {
        const e2 = /* @__PURE__ */ Object.create(null);
        for (const n2 of t2) if (n2) for (const t3 of Object.keys(n2)) {
          const i2 = n2[t3];
          if ("string" == typeof i2) e2[t3] = i2;
          else if (i2 && "object" == typeof i2 && void 0 !== i2.val) {
            const n3 = i2.val;
            "string" == typeof n3 && (e2[t3] = n3);
          }
        }
        return e2;
      }
      __name(q, "q");
      const Z = "external", J = "base", K = "all", Q = Object.freeze({ allow: 0, leave: 1, remove: 2, throw: 3 }), H = /* @__PURE__ */ new Set([9, 10, 13]);
      class tt {
        static {
          __name(this, "tt");
        }
        constructor(t2 = {}) {
          var e2;
          this._limit = t2.limit || {}, this._maxTotalExpansions = this._limit.maxTotalExpansions || 0, this._maxExpandedLength = this._limit.maxExpandedLength || 0, this._postCheck = "function" == typeof t2.postCheck ? t2.postCheck : (t3) => t3, this._limitTiers = (e2 = this._limit.applyLimitsTo ?? Z) && e2 !== Z ? e2 === K ? /* @__PURE__ */ new Set([K]) : e2 === J ? /* @__PURE__ */ new Set([J]) : Array.isArray(e2) ? new Set(e2) : /* @__PURE__ */ new Set([Z]) : /* @__PURE__ */ new Set([Z]), this._numericAllowed = t2.numericAllowed ?? true, this._baseMap = q(W, t2.namedEntities || null), this._externalMap = /* @__PURE__ */ Object.create(null), this._inputMap = /* @__PURE__ */ Object.create(null), this._totalExpansions = 0, this._expandedLength = 0, this._removeSet = new Set(t2.remove && Array.isArray(t2.remove) ? t2.remove : []), this._leaveSet = new Set(t2.leave && Array.isArray(t2.leave) ? t2.leave : []);
          const n2 = function(t3) {
            if (!t3) return { xmlVersion: 1, onLevel: Q.allow, nullLevel: Q.remove };
            const e3 = 1.1 === t3.xmlVersion ? 1.1 : 1, n3 = Q[t3.onNCR] ?? Q.allow, i2 = Q[t3.nullNCR] ?? Q.remove;
            return { xmlVersion: e3, onLevel: n3, nullLevel: Math.max(i2, Q.remove) };
          }(t2.ncr);
          this._ncrXmlVersion = n2.xmlVersion, this._ncrOnLevel = n2.onLevel, this._ncrNullLevel = n2.nullLevel;
        }
        setExternalEntities(t2) {
          if (t2) for (const e2 of Object.keys(t2)) z(e2);
          this._externalMap = q(t2);
        }
        addExternalEntity(t2, e2) {
          z(t2), "string" == typeof e2 && -1 === e2.indexOf("&") && (this._externalMap[t2] = e2);
        }
        addInputEntities(t2) {
          this._totalExpansions = 0, this._expandedLength = 0, this._inputMap = q(t2);
        }
        reset() {
          return this._inputMap = /* @__PURE__ */ Object.create(null), this._totalExpansions = 0, this._expandedLength = 0, this;
        }
        setXmlVersion(t2) {
          this._ncrXmlVersion = 1.1 === t2 ? 1.1 : 1;
        }
        decode(t2) {
          if ("string" != typeof t2 || 0 === t2.length) return t2;
          const e2 = t2, n2 = [], i2 = t2.length;
          let s2 = 0, r2 = 0;
          const o2 = this._maxTotalExpansions > 0, a2 = this._maxExpandedLength > 0, h2 = o2 || a2;
          for (; r2 < i2; ) {
            if (38 !== t2.charCodeAt(r2)) {
              r2++;
              continue;
            }
            let e3 = r2 + 1;
            for (; e3 < i2 && 59 !== t2.charCodeAt(e3) && e3 - r2 <= 32; ) e3++;
            if (e3 >= i2 || 59 !== t2.charCodeAt(e3)) {
              r2++;
              continue;
            }
            const l3 = t2.slice(r2 + 1, e3);
            if (0 === l3.length) {
              r2++;
              continue;
            }
            let u2, p2;
            if (this._removeSet.has(l3)) u2 = "", void 0 === p2 && (p2 = Z);
            else {
              if (this._leaveSet.has(l3)) {
                r2++;
                continue;
              }
              if (35 === l3.charCodeAt(0)) {
                const t3 = this._resolveNCR(l3);
                if (void 0 === t3) {
                  r2++;
                  continue;
                }
                u2 = t3, p2 = J;
              } else {
                const t3 = this._resolveName(l3);
                u2 = t3?.value, p2 = t3?.tier;
              }
            }
            if (void 0 !== u2) {
              if (r2 > s2 && n2.push(t2.slice(s2, r2)), n2.push(u2), s2 = e3 + 1, r2 = s2, h2 && this._tierCounts(p2)) {
                if (o2 && (this._totalExpansions++, this._totalExpansions > this._maxTotalExpansions)) throw new Error(`[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`);
                if (a2) {
                  const t3 = u2.length - (l3.length + 2);
                  if (t3 > 0 && (this._expandedLength += t3, this._expandedLength > this._maxExpandedLength)) throw new Error(`[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`);
                }
              }
            } else r2++;
          }
          s2 < i2 && n2.push(t2.slice(s2));
          const l2 = 0 === n2.length ? t2 : n2.join("");
          return this._postCheck(l2, e2);
        }
        _tierCounts(t2) {
          return !!this._limitTiers.has(K) || this._limitTiers.has(t2);
        }
        _resolveName(t2) {
          return t2 in this._inputMap ? { value: this._inputMap[t2], tier: Z } : t2 in this._externalMap ? { value: this._externalMap[t2], tier: Z } : t2 in this._baseMap ? { value: this._baseMap[t2], tier: J } : void 0;
        }
        _classifyNCR(t2) {
          return 0 === t2 ? this._ncrNullLevel : t2 >= 55296 && t2 <= 57343 || 1 === this._ncrXmlVersion && t2 >= 1 && t2 <= 31 && !H.has(t2) ? Q.remove : -1;
        }
        _applyNCRAction(t2, e2, n2) {
          switch (t2) {
            case Q.allow:
              return String.fromCodePoint(n2);
            case Q.remove:
              return "";
            case Q.leave:
              return;
            case Q.throw:
              throw new Error(`[EntityDecoder] Prohibited numeric character reference &${e2}; (U+${n2.toString(16).toUpperCase().padStart(4, "0")})`);
            default:
              return String.fromCodePoint(n2);
          }
        }
        _resolveNCR(t2) {
          const e2 = t2.charCodeAt(1);
          let n2;
          if (n2 = 120 === e2 || 88 === e2 ? parseInt(t2.slice(2), 16) : parseInt(t2.slice(1), 10), Number.isNaN(n2) || n2 < 0 || n2 > 1114111) return;
          const i2 = this._classifyNCR(n2);
          if (!this._numericAllowed && i2 < Q.remove) return;
          const s2 = -1 === i2 ? this._ncrOnLevel : Math.max(this._ncrOnLevel, i2);
          return this._applyNCRAction(s2, t2, n2);
        }
      }
      function et(t2, e2) {
        if (!t2) return {};
        const n2 = e2.attributesGroupName ? t2[e2.attributesGroupName] : t2;
        if (!n2) return {};
        const i2 = {};
        for (const t3 in n2) t3.startsWith(e2.attributeNamePrefix) ? i2[t3.substring(e2.attributeNamePrefix.length)] = n2[t3] : i2[t3] = n2[t3];
        return i2;
      }
      __name(et, "et");
      function nt(t2) {
        if (!t2 || "string" != typeof t2) return;
        const e2 = t2.indexOf(":");
        if (-1 !== e2 && e2 > 0) {
          const n2 = t2.substring(0, e2);
          if ("xmlns" !== n2) return n2;
        }
      }
      __name(nt, "nt");
      class it {
        static {
          __name(this, "it");
        }
        constructor(t2) {
          var e2;
          this.options = t2, this.currentNode = null, this.tagsNodeStack = [], this.parseXml = ht, this.parseTextData = st, this.resolveNameSpace = rt, this.buildAttributesMap = at, this.isItStopNode = ct, this.replaceEntitiesValue = ut, this.readStopNodeData = mt, this.saveTextToParentTag = pt, this.addChild = lt, this.ignoreAttributesFn = "function" == typeof (e2 = this.options.ignoreAttributes) ? e2 : Array.isArray(e2) ? (t3) => {
            for (const n3 of e2) {
              if ("string" == typeof n3 && t3 === n3) return true;
              if (n3 instanceof RegExp && n3.test(t3)) return true;
            }
          } : () => false, this.entityExpansionCount = 0, this.currentExpandedLength = 0;
          let n2 = { ...W };
          this.options.entityDecoder ? this.entityDecoder = this.options.entityDecoder : ("object" == typeof this.options.htmlEntities ? n2 = this.options.htmlEntities : true === this.options.htmlEntities && (n2 = { ...X, ...U }), this.entityDecoder = new tt({ namedEntities: n2, numericAllowed: this.options.htmlEntities, limit: { maxTotalExpansions: this.options.processEntities.maxTotalExpansions, maxExpandedLength: this.options.processEntities.maxExpandedLength, applyLimitsTo: this.options.processEntities.appliesTo } })), this.matcher = new R(), this.readonlyMatcher = this.matcher.readOnly(), this.isCurrentNodeStopNode = false, this.stopNodeExpressionsSet = new B();
          const i2 = this.options.stopNodes;
          if (i2 && i2.length > 0) {
            for (let t3 = 0; t3 < i2.length; t3++) {
              const e3 = i2[t3];
              "string" == typeof e3 ? this.stopNodeExpressionsSet.add(new G(e3)) : e3 instanceof G && this.stopNodeExpressionsSet.add(e3);
            }
            this.stopNodeExpressionsSet.seal();
          }
        }
      }
      function st(t2, e2, n2, i2, s2, r2, o2) {
        const a2 = this.options;
        if (void 0 !== t2 && (a2.trimValues && !i2 && (t2 = t2.trim()), t2.length > 0)) {
          o2 || (t2 = this.replaceEntitiesValue(t2, e2, n2));
          const i3 = a2.jPath ? n2.toString() : n2, h2 = a2.tagValueProcessor(e2, t2, i3, s2, r2);
          return null == h2 ? t2 : typeof h2 != typeof t2 || h2 !== t2 ? h2 : a2.trimValues || t2.trim() === t2 ? xt(t2, a2.parseTagValue, a2.numberParseOptions) : t2;
        }
      }
      __name(st, "st");
      function rt(t2) {
        if (this.options.removeNSPrefix) {
          const e2 = t2.split(":"), n2 = "/" === t2.charAt(0) ? "/" : "";
          if ("xmlns" === e2[0]) return "";
          2 === e2.length && (t2 = n2 + e2[1]);
        }
        return t2;
      }
      __name(rt, "rt");
      const ot = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
      function at(t2, e2, n2, i2 = false) {
        const r2 = this.options;
        if (true === i2 || true !== r2.ignoreAttributes && "string" == typeof t2) {
          const i3 = s(t2, ot), o2 = i3.length, a2 = {}, h2 = new Array(o2);
          let l2 = false;
          const u2 = {};
          for (let t3 = 0; t3 < o2; t3++) {
            const e3 = this.resolveNameSpace(i3[t3][1]), s2 = i3[t3][4];
            if (e3.length && void 0 !== s2) {
              let i4 = s2;
              r2.trimValues && (i4 = i4.trim()), i4 = this.replaceEntitiesValue(i4, n2, this.readonlyMatcher), h2[t3] = i4, u2[e3] = i4, l2 = true;
            }
          }
          l2 && "object" == typeof e2 && e2.updateCurrent && e2.updateCurrent(u2);
          const p2 = r2.jPath ? e2.toString() : this.readonlyMatcher;
          let c2 = false;
          for (let t3 = 0; t3 < o2; t3++) {
            const e3 = this.resolveNameSpace(i3[t3][1]);
            if (this.ignoreAttributesFn(e3, p2)) continue;
            let n3 = r2.attributeNamePrefix + e3;
            if (e3.length) if (r2.transformAttributeName && (n3 = r2.transformAttributeName(n3)), n3 = bt(n3, r2), void 0 !== i3[t3][4]) {
              const i4 = h2[t3], s2 = r2.attributeValueProcessor(e3, i4, p2);
              a2[n3] = null == s2 ? i4 : typeof s2 != typeof i4 || s2 !== i4 ? s2 : xt(i4, r2.parseAttributeValue, r2.numberParseOptions), c2 = true;
            } else r2.allowBooleanAttributes && (a2[n3] = true, c2 = true);
          }
          if (!c2) return;
          if (r2.attributesGroupName) {
            const t3 = {};
            return t3[r2.attributesGroupName] = a2, t3;
          }
          return a2;
        }
      }
      __name(at, "at");
      const ht = /* @__PURE__ */ __name(function(t2) {
        t2 = t2.replace(/\r\n?/g, "\n");
        const e2 = new O("!xml");
        let n2 = e2, i2 = "";
        this.matcher.reset(), this.entityDecoder.reset(), this.entityExpansionCount = 0, this.currentExpandedLength = 0;
        const s2 = this.options, r2 = new $(s2.processEntities), o2 = t2.length;
        for (let a2 = 0; a2 < o2; a2++) if ("<" === t2[a2]) {
          const h2 = t2.charCodeAt(a2 + 1);
          if (47 === h2) {
            const e3 = dt(t2, ">", a2, "Closing Tag is not closed.");
            let r3 = t2.substring(a2 + 2, e3).trim();
            if (s2.removeNSPrefix) {
              const t3 = r3.indexOf(":");
              -1 !== t3 && (r3 = r3.substr(t3 + 1));
            }
            r3 = Nt(s2.transformTagName, r3, "", s2).tagName, n2 && (i2 = this.saveTextToParentTag(i2, n2, this.readonlyMatcher));
            const o3 = this.matcher.getCurrentTag();
            if (r3 && s2.unpairedTagsSet.has(r3)) throw new Error(`Unpaired tag can not be used as closing tag: </${r3}>`);
            o3 && s2.unpairedTagsSet.has(o3) && (this.matcher.pop(), this.tagsNodeStack.pop()), this.matcher.pop(), this.isCurrentNodeStopNode = false, n2 = this.tagsNodeStack.pop(), i2 = "", a2 = e3;
          } else if (63 === h2) {
            let e3 = gt(t2, a2, false, "?>");
            if (!e3) throw new Error("Pi Tag is not closed.");
            i2 = this.saveTextToParentTag(i2, n2, this.readonlyMatcher);
            const r3 = this.buildAttributesMap(e3.tagExp, this.matcher, e3.tagName, true);
            if (r3) {
              const t3 = r3[this.options.attributeNamePrefix + "version"];
              this.entityDecoder.setXmlVersion(Number(t3) || 1);
            }
            if (s2.ignoreDeclaration && "?xml" === e3.tagName || s2.ignorePiTags) ;
            else {
              const t3 = new O(e3.tagName);
              t3.add(s2.textNodeName, ""), e3.tagName !== e3.tagExp && e3.attrExpPresent && true !== s2.ignoreAttributes && (t3[":@"] = r3), this.addChild(n2, t3, this.readonlyMatcher, a2);
            }
            a2 = e3.closeIndex + 1;
          } else if (33 === h2 && 45 === t2.charCodeAt(a2 + 2) && 45 === t2.charCodeAt(a2 + 3)) {
            const e3 = dt(t2, "-->", a2 + 4, "Comment is not closed.");
            if (s2.commentPropName) {
              const r3 = t2.substring(a2 + 4, e3 - 2);
              i2 = this.saveTextToParentTag(i2, n2, this.readonlyMatcher), n2.add(s2.commentPropName, [{ [s2.textNodeName]: r3 }]);
            }
            a2 = e3;
          } else if (33 === h2 && 68 === t2.charCodeAt(a2 + 2)) {
            const e3 = r2.readDocType(t2, a2);
            this.entityDecoder.addInputEntities(e3.entities), a2 = e3.i;
          } else if (33 === h2 && 91 === t2.charCodeAt(a2 + 2)) {
            const e3 = dt(t2, "]]>", a2, "CDATA is not closed.") - 2, r3 = t2.substring(a2 + 9, e3);
            i2 = this.saveTextToParentTag(i2, n2, this.readonlyMatcher);
            let o3 = this.parseTextData(r3, n2.tagname, this.readonlyMatcher, true, false, true, true);
            null == o3 && (o3 = ""), s2.cdataPropName ? n2.add(s2.cdataPropName, [{ [s2.textNodeName]: r3 }]) : n2.add(s2.textNodeName, o3), a2 = e3 + 2;
          } else {
            let r3 = gt(t2, a2, s2.removeNSPrefix);
            if (!r3) {
              const e3 = t2.substring(Math.max(0, a2 - 50), Math.min(o2, a2 + 50));
              throw new Error(`readTagExp returned undefined at position ${a2}. Context: "${e3}"`);
            }
            let h3 = r3.tagName;
            const l2 = r3.rawTagName;
            let u2 = r3.tagExp, p2 = r3.attrExpPresent, c2 = r3.closeIndex;
            if ({ tagName: h3, tagExp: u2 } = Nt(s2.transformTagName, h3, u2, s2), s2.strictReservedNames && (h3 === s2.commentPropName || h3 === s2.cdataPropName || h3 === s2.textNodeName || h3 === s2.attributesGroupName)) throw new Error(`Invalid tag name: ${h3}`);
            n2 && i2 && "!xml" !== n2.tagname && (i2 = this.saveTextToParentTag(i2, n2, this.readonlyMatcher, false));
            const d2 = n2;
            d2 && s2.unpairedTagsSet.has(d2.tagname) && (n2 = this.tagsNodeStack.pop(), this.matcher.pop());
            let f2 = false;
            u2.length > 0 && u2.lastIndexOf("/") === u2.length - 1 && (f2 = true, "/" === h3[h3.length - 1] ? (h3 = h3.substr(0, h3.length - 1), u2 = h3) : u2 = u2.substr(0, u2.length - 1), p2 = h3 !== u2);
            let g2, m2 = null, x2 = {};
            g2 = nt(l2), h3 !== e2.tagname && this.matcher.push(h3, {}, g2), h3 !== u2 && p2 && (m2 = this.buildAttributesMap(u2, this.matcher, h3), m2 && (x2 = et(m2, s2))), h3 !== e2.tagname && (this.isCurrentNodeStopNode = this.isItStopNode());
            const N2 = a2;
            if (this.isCurrentNodeStopNode) {
              let e3 = "";
              if (f2) a2 = r3.closeIndex;
              else if (s2.unpairedTagsSet.has(h3)) a2 = r3.closeIndex;
              else {
                const n3 = this.readStopNodeData(t2, l2, c2 + 1);
                if (!n3) throw new Error(`Unexpected end of ${l2}`);
                a2 = n3.i, e3 = n3.tagContent;
              }
              const i3 = new O(h3);
              m2 && (i3[":@"] = m2), i3.add(s2.textNodeName, e3), this.matcher.pop(), this.isCurrentNodeStopNode = false, this.addChild(n2, i3, this.readonlyMatcher, N2);
            } else {
              if (f2) {
                ({ tagName: h3, tagExp: u2 } = Nt(s2.transformTagName, h3, u2, s2));
                const t3 = new O(h3);
                m2 && (t3[":@"] = m2), this.addChild(n2, t3, this.readonlyMatcher, N2), this.matcher.pop(), this.isCurrentNodeStopNode = false;
              } else {
                if (s2.unpairedTagsSet.has(h3)) {
                  const t3 = new O(h3);
                  m2 && (t3[":@"] = m2), this.addChild(n2, t3, this.readonlyMatcher, N2), this.matcher.pop(), this.isCurrentNodeStopNode = false, a2 = r3.closeIndex;
                  continue;
                }
                {
                  const t3 = new O(h3);
                  if (this.tagsNodeStack.length > s2.maxNestedTags) throw new Error("Maximum nested tags exceeded");
                  this.tagsNodeStack.push(n2), m2 && (t3[":@"] = m2), this.addChild(n2, t3, this.readonlyMatcher, N2), n2 = t3;
                }
              }
              i2 = "", a2 = c2;
            }
          }
        } else i2 += t2[a2];
        return e2.child;
      }, "ht");
      function lt(t2, e2, n2, i2) {
        this.options.captureMetaData || (i2 = void 0);
        const s2 = this.options.jPath ? n2.toString() : n2, r2 = this.options.updateTag(e2.tagname, s2, e2[":@"]);
        false === r2 || ("string" == typeof r2 ? (e2.tagname = r2, t2.addChild(e2, i2)) : t2.addChild(e2, i2));
      }
      __name(lt, "lt");
      function ut(t2, e2, n2) {
        const i2 = this.options.processEntities;
        if (!i2 || !i2.enabled) return t2;
        if (i2.allowedTags) {
          const s2 = this.options.jPath ? n2.toString() : n2;
          if (!(Array.isArray(i2.allowedTags) ? i2.allowedTags.includes(e2) : i2.allowedTags(e2, s2))) return t2;
        }
        if (i2.tagFilter) {
          const s2 = this.options.jPath ? n2.toString() : n2;
          if (!i2.tagFilter(e2, s2)) return t2;
        }
        return this.entityDecoder.decode(t2);
      }
      __name(ut, "ut");
      function pt(t2, e2, n2, i2) {
        return t2 && (void 0 === i2 && (i2 = 0 === e2.child.length), void 0 !== (t2 = this.parseTextData(t2, e2.tagname, n2, false, !!e2[":@"] && 0 !== Object.keys(e2[":@"]).length, i2)) && "" !== t2 && e2.add(this.options.textNodeName, t2), t2 = ""), t2;
      }
      __name(pt, "pt");
      function ct() {
        return 0 !== this.stopNodeExpressionsSet.size && this.matcher.matchesAny(this.stopNodeExpressionsSet);
      }
      __name(ct, "ct");
      function dt(t2, e2, n2, i2) {
        const s2 = t2.indexOf(e2, n2);
        if (-1 === s2) throw new Error(i2);
        return s2 + e2.length - 1;
      }
      __name(dt, "dt");
      function ft(t2, e2, n2, i2) {
        const s2 = t2.indexOf(e2, n2);
        if (-1 === s2) throw new Error(i2);
        return s2;
      }
      __name(ft, "ft");
      function gt(t2, e2, n2, i2 = ">") {
        const s2 = function(t3, e3, n3 = ">") {
          let i3 = 0;
          const s3 = [], r3 = t3.length, o3 = n3.charCodeAt(0), a3 = n3.length > 1 ? n3.charCodeAt(1) : -1;
          for (let n4 = e3; n4 < r3; n4++) {
            const e4 = t3.charCodeAt(n4);
            if (i3) e4 === i3 && (i3 = 0);
            else if (34 === e4 || 39 === e4) i3 = e4;
            else if (e4 === o3) {
              if (-1 === a3) return { data: String.fromCharCode(...s3), index: n4 };
              if (t3.charCodeAt(n4 + 1) === a3) return { data: String.fromCharCode(...s3), index: n4 };
            } else if (9 === e4) {
              s3.push(32);
              continue;
            }
            s3.push(e4);
          }
        }(t2, e2 + 1, i2);
        if (!s2) return;
        let r2 = s2.data;
        const o2 = s2.index, a2 = r2.search(/\s/);
        let h2 = r2, l2 = true;
        -1 !== a2 && (h2 = r2.substring(0, a2), r2 = r2.substring(a2 + 1).trimStart());
        const u2 = h2;
        if (n2) {
          const t3 = h2.indexOf(":");
          -1 !== t3 && (h2 = h2.substr(t3 + 1), l2 = h2 !== s2.data.substr(t3 + 1));
        }
        return { tagName: h2, tagExp: r2, closeIndex: o2, attrExpPresent: l2, rawTagName: u2 };
      }
      __name(gt, "gt");
      function mt(t2, e2, n2) {
        const i2 = n2;
        let s2 = 1;
        const r2 = t2.length;
        for (; n2 < r2; n2++) if ("<" === t2[n2]) {
          const r3 = t2.charCodeAt(n2 + 1);
          if (47 === r3) {
            const r4 = ft(t2, ">", n2, `${e2} is not closed`);
            if (t2.substring(n2 + 2, r4).trim() === e2 && (s2--, 0 === s2)) return { tagContent: t2.substring(i2, n2), i: r4 };
            n2 = r4;
          } else if (63 === r3) n2 = dt(t2, "?>", n2 + 1, "StopNode is not closed.");
          else if (33 === r3 && 45 === t2.charCodeAt(n2 + 2) && 45 === t2.charCodeAt(n2 + 3)) n2 = dt(t2, "-->", n2 + 3, "StopNode is not closed.");
          else if (33 === r3 && 91 === t2.charCodeAt(n2 + 2)) n2 = dt(t2, "]]>", n2, "StopNode is not closed.") - 2;
          else {
            const i3 = gt(t2, n2, ">");
            i3 && ((i3 && i3.tagName) === e2 && "/" !== i3.tagExp[i3.tagExp.length - 1] && s2++, n2 = i3.closeIndex);
          }
        }
      }
      __name(mt, "mt");
      function xt(t2, e2, n2) {
        if (e2 && "string" == typeof t2) {
          const e3 = t2.trim();
          return "true" === e3 || "false" !== e3 && function(t3, e4 = {}) {
            if (e4 = Object.assign({}, L, e4), !t3 || "string" != typeof t3) return t3;
            let n3 = t3.trim();
            if (0 === n3.length) return t3;
            if (void 0 !== e4.skipLike && e4.skipLike.test(n3)) return t3;
            if ("0" === n3) return 0;
            if (e4.hex && j.test(n3)) return function(t4) {
              if (parseInt) return parseInt(t4, 16);
              if (Number.parseInt) return Number.parseInt(t4, 16);
              if (window && window.parseInt) return window.parseInt(t4, 16);
              throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
            }(n3);
            if (isFinite(n3)) {
              if (n3.includes("e") || n3.includes("E")) return function(t4, e5, n4) {
                if (!n4.eNotation) return t4;
                const i3 = e5.match(k);
                if (i3) {
                  let s2 = i3[1] || "";
                  const r2 = -1 === i3[3].indexOf("e") ? "E" : "e", o2 = i3[2], a2 = s2 ? t4[o2.length + 1] === r2 : t4[o2.length] === r2;
                  return o2.length > 1 && a2 ? t4 : (1 !== o2.length || !i3[3].startsWith(`.${r2}`) && i3[3][0] !== r2) && o2.length > 0 ? n4.leadingZeros && !a2 ? (e5 = (i3[1] || "") + i3[3], Number(e5)) : t4 : Number(e5);
                }
                return t4;
              }(t3, n3, e4);
              {
                const s2 = V.exec(n3);
                if (s2) {
                  const r2 = s2[1] || "", o2 = s2[2];
                  let a2 = (i2 = s2[3]) && -1 !== i2.indexOf(".") ? ("." === (i2 = i2.replace(/0+$/, "")) ? i2 = "0" : "." === i2[0] ? i2 = "0" + i2 : "." === i2[i2.length - 1] && (i2 = i2.substring(0, i2.length - 1)), i2) : i2;
                  const h2 = r2 ? "." === t3[o2.length + 1] : "." === t3[o2.length];
                  if (!e4.leadingZeros && (o2.length > 1 || 1 === o2.length && !h2)) return t3;
                  {
                    const i3 = Number(n3), s3 = String(i3);
                    if (0 === i3) return i3;
                    if (-1 !== s3.search(/[eE]/)) return e4.eNotation ? i3 : t3;
                    if (-1 !== n3.indexOf(".")) return "0" === s3 || s3 === a2 || s3 === `${r2}${a2}` ? i3 : t3;
                    let h3 = o2 ? a2 : n3;
                    return o2 ? h3 === s3 || r2 + h3 === s3 ? i3 : t3 : h3 === s3 || h3 === r2 + s3 ? i3 : t3;
                  }
                }
                return t3;
              }
            }
            var i2;
            return function(t4, e5, n4) {
              const i3 = e5 === 1 / 0;
              switch (n4.infinity.toLowerCase()) {
                case "null":
                  return null;
                case "infinity":
                  return e5;
                case "string":
                  return i3 ? "Infinity" : "-Infinity";
                default:
                  return t4;
              }
            }(t3, Number(n3), e4);
          }(t2, n2);
        }
        return void 0 !== t2 ? t2 : "";
      }
      __name(xt, "xt");
      function Nt(t2, e2, n2, i2) {
        if (t2) {
          const i3 = t2(e2);
          n2 === e2 && (n2 = i3), e2 = i3;
        }
        return { tagName: e2 = bt(e2, i2), tagExp: n2 };
      }
      __name(Nt, "Nt");
      function bt(t2, e2) {
        if (a.includes(t2)) throw new Error(`[SECURITY] Invalid name: "${t2}" is a reserved JavaScript keyword that could cause prototype pollution`);
        return o.includes(t2) ? e2.onDangerousProperty(t2) : t2;
      }
      __name(bt, "bt");
      const yt = O.getMetaDataSymbol();
      function Et(t2, e2) {
        if (!t2 || "object" != typeof t2) return {};
        if (!e2) return t2;
        const n2 = {};
        for (const i2 in t2) i2.startsWith(e2) ? n2[i2.substring(e2.length)] = t2[i2] : n2[i2] = t2[i2];
        return n2;
      }
      __name(Et, "Et");
      function wt(t2, e2, n2, i2) {
        return vt(t2, e2, n2, i2);
      }
      __name(wt, "wt");
      function vt(t2, e2, n2, i2) {
        let s2;
        const r2 = {};
        for (let o2 = 0; o2 < t2.length; o2++) {
          const a2 = t2[o2], h2 = St(a2);
          if (void 0 !== h2 && h2 !== e2.textNodeName) {
            const t3 = Et(a2[":@"] || {}, e2.attributeNamePrefix);
            n2.push(h2, t3);
          }
          if (h2 === e2.textNodeName) void 0 === s2 ? s2 = a2[h2] : s2 += "" + a2[h2];
          else {
            if (void 0 === h2) continue;
            if (a2[h2]) {
              let t3 = vt(a2[h2], e2, n2, i2);
              const s3 = At(t3, e2);
              if (a2[":@"] ? _t(t3, a2[":@"], i2, e2) : 1 !== Object.keys(t3).length || void 0 === t3[e2.textNodeName] || e2.alwaysCreateTextNode ? 0 === Object.keys(t3).length && (e2.alwaysCreateTextNode ? t3[e2.textNodeName] = "" : t3 = "") : t3 = t3[e2.textNodeName], void 0 !== a2[yt] && "object" == typeof t3 && null !== t3 && (t3[yt] = a2[yt]), void 0 !== r2[h2] && Object.prototype.hasOwnProperty.call(r2, h2)) Array.isArray(r2[h2]) || (r2[h2] = [r2[h2]]), r2[h2].push(t3);
              else {
                const n3 = e2.jPath ? i2.toString() : i2;
                e2.isArray(h2, n3, s3) ? r2[h2] = [t3] : r2[h2] = t3;
              }
              void 0 !== h2 && h2 !== e2.textNodeName && n2.pop();
            }
          }
        }
        return "string" == typeof s2 ? s2.length > 0 && (r2[e2.textNodeName] = s2) : void 0 !== s2 && (r2[e2.textNodeName] = s2), r2;
      }
      __name(vt, "vt");
      function St(t2) {
        const e2 = Object.keys(t2);
        for (let t3 = 0; t3 < e2.length; t3++) {
          const n2 = e2[t3];
          if (":@" !== n2) return n2;
        }
      }
      __name(St, "St");
      function _t(t2, e2, n2, i2) {
        if (e2) {
          const s2 = Object.keys(e2), r2 = s2.length;
          for (let o2 = 0; o2 < r2; o2++) {
            const r3 = s2[o2], a2 = r3.startsWith(i2.attributeNamePrefix) ? r3.substring(i2.attributeNamePrefix.length) : r3, h2 = i2.jPath ? n2.toString() + "." + a2 : n2;
            i2.isArray(r3, h2, true, true) ? t2[r3] = [e2[r3]] : t2[r3] = e2[r3];
          }
        }
      }
      __name(_t, "_t");
      function At(t2, e2) {
        const { textNodeName: n2 } = e2, i2 = Object.keys(t2).length;
        return 0 === i2 || !(1 !== i2 || !t2[n2] && "boolean" != typeof t2[n2] && 0 !== t2[n2]);
      }
      __name(At, "At");
      class Tt {
        static {
          __name(this, "Tt");
        }
        constructor(t2) {
          this.externalEntities = {}, this.options = C(t2);
        }
        parse(t2, e2) {
          if ("string" != typeof t2 && t2.toString) t2 = t2.toString();
          else if ("string" != typeof t2) throw new Error("XML data is accepted in String or Bytes[] form.");
          if (e2) {
            true === e2 && (e2 = {});
            const n3 = l(t2, e2);
            if (true !== n3) throw Error(`${n3.err.msg}:${n3.err.line}:${n3.err.col}`);
          }
          const n2 = new it(this.options);
          n2.entityDecoder.setExternalEntities(this.externalEntities);
          const i2 = n2.parseXml(t2);
          return this.options.preserveOrder || void 0 === i2 ? i2 : wt(i2, this.options, n2.matcher, n2.readonlyMatcher);
        }
        addEntity(t2, e2) {
          if (-1 !== e2.indexOf("&")) throw new Error("Entity value can't have '&'");
          if (-1 !== t2.indexOf("&") || -1 !== t2.indexOf(";")) throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
          if ("&" === e2) throw new Error("An entity with value '&' is not permitted");
          this.externalEntities[t2] = e2;
        }
        static getMetaDataSymbol() {
          return O.getMetaDataSymbol();
        }
      }
      function Ct(t2, e2) {
        let n2 = "";
        e2.format && e2.indentBy.length > 0 && (n2 = "\n");
        const i2 = [];
        if (e2.stopNodes && Array.isArray(e2.stopNodes)) for (let t3 = 0; t3 < e2.stopNodes.length; t3++) {
          const n3 = e2.stopNodes[t3];
          "string" == typeof n3 ? i2.push(new G(n3)) : n3 instanceof G && i2.push(n3);
        }
        return Pt(t2, e2, n2, new R(), i2);
      }
      __name(Ct, "Ct");
      function Pt(t2, e2, n2, i2, s2) {
        let r2 = "", o2 = false;
        if (e2.maxNestedTags && i2.getDepth() > e2.maxNestedTags) throw new Error("Maximum nested tags exceeded");
        if (!Array.isArray(t2)) {
          if (null != t2) {
            let n3 = t2.toString();
            return n3 = Vt(n3, e2), n3;
          }
          return "";
        }
        for (let a2 = 0; a2 < t2.length; a2++) {
          const h2 = t2[a2], l2 = Dt(h2);
          if (void 0 === l2) continue;
          const u2 = Ot(h2[":@"], e2);
          i2.push(l2, u2);
          const p2 = jt(i2, s2);
          if (l2 === e2.textNodeName) {
            let t3 = h2[l2];
            p2 || (t3 = e2.tagValueProcessor(l2, t3), t3 = Vt(t3, e2)), o2 && (r2 += n2), r2 += t3, o2 = false, i2.pop();
            continue;
          }
          if (l2 === e2.cdataPropName) {
            o2 && (r2 += n2);
            const t3 = h2[l2][0][e2.textNodeName];
            r2 += `<![CDATA[${String(t3).replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`, o2 = false, i2.pop();
            continue;
          }
          if (l2 === e2.commentPropName) {
            const t3 = h2[l2][0][e2.textNodeName];
            r2 += n2 + `<!--${String(t3).replace(/--/g, "- -").replace(/-$/, "- ")}-->`, o2 = true, i2.pop();
            continue;
          }
          if ("?" === l2[0]) {
            const t3 = Mt(h2[":@"], e2, p2), s3 = "?xml" === l2 ? "" : n2;
            let a3 = h2[l2][0][e2.textNodeName];
            a3 = 0 !== a3.length ? " " + a3 : "", r2 += s3 + `<${l2}${a3}${t3}?>`, o2 = true, i2.pop();
            continue;
          }
          let c2 = n2;
          "" !== c2 && (c2 += e2.indentBy);
          const d2 = n2 + `<${l2}${Mt(h2[":@"], e2, p2)}`;
          let f2;
          f2 = p2 ? $t(h2[l2], e2) : Pt(h2[l2], e2, c2, i2, s2), -1 !== e2.unpairedTags.indexOf(l2) ? e2.suppressUnpairedNode ? r2 += d2 + ">" : r2 += d2 + "/>" : f2 && 0 !== f2.length || !e2.suppressEmptyNode ? f2 && f2.endsWith(">") ? r2 += d2 + `>${f2}${n2}</${l2}>` : (r2 += d2 + ">", f2 && "" !== n2 && (f2.includes("/>") || f2.includes("</")) ? r2 += n2 + e2.indentBy + f2 + n2 : r2 += f2, r2 += `</${l2}>`) : r2 += d2 + "/>", o2 = true, i2.pop();
        }
        return r2;
      }
      __name(Pt, "Pt");
      function Ot(t2, e2) {
        if (!t2 || e2.ignoreAttributes) return null;
        const n2 = {};
        let i2 = false;
        for (let s2 in t2) Object.prototype.hasOwnProperty.call(t2, s2) && (n2[s2.startsWith(e2.attributeNamePrefix) ? s2.substr(e2.attributeNamePrefix.length) : s2] = t2[s2], i2 = true);
        return i2 ? n2 : null;
      }
      __name(Ot, "Ot");
      function $t(t2, e2) {
        if (!Array.isArray(t2)) return null != t2 ? t2.toString() : "";
        let n2 = "";
        for (let i2 = 0; i2 < t2.length; i2++) {
          const s2 = t2[i2], r2 = Dt(s2);
          if (r2 === e2.textNodeName) n2 += s2[r2];
          else if (r2 === e2.cdataPropName) n2 += s2[r2][0][e2.textNodeName];
          else if (r2 === e2.commentPropName) n2 += s2[r2][0][e2.textNodeName];
          else {
            if (r2 && "?" === r2[0]) continue;
            if (r2) {
              const t3 = It(s2[":@"], e2), i3 = $t(s2[r2], e2);
              i3 && 0 !== i3.length ? n2 += `<${r2}${t3}>${i3}</${r2}>` : n2 += `<${r2}${t3}/>`;
            }
          }
        }
        return n2;
      }
      __name($t, "$t");
      function It(t2, e2) {
        let n2 = "";
        if (t2 && !e2.ignoreAttributes) for (let i2 in t2) {
          if (!Object.prototype.hasOwnProperty.call(t2, i2)) continue;
          let s2 = t2[i2];
          true === s2 && e2.suppressBooleanAttributes ? n2 += ` ${i2.substr(e2.attributeNamePrefix.length)}` : n2 += ` ${i2.substr(e2.attributeNamePrefix.length)}="${s2}"`;
        }
        return n2;
      }
      __name(It, "It");
      function Dt(t2) {
        const e2 = Object.keys(t2);
        for (let n2 = 0; n2 < e2.length; n2++) {
          const i2 = e2[n2];
          if (Object.prototype.hasOwnProperty.call(t2, i2) && ":@" !== i2) return i2;
        }
      }
      __name(Dt, "Dt");
      function Mt(t2, e2, n2) {
        let i2 = "";
        if (t2 && !e2.ignoreAttributes) for (let s2 in t2) {
          if (!Object.prototype.hasOwnProperty.call(t2, s2)) continue;
          let r2;
          n2 ? r2 = t2[s2] : (r2 = e2.attributeValueProcessor(s2, t2[s2]), r2 = Vt(r2, e2)), true === r2 && e2.suppressBooleanAttributes ? i2 += ` ${s2.substr(e2.attributeNamePrefix.length)}` : i2 += ` ${s2.substr(e2.attributeNamePrefix.length)}="${r2}"`;
        }
        return i2;
      }
      __name(Mt, "Mt");
      function jt(t2, e2) {
        if (!e2 || 0 === e2.length) return false;
        for (let n2 = 0; n2 < e2.length; n2++) if (t2.matches(e2[n2])) return true;
        return false;
      }
      __name(jt, "jt");
      function Vt(t2, e2) {
        if (t2 && t2.length > 0 && e2.processEntities) for (let n2 = 0; n2 < e2.entities.length; n2++) {
          const i2 = e2.entities[n2];
          t2 = t2.replace(i2.regex, i2.val);
        }
        return t2;
      }
      __name(Vt, "Vt");
      const Lt = { attributeNamePrefix: "@_", attributesGroupName: false, textNodeName: "#text", ignoreAttributes: true, cdataPropName: false, format: false, indentBy: "  ", suppressEmptyNode: false, suppressUnpairedNode: true, suppressBooleanAttributes: true, tagValueProcessor: /* @__PURE__ */ __name(function(t2, e2) {
        return e2;
      }, "tagValueProcessor"), attributeValueProcessor: /* @__PURE__ */ __name(function(t2, e2) {
        return e2;
      }, "attributeValueProcessor"), preserveOrder: false, commentPropName: false, unpairedTags: [], entities: [{ regex: new RegExp("&", "g"), val: "&amp;" }, { regex: new RegExp(">", "g"), val: "&gt;" }, { regex: new RegExp("<", "g"), val: "&lt;" }, { regex: new RegExp("'", "g"), val: "&apos;" }, { regex: new RegExp('"', "g"), val: "&quot;" }], processEntities: true, stopNodes: [], oneListGroup: false, maxNestedTags: 100, jPath: true };
      function kt(t2) {
        if (this.options = Object.assign({}, Lt, t2), this.options.stopNodes && Array.isArray(this.options.stopNodes) && (this.options.stopNodes = this.options.stopNodes.map((t3) => "string" == typeof t3 && t3.startsWith("*.") ? ".." + t3.substring(2) : t3)), this.stopNodeExpressions = [], this.options.stopNodes && Array.isArray(this.options.stopNodes)) for (let t3 = 0; t3 < this.options.stopNodes.length; t3++) {
          const e3 = this.options.stopNodes[t3];
          "string" == typeof e3 ? this.stopNodeExpressions.push(new G(e3)) : e3 instanceof G && this.stopNodeExpressions.push(e3);
        }
        var e2;
        true === this.options.ignoreAttributes || this.options.attributesGroupName ? this.isAttribute = function() {
          return false;
        } : (this.ignoreAttributesFn = "function" == typeof (e2 = this.options.ignoreAttributes) ? e2 : Array.isArray(e2) ? (t3) => {
          for (const n2 of e2) {
            if ("string" == typeof n2 && t3 === n2) return true;
            if (n2 instanceof RegExp && n2.test(t3)) return true;
          }
        } : () => false, this.attrPrefixLen = this.options.attributeNamePrefix.length, this.isAttribute = Gt), this.processTextOrObjNode = Ft, this.options.format ? (this.indentate = Rt, this.tagEndChar = ">\n", this.newLine = "\n") : (this.indentate = function() {
          return "";
        }, this.tagEndChar = ">", this.newLine = "");
      }
      __name(kt, "kt");
      function Ft(t2, e2, n2, i2) {
        const s2 = this.extractAttributes(t2);
        if (i2.push(e2, s2), this.checkStopNode(i2)) {
          const s3 = this.buildRawContent(t2), r3 = this.buildAttributesForStopNode(t2);
          return i2.pop(), this.buildObjectNode(s3, e2, r3, n2);
        }
        const r2 = this.j2x(t2, n2 + 1, i2);
        return i2.pop(), void 0 !== t2[this.options.textNodeName] && 1 === Object.keys(t2).length ? this.buildTextValNode(t2[this.options.textNodeName], e2, r2.attrStr, n2, i2) : this.buildObjectNode(r2.val, e2, r2.attrStr, n2);
      }
      __name(Ft, "Ft");
      function Rt(t2) {
        return this.options.indentBy.repeat(t2);
      }
      __name(Rt, "Rt");
      function Gt(t2) {
        return !(!t2.startsWith(this.options.attributeNamePrefix) || t2 === this.options.textNodeName) && t2.substr(this.attrPrefixLen);
      }
      __name(Gt, "Gt");
      kt.prototype.build = function(t2) {
        if (this.options.preserveOrder) return Ct(t2, this.options);
        {
          Array.isArray(t2) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1 && (t2 = { [this.options.arrayNodeName]: t2 });
          const e2 = new R();
          return this.j2x(t2, 0, e2).val;
        }
      }, kt.prototype.j2x = function(t2, e2, n2) {
        let i2 = "", s2 = "";
        if (this.options.maxNestedTags && n2.getDepth() >= this.options.maxNestedTags) throw new Error("Maximum nested tags exceeded");
        const r2 = this.options.jPath ? n2.toString() : n2, o2 = this.checkStopNode(n2);
        for (let a2 in t2) if (Object.prototype.hasOwnProperty.call(t2, a2)) if (void 0 === t2[a2]) this.isAttribute(a2) && (s2 += "");
        else if (null === t2[a2]) this.isAttribute(a2) || a2 === this.options.cdataPropName ? s2 += "" : "?" === a2[0] ? s2 += this.indentate(e2) + "<" + a2 + "?" + this.tagEndChar : s2 += this.indentate(e2) + "<" + a2 + "/" + this.tagEndChar;
        else if (t2[a2] instanceof Date) s2 += this.buildTextValNode(t2[a2], a2, "", e2, n2);
        else if ("object" != typeof t2[a2]) {
          const h2 = this.isAttribute(a2);
          if (h2 && !this.ignoreAttributesFn(h2, r2)) i2 += this.buildAttrPairStr(h2, "" + t2[a2], o2);
          else if (!h2) if (a2 === this.options.textNodeName) {
            let e3 = this.options.tagValueProcessor(a2, "" + t2[a2]);
            s2 += this.replaceEntitiesValue(e3);
          } else {
            n2.push(a2);
            const i3 = this.checkStopNode(n2);
            if (n2.pop(), i3) {
              const n3 = "" + t2[a2];
              s2 += "" === n3 ? this.indentate(e2) + "<" + a2 + this.closeTag(a2) + this.tagEndChar : this.indentate(e2) + "<" + a2 + ">" + n3 + "</" + a2 + this.tagEndChar;
            } else s2 += this.buildTextValNode(t2[a2], a2, "", e2, n2);
          }
        } else if (Array.isArray(t2[a2])) {
          const i3 = t2[a2].length;
          let r3 = "", o3 = "";
          for (let h2 = 0; h2 < i3; h2++) {
            const i4 = t2[a2][h2];
            if (void 0 === i4) ;
            else if (null === i4) "?" === a2[0] ? s2 += this.indentate(e2) + "<" + a2 + "?" + this.tagEndChar : s2 += this.indentate(e2) + "<" + a2 + "/" + this.tagEndChar;
            else if ("object" == typeof i4) if (this.options.oneListGroup) {
              n2.push(a2);
              const t3 = this.j2x(i4, e2 + 1, n2);
              n2.pop(), r3 += t3.val, this.options.attributesGroupName && i4.hasOwnProperty(this.options.attributesGroupName) && (o3 += t3.attrStr);
            } else r3 += this.processTextOrObjNode(i4, a2, e2, n2);
            else if (this.options.oneListGroup) {
              let t3 = this.options.tagValueProcessor(a2, i4);
              t3 = this.replaceEntitiesValue(t3), r3 += t3;
            } else {
              n2.push(a2);
              const t3 = this.checkStopNode(n2);
              if (n2.pop(), t3) {
                const t4 = "" + i4;
                r3 += "" === t4 ? this.indentate(e2) + "<" + a2 + this.closeTag(a2) + this.tagEndChar : this.indentate(e2) + "<" + a2 + ">" + t4 + "</" + a2 + this.tagEndChar;
              } else r3 += this.buildTextValNode(i4, a2, "", e2, n2);
            }
          }
          this.options.oneListGroup && (r3 = this.buildObjectNode(r3, a2, o3, e2)), s2 += r3;
        } else if (this.options.attributesGroupName && a2 === this.options.attributesGroupName) {
          const e3 = Object.keys(t2[a2]), n3 = e3.length;
          for (let s3 = 0; s3 < n3; s3++) i2 += this.buildAttrPairStr(e3[s3], "" + t2[a2][e3[s3]], o2);
        } else s2 += this.processTextOrObjNode(t2[a2], a2, e2, n2);
        return { attrStr: i2, val: s2 };
      }, kt.prototype.buildAttrPairStr = function(t2, e2, n2) {
        return n2 || (e2 = this.options.attributeValueProcessor(t2, "" + e2), e2 = this.replaceEntitiesValue(e2)), this.options.suppressBooleanAttributes && "true" === e2 ? " " + t2 : " " + t2 + '="' + e2 + '"';
      }, kt.prototype.extractAttributes = function(t2) {
        if (!t2 || "object" != typeof t2) return null;
        const e2 = {};
        let n2 = false;
        if (this.options.attributesGroupName && t2[this.options.attributesGroupName]) {
          const i2 = t2[this.options.attributesGroupName];
          for (let t3 in i2) Object.prototype.hasOwnProperty.call(i2, t3) && (e2[t3.startsWith(this.options.attributeNamePrefix) ? t3.substring(this.options.attributeNamePrefix.length) : t3] = i2[t3], n2 = true);
        } else for (let i2 in t2) {
          if (!Object.prototype.hasOwnProperty.call(t2, i2)) continue;
          const s2 = this.isAttribute(i2);
          s2 && (e2[s2] = t2[i2], n2 = true);
        }
        return n2 ? e2 : null;
      }, kt.prototype.buildRawContent = function(t2) {
        if ("string" == typeof t2) return t2;
        if ("object" != typeof t2 || null === t2) return String(t2);
        if (void 0 !== t2[this.options.textNodeName]) return t2[this.options.textNodeName];
        let e2 = "";
        for (let n2 in t2) {
          if (!Object.prototype.hasOwnProperty.call(t2, n2)) continue;
          if (this.isAttribute(n2)) continue;
          if (this.options.attributesGroupName && n2 === this.options.attributesGroupName) continue;
          const i2 = t2[n2];
          if (n2 === this.options.textNodeName) e2 += i2;
          else if (Array.isArray(i2)) {
            for (let t3 of i2) if ("string" == typeof t3 || "number" == typeof t3) e2 += `<${n2}>${t3}</${n2}>`;
            else if ("object" == typeof t3 && null !== t3) {
              const i3 = this.buildRawContent(t3), s2 = this.buildAttributesForStopNode(t3);
              e2 += "" === i3 ? `<${n2}${s2}/>` : `<${n2}${s2}>${i3}</${n2}>`;
            }
          } else if ("object" == typeof i2 && null !== i2) {
            const t3 = this.buildRawContent(i2), s2 = this.buildAttributesForStopNode(i2);
            e2 += "" === t3 ? `<${n2}${s2}/>` : `<${n2}${s2}>${t3}</${n2}>`;
          } else e2 += `<${n2}>${i2}</${n2}>`;
        }
        return e2;
      }, kt.prototype.buildAttributesForStopNode = function(t2) {
        if (!t2 || "object" != typeof t2) return "";
        let e2 = "";
        if (this.options.attributesGroupName && t2[this.options.attributesGroupName]) {
          const n2 = t2[this.options.attributesGroupName];
          for (let t3 in n2) {
            if (!Object.prototype.hasOwnProperty.call(n2, t3)) continue;
            const i2 = t3.startsWith(this.options.attributeNamePrefix) ? t3.substring(this.options.attributeNamePrefix.length) : t3, s2 = n2[t3];
            true === s2 && this.options.suppressBooleanAttributes ? e2 += " " + i2 : e2 += " " + i2 + '="' + s2 + '"';
          }
        } else for (let n2 in t2) {
          if (!Object.prototype.hasOwnProperty.call(t2, n2)) continue;
          const i2 = this.isAttribute(n2);
          if (i2) {
            const s2 = t2[n2];
            true === s2 && this.options.suppressBooleanAttributes ? e2 += " " + i2 : e2 += " " + i2 + '="' + s2 + '"';
          }
        }
        return e2;
      }, kt.prototype.buildObjectNode = function(t2, e2, n2, i2) {
        if ("" === t2) return "?" === e2[0] ? this.indentate(i2) + "<" + e2 + n2 + "?" + this.tagEndChar : this.indentate(i2) + "<" + e2 + n2 + this.closeTag(e2) + this.tagEndChar;
        {
          let s2 = "</" + e2 + this.tagEndChar, r2 = "";
          return "?" === e2[0] && (r2 = "?", s2 = ""), !n2 && "" !== n2 || -1 !== t2.indexOf("<") ? false !== this.options.commentPropName && e2 === this.options.commentPropName && 0 === r2.length ? this.indentate(i2) + `<!--${t2}-->` + this.newLine : this.indentate(i2) + "<" + e2 + n2 + r2 + this.tagEndChar + t2 + this.indentate(i2) + s2 : this.indentate(i2) + "<" + e2 + n2 + r2 + ">" + t2 + s2;
        }
      }, kt.prototype.closeTag = function(t2) {
        let e2 = "";
        return -1 !== this.options.unpairedTags.indexOf(t2) ? this.options.suppressUnpairedNode || (e2 = "/") : e2 = this.options.suppressEmptyNode ? "/" : `></${t2}`, e2;
      }, kt.prototype.checkStopNode = function(t2) {
        if (!this.stopNodeExpressions || 0 === this.stopNodeExpressions.length) return false;
        for (let e2 = 0; e2 < this.stopNodeExpressions.length; e2++) if (t2.matches(this.stopNodeExpressions[e2])) return true;
        return false;
      }, kt.prototype.buildTextValNode = function(t2, e2, n2, i2, s2) {
        if (false !== this.options.cdataPropName && e2 === this.options.cdataPropName) {
          const e3 = String(t2).replace(/\]\]>/g, "]]]]><![CDATA[>");
          return this.indentate(i2) + `<![CDATA[${e3}]]>` + this.newLine;
        }
        if (false !== this.options.commentPropName && e2 === this.options.commentPropName) {
          const e3 = String(t2).replace(/--/g, "- -").replace(/-$/, "- ");
          return this.indentate(i2) + `<!--${e3}-->` + this.newLine;
        }
        if ("?" === e2[0]) return this.indentate(i2) + "<" + e2 + n2 + "?" + this.tagEndChar;
        {
          let s3 = this.options.tagValueProcessor(e2, t2);
          return s3 = this.replaceEntitiesValue(s3), "" === s3 ? this.indentate(i2) + "<" + e2 + n2 + this.closeTag(e2) + this.tagEndChar : this.indentate(i2) + "<" + e2 + n2 + ">" + s3 + "</" + e2 + this.tagEndChar;
        }
      }, kt.prototype.replaceEntitiesValue = function(t2) {
        if (t2 && t2.length > 0 && this.options.processEntities) for (let e2 = 0; e2 < this.options.entities.length; e2++) {
          const n2 = this.options.entities[e2];
          t2 = t2.replace(n2.regex, n2.val);
        }
        return t2;
      };
      const Bt = kt, Ut = { validate: l };
      module.exports = e;
    })();
  }
});

// node_modules/@aws-sdk/xml-builder/dist-cjs/xml-parser.js
var require_xml_parser = __commonJS({
  "node_modules/@aws-sdk/xml-builder/dist-cjs/xml-parser.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseXML = parseXML3;
    var fast_xml_parser_1 = require_fxp();
    var parser = new fast_xml_parser_1.XMLParser({
      attributeNamePrefix: "",
      processEntities: {
        enabled: true,
        maxTotalExpansions: Infinity
      },
      htmlEntities: true,
      ignoreAttributes: false,
      ignoreDeclaration: true,
      parseTagValue: false,
      trimValues: false,
      tagValueProcessor: /* @__PURE__ */ __name((_, val) => val.trim() === "" && val.includes("\n") ? "" : void 0, "tagValueProcessor"),
      maxNestedTags: Infinity
    });
    function parseXML3(xmlString) {
      return parser.parse(xmlString, true);
    }
    __name(parseXML3, "parseXML");
  }
});

// node_modules/@aws-sdk/xml-builder/dist-cjs/index.js
var require_dist_cjs36 = __commonJS({
  "node_modules/@aws-sdk/xml-builder/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var xmlParser = require_xml_parser();
    var ATTR_ESCAPE_RE = /[&<>"]/g;
    var ATTR_ESCAPE_MAP = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    };
    function escapeAttribute(value) {
      return value.replace(ATTR_ESCAPE_RE, (ch) => ATTR_ESCAPE_MAP[ch]);
    }
    __name(escapeAttribute, "escapeAttribute");
    var ELEMENT_ESCAPE_RE = /[&"'<>\r\n\u0085\u2028]/g;
    var ELEMENT_ESCAPE_MAP = {
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
      "<": "&lt;",
      ">": "&gt;",
      "\r": "&#x0D;",
      "\n": "&#x0A;",
      "": "&#x85;",
      "\u2028": "&#x2028;"
    };
    function escapeElement(value) {
      return value.replace(ELEMENT_ESCAPE_RE, (ch) => ELEMENT_ESCAPE_MAP[ch]);
    }
    __name(escapeElement, "escapeElement");
    var XmlText2 = class {
      static {
        __name(this, "XmlText");
      }
      value;
      constructor(value) {
        this.value = value;
      }
      toString() {
        return escapeElement("" + this.value);
      }
    };
    var XmlNode2 = class _XmlNode {
      static {
        __name(this, "XmlNode");
      }
      name;
      children;
      attributes = {};
      static of(name, childText, withName) {
        const node = new _XmlNode(name);
        if (childText !== void 0) {
          node.addChildNode(new XmlText2(childText));
        }
        if (withName !== void 0) {
          node.withName(withName);
        }
        return node;
      }
      constructor(name, children = []) {
        this.name = name;
        this.children = children;
      }
      withName(name) {
        this.name = name;
        return this;
      }
      addAttribute(name, value) {
        this.attributes[name] = value;
        return this;
      }
      addChildNode(child) {
        this.children.push(child);
        return this;
      }
      removeAttribute(name) {
        delete this.attributes[name];
        return this;
      }
      n(name) {
        this.name = name;
        return this;
      }
      c(child) {
        this.children.push(child);
        return this;
      }
      a(name, value) {
        if (value != null) {
          this.attributes[name] = value;
        }
        return this;
      }
      cc(input, field, withName = field) {
        if (input[field] != null) {
          const node = _XmlNode.of(field, input[field]).withName(withName);
          this.c(node);
        }
      }
      l(input, listName, memberName, valueProvider) {
        if (input[listName] != null) {
          const nodes = valueProvider();
          nodes.map((node) => {
            node.withName(memberName);
            this.c(node);
          });
        }
      }
      lc(input, listName, memberName, valueProvider) {
        if (input[listName] != null) {
          const nodes = valueProvider();
          const containerNode = new _XmlNode(memberName);
          nodes.map((node) => {
            containerNode.c(node);
          });
          this.c(containerNode);
        }
      }
      toString() {
        const hasChildren = Boolean(this.children.length);
        let xmlText = `<${this.name}`;
        const attributes = this.attributes;
        for (const attributeName of Object.keys(attributes)) {
          const attribute = attributes[attributeName];
          if (attribute != null) {
            xmlText += ` ${attributeName}="${escapeAttribute("" + attribute)}"`;
          }
        }
        return xmlText += !hasChildren ? "/>" : `>${this.children.map((c) => c.toString()).join("")}</${this.name}>`;
      }
    };
    exports.parseXML = xmlParser.parseXML;
    exports.XmlNode = XmlNode2;
    exports.XmlText = XmlText2;
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/XmlShapeDeserializer.js
var import_xml_builder, import_smithy_client3, import_util_utf82, XmlShapeDeserializer;
var init_XmlShapeDeserializer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/XmlShapeDeserializer.js"() {
    init_esm();
    import_xml_builder = __toESM(require_dist_cjs36());
    init_protocols();
    init_schema();
    import_smithy_client3 = __toESM(require_dist_cjs14());
    import_util_utf82 = __toESM(require_dist_cjs7());
    init_ConfigurableSerdeContext();
    init_UnionSerde();
    XmlShapeDeserializer = class extends SerdeContextConfig {
      static {
        __name(this, "XmlShapeDeserializer");
      }
      settings;
      stringDeserializer;
      constructor(settings) {
        super();
        this.settings = settings;
        this.stringDeserializer = new FromStringShapeDeserializer(settings);
      }
      setSerdeContext(serdeContext) {
        this.serdeContext = serdeContext;
        this.stringDeserializer.setSerdeContext(serdeContext);
      }
      read(schema, bytes, key) {
        const ns = NormalizedSchema.of(schema);
        const memberSchemas = ns.getMemberSchemas();
        const isEventPayload = ns.isStructSchema() && ns.isMemberSchema() && !!Object.values(memberSchemas).find((memberNs) => {
          return !!memberNs.getMemberTraits().eventPayload;
        });
        if (isEventPayload) {
          const output = {};
          const memberName = Object.keys(memberSchemas)[0];
          const eventMemberSchema = memberSchemas[memberName];
          if (eventMemberSchema.isBlobSchema()) {
            output[memberName] = bytes;
          } else {
            output[memberName] = this.read(memberSchemas[memberName], bytes);
          }
          return output;
        }
        const xmlString = (this.serdeContext?.utf8Encoder ?? import_util_utf82.toUtf8)(bytes);
        const parsedObject = this.parseXml(xmlString);
        return this.readSchema(schema, key ? parsedObject[key] : parsedObject);
      }
      readSchema(_schema, value) {
        const ns = NormalizedSchema.of(_schema);
        if (ns.isUnitSchema()) {
          return;
        }
        const traits = ns.getMergedTraits();
        if (ns.isListSchema() && !Array.isArray(value)) {
          return this.readSchema(ns, [value]);
        }
        if (value == null) {
          return value;
        }
        if (typeof value === "object") {
          const flat = !!traits.xmlFlattened;
          if (ns.isListSchema()) {
            const listValue = ns.getValueSchema();
            const buffer2 = [];
            const sourceKey = listValue.getMergedTraits().xmlName ?? "member";
            const source = flat ? value : (value[0] ?? value)[sourceKey];
            if (source == null) {
              return buffer2;
            }
            const sourceArray = Array.isArray(source) ? source : [source];
            for (const v of sourceArray) {
              buffer2.push(this.readSchema(listValue, v));
            }
            return buffer2;
          }
          const buffer = {};
          if (ns.isMapSchema()) {
            const keyNs = ns.getKeySchema();
            const memberNs = ns.getValueSchema();
            let entries;
            if (flat) {
              entries = Array.isArray(value) ? value : [value];
            } else {
              entries = Array.isArray(value.entry) ? value.entry : [value.entry];
            }
            const keyProperty = keyNs.getMergedTraits().xmlName ?? "key";
            const valueProperty = memberNs.getMergedTraits().xmlName ?? "value";
            for (const entry of entries) {
              const key = entry[keyProperty];
              const value2 = entry[valueProperty];
              buffer[key] = this.readSchema(memberNs, value2);
            }
            return buffer;
          }
          if (ns.isStructSchema()) {
            const union = ns.isUnionSchema();
            let unionSerde;
            if (union) {
              unionSerde = new UnionSerde(value, buffer);
            }
            for (const [memberName, memberSchema] of ns.structIterator()) {
              const memberTraits = memberSchema.getMergedTraits();
              const xmlObjectKey = !memberTraits.httpPayload ? memberSchema.getMemberTraits().xmlName ?? memberName : memberTraits.xmlName ?? memberSchema.getName();
              if (union) {
                unionSerde.mark(xmlObjectKey);
              }
              if (value[xmlObjectKey] != null) {
                buffer[memberName] = this.readSchema(memberSchema, value[xmlObjectKey]);
              }
            }
            if (union) {
              unionSerde.writeUnknown();
            }
            return buffer;
          }
          if (ns.isDocumentSchema()) {
            return value;
          }
          throw new Error(`@aws-sdk/core/protocols - xml deserializer unhandled schema type for ${ns.getName(true)}`);
        }
        if (ns.isListSchema()) {
          return [];
        }
        if (ns.isMapSchema() || ns.isStructSchema()) {
          return {};
        }
        return this.stringDeserializer.read(ns, value);
      }
      parseXml(xml) {
        if (xml.length) {
          let parsedObj;
          try {
            parsedObj = (0, import_xml_builder.parseXML)(xml);
          } catch (e) {
            if (e && typeof e === "object") {
              Object.defineProperty(e, "$responseBodyText", {
                value: xml
              });
            }
            throw e;
          }
          const textNodeName = "#text";
          const key = Object.keys(parsedObj)[0];
          const parsedObjToReturn = parsedObj[key];
          if (parsedObjToReturn[textNodeName]) {
            parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
            delete parsedObjToReturn[textNodeName];
          }
          return (0, import_smithy_client3.getValueFromTextNode)(parsedObjToReturn);
        }
        return {};
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/QueryShapeSerializer.js
var import_smithy_client4, import_util_base643, QueryShapeSerializer;
var init_QueryShapeSerializer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/QueryShapeSerializer.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_serde();
    import_smithy_client4 = __toESM(require_dist_cjs14());
    import_util_base643 = __toESM(require_dist_cjs8());
    init_ConfigurableSerdeContext();
    QueryShapeSerializer = class extends SerdeContextConfig {
      static {
        __name(this, "QueryShapeSerializer");
      }
      settings;
      buffer;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      write(schema, value, prefix = "") {
        if (this.buffer === void 0) {
          this.buffer = "";
        }
        const ns = NormalizedSchema.of(schema);
        if (prefix && !prefix.endsWith(".")) {
          prefix += ".";
        }
        if (ns.isBlobSchema()) {
          if (typeof value === "string" || value instanceof Uint8Array) {
            this.writeKey(prefix);
            this.writeValue((this.serdeContext?.base64Encoder ?? import_util_base643.toBase64)(value));
          }
        } else if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isStringSchema()) {
          if (value != null) {
            this.writeKey(prefix);
            this.writeValue(String(value));
          } else if (ns.isIdempotencyToken()) {
            this.writeKey(prefix);
            this.writeValue((0, import_uuid.v4)());
          }
        } else if (ns.isBigIntegerSchema()) {
          if (value != null) {
            this.writeKey(prefix);
            this.writeValue(String(value));
          }
        } else if (ns.isBigDecimalSchema()) {
          if (value != null) {
            this.writeKey(prefix);
            this.writeValue(value instanceof NumericValue ? value.string : String(value));
          }
        } else if (ns.isTimestampSchema()) {
          if (value instanceof Date) {
            this.writeKey(prefix);
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
              case 5:
                this.writeValue(value.toISOString().replace(".000Z", "Z"));
                break;
              case 6:
                this.writeValue((0, import_smithy_client4.dateToUtcString)(value));
                break;
              case 7:
                this.writeValue(String(value.getTime() / 1e3));
                break;
            }
          }
        } else if (ns.isDocumentSchema()) {
          if (Array.isArray(value)) {
            this.write(64 | 15, value, prefix);
          } else if (value instanceof Date) {
            this.write(4, value, prefix);
          } else if (value instanceof Uint8Array) {
            this.write(21, value, prefix);
          } else if (value && typeof value === "object") {
            this.write(128 | 15, value, prefix);
          } else {
            this.writeKey(prefix);
            this.writeValue(String(value));
          }
        } else if (ns.isListSchema()) {
          if (Array.isArray(value)) {
            if (value.length === 0) {
              if (this.settings.serializeEmptyLists) {
                this.writeKey(prefix);
                this.writeValue("");
              }
            } else {
              const member = ns.getValueSchema();
              const flat = this.settings.flattenLists || ns.getMergedTraits().xmlFlattened;
              let i = 1;
              for (const item of value) {
                if (item == null) {
                  continue;
                }
                const traits = member.getMergedTraits();
                const suffix = this.getKey("member", traits.xmlName, traits.ec2QueryName);
                const key = flat ? `${prefix}${i}` : `${prefix}${suffix}.${i}`;
                this.write(member, item, key);
                ++i;
              }
            }
          }
        } else if (ns.isMapSchema()) {
          if (value && typeof value === "object") {
            const keySchema = ns.getKeySchema();
            const memberSchema = ns.getValueSchema();
            const flat = ns.getMergedTraits().xmlFlattened;
            let i = 1;
            for (const k in value) {
              const v = value[k];
              if (v == null) {
                continue;
              }
              const keyTraits = keySchema.getMergedTraits();
              const keySuffix = this.getKey("key", keyTraits.xmlName, keyTraits.ec2QueryName);
              const key = flat ? `${prefix}${i}.${keySuffix}` : `${prefix}entry.${i}.${keySuffix}`;
              const valTraits = memberSchema.getMergedTraits();
              const valueSuffix = this.getKey("value", valTraits.xmlName, valTraits.ec2QueryName);
              const valueKey = flat ? `${prefix}${i}.${valueSuffix}` : `${prefix}entry.${i}.${valueSuffix}`;
              this.write(keySchema, k, key);
              this.write(memberSchema, v, valueKey);
              ++i;
            }
          }
        } else if (ns.isStructSchema()) {
          if (value && typeof value === "object") {
            let didWriteMember = false;
            for (const [memberName, member] of ns.structIterator()) {
              if (value[memberName] == null && !member.isIdempotencyToken()) {
                continue;
              }
              const traits = member.getMergedTraits();
              const suffix = this.getKey(memberName, traits.xmlName, traits.ec2QueryName, "struct");
              const key = `${prefix}${suffix}`;
              this.write(member, value[memberName], key);
              didWriteMember = true;
            }
            if (!didWriteMember && ns.isUnionSchema()) {
              const { $unknown } = value;
              if (Array.isArray($unknown)) {
                const [k, v] = $unknown;
                const key = `${prefix}${k}`;
                this.write(15, v, key);
              }
            }
          }
        } else if (ns.isUnitSchema()) {
        } else {
          throw new Error(`@aws-sdk/core/protocols - QuerySerializer unrecognized schema type ${ns.getName(true)}`);
        }
      }
      flush() {
        if (this.buffer === void 0) {
          throw new Error("@aws-sdk/core/protocols - QuerySerializer cannot flush with nothing written to buffer.");
        }
        const str = this.buffer;
        delete this.buffer;
        return str;
      }
      getKey(memberName, xmlName, ec2QueryName, keySource) {
        const { ec2, capitalizeKeys } = this.settings;
        if (ec2 && ec2QueryName) {
          return ec2QueryName;
        }
        const key = xmlName ?? memberName;
        if (capitalizeKeys && keySource === "struct") {
          return key[0].toUpperCase() + key.slice(1);
        }
        return key;
      }
      writeKey(key) {
        if (key.endsWith(".")) {
          key = key.slice(0, key.length - 1);
        }
        this.buffer += `&${extendedEncodeURIComponent(key)}=`;
      }
      writeValue(value) {
        this.buffer += extendedEncodeURIComponent(value);
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/AwsQueryProtocol.js
var AwsQueryProtocol;
var init_AwsQueryProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/AwsQueryProtocol.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_ProtocolLib();
    init_XmlShapeDeserializer();
    init_QueryShapeSerializer();
    AwsQueryProtocol = class extends RpcProtocol {
      static {
        __name(this, "AwsQueryProtocol");
      }
      options;
      serializer;
      deserializer;
      mixin = new ProtocolLib();
      constructor(options) {
        super({
          defaultNamespace: options.defaultNamespace,
          errorTypeRegistries: options.errorTypeRegistries
        });
        this.options = options;
        const settings = {
          timestampFormat: {
            useTrait: true,
            default: 5
          },
          httpBindings: false,
          xmlNamespace: options.xmlNamespace,
          serviceNamespace: options.defaultNamespace,
          serializeEmptyLists: true
        };
        this.serializer = new QueryShapeSerializer(settings);
        this.deserializer = new XmlShapeDeserializer(settings);
      }
      getShapeId() {
        return "aws.protocols#awsQuery";
      }
      setSerdeContext(serdeContext) {
        this.serializer.setSerdeContext(serdeContext);
        this.deserializer.setSerdeContext(serdeContext);
      }
      getPayloadCodec() {
        throw new Error("AWSQuery protocol has no payload codec.");
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
          request.path += "/";
        }
        request.headers["content-type"] = "application/x-www-form-urlencoded";
        if (deref(operationSchema.input) === "unit" || !request.body) {
          request.body = "";
        }
        const action = operationSchema.name.split("#")[1] ?? operationSchema.name;
        request.body = `Action=${action}&Version=${this.options.version}` + request.body;
        if (request.body.endsWith("&")) {
          request.body = request.body.slice(-1);
        }
        return request;
      }
      async deserializeResponse(operationSchema, context, response) {
        const deserializer = this.deserializer;
        const ns = NormalizedSchema.of(operationSchema.output);
        const dataObject = {};
        if (response.statusCode >= 300) {
          const bytes2 = await collectBody(response.body, context);
          if (bytes2.byteLength > 0) {
            Object.assign(dataObject, await deserializer.read(15, bytes2));
          }
          await this.handleError(operationSchema, context, response, dataObject, this.deserializeMetadata(response));
        }
        for (const header in response.headers) {
          const value = response.headers[header];
          delete response.headers[header];
          response.headers[header.toLowerCase()] = value;
        }
        const shortName = operationSchema.name.split("#")[1] ?? operationSchema.name;
        const awsQueryResultKey = ns.isStructSchema() && this.useNestedResult() ? shortName + "Result" : void 0;
        const bytes = await collectBody(response.body, context);
        if (bytes.byteLength > 0) {
          Object.assign(dataObject, await deserializer.read(ns, bytes, awsQueryResultKey));
        }
        dataObject.$metadata = this.deserializeMetadata(response);
        return dataObject;
      }
      useNestedResult() {
        return true;
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = this.loadQueryErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const errorData = this.loadQueryError(dataObject) ?? {};
        const message = this.loadQueryErrorMessage(dataObject);
        errorData.message = message;
        errorData.Error = {
          Type: errorData.Type,
          Code: errorData.Code,
          Message: message
        };
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, errorData, metadata, this.mixin.findQueryCompatibleError);
        const ns = NormalizedSchema.of(errorSchema);
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor(message);
        const output = {
          Type: errorData.Error.Type,
          Code: errorData.Error.Code,
          Error: errorData.Error
        };
        for (const [name, member] of ns.structIterator()) {
          const target = member.getMergedTraits().xmlName ?? name;
          const value = errorData[target] ?? dataObject[target];
          output[name] = this.deserializer.readSchema(member, value);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output), dataObject);
      }
      loadQueryErrorCode(output, data2) {
        const code = (data2.Errors?.[0]?.Error ?? data2.Errors?.Error ?? data2.Error)?.Code;
        if (code !== void 0) {
          return code;
        }
        if (output.statusCode == 404) {
          return "NotFound";
        }
      }
      loadQueryError(data2) {
        return data2.Errors?.[0]?.Error ?? data2.Errors?.Error ?? data2.Error;
      }
      loadQueryErrorMessage(data2) {
        const errorData = this.loadQueryError(data2);
        return errorData?.message ?? errorData?.Message ?? data2.message ?? data2.Message ?? "Unknown";
      }
      getDefaultContentType() {
        return "application/x-www-form-urlencoded";
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/cbor/cbor-types.js
function alloc(size) {
  return typeof Buffer !== "undefined" ? Buffer.alloc(size) : new Uint8Array(size);
}
function tag(data2) {
  data2[tagSymbol] = true;
  return data2;
}
var majorUint64, majorNegativeInt64, majorUnstructuredByteString, majorUtf8String, majorList, majorMap, majorTag, majorSpecial, specialFalse, specialTrue, specialNull, specialUndefined, extendedOneByte, extendedFloat16, extendedFloat32, extendedFloat64, minorIndefinite, tagSymbol;
var init_cbor_types = __esm({
  "node_modules/@smithy/core/dist-es/submodules/cbor/cbor-types.js"() {
    init_esm();
    majorUint64 = 0;
    majorNegativeInt64 = 1;
    majorUnstructuredByteString = 2;
    majorUtf8String = 3;
    majorList = 4;
    majorMap = 5;
    majorTag = 6;
    majorSpecial = 7;
    specialFalse = 20;
    specialTrue = 21;
    specialNull = 22;
    specialUndefined = 23;
    extendedOneByte = 24;
    extendedFloat16 = 25;
    extendedFloat32 = 26;
    extendedFloat64 = 27;
    minorIndefinite = 31;
    __name(alloc, "alloc");
    tagSymbol = Symbol("@smithy/core/cbor::tagSymbol");
    __name(tag, "tag");
  }
});

// node_modules/@smithy/core/dist-es/submodules/cbor/cbor-decode.js
function setPayload(bytes) {
  payload = bytes;
  dataView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
}
function decode(at, to) {
  if (at >= to) {
    throw new Error("unexpected end of (decode) payload.");
  }
  const major = (payload[at] & 224) >> 5;
  const minor = payload[at] & 31;
  switch (major) {
    case majorUint64:
    case majorNegativeInt64:
    case majorTag:
      let unsignedInt;
      let offset;
      if (minor < 24) {
        unsignedInt = minor;
        offset = 1;
      } else {
        switch (minor) {
          case extendedOneByte:
          case extendedFloat16:
          case extendedFloat32:
          case extendedFloat64:
            const countLength = minorValueToArgumentLength[minor];
            const countOffset = countLength + 1;
            offset = countOffset;
            if (to - at < countOffset) {
              throw new Error(`countLength ${countLength} greater than remaining buf len.`);
            }
            const countIndex = at + 1;
            if (countLength === 1) {
              unsignedInt = payload[countIndex];
            } else if (countLength === 2) {
              unsignedInt = dataView.getUint16(countIndex);
            } else if (countLength === 4) {
              unsignedInt = dataView.getUint32(countIndex);
            } else {
              unsignedInt = dataView.getBigUint64(countIndex);
            }
            break;
          default:
            throw new Error(`unexpected minor value ${minor}.`);
        }
      }
      if (major === majorUint64) {
        _offset = offset;
        return castBigInt(unsignedInt);
      } else if (major === majorNegativeInt64) {
        let negativeInt;
        if (typeof unsignedInt === "bigint") {
          negativeInt = BigInt(-1) - unsignedInt;
        } else {
          negativeInt = -1 - unsignedInt;
        }
        _offset = offset;
        return castBigInt(negativeInt);
      } else {
        if (minor === 2 || minor === 3) {
          const length = decodeCount(at + offset, to);
          let b = BigInt(0);
          const start = at + offset + _offset;
          for (let i = start; i < start + length; ++i) {
            b = b << BigInt(8) | BigInt(payload[i]);
          }
          _offset = offset + _offset + length;
          return minor === 3 ? -b - BigInt(1) : b;
        } else if (minor === 4) {
          const decimalFraction = decode(at + offset, to);
          const [exponent, mantissa] = decimalFraction;
          const normalizer = mantissa < 0 ? -1 : 1;
          const mantissaStr = "0".repeat(Math.abs(exponent) + 1) + String(BigInt(normalizer) * BigInt(mantissa));
          let numericString;
          const sign = mantissa < 0 ? "-" : "";
          numericString = exponent === 0 ? mantissaStr : mantissaStr.slice(0, mantissaStr.length + exponent) + "." + mantissaStr.slice(exponent);
          numericString = numericString.replace(/^0+/g, "");
          if (numericString === "") {
            numericString = "0";
          }
          if (numericString[0] === ".") {
            numericString = "0" + numericString;
          }
          numericString = sign + numericString;
          _offset = offset + _offset;
          return nv(numericString);
        } else {
          const value = decode(at + offset, to);
          const valueOffset = _offset;
          _offset = offset + valueOffset;
          return tag({ tag: castBigInt(unsignedInt), value });
        }
      }
    case majorUtf8String:
    case majorMap:
    case majorList:
    case majorUnstructuredByteString:
      if (minor === minorIndefinite) {
        switch (major) {
          case majorUtf8String:
            return decodeUtf8StringIndefinite(at, to);
          case majorMap:
            return decodeMapIndefinite(at, to);
          case majorList:
            return decodeListIndefinite(at, to);
          case majorUnstructuredByteString:
            return decodeUnstructuredByteStringIndefinite(at, to);
        }
      } else {
        switch (major) {
          case majorUtf8String:
            return decodeUtf8String(at, to);
          case majorMap:
            return decodeMap(at, to);
          case majorList:
            return decodeList(at, to);
          case majorUnstructuredByteString:
            return decodeUnstructuredByteString(at, to);
        }
      }
    default:
      return decodeSpecial(at, to);
  }
}
function bytesToUtf8(bytes, at, to) {
  if (USE_BUFFER && bytes.constructor?.name === "Buffer") {
    return bytes.toString("utf-8", at, to);
  }
  if (textDecoder) {
    return textDecoder.decode(bytes.subarray(at, to));
  }
  return (0, import_util_utf83.toUtf8)(bytes.subarray(at, to));
}
function demote(bigInteger) {
  const num = Number(bigInteger);
  if (num < Number.MIN_SAFE_INTEGER || Number.MAX_SAFE_INTEGER < num) {
    console.warn(new Error(`@smithy/core/cbor - truncating BigInt(${bigInteger}) to ${num} with loss of precision.`));
  }
  return num;
}
function bytesToFloat16(a, b) {
  const sign = a >> 7;
  const exponent = (a & 124) >> 2;
  const fraction = (a & 3) << 8 | b;
  const scalar = sign === 0 ? 1 : -1;
  let exponentComponent;
  let summation;
  if (exponent === 0) {
    if (fraction === 0) {
      return 0;
    } else {
      exponentComponent = Math.pow(2, 1 - 15);
      summation = 0;
    }
  } else if (exponent === 31) {
    if (fraction === 0) {
      return scalar * Infinity;
    } else {
      return NaN;
    }
  } else {
    exponentComponent = Math.pow(2, exponent - 15);
    summation = 1;
  }
  summation += fraction / 1024;
  return scalar * (exponentComponent * summation);
}
function decodeCount(at, to) {
  const minor = payload[at] & 31;
  if (minor < 24) {
    _offset = 1;
    return minor;
  }
  if (minor === extendedOneByte || minor === extendedFloat16 || minor === extendedFloat32 || minor === extendedFloat64) {
    const countLength = minorValueToArgumentLength[minor];
    _offset = countLength + 1;
    if (to - at < _offset) {
      throw new Error(`countLength ${countLength} greater than remaining buf len.`);
    }
    const countIndex = at + 1;
    if (countLength === 1) {
      return payload[countIndex];
    } else if (countLength === 2) {
      return dataView.getUint16(countIndex);
    } else if (countLength === 4) {
      return dataView.getUint32(countIndex);
    }
    return demote(dataView.getBigUint64(countIndex));
  }
  throw new Error(`unexpected minor value ${minor}.`);
}
function decodeUtf8String(at, to) {
  const length = decodeCount(at, to);
  const offset = _offset;
  at += offset;
  if (to - at < length) {
    throw new Error(`string len ${length} greater than remaining buf len.`);
  }
  const value = bytesToUtf8(payload, at, at + length);
  _offset = offset + length;
  return value;
}
function decodeUtf8StringIndefinite(at, to) {
  at += 1;
  const vector = [];
  for (const base = at; at < to; ) {
    if (payload[at] === 255) {
      const data2 = alloc(vector.length);
      data2.set(vector, 0);
      _offset = at - base + 2;
      return bytesToUtf8(data2, 0, data2.length);
    }
    const major = (payload[at] & 224) >> 5;
    const minor = payload[at] & 31;
    if (major !== majorUtf8String) {
      throw new Error(`unexpected major type ${major} in indefinite string.`);
    }
    if (minor === minorIndefinite) {
      throw new Error("nested indefinite string.");
    }
    const bytes = decodeUnstructuredByteString(at, to);
    const length = _offset;
    at += length;
    for (let i = 0; i < bytes.length; ++i) {
      vector.push(bytes[i]);
    }
  }
  throw new Error("expected break marker.");
}
function decodeUnstructuredByteString(at, to) {
  const length = decodeCount(at, to);
  const offset = _offset;
  at += offset;
  if (to - at < length) {
    throw new Error(`unstructured byte string len ${length} greater than remaining buf len.`);
  }
  const value = payload.subarray(at, at + length);
  _offset = offset + length;
  return value;
}
function decodeUnstructuredByteStringIndefinite(at, to) {
  at += 1;
  const vector = [];
  for (const base = at; at < to; ) {
    if (payload[at] === 255) {
      const data2 = alloc(vector.length);
      data2.set(vector, 0);
      _offset = at - base + 2;
      return data2;
    }
    const major = (payload[at] & 224) >> 5;
    const minor = payload[at] & 31;
    if (major !== majorUnstructuredByteString) {
      throw new Error(`unexpected major type ${major} in indefinite string.`);
    }
    if (minor === minorIndefinite) {
      throw new Error("nested indefinite string.");
    }
    const bytes = decodeUnstructuredByteString(at, to);
    const length = _offset;
    at += length;
    for (let i = 0; i < bytes.length; ++i) {
      vector.push(bytes[i]);
    }
  }
  throw new Error("expected break marker.");
}
function decodeList(at, to) {
  const listDataLength = decodeCount(at, to);
  const offset = _offset;
  at += offset;
  const base = at;
  const list = Array(listDataLength);
  for (let i = 0; i < listDataLength; ++i) {
    const item = decode(at, to);
    const itemOffset = _offset;
    list[i] = item;
    at += itemOffset;
  }
  _offset = offset + (at - base);
  return list;
}
function decodeListIndefinite(at, to) {
  at += 1;
  const list = [];
  for (const base = at; at < to; ) {
    if (payload[at] === 255) {
      _offset = at - base + 2;
      return list;
    }
    const item = decode(at, to);
    const n = _offset;
    at += n;
    list.push(item);
  }
  throw new Error("expected break marker.");
}
function decodeMap(at, to) {
  const mapDataLength = decodeCount(at, to);
  const offset = _offset;
  at += offset;
  const base = at;
  const map = {};
  for (let i = 0; i < mapDataLength; ++i) {
    if (at >= to) {
      throw new Error("unexpected end of map payload.");
    }
    const major = (payload[at] & 224) >> 5;
    if (major !== majorUtf8String) {
      throw new Error(`unexpected major type ${major} for map key at index ${at}.`);
    }
    const key = decode(at, to);
    at += _offset;
    const value = decode(at, to);
    at += _offset;
    map[key] = value;
  }
  _offset = offset + (at - base);
  return map;
}
function decodeMapIndefinite(at, to) {
  at += 1;
  const base = at;
  const map = {};
  for (; at < to; ) {
    if (at >= to) {
      throw new Error("unexpected end of map payload.");
    }
    if (payload[at] === 255) {
      _offset = at - base + 2;
      return map;
    }
    const major = (payload[at] & 224) >> 5;
    if (major !== majorUtf8String) {
      throw new Error(`unexpected major type ${major} for map key.`);
    }
    const key = decode(at, to);
    at += _offset;
    const value = decode(at, to);
    at += _offset;
    map[key] = value;
  }
  throw new Error("expected break marker.");
}
function decodeSpecial(at, to) {
  const minor = payload[at] & 31;
  switch (minor) {
    case specialTrue:
    case specialFalse:
      _offset = 1;
      return minor === specialTrue;
    case specialNull:
      _offset = 1;
      return null;
    case specialUndefined:
      _offset = 1;
      return null;
    case extendedFloat16:
      if (to - at < 3) {
        throw new Error("incomplete float16 at end of buf.");
      }
      _offset = 3;
      return bytesToFloat16(payload[at + 1], payload[at + 2]);
    case extendedFloat32:
      if (to - at < 5) {
        throw new Error("incomplete float32 at end of buf.");
      }
      _offset = 5;
      return dataView.getFloat32(at + 1);
    case extendedFloat64:
      if (to - at < 9) {
        throw new Error("incomplete float64 at end of buf.");
      }
      _offset = 9;
      return dataView.getFloat64(at + 1);
    default:
      throw new Error(`unexpected minor value ${minor}.`);
  }
}
function castBigInt(bigInt) {
  if (typeof bigInt === "number") {
    return bigInt;
  }
  const num = Number(bigInt);
  if (Number.MIN_SAFE_INTEGER <= num && num <= Number.MAX_SAFE_INTEGER) {
    return num;
  }
  return bigInt;
}
var import_util_utf83, USE_TEXT_DECODER, USE_BUFFER, payload, dataView, textDecoder, _offset, minorValueToArgumentLength;
var init_cbor_decode = __esm({
  "node_modules/@smithy/core/dist-es/submodules/cbor/cbor-decode.js"() {
    init_esm();
    init_serde();
    import_util_utf83 = __toESM(require_dist_cjs7());
    init_cbor_types();
    USE_TEXT_DECODER = typeof TextDecoder !== "undefined";
    USE_BUFFER = typeof Buffer !== "undefined";
    payload = alloc(0);
    dataView = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    textDecoder = USE_TEXT_DECODER ? new TextDecoder() : null;
    _offset = 0;
    __name(setPayload, "setPayload");
    __name(decode, "decode");
    __name(bytesToUtf8, "bytesToUtf8");
    __name(demote, "demote");
    minorValueToArgumentLength = {
      [extendedOneByte]: 1,
      [extendedFloat16]: 2,
      [extendedFloat32]: 4,
      [extendedFloat64]: 8
    };
    __name(bytesToFloat16, "bytesToFloat16");
    __name(decodeCount, "decodeCount");
    __name(decodeUtf8String, "decodeUtf8String");
    __name(decodeUtf8StringIndefinite, "decodeUtf8StringIndefinite");
    __name(decodeUnstructuredByteString, "decodeUnstructuredByteString");
    __name(decodeUnstructuredByteStringIndefinite, "decodeUnstructuredByteStringIndefinite");
    __name(decodeList, "decodeList");
    __name(decodeListIndefinite, "decodeListIndefinite");
    __name(decodeMap, "decodeMap");
    __name(decodeMapIndefinite, "decodeMapIndefinite");
    __name(decodeSpecial, "decodeSpecial");
    __name(castBigInt, "castBigInt");
  }
});

// node_modules/@smithy/core/dist-es/submodules/cbor/cbor-encode.js
function ensureSpace(bytes) {
  const remaining = data.byteLength - cursor;
  if (remaining < bytes) {
    if (cursor < 16e6) {
      resize(Math.max(data.byteLength * 4, data.byteLength + bytes));
    } else {
      resize(data.byteLength + bytes + 16e6);
    }
  }
}
function toUint8Array() {
  const out = alloc(cursor);
  out.set(data.subarray(0, cursor), 0);
  cursor = 0;
  return out;
}
function resize(size) {
  const old = data;
  data = alloc(size);
  if (old) {
    if (old.copy) {
      old.copy(data, 0, 0, old.byteLength);
    } else {
      data.set(old, 0);
    }
  }
  dataView2 = new DataView(data.buffer, data.byteOffset, data.byteLength);
}
function encodeHeader(major, value) {
  if (value < 24) {
    data[cursor++] = major << 5 | value;
  } else if (value < 1 << 8) {
    data[cursor++] = major << 5 | 24;
    data[cursor++] = value;
  } else if (value < 1 << 16) {
    data[cursor++] = major << 5 | extendedFloat16;
    dataView2.setUint16(cursor, value);
    cursor += 2;
  } else if (value < 2 ** 32) {
    data[cursor++] = major << 5 | extendedFloat32;
    dataView2.setUint32(cursor, value);
    cursor += 4;
  } else {
    data[cursor++] = major << 5 | extendedFloat64;
    dataView2.setBigUint64(cursor, typeof value === "bigint" ? value : BigInt(value));
    cursor += 8;
  }
}
function encode(_input) {
  const encodeStack = [_input];
  while (encodeStack.length) {
    const input = encodeStack.pop();
    ensureSpace(typeof input === "string" ? input.length * 4 : 64);
    if (typeof input === "string") {
      if (USE_BUFFER2) {
        encodeHeader(majorUtf8String, Buffer.byteLength(input));
        cursor += data.write(input, cursor);
      } else {
        const bytes = (0, import_util_utf84.fromUtf8)(input);
        encodeHeader(majorUtf8String, bytes.byteLength);
        data.set(bytes, cursor);
        cursor += bytes.byteLength;
      }
      continue;
    } else if (typeof input === "number") {
      if (Number.isInteger(input)) {
        const nonNegative = input >= 0;
        const major = nonNegative ? majorUint64 : majorNegativeInt64;
        const value = nonNegative ? input : -input - 1;
        if (value < 24) {
          data[cursor++] = major << 5 | value;
        } else if (value < 256) {
          data[cursor++] = major << 5 | 24;
          data[cursor++] = value;
        } else if (value < 65536) {
          data[cursor++] = major << 5 | extendedFloat16;
          data[cursor++] = value >> 8;
          data[cursor++] = value;
        } else if (value < 4294967296) {
          data[cursor++] = major << 5 | extendedFloat32;
          dataView2.setUint32(cursor, value);
          cursor += 4;
        } else {
          data[cursor++] = major << 5 | extendedFloat64;
          dataView2.setBigUint64(cursor, BigInt(value));
          cursor += 8;
        }
        continue;
      }
      data[cursor++] = majorSpecial << 5 | extendedFloat64;
      dataView2.setFloat64(cursor, input);
      cursor += 8;
      continue;
    } else if (typeof input === "bigint") {
      const nonNegative = input >= 0;
      const major = nonNegative ? majorUint64 : majorNegativeInt64;
      const value = nonNegative ? input : -input - BigInt(1);
      const n = Number(value);
      if (n < 24) {
        data[cursor++] = major << 5 | n;
      } else if (n < 256) {
        data[cursor++] = major << 5 | 24;
        data[cursor++] = n;
      } else if (n < 65536) {
        data[cursor++] = major << 5 | extendedFloat16;
        data[cursor++] = n >> 8;
        data[cursor++] = n & 255;
      } else if (n < 4294967296) {
        data[cursor++] = major << 5 | extendedFloat32;
        dataView2.setUint32(cursor, n);
        cursor += 4;
      } else if (value < BigInt("18446744073709551616")) {
        data[cursor++] = major << 5 | extendedFloat64;
        dataView2.setBigUint64(cursor, value);
        cursor += 8;
      } else {
        const binaryBigInt = value.toString(2);
        const bigIntBytes = new Uint8Array(Math.ceil(binaryBigInt.length / 8));
        let b = value;
        let i = 0;
        while (bigIntBytes.byteLength - ++i >= 0) {
          bigIntBytes[bigIntBytes.byteLength - i] = Number(b & BigInt(255));
          b >>= BigInt(8);
        }
        ensureSpace(bigIntBytes.byteLength * 2);
        data[cursor++] = nonNegative ? 194 : 195;
        if (USE_BUFFER2) {
          encodeHeader(majorUnstructuredByteString, Buffer.byteLength(bigIntBytes));
        } else {
          encodeHeader(majorUnstructuredByteString, bigIntBytes.byteLength);
        }
        data.set(bigIntBytes, cursor);
        cursor += bigIntBytes.byteLength;
      }
      continue;
    } else if (input === null) {
      data[cursor++] = majorSpecial << 5 | specialNull;
      continue;
    } else if (typeof input === "boolean") {
      data[cursor++] = majorSpecial << 5 | (input ? specialTrue : specialFalse);
      continue;
    } else if (typeof input === "undefined") {
      throw new Error("@smithy/core/cbor: client may not serialize undefined value.");
    } else if (Array.isArray(input)) {
      for (let i = input.length - 1; i >= 0; --i) {
        encodeStack.push(input[i]);
      }
      encodeHeader(majorList, input.length);
      continue;
    } else if (typeof input.byteLength === "number") {
      ensureSpace(input.length * 2);
      encodeHeader(majorUnstructuredByteString, input.length);
      data.set(input, cursor);
      cursor += input.byteLength;
      continue;
    } else if (typeof input === "object") {
      if (input instanceof NumericValue) {
        const decimalIndex = input.string.indexOf(".");
        const exponent = decimalIndex === -1 ? 0 : decimalIndex - input.string.length + 1;
        const mantissa = BigInt(input.string.replace(".", ""));
        data[cursor++] = 196;
        encodeStack.push(mantissa);
        encodeStack.push(exponent);
        encodeHeader(majorList, 2);
        continue;
      }
      if (input[tagSymbol]) {
        if ("tag" in input && "value" in input) {
          encodeStack.push(input.value);
          encodeHeader(majorTag, input.tag);
          continue;
        } else {
          throw new Error("tag encountered with missing fields, need 'tag' and 'value', found: " + JSON.stringify(input));
        }
      }
      const keys = Object.keys(input);
      for (let i = keys.length - 1; i >= 0; --i) {
        const key = keys[i];
        encodeStack.push(input[key]);
        encodeStack.push(key);
      }
      encodeHeader(majorMap, keys.length);
      continue;
    }
    throw new Error(`data type ${input?.constructor?.name ?? typeof input} not compatible for encoding.`);
  }
}
var import_util_utf84, USE_BUFFER2, initialSize, data, dataView2, cursor;
var init_cbor_encode = __esm({
  "node_modules/@smithy/core/dist-es/submodules/cbor/cbor-encode.js"() {
    init_esm();
    init_serde();
    import_util_utf84 = __toESM(require_dist_cjs7());
    init_cbor_types();
    USE_BUFFER2 = typeof Buffer !== "undefined";
    initialSize = 2048;
    data = alloc(initialSize);
    dataView2 = new DataView(data.buffer, data.byteOffset, data.byteLength);
    cursor = 0;
    __name(ensureSpace, "ensureSpace");
    __name(toUint8Array, "toUint8Array");
    __name(resize, "resize");
    __name(encodeHeader, "encodeHeader");
    __name(encode, "encode");
  }
});

// node_modules/@smithy/core/dist-es/submodules/cbor/cbor.js
var cbor;
var init_cbor = __esm({
  "node_modules/@smithy/core/dist-es/submodules/cbor/cbor.js"() {
    init_esm();
    init_cbor_decode();
    init_cbor_encode();
    cbor = {
      deserialize(payload2) {
        setPayload(payload2);
        return decode(0, payload2.length);
      },
      serialize(input) {
        try {
          encode(input);
          return toUint8Array();
        } catch (e) {
          toUint8Array();
          throw e;
        }
      },
      resizeEncodingBuffer(size) {
        resize(size);
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/cbor/parseCborBody.js
var dateToTag, loadSmithyRpcV2CborErrorCode;
var init_parseCborBody = __esm({
  "node_modules/@smithy/core/dist-es/submodules/cbor/parseCborBody.js"() {
    init_esm();
    init_cbor_types();
    dateToTag = /* @__PURE__ */ __name((date) => {
      return tag({
        tag: 1,
        value: date.getTime() / 1e3
      });
    }, "dateToTag");
    loadSmithyRpcV2CborErrorCode = /* @__PURE__ */ __name((output, data2) => {
      const sanitizeErrorCode2 = /* @__PURE__ */ __name((rawValue) => {
        let cleanValue = rawValue;
        if (typeof cleanValue === "number") {
          cleanValue = cleanValue.toString();
        }
        if (cleanValue.indexOf(",") >= 0) {
          cleanValue = cleanValue.split(",")[0];
        }
        if (cleanValue.indexOf(":") >= 0) {
          cleanValue = cleanValue.split(":")[0];
        }
        if (cleanValue.indexOf("#") >= 0) {
          cleanValue = cleanValue.split("#")[1];
        }
        return cleanValue;
      }, "sanitizeErrorCode");
      if (data2["__type"] !== void 0) {
        return sanitizeErrorCode2(data2["__type"]);
      }
      let codeKey;
      for (const key in data2) {
        if (key.toLowerCase() === "code") {
          codeKey = key;
          break;
        }
      }
      if (codeKey && data2[codeKey] !== void 0) {
        return sanitizeErrorCode2(data2[codeKey]);
      }
    }, "loadSmithyRpcV2CborErrorCode");
  }
});

// node_modules/@smithy/core/dist-es/submodules/cbor/CborCodec.js
var import_util_base644, CborCodec, CborShapeSerializer, CborShapeDeserializer;
var init_CborCodec = __esm({
  "node_modules/@smithy/core/dist-es/submodules/cbor/CborCodec.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_serde();
    init_serde();
    import_util_base644 = __toESM(require_dist_cjs8());
    init_cbor();
    init_parseCborBody();
    CborCodec = class extends SerdeContext {
      static {
        __name(this, "CborCodec");
      }
      createSerializer() {
        const serializer = new CborShapeSerializer();
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
      }
      createDeserializer() {
        const deserializer = new CborShapeDeserializer();
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
      }
    };
    CborShapeSerializer = class extends SerdeContext {
      static {
        __name(this, "CborShapeSerializer");
      }
      value;
      write(schema, value) {
        this.value = this.serialize(schema, value);
      }
      serialize(schema, source) {
        const ns = NormalizedSchema.of(schema);
        if (source == null) {
          if (ns.isIdempotencyToken()) {
            return (0, import_uuid.v4)();
          }
          return source;
        }
        if (ns.isBlobSchema()) {
          if (typeof source === "string") {
            return (this.serdeContext?.base64Decoder ?? import_util_base644.fromBase64)(source);
          }
          return source;
        }
        if (ns.isTimestampSchema()) {
          if (typeof source === "number" || typeof source === "bigint") {
            return dateToTag(new Date(Number(source) / 1e3 | 0));
          }
          return dateToTag(source);
        }
        if (typeof source === "function" || typeof source === "object") {
          const sourceObject = source;
          if (ns.isListSchema() && Array.isArray(sourceObject)) {
            const sparse = !!ns.getMergedTraits().sparse;
            const newArray = [];
            let i = 0;
            for (const item of sourceObject) {
              const value = this.serialize(ns.getValueSchema(), item);
              if (value != null || sparse) {
                newArray[i++] = value;
              }
            }
            return newArray;
          }
          if (sourceObject instanceof Date) {
            return dateToTag(sourceObject);
          }
          const newObject = {};
          if (ns.isMapSchema()) {
            const sparse = !!ns.getMergedTraits().sparse;
            for (const key in sourceObject) {
              const value = this.serialize(ns.getValueSchema(), sourceObject[key]);
              if (value != null || sparse) {
                newObject[key] = value;
              }
            }
          } else if (ns.isStructSchema()) {
            for (const [key, memberSchema] of ns.structIterator()) {
              const value = this.serialize(memberSchema, sourceObject[key]);
              if (value != null) {
                newObject[key] = value;
              }
            }
            const isUnion = ns.isUnionSchema();
            if (isUnion && Array.isArray(sourceObject.$unknown)) {
              const [k, v] = sourceObject.$unknown;
              newObject[k] = v;
            } else if (typeof sourceObject.__type === "string") {
              for (const k in sourceObject) {
                if (!(k in newObject)) {
                  newObject[k] = this.serialize(15, sourceObject[k]);
                }
              }
            }
          } else if (ns.isDocumentSchema()) {
            for (const key in sourceObject) {
              newObject[key] = this.serialize(ns.getValueSchema(), sourceObject[key]);
            }
          } else if (ns.isBigDecimalSchema()) {
            return sourceObject;
          }
          return newObject;
        }
        return source;
      }
      flush() {
        const buffer = cbor.serialize(this.value);
        this.value = void 0;
        return buffer;
      }
    };
    CborShapeDeserializer = class extends SerdeContext {
      static {
        __name(this, "CborShapeDeserializer");
      }
      read(schema, bytes) {
        const data2 = cbor.deserialize(bytes);
        return this.readValue(schema, data2);
      }
      readValue(_schema, value) {
        const ns = NormalizedSchema.of(_schema);
        if (ns.isTimestampSchema()) {
          if (typeof value === "number") {
            return _parseEpochTimestamp(value);
          }
          if (typeof value === "object") {
            if (value.tag === 1 && "value" in value) {
              return _parseEpochTimestamp(value.value);
            }
          }
        }
        if (ns.isBlobSchema()) {
          if (typeof value === "string") {
            return (this.serdeContext?.base64Decoder ?? import_util_base644.fromBase64)(value);
          }
          return value;
        }
        if (typeof value === "undefined" || typeof value === "boolean" || typeof value === "number" || typeof value === "string" || typeof value === "bigint" || typeof value === "symbol") {
          return value;
        } else if (typeof value === "object") {
          if (value === null) {
            return null;
          }
          if ("byteLength" in value) {
            return value;
          }
          if (value instanceof Date) {
            return value;
          }
          if (ns.isDocumentSchema()) {
            return value;
          }
          if (ns.isListSchema()) {
            const newArray = [];
            const memberSchema = ns.getValueSchema();
            for (const item of value) {
              const itemValue = this.readValue(memberSchema, item);
              newArray.push(itemValue);
            }
            return newArray;
          }
          const newObject = {};
          if (ns.isMapSchema()) {
            const targetSchema = ns.getValueSchema();
            for (const key in value) {
              const itemValue = this.readValue(targetSchema, value[key]);
              newObject[key] = itemValue;
            }
          } else if (ns.isStructSchema()) {
            const isUnion = ns.isUnionSchema();
            let keys;
            if (isUnion) {
              keys = /* @__PURE__ */ new Set();
              for (const k in value) {
                if (k !== "__type") {
                  keys.add(k);
                }
              }
            }
            for (const [key, memberSchema] of ns.structIterator()) {
              if (isUnion) {
                keys.delete(key);
              }
              if (value[key] != null) {
                newObject[key] = this.readValue(memberSchema, value[key]);
              }
            }
            if (isUnion && keys?.size === 1) {
              let newObjectEmpty = true;
              for (const _ in newObject) {
                newObjectEmpty = false;
                break;
              }
              if (newObjectEmpty) {
                const k = keys.values().next().value;
                newObject.$unknown = [k, value[k]];
              }
            } else if (typeof value.__type === "string") {
              for (const k in value) {
                if (!(k in newObject)) {
                  newObject[k] = value[k];
                }
              }
            }
          } else if (value instanceof NumericValue) {
            return value;
          }
          return newObject;
        } else {
          return value;
        }
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/cbor/SmithyRpcV2CborProtocol.js
var import_util_middleware3, SmithyRpcV2CborProtocol;
var init_SmithyRpcV2CborProtocol = __esm({
  "node_modules/@smithy/core/dist-es/submodules/cbor/SmithyRpcV2CborProtocol.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_schema();
    import_util_middleware3 = __toESM(require_dist_cjs11());
    init_CborCodec();
    init_parseCborBody();
    SmithyRpcV2CborProtocol = class extends RpcProtocol {
      static {
        __name(this, "SmithyRpcV2CborProtocol");
      }
      codec = new CborCodec();
      serializer = this.codec.createSerializer();
      deserializer = this.codec.createDeserializer();
      constructor({ defaultNamespace, errorTypeRegistries }) {
        super({ defaultNamespace, errorTypeRegistries });
      }
      getShapeId() {
        return "smithy.protocols#rpcv2Cbor";
      }
      getPayloadCodec() {
        return this.codec;
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        Object.assign(request.headers, {
          "content-type": this.getDefaultContentType(),
          "smithy-protocol": "rpc-v2-cbor",
          accept: this.getDefaultContentType()
        });
        if (deref(operationSchema.input) === "unit") {
          delete request.body;
          delete request.headers["content-type"];
        } else {
          if (!request.body) {
            this.serializer.write(15, {});
            request.body = this.serializer.flush();
          }
          try {
            request.headers["content-length"] = String(request.body.byteLength);
          } catch (e) {
          }
        }
        const { service, operation } = (0, import_util_middleware3.getSmithyContext)(context);
        const path = `/service/${service}/operation/${operation}`;
        if (request.path.endsWith("/")) {
          request.path += path.slice(1);
        } else {
          request.path += path;
        }
        return request;
      }
      async deserializeResponse(operationSchema, context, response) {
        return super.deserializeResponse(operationSchema, context, response);
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorName = loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
        const errorMetadata = {
          $metadata: metadata,
          $fault: response.statusCode <= 500 ? "client" : "server"
        };
        let namespace = this.options.defaultNamespace;
        if (errorName.includes("#")) {
          [namespace] = errorName.split("#");
        }
        const registry = this.compositeErrorRegistry;
        const nsRegistry = TypeRegistry.for(namespace);
        registry.copyFrom(nsRegistry);
        let errorSchema;
        try {
          errorSchema = registry.getSchema(errorName);
        } catch (e) {
          if (dataObject.Message) {
            dataObject.message = dataObject.Message;
          }
          const syntheticRegistry = TypeRegistry.for("smithy.ts.sdk.synthetic." + namespace);
          registry.copyFrom(syntheticRegistry);
          const baseExceptionSchema = registry.getBaseException();
          if (baseExceptionSchema) {
            const ErrorCtor2 = registry.getErrorCtor(baseExceptionSchema);
            throw Object.assign(new ErrorCtor2({ name: errorName }), errorMetadata, dataObject);
          }
          throw Object.assign(new Error(errorName), errorMetadata, dataObject);
        }
        const ns = NormalizedSchema.of(errorSchema);
        const ErrorCtor = registry.getErrorCtor(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "Unknown";
        const exception = new ErrorCtor(message);
        const output = {};
        for (const [name, member] of ns.structIterator()) {
          output[name] = this.deserializer.readValue(member, dataObject[name]);
        }
        throw Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output);
      }
      getDefaultContentType() {
        return "application/cbor";
      }
    };
  }
});

// node_modules/@smithy/core/dist-es/submodules/cbor/index.js
var init_cbor2 = __esm({
  "node_modules/@smithy/core/dist-es/submodules/cbor/index.js"() {
    init_esm();
    init_parseCborBody();
    init_SmithyRpcV2CborProtocol();
    init_CborCodec();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/cbor/AwsSmithyRpcV2CborProtocol.js
var AwsSmithyRpcV2CborProtocol;
var init_AwsSmithyRpcV2CborProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/cbor/AwsSmithyRpcV2CborProtocol.js"() {
    init_esm();
    init_cbor2();
    init_schema();
    init_ProtocolLib();
    AwsSmithyRpcV2CborProtocol = class extends SmithyRpcV2CborProtocol {
      static {
        __name(this, "AwsSmithyRpcV2CborProtocol");
      }
      awsQueryCompatible;
      mixin;
      constructor({ defaultNamespace, errorTypeRegistries, awsQueryCompatible }) {
        super({ defaultNamespace, errorTypeRegistries });
        this.awsQueryCompatible = !!awsQueryCompatible;
        this.mixin = new ProtocolLib(this.awsQueryCompatible);
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (this.awsQueryCompatible) {
          request.headers["x-amzn-query-mode"] = "true";
        }
        return request;
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        if (this.awsQueryCompatible) {
          this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorName = (() => {
          const compatHeader = response.headers["x-amzn-query-error"];
          if (compatHeader && this.awsQueryCompatible) {
            return compatHeader.split(";")[0];
          }
          return loadSmithyRpcV2CborErrorCode(response, dataObject) ?? "Unknown";
        })();
        this.mixin.compose(this.compositeErrorRegistry, errorName, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorName, this.options.defaultNamespace, response, dataObject, metadata, this.awsQueryCompatible ? this.mixin.findQueryCompatibleError : void 0);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor(message);
        const output = {};
        for (const [name, member] of ns.structIterator()) {
          if (dataObject[name] != null) {
            output[name] = this.deserializer.readValue(member, dataObject[name]);
          }
        }
        if (this.awsQueryCompatible) {
          this.mixin.queryCompatOutput(dataObject, output);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output), dataObject);
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/coercing-serializers.js
var _toStr, _toBool, _toNum;
var init_coercing_serializers = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/coercing-serializers.js"() {
    init_esm();
    _toStr = /* @__PURE__ */ __name((val) => {
      if (val == null) {
        return val;
      }
      if (typeof val === "number" || typeof val === "bigint") {
        const warning = new Error(`Received number ${val} where a string was expected.`);
        warning.name = "Warning";
        console.warn(warning);
        return String(val);
      }
      if (typeof val === "boolean") {
        const warning = new Error(`Received boolean ${val} where a string was expected.`);
        warning.name = "Warning";
        console.warn(warning);
        return String(val);
      }
      return val;
    }, "_toStr");
    _toBool = /* @__PURE__ */ __name((val) => {
      if (val == null) {
        return val;
      }
      if (typeof val === "number") {
      }
      if (typeof val === "string") {
        const lowercase = val.toLowerCase();
        if (val !== "" && lowercase !== "false" && lowercase !== "true") {
          const warning = new Error(`Received string "${val}" where a boolean was expected.`);
          warning.name = "Warning";
          console.warn(warning);
        }
        return val !== "" && lowercase !== "false";
      }
      return val;
    }, "_toBool");
    _toNum = /* @__PURE__ */ __name((val) => {
      if (val == null) {
        return val;
      }
      if (typeof val === "boolean") {
      }
      if (typeof val === "string") {
        const num = Number(val);
        if (num.toString() !== val) {
          const warning = new Error(`Received string "${val}" where a number was expected.`);
          warning.name = "Warning";
          console.warn(warning);
          return val;
        }
        return num;
      }
      return val;
    }, "_toNum");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJsonRpcProtocol.js
var AwsJsonRpcProtocol;
var init_AwsJsonRpcProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJsonRpcProtocol.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_ProtocolLib();
    init_JsonCodec();
    init_parseJsonBody();
    AwsJsonRpcProtocol = class extends RpcProtocol {
      static {
        __name(this, "AwsJsonRpcProtocol");
      }
      serializer;
      deserializer;
      serviceTarget;
      codec;
      mixin;
      awsQueryCompatible;
      constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec }) {
        super({
          defaultNamespace,
          errorTypeRegistries
        });
        this.serviceTarget = serviceTarget;
        this.codec = jsonCodec ?? new JsonCodec({
          timestampFormat: {
            useTrait: true,
            default: 7
          },
          jsonName: false
        });
        this.serializer = this.codec.createSerializer();
        this.deserializer = this.codec.createDeserializer();
        this.awsQueryCompatible = !!awsQueryCompatible;
        this.mixin = new ProtocolLib(this.awsQueryCompatible);
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        if (!request.path.endsWith("/")) {
          request.path += "/";
        }
        request.headers["content-type"] = `application/x-amz-json-${this.getJsonRpcVersion()}`;
        request.headers["x-amz-target"] = `${this.serviceTarget}.${operationSchema.name}`;
        if (this.awsQueryCompatible) {
          request.headers["x-amzn-query-mode"] = "true";
        }
        if (deref(operationSchema.input) === "unit" || !request.body) {
          request.body = "{}";
        }
        return request;
      }
      getPayloadCodec() {
        return this.codec;
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        if (this.awsQueryCompatible) {
          this.mixin.setQueryCompatError(dataObject, response);
        }
        const errorIdentifier = loadRestJsonErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata, this.awsQueryCompatible ? this.mixin.findQueryCompatibleError : void 0);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor(message);
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
          if (dataObject[name] != null) {
            output[name] = errorDeserializer.readObject(member, dataObject[name]);
          }
        }
        if (this.awsQueryCompatible) {
          this.mixin.queryCompatOutput(dataObject, output);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output), dataObject);
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJson1_0Protocol.js
var AwsJson1_0Protocol;
var init_AwsJson1_0Protocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJson1_0Protocol.js"() {
    init_esm();
    init_AwsJsonRpcProtocol();
    AwsJson1_0Protocol = class extends AwsJsonRpcProtocol {
      static {
        __name(this, "AwsJson1_0Protocol");
      }
      constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec }) {
        super({
          defaultNamespace,
          errorTypeRegistries,
          serviceTarget,
          awsQueryCompatible,
          jsonCodec
        });
      }
      getShapeId() {
        return "aws.protocols#awsJson1_0";
      }
      getJsonRpcVersion() {
        return "1.0";
      }
      getDefaultContentType() {
        return "application/x-amz-json-1.0";
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJson1_1Protocol.js
var AwsJson1_1Protocol;
var init_AwsJson1_1Protocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/AwsJson1_1Protocol.js"() {
    init_esm();
    init_AwsJsonRpcProtocol();
    AwsJson1_1Protocol = class extends AwsJsonRpcProtocol {
      static {
        __name(this, "AwsJson1_1Protocol");
      }
      constructor({ defaultNamespace, errorTypeRegistries, serviceTarget, awsQueryCompatible, jsonCodec }) {
        super({
          defaultNamespace,
          errorTypeRegistries,
          serviceTarget,
          awsQueryCompatible,
          jsonCodec
        });
      }
      getShapeId() {
        return "aws.protocols#awsJson1_1";
      }
      getJsonRpcVersion() {
        return "1.1";
      }
      getDefaultContentType() {
        return "application/x-amz-json-1.1";
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/awsExpectUnion.js
var import_smithy_client5, awsExpectUnion;
var init_awsExpectUnion = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/json/awsExpectUnion.js"() {
    init_esm();
    import_smithy_client5 = __toESM(require_dist_cjs14());
    awsExpectUnion = /* @__PURE__ */ __name((value) => {
      if (value == null) {
        return void 0;
      }
      if (typeof value === "object" && "__type" in value) {
        delete value.__type;
      }
      return (0, import_smithy_client5.expectUnion)(value);
    }, "awsExpectUnion");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/AwsEc2QueryProtocol.js
var AwsEc2QueryProtocol;
var init_AwsEc2QueryProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/AwsEc2QueryProtocol.js"() {
    init_esm();
    init_AwsQueryProtocol();
    AwsEc2QueryProtocol = class extends AwsQueryProtocol {
      static {
        __name(this, "AwsEc2QueryProtocol");
      }
      options;
      constructor(options) {
        super(options);
        this.options = options;
        const ec2Settings = {
          capitalizeKeys: true,
          flattenLists: true,
          serializeEmptyLists: false,
          ec2: true
        };
        Object.assign(this.serializer.settings, ec2Settings);
      }
      getShapeId() {
        return "aws.protocols#ec2Query";
      }
      useNestedResult() {
        return false;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/QuerySerializerSettings.js
var init_QuerySerializerSettings = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/query/QuerySerializerSettings.js"() {
    init_esm();
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/parseXmlBody.js
var import_xml_builder2, import_smithy_client6, parseXmlBody, parseXmlErrorBody, loadRestXmlErrorCode;
var init_parseXmlBody = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/parseXmlBody.js"() {
    init_esm();
    import_xml_builder2 = __toESM(require_dist_cjs36());
    import_smithy_client6 = __toESM(require_dist_cjs14());
    init_common();
    parseXmlBody = /* @__PURE__ */ __name((streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
      if (encoded.length) {
        let parsedObj;
        try {
          parsedObj = (0, import_xml_builder2.parseXML)(encoded);
        } catch (e) {
          if (e && typeof e === "object") {
            Object.defineProperty(e, "$responseBodyText", {
              value: encoded
            });
          }
          throw e;
        }
        const textNodeName = "#text";
        const key = Object.keys(parsedObj)[0];
        const parsedObjToReturn = parsedObj[key];
        if (parsedObjToReturn[textNodeName]) {
          parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
          delete parsedObjToReturn[textNodeName];
        }
        return (0, import_smithy_client6.getValueFromTextNode)(parsedObjToReturn);
      }
      return {};
    }), "parseXmlBody");
    parseXmlErrorBody = /* @__PURE__ */ __name(async (errorBody, context) => {
      const value = await parseXmlBody(errorBody, context);
      if (value.Error) {
        value.Error.message = value.Error.message ?? value.Error.Message;
      }
      return value;
    }, "parseXmlErrorBody");
    loadRestXmlErrorCode = /* @__PURE__ */ __name((output, data2) => {
      if (data2?.Error?.Code !== void 0) {
        return data2.Error.Code;
      }
      if (data2?.Code !== void 0) {
        return data2.Code;
      }
      if (output.statusCode == 404) {
        return "NotFound";
      }
    }, "loadRestXmlErrorCode");
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/XmlShapeSerializer.js
var import_xml_builder3, import_smithy_client7, import_util_base645, XmlShapeSerializer;
var init_XmlShapeSerializer = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/XmlShapeSerializer.js"() {
    init_esm();
    import_xml_builder3 = __toESM(require_dist_cjs36());
    init_protocols();
    init_schema();
    init_serde();
    import_smithy_client7 = __toESM(require_dist_cjs14());
    import_util_base645 = __toESM(require_dist_cjs8());
    init_ConfigurableSerdeContext();
    XmlShapeSerializer = class extends SerdeContextConfig {
      static {
        __name(this, "XmlShapeSerializer");
      }
      settings;
      stringBuffer;
      byteBuffer;
      buffer;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      write(schema, value) {
        const ns = NormalizedSchema.of(schema);
        if (ns.isStringSchema() && typeof value === "string") {
          this.stringBuffer = value;
        } else if (ns.isBlobSchema()) {
          this.byteBuffer = "byteLength" in value ? value : (this.serdeContext?.base64Decoder ?? import_util_base645.fromBase64)(value);
        } else {
          this.buffer = this.writeStruct(ns, value, void 0);
          const traits = ns.getMergedTraits();
          if (traits.httpPayload && !traits.xmlName) {
            this.buffer.withName(ns.getName());
          }
        }
      }
      flush() {
        if (this.byteBuffer !== void 0) {
          const bytes = this.byteBuffer;
          delete this.byteBuffer;
          return bytes;
        }
        if (this.stringBuffer !== void 0) {
          const str = this.stringBuffer;
          delete this.stringBuffer;
          return str;
        }
        const buffer = this.buffer;
        if (this.settings.xmlNamespace) {
          if (!buffer?.attributes?.["xmlns"]) {
            buffer.addAttribute("xmlns", this.settings.xmlNamespace);
          }
        }
        delete this.buffer;
        return buffer.toString();
      }
      writeStruct(ns, value, parentXmlns) {
        const traits = ns.getMergedTraits();
        const name = ns.isMemberSchema() && !traits.httpPayload ? ns.getMemberTraits().xmlName ?? ns.getMemberName() : traits.xmlName ?? ns.getName();
        if (!name || !ns.isStructSchema()) {
          throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write struct with empty name or non-struct, schema=${ns.getName(true)}.`);
        }
        const structXmlNode = import_xml_builder3.XmlNode.of(name);
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(ns, parentXmlns);
        for (const [memberName, memberSchema] of ns.structIterator()) {
          const val = value[memberName];
          if (val != null || memberSchema.isIdempotencyToken()) {
            if (memberSchema.getMergedTraits().xmlAttribute) {
              structXmlNode.addAttribute(memberSchema.getMergedTraits().xmlName ?? memberName, this.writeSimple(memberSchema, val));
              continue;
            }
            if (memberSchema.isListSchema()) {
              this.writeList(memberSchema, val, structXmlNode, xmlns);
            } else if (memberSchema.isMapSchema()) {
              this.writeMap(memberSchema, val, structXmlNode, xmlns);
            } else if (memberSchema.isStructSchema()) {
              structXmlNode.addChildNode(this.writeStruct(memberSchema, val, xmlns));
            } else {
              const memberNode = import_xml_builder3.XmlNode.of(memberSchema.getMergedTraits().xmlName ?? memberSchema.getMemberName());
              this.writeSimpleInto(memberSchema, val, memberNode, xmlns);
              structXmlNode.addChildNode(memberNode);
            }
          }
        }
        const { $unknown } = value;
        if ($unknown && ns.isUnionSchema() && Array.isArray($unknown) && Object.keys(value).length === 1) {
          const [k, v] = $unknown;
          const node = import_xml_builder3.XmlNode.of(k);
          if (typeof v !== "string") {
            if (value instanceof import_xml_builder3.XmlNode || value instanceof import_xml_builder3.XmlText) {
              structXmlNode.addChildNode(value);
            } else {
              throw new Error(`@aws-sdk - $unknown union member in XML requires value of type string, @aws-sdk/xml-builder::XmlNode or XmlText.`);
            }
          }
          this.writeSimpleInto(0, v, node, xmlns);
          structXmlNode.addChildNode(node);
        }
        if (xmlns) {
          structXmlNode.addAttribute(xmlnsAttr, xmlns);
        }
        return structXmlNode;
      }
      writeList(listMember, array, container, parentXmlns) {
        if (!listMember.isMemberSchema()) {
          throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write non-member list: ${listMember.getName(true)}`);
        }
        const listTraits = listMember.getMergedTraits();
        const listValueSchema = listMember.getValueSchema();
        const listValueTraits = listValueSchema.getMergedTraits();
        const sparse = !!listValueTraits.sparse;
        const flat = !!listTraits.xmlFlattened;
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(listMember, parentXmlns);
        const writeItem = /* @__PURE__ */ __name((container2, value) => {
          if (listValueSchema.isListSchema()) {
            this.writeList(listValueSchema, Array.isArray(value) ? value : [value], container2, xmlns);
          } else if (listValueSchema.isMapSchema()) {
            this.writeMap(listValueSchema, value, container2, xmlns);
          } else if (listValueSchema.isStructSchema()) {
            const struct = this.writeStruct(listValueSchema, value, xmlns);
            container2.addChildNode(struct.withName(flat ? listTraits.xmlName ?? listMember.getMemberName() : listValueTraits.xmlName ?? "member"));
          } else {
            const listItemNode = import_xml_builder3.XmlNode.of(flat ? listTraits.xmlName ?? listMember.getMemberName() : listValueTraits.xmlName ?? "member");
            this.writeSimpleInto(listValueSchema, value, listItemNode, xmlns);
            container2.addChildNode(listItemNode);
          }
        }, "writeItem");
        if (flat) {
          for (const value of array) {
            if (sparse || value != null) {
              writeItem(container, value);
            }
          }
        } else {
          const listNode = import_xml_builder3.XmlNode.of(listTraits.xmlName ?? listMember.getMemberName());
          if (xmlns) {
            listNode.addAttribute(xmlnsAttr, xmlns);
          }
          for (const value of array) {
            if (sparse || value != null) {
              writeItem(listNode, value);
            }
          }
          container.addChildNode(listNode);
        }
      }
      writeMap(mapMember, map, container, parentXmlns, containerIsMap = false) {
        if (!mapMember.isMemberSchema()) {
          throw new Error(`@aws-sdk/core/protocols - xml serializer, cannot write non-member map: ${mapMember.getName(true)}`);
        }
        const mapTraits = mapMember.getMergedTraits();
        const mapKeySchema = mapMember.getKeySchema();
        const mapKeyTraits = mapKeySchema.getMergedTraits();
        const keyTag = mapKeyTraits.xmlName ?? "key";
        const mapValueSchema = mapMember.getValueSchema();
        const mapValueTraits = mapValueSchema.getMergedTraits();
        const valueTag = mapValueTraits.xmlName ?? "value";
        const sparse = !!mapValueTraits.sparse;
        const flat = !!mapTraits.xmlFlattened;
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(mapMember, parentXmlns);
        const addKeyValue = /* @__PURE__ */ __name((entry, key, val) => {
          const keyNode = import_xml_builder3.XmlNode.of(keyTag, key);
          const [keyXmlnsAttr, keyXmlns] = this.getXmlnsAttribute(mapKeySchema, xmlns);
          if (keyXmlns) {
            keyNode.addAttribute(keyXmlnsAttr, keyXmlns);
          }
          entry.addChildNode(keyNode);
          let valueNode = import_xml_builder3.XmlNode.of(valueTag);
          if (mapValueSchema.isListSchema()) {
            this.writeList(mapValueSchema, val, valueNode, xmlns);
          } else if (mapValueSchema.isMapSchema()) {
            this.writeMap(mapValueSchema, val, valueNode, xmlns, true);
          } else if (mapValueSchema.isStructSchema()) {
            valueNode = this.writeStruct(mapValueSchema, val, xmlns);
          } else {
            this.writeSimpleInto(mapValueSchema, val, valueNode, xmlns);
          }
          entry.addChildNode(valueNode);
        }, "addKeyValue");
        if (flat) {
          for (const key in map) {
            const val = map[key];
            if (sparse || val != null) {
              const entry = import_xml_builder3.XmlNode.of(mapTraits.xmlName ?? mapMember.getMemberName());
              addKeyValue(entry, key, val);
              container.addChildNode(entry);
            }
          }
        } else {
          let mapNode;
          if (!containerIsMap) {
            mapNode = import_xml_builder3.XmlNode.of(mapTraits.xmlName ?? mapMember.getMemberName());
            if (xmlns) {
              mapNode.addAttribute(xmlnsAttr, xmlns);
            }
            container.addChildNode(mapNode);
          }
          for (const key in map) {
            const val = map[key];
            if (sparse || val != null) {
              const entry = import_xml_builder3.XmlNode.of("entry");
              addKeyValue(entry, key, val);
              (containerIsMap ? container : mapNode).addChildNode(entry);
            }
          }
        }
      }
      writeSimple(_schema, value) {
        if (null === value) {
          throw new Error("@aws-sdk/core/protocols - (XML serializer) cannot write null value.");
        }
        const ns = NormalizedSchema.of(_schema);
        let nodeContents = null;
        if (value && typeof value === "object") {
          if (ns.isBlobSchema()) {
            nodeContents = (this.serdeContext?.base64Encoder ?? import_util_base645.toBase64)(value);
          } else if (ns.isTimestampSchema() && value instanceof Date) {
            const format = determineTimestampFormat(ns, this.settings);
            switch (format) {
              case 5:
                nodeContents = value.toISOString().replace(".000Z", "Z");
                break;
              case 6:
                nodeContents = (0, import_smithy_client7.dateToUtcString)(value);
                break;
              case 7:
                nodeContents = String(value.getTime() / 1e3);
                break;
              default:
                console.warn("Missing timestamp format, using http date", value);
                nodeContents = (0, import_smithy_client7.dateToUtcString)(value);
                break;
            }
          } else if (ns.isBigDecimalSchema() && value) {
            if (value instanceof NumericValue) {
              return value.string;
            }
            return String(value);
          } else if (ns.isMapSchema() || ns.isListSchema()) {
            throw new Error("@aws-sdk/core/protocols - xml serializer, cannot call _write() on List/Map schema, call writeList or writeMap() instead.");
          } else {
            throw new Error(`@aws-sdk/core/protocols - xml serializer, unhandled schema type for object value and schema: ${ns.getName(true)}`);
          }
        }
        if (ns.isBooleanSchema() || ns.isNumericSchema() || ns.isBigIntegerSchema() || ns.isBigDecimalSchema()) {
          nodeContents = String(value);
        }
        if (ns.isStringSchema()) {
          if (value === void 0 && ns.isIdempotencyToken()) {
            nodeContents = (0, import_uuid.v4)();
          } else {
            nodeContents = String(value);
          }
        }
        if (nodeContents === null) {
          throw new Error(`Unhandled schema-value pair ${ns.getName(true)}=${value}`);
        }
        return nodeContents;
      }
      writeSimpleInto(_schema, value, into, parentXmlns) {
        const nodeContents = this.writeSimple(_schema, value);
        const ns = NormalizedSchema.of(_schema);
        const content = new import_xml_builder3.XmlText(nodeContents);
        const [xmlnsAttr, xmlns] = this.getXmlnsAttribute(ns, parentXmlns);
        if (xmlns) {
          into.addAttribute(xmlnsAttr, xmlns);
        }
        into.addChildNode(content);
      }
      getXmlnsAttribute(ns, parentXmlns) {
        const traits = ns.getMergedTraits();
        const [prefix, xmlns] = traits.xmlNamespace ?? [];
        if (xmlns && xmlns !== parentXmlns) {
          return [prefix ? `xmlns:${prefix}` : "xmlns", xmlns];
        }
        return [void 0, void 0];
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/XmlCodec.js
var XmlCodec;
var init_XmlCodec = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/XmlCodec.js"() {
    init_esm();
    init_ConfigurableSerdeContext();
    init_XmlShapeDeserializer();
    init_XmlShapeSerializer();
    XmlCodec = class extends SerdeContextConfig {
      static {
        __name(this, "XmlCodec");
      }
      settings;
      constructor(settings) {
        super();
        this.settings = settings;
      }
      createSerializer() {
        const serializer = new XmlShapeSerializer(this.settings);
        serializer.setSerdeContext(this.serdeContext);
        return serializer;
      }
      createDeserializer() {
        const deserializer = new XmlShapeDeserializer(this.settings);
        deserializer.setSerdeContext(this.serdeContext);
        return deserializer;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/AwsRestXmlProtocol.js
var AwsRestXmlProtocol;
var init_AwsRestXmlProtocol = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/xml/AwsRestXmlProtocol.js"() {
    init_esm();
    init_protocols();
    init_schema();
    init_ProtocolLib();
    init_parseXmlBody();
    init_XmlCodec();
    AwsRestXmlProtocol = class extends HttpBindingProtocol {
      static {
        __name(this, "AwsRestXmlProtocol");
      }
      codec;
      serializer;
      deserializer;
      mixin = new ProtocolLib();
      constructor(options) {
        super(options);
        const settings = {
          timestampFormat: {
            useTrait: true,
            default: 5
          },
          httpBindings: true,
          xmlNamespace: options.xmlNamespace,
          serviceNamespace: options.defaultNamespace
        };
        this.codec = new XmlCodec(settings);
        this.serializer = new HttpInterceptingShapeSerializer(this.codec.createSerializer(), settings);
        this.deserializer = new HttpInterceptingShapeDeserializer(this.codec.createDeserializer(), settings);
      }
      getPayloadCodec() {
        return this.codec;
      }
      getShapeId() {
        return "aws.protocols#restXml";
      }
      async serializeRequest(operationSchema, input, context) {
        const request = await super.serializeRequest(operationSchema, input, context);
        const inputSchema = NormalizedSchema.of(operationSchema.input);
        if (!request.headers["content-type"]) {
          const contentType = this.mixin.resolveRestContentType(this.getDefaultContentType(), inputSchema);
          if (contentType) {
            request.headers["content-type"] = contentType;
          }
        }
        if (typeof request.body === "string" && request.headers["content-type"] === this.getDefaultContentType() && !request.body.startsWith("<?xml ") && !this.hasUnstructuredPayloadBinding(inputSchema)) {
          request.body = '<?xml version="1.0" encoding="UTF-8"?>' + request.body;
        }
        return request;
      }
      async deserializeResponse(operationSchema, context, response) {
        return super.deserializeResponse(operationSchema, context, response);
      }
      async handleError(operationSchema, context, response, dataObject, metadata) {
        const errorIdentifier = loadRestXmlErrorCode(response, dataObject) ?? "Unknown";
        this.mixin.compose(this.compositeErrorRegistry, errorIdentifier, this.options.defaultNamespace);
        if (dataObject.Error && typeof dataObject.Error === "object") {
          for (const key of Object.keys(dataObject.Error)) {
            dataObject[key] = dataObject.Error[key];
            if (key.toLowerCase() === "message") {
              dataObject.message = dataObject.Error[key];
            }
          }
        }
        if (dataObject.RequestId && !metadata.requestId) {
          metadata.requestId = dataObject.RequestId;
        }
        const { errorSchema, errorMetadata } = await this.mixin.getErrorSchemaOrThrowBaseException(errorIdentifier, this.options.defaultNamespace, response, dataObject, metadata);
        const ns = NormalizedSchema.of(errorSchema);
        const message = dataObject.Error?.message ?? dataObject.Error?.Message ?? dataObject.message ?? dataObject.Message ?? "UnknownError";
        const ErrorCtor = this.compositeErrorRegistry.getErrorCtor(errorSchema) ?? Error;
        const exception = new ErrorCtor(message);
        await this.deserializeHttpMessage(errorSchema, context, response, dataObject);
        const output = {};
        const errorDeserializer = this.codec.createDeserializer();
        for (const [name, member] of ns.structIterator()) {
          const target = member.getMergedTraits().xmlName ?? name;
          const value = dataObject.Error?.[target] ?? dataObject[target];
          output[name] = errorDeserializer.readSchema(member, value);
        }
        throw this.mixin.decorateServiceException(Object.assign(exception, errorMetadata, {
          $fault: ns.getMergedTraits().error,
          message
        }, output), dataObject);
      }
      getDefaultContentType() {
        return "application/xml";
      }
      hasUnstructuredPayloadBinding(ns) {
        for (const [, member] of ns.structIterator()) {
          if (member.getMergedTraits().httpPayload) {
            return !(member.isStructSchema() || member.isMapSchema() || member.isListSchema());
          }
        }
        return false;
      }
    };
  }
});

// node_modules/@aws-sdk/core/dist-es/submodules/protocols/index.js
var protocols_exports = {};
__export(protocols_exports, {
  AwsEc2QueryProtocol: () => AwsEc2QueryProtocol,
  AwsJson1_0Protocol: () => AwsJson1_0Protocol,
  AwsJson1_1Protocol: () => AwsJson1_1Protocol,
  AwsJsonRpcProtocol: () => AwsJsonRpcProtocol,
  AwsQueryProtocol: () => AwsQueryProtocol,
  AwsRestJsonProtocol: () => AwsRestJsonProtocol,
  AwsRestXmlProtocol: () => AwsRestXmlProtocol,
  AwsSmithyRpcV2CborProtocol: () => AwsSmithyRpcV2CborProtocol,
  JsonCodec: () => JsonCodec,
  JsonShapeDeserializer: () => JsonShapeDeserializer,
  JsonShapeSerializer: () => JsonShapeSerializer,
  QueryShapeSerializer: () => QueryShapeSerializer,
  XmlCodec: () => XmlCodec,
  XmlShapeDeserializer: () => XmlShapeDeserializer,
  XmlShapeSerializer: () => XmlShapeSerializer,
  _toBool: () => _toBool,
  _toNum: () => _toNum,
  _toStr: () => _toStr,
  awsExpectUnion: () => awsExpectUnion,
  loadRestJsonErrorCode: () => loadRestJsonErrorCode,
  loadRestXmlErrorCode: () => loadRestXmlErrorCode,
  parseJsonBody: () => parseJsonBody,
  parseJsonErrorBody: () => parseJsonErrorBody,
  parseXmlBody: () => parseXmlBody,
  parseXmlErrorBody: () => parseXmlErrorBody
});
var init_protocols2 = __esm({
  "node_modules/@aws-sdk/core/dist-es/submodules/protocols/index.js"() {
    init_esm();
    init_AwsSmithyRpcV2CborProtocol();
    init_coercing_serializers();
    init_AwsJson1_0Protocol();
    init_AwsJson1_1Protocol();
    init_AwsJsonRpcProtocol();
    init_AwsRestJsonProtocol();
    init_JsonCodec();
    init_JsonShapeDeserializer();
    init_JsonShapeSerializer();
    init_awsExpectUnion();
    init_parseJsonBody();
    init_AwsEc2QueryProtocol();
    init_AwsQueryProtocol();
    init_QuerySerializerSettings();
    init_QueryShapeSerializer();
    init_AwsRestXmlProtocol();
    init_XmlCodec();
    init_XmlShapeDeserializer();
    init_XmlShapeSerializer();
    init_parseXmlBody();
  }
});

export {
  require_dist_cjs18 as require_dist_cjs,
  require_dist_cjs19 as require_dist_cjs2,
  require_dist_cjs20 as require_dist_cjs3,
  AwsRestJsonProtocol,
  AwsQueryProtocol,
  protocols_exports,
  init_protocols2 as init_protocols,
  require_dist_cjs30 as require_dist_cjs4,
  require_dist_cjs24 as require_dist_cjs5,
  getHttpAuthSchemeEndpointRuleSetPlugin,
  getHttpSigningPlugin,
  DefaultIdentityProviderConfig,
  NoAuthSigner,
  dist_es_exports,
  init_dist_es,
  require_dist_cjs21 as require_dist_cjs6,
  require_dist_cjs22 as require_dist_cjs7,
  require_dist_cjs23 as require_dist_cjs8,
  require_dist_cjs25 as require_dist_cjs9,
  require_dist_cjs26 as require_dist_cjs10,
  require_dist_cjs28 as require_dist_cjs11,
  require_dist_cjs29 as require_dist_cjs12,
  AwsSdkSigV4Signer,
  AwsSdkSigV4ASigner,
  NODE_AUTH_SCHEME_PREFERENCE_OPTIONS,
  resolveAwsSdkSigV4AConfig,
  NODE_SIGV4A_CONFIG_OPTIONS,
  resolveAwsSdkSigV4Config,
  httpAuthSchemes_exports,
  init_httpAuthSchemes2 as init_httpAuthSchemes,
  require_dist_cjs31 as require_dist_cjs13,
  require_dist_cjs32 as require_dist_cjs14,
  require_dist_cjs33 as require_dist_cjs15,
  require_dist_cjs34 as require_dist_cjs16,
  require_dist_cjs35 as require_dist_cjs17
};
//# sourceMappingURL=chunk-QGEXMNHO.mjs.map
