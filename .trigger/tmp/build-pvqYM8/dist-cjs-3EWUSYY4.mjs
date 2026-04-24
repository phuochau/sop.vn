import {
  init_package,
  package_default
} from "./chunk-3KZINXDK.mjs";
import {
  AwsRestJsonProtocol,
  AwsSdkSigV4Signer,
  DefaultIdentityProviderConfig,
  NODE_AUTH_SCHEME_PREFERENCE_OPTIONS,
  NoAuthSigner,
  getHttpAuthSchemeEndpointRuleSetPlugin,
  getHttpSigningPlugin,
  httpAuthSchemes_exports,
  init_dist_es,
  init_httpAuthSchemes,
  init_protocols,
  require_dist_cjs as require_dist_cjs7,
  require_dist_cjs10 as require_dist_cjs16,
  require_dist_cjs11 as require_dist_cjs20,
  require_dist_cjs12 as require_dist_cjs21,
  require_dist_cjs13 as require_dist_cjs22,
  require_dist_cjs14 as require_dist_cjs23,
  require_dist_cjs15 as require_dist_cjs24,
  require_dist_cjs16 as require_dist_cjs25,
  require_dist_cjs17 as require_dist_cjs26,
  require_dist_cjs2 as require_dist_cjs8,
  require_dist_cjs3 as require_dist_cjs9,
  require_dist_cjs6 as require_dist_cjs12,
  require_dist_cjs7 as require_dist_cjs13,
  require_dist_cjs8 as require_dist_cjs14,
  require_dist_cjs9 as require_dist_cjs15,
  resolveAwsSdkSigV4Config
} from "./chunk-QGEXMNHO.mjs";
import {
  TypeRegistry,
  getSchemaSerdePlugin,
  init_schema,
  require_dist_cjs as require_dist_cjs4,
  require_dist_cjs4 as require_dist_cjs5,
  require_dist_cjs7 as require_dist_cjs6,
  require_dist_cjs9 as require_dist_cjs11
} from "./chunk-TYTCKKP3.mjs";
import {
  require_dist_cjs
} from "./chunk-AJILZ5WZ.mjs";
import {
  require_dist_cjs3
} from "./chunk-TPR7ISAF.mjs";
import {
  client_exports,
  emitWarningIfUnsupportedVersion,
  init_client,
  require_dist_cjs2
} from "./chunk-IAJ5C443.mjs";
import {
  require_dist_cjs as require_dist_cjs19
} from "./chunk-HVKOIMR6.mjs";
import {
  require_dist_cjs as require_dist_cjs10
} from "./chunk-Q4T5MCLT.mjs";
import {
  require_dist_cjs as require_dist_cjs18
} from "./chunk-IIMKTLY7.mjs";
import "./chunk-YPLDPGBH.mjs";
import {
  require_dist_cjs as require_dist_cjs17
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

// node_modules/@aws-sdk/token-providers/dist-cjs/index.js
var require_dist_cjs27 = __commonJS({
  "node_modules/@aws-sdk/token-providers/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var client = (init_client(), __toCommonJS(client_exports));
    var httpAuthSchemes = (init_httpAuthSchemes(), __toCommonJS(httpAuthSchemes_exports));
    var propertyProvider = require_dist_cjs17();
    var sharedIniFileLoader = require_dist_cjs18();
    var node_fs = __require("node:fs");
    var fromEnvSigningName = /* @__PURE__ */ __name(({ logger, signingName } = {}) => async () => {
      logger?.debug?.("@aws-sdk/token-providers - fromEnvSigningName");
      if (!signingName) {
        throw new propertyProvider.TokenProviderError("Please pass 'signingName' to compute environment variable key", { logger });
      }
      const bearerTokenKey = httpAuthSchemes.getBearerTokenEnvKey(signingName);
      if (!(bearerTokenKey in process.env)) {
        throw new propertyProvider.TokenProviderError(`Token not present in '${bearerTokenKey}' environment variable`, { logger });
      }
      const token = { token: process.env[bearerTokenKey] };
      client.setTokenFeature(token, "BEARER_SERVICE_ENV_VARS", "3");
      return token;
    }, "fromEnvSigningName");
    var EXPIRE_WINDOW_MS = 5 * 60 * 1e3;
    var REFRESH_MESSAGE = `To refresh this SSO session run 'aws sso login' with the corresponding profile.`;
    var getSsoOidcClient = /* @__PURE__ */ __name(async (ssoRegion, init = {}, callerClientConfig) => {
      const { SSOOIDCClient } = await import("./sso-oidc-OMB2LEAC.mjs");
      const coalesce = /* @__PURE__ */ __name((prop) => init.clientConfig?.[prop] ?? init.parentClientConfig?.[prop] ?? callerClientConfig?.[prop], "coalesce");
      const ssoOidcClient = new SSOOIDCClient(Object.assign({}, init.clientConfig ?? {}, {
        region: ssoRegion ?? init.clientConfig?.region,
        logger: coalesce("logger"),
        userAgentAppId: coalesce("userAgentAppId")
      }));
      return ssoOidcClient;
    }, "getSsoOidcClient");
    var getNewSsoOidcToken = /* @__PURE__ */ __name(async (ssoToken, ssoRegion, init = {}, callerClientConfig) => {
      const { CreateTokenCommand } = await import("./sso-oidc-OMB2LEAC.mjs");
      const ssoOidcClient = await getSsoOidcClient(ssoRegion, init, callerClientConfig);
      return ssoOidcClient.send(new CreateTokenCommand({
        clientId: ssoToken.clientId,
        clientSecret: ssoToken.clientSecret,
        refreshToken: ssoToken.refreshToken,
        grantType: "refresh_token"
      }));
    }, "getNewSsoOidcToken");
    var validateTokenExpiry = /* @__PURE__ */ __name((token) => {
      if (token.expiration && token.expiration.getTime() < Date.now()) {
        throw new propertyProvider.TokenProviderError(`Token is expired. ${REFRESH_MESSAGE}`, false);
      }
    }, "validateTokenExpiry");
    var validateTokenKey = /* @__PURE__ */ __name((key, value, forRefresh = false) => {
      if (typeof value === "undefined") {
        throw new propertyProvider.TokenProviderError(`Value not present for '${key}' in SSO Token${forRefresh ? ". Cannot refresh" : ""}. ${REFRESH_MESSAGE}`, false);
      }
    }, "validateTokenKey");
    var { writeFile } = node_fs.promises;
    var writeSSOTokenToFile = /* @__PURE__ */ __name((id, ssoToken) => {
      const tokenFilepath = sharedIniFileLoader.getSSOTokenFilepath(id);
      const tokenString = JSON.stringify(ssoToken, null, 2);
      return writeFile(tokenFilepath, tokenString);
    }, "writeSSOTokenToFile");
    var lastRefreshAttemptTime = /* @__PURE__ */ new Date(0);
    var fromSso = /* @__PURE__ */ __name((init = {}) => async ({ callerClientConfig } = {}) => {
      init.logger?.debug("@aws-sdk/token-providers - fromSso");
      const profiles = await sharedIniFileLoader.parseKnownFiles(init);
      const profileName = sharedIniFileLoader.getProfileName({
        profile: init.profile ?? callerClientConfig?.profile
      });
      const profile = profiles[profileName];
      if (!profile) {
        throw new propertyProvider.TokenProviderError(`Profile '${profileName}' could not be found in shared credentials file.`, false);
      } else if (!profile["sso_session"]) {
        throw new propertyProvider.TokenProviderError(`Profile '${profileName}' is missing required property 'sso_session'.`);
      }
      const ssoSessionName = profile["sso_session"];
      const ssoSessions = await sharedIniFileLoader.loadSsoSessionData(init);
      const ssoSession = ssoSessions[ssoSessionName];
      if (!ssoSession) {
        throw new propertyProvider.TokenProviderError(`Sso session '${ssoSessionName}' could not be found in shared credentials file.`, false);
      }
      for (const ssoSessionRequiredKey of ["sso_start_url", "sso_region"]) {
        if (!ssoSession[ssoSessionRequiredKey]) {
          throw new propertyProvider.TokenProviderError(`Sso session '${ssoSessionName}' is missing required property '${ssoSessionRequiredKey}'.`, false);
        }
      }
      ssoSession["sso_start_url"];
      const ssoRegion = ssoSession["sso_region"];
      let ssoToken;
      try {
        ssoToken = await sharedIniFileLoader.getSSOTokenFromFile(ssoSessionName);
      } catch (e2) {
        throw new propertyProvider.TokenProviderError(`The SSO session token associated with profile=${profileName} was not found or is invalid. ${REFRESH_MESSAGE}`, false);
      }
      validateTokenKey("accessToken", ssoToken.accessToken);
      validateTokenKey("expiresAt", ssoToken.expiresAt);
      const { accessToken, expiresAt } = ssoToken;
      const existingToken = { token: accessToken, expiration: new Date(expiresAt) };
      if (existingToken.expiration.getTime() - Date.now() > EXPIRE_WINDOW_MS) {
        return existingToken;
      }
      if (Date.now() - lastRefreshAttemptTime.getTime() < 30 * 1e3) {
        validateTokenExpiry(existingToken);
        return existingToken;
      }
      validateTokenKey("clientId", ssoToken.clientId, true);
      validateTokenKey("clientSecret", ssoToken.clientSecret, true);
      validateTokenKey("refreshToken", ssoToken.refreshToken, true);
      try {
        lastRefreshAttemptTime.setTime(Date.now());
        const newSsoOidcToken = await getNewSsoOidcToken(ssoToken, ssoRegion, init, callerClientConfig);
        validateTokenKey("accessToken", newSsoOidcToken.accessToken);
        validateTokenKey("expiresIn", newSsoOidcToken.expiresIn);
        const newTokenExpiration = new Date(Date.now() + newSsoOidcToken.expiresIn * 1e3);
        try {
          await writeSSOTokenToFile(ssoSessionName, {
            ...ssoToken,
            accessToken: newSsoOidcToken.accessToken,
            expiresAt: newTokenExpiration.toISOString(),
            refreshToken: newSsoOidcToken.refreshToken
          });
        } catch (error) {
        }
        return {
          token: newSsoOidcToken.accessToken,
          expiration: newTokenExpiration
        };
      } catch (error) {
        validateTokenExpiry(existingToken);
        return existingToken;
      }
    }, "fromSso");
    var fromStatic = /* @__PURE__ */ __name(({ token, logger }) => async () => {
      logger?.debug("@aws-sdk/token-providers - fromStatic");
      if (!token || !token.token) {
        throw new propertyProvider.TokenProviderError(`Please pass a valid token to fromStatic`, false);
      }
      return token;
    }, "fromStatic");
    var nodeProvider = /* @__PURE__ */ __name((init = {}) => propertyProvider.memoize(propertyProvider.chain(fromSso(init), async () => {
      throw new propertyProvider.TokenProviderError("Could not load token from any providers", false);
    }), (token) => token.expiration !== void 0 && token.expiration.getTime() - Date.now() < 3e5, (token) => token.expiration !== void 0), "nodeProvider");
    exports.fromEnvSigningName = fromEnvSigningName;
    exports.fromSso = fromSso;
    exports.fromStatic = fromStatic;
    exports.nodeProvider = nodeProvider;
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "awsssoportal",
      region: authParameters.region
    },
    propertiesExtractor: /* @__PURE__ */ __name((config, context) => ({
      signingProperties: {
        config,
        context
      }
    }), "propertiesExtractor")
  };
}
function createSmithyApiNoAuthHttpAuthOption(authParameters) {
  return {
    schemeId: "smithy.api#noAuth"
  };
}
var import_util_middleware, defaultSSOHttpAuthSchemeParametersProvider, defaultSSOHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig;
var init_httpAuthSchemeProvider = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/auth/httpAuthSchemeProvider.js"() {
    init_esm();
    init_httpAuthSchemes();
    import_util_middleware = __toESM(require_dist_cjs6());
    defaultSSOHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: (0, import_util_middleware.getSmithyContext)(context).operation,
        region: await (0, import_util_middleware.normalizeProvider)(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "defaultSSOHttpAuthSchemeParametersProvider");
    __name(createAwsAuthSigv4HttpAuthOption, "createAwsAuthSigv4HttpAuthOption");
    __name(createSmithyApiNoAuthHttpAuthOption, "createSmithyApiNoAuthHttpAuthOption");
    defaultSSOHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        case "GetRoleCredentials": {
          options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
          break;
        }
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
        }
      }
      return options;
    }, "defaultSSOHttpAuthSchemeProvider");
    resolveHttpAuthSchemeConfig = /* @__PURE__ */ __name((config) => {
      const config_0 = resolveAwsSdkSigV4Config(config);
      return Object.assign(config_0, {
        authSchemePreference: (0, import_util_middleware.normalizeProvider)(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/EndpointParameters.js
var resolveClientEndpointParameters, commonParams;
var init_EndpointParameters = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/EndpointParameters.js"() {
    init_esm();
    resolveClientEndpointParameters = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "awsssoportal"
      });
    }, "resolveClientEndpointParameters");
    commonParams = {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/bdd.js
var import_util_endpoints, k, a, b, c, d, e, f, g, h, i, j, _data, root, r, nodes, bdd;
var init_bdd = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/bdd.js"() {
    init_esm();
    import_util_endpoints = __toESM(require_dist_cjs12());
    k = "ref";
    a = -1;
    b = true;
    c = "isSet";
    d = "PartitionResult";
    e = "booleanEquals";
    f = "getAttr";
    g = { [k]: "Endpoint" };
    h = { [k]: d };
    i = {};
    j = [{ [k]: "Region" }];
    _data = {
      conditions: [
        [c, [g]],
        [c, j],
        ["aws.partition", j, d],
        [e, [{ [k]: "UseFIPS" }, b]],
        [e, [{ [k]: "UseDualStack" }, b]],
        [e, [{ fn: f, argv: [h, "supportsDualStack"] }, b]],
        [e, [{ fn: f, argv: [h, "supportsFIPS"] }, b]],
        ["stringEquals", [{ fn: f, argv: [h, "name"] }, "aws-us-gov"]]
      ],
      results: [
        [a],
        [a, "Invalid Configuration: FIPS and custom endpoint are not supported"],
        [a, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
        [g, i],
        ["https://portal.sso-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
        [a, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://portal.sso.{Region}.amazonaws.com", i],
        ["https://portal.sso-fips.{Region}.{PartitionResult#dnsSuffix}", i],
        [a, "FIPS is enabled but this partition does not support FIPS"],
        ["https://portal.sso.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
        [a, "DualStack is enabled but this partition does not support DualStack"],
        ["https://portal.sso.{Region}.{PartitionResult#dnsSuffix}", i],
        [a, "Invalid Configuration: Missing Region"]
      ]
    };
    root = 2;
    r = 1e8;
    nodes = new Int32Array([
      -1,
      1,
      -1,
      0,
      13,
      3,
      1,
      4,
      r + 12,
      2,
      5,
      r + 12,
      3,
      8,
      6,
      4,
      7,
      r + 11,
      5,
      r + 9,
      r + 10,
      4,
      11,
      9,
      6,
      10,
      r + 8,
      7,
      r + 6,
      r + 7,
      5,
      12,
      r + 5,
      6,
      r + 4,
      r + 5,
      3,
      r + 1,
      14,
      4,
      r + 2,
      r + 3
    ]);
    bdd = import_util_endpoints.BinaryDecisionDiagram.from(nodes, root, _data.conditions, _data.results);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/endpointResolver.js
var import_util_endpoints2, import_util_endpoints3, cache, defaultEndpointResolver;
var init_endpointResolver = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/endpoint/endpointResolver.js"() {
    init_esm();
    import_util_endpoints2 = __toESM(require_dist_cjs13());
    import_util_endpoints3 = __toESM(require_dist_cjs12());
    init_bdd();
    cache = new import_util_endpoints3.EndpointCache({
      size: 50,
      params: ["Endpoint", "Region", "UseDualStack", "UseFIPS"]
    });
    defaultEndpointResolver = /* @__PURE__ */ __name((endpointParams, context = {}) => {
      return cache.get(endpointParams, () => (0, import_util_endpoints3.decideEndpoint)(bdd, {
        endpointParams,
        logger: context.logger
      }));
    }, "defaultEndpointResolver");
    import_util_endpoints3.customEndpointFunctions.aws = import_util_endpoints2.awsEndpointFunctions;
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/SSOServiceException.js
var import_smithy_client, SSOServiceException;
var init_SSOServiceException = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/SSOServiceException.js"() {
    init_esm();
    import_smithy_client = __toESM(require_dist_cjs11());
    SSOServiceException = class _SSOServiceException extends import_smithy_client.ServiceException {
      static {
        __name(this, "SSOServiceException");
      }
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _SSOServiceException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/errors.js
var InvalidRequestException, ResourceNotFoundException, TooManyRequestsException, UnauthorizedException;
var init_errors = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/errors.js"() {
    init_esm();
    init_SSOServiceException();
    InvalidRequestException = class _InvalidRequestException extends SSOServiceException {
      static {
        __name(this, "InvalidRequestException");
      }
      name = "InvalidRequestException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "InvalidRequestException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidRequestException.prototype);
      }
    };
    ResourceNotFoundException = class _ResourceNotFoundException extends SSOServiceException {
      static {
        __name(this, "ResourceNotFoundException");
      }
      name = "ResourceNotFoundException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "ResourceNotFoundException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ResourceNotFoundException.prototype);
      }
    };
    TooManyRequestsException = class _TooManyRequestsException extends SSOServiceException {
      static {
        __name(this, "TooManyRequestsException");
      }
      name = "TooManyRequestsException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "TooManyRequestsException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _TooManyRequestsException.prototype);
      }
    };
    UnauthorizedException = class _UnauthorizedException extends SSOServiceException {
      static {
        __name(this, "UnauthorizedException");
      }
      name = "UnauthorizedException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "UnauthorizedException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _UnauthorizedException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/schemas/schemas_0.js
var _ATT, _GRC, _GRCR, _GRCRe, _IRE, _RC, _RNFE, _SAKT, _STT, _TMRE, _UE, _aI, _aKI, _aT, _ai, _c, _e, _ex, _h, _hE, _hH, _hQ, _m, _rC, _rN, _rn, _s, _sAK, _sT, _xasbt, n0, _s_registry, SSOServiceException$, n0_registry, InvalidRequestException$, ResourceNotFoundException$, TooManyRequestsException$, UnauthorizedException$, errorTypeRegistries, AccessTokenType, SecretAccessKeyType, SessionTokenType, GetRoleCredentialsRequest$, GetRoleCredentialsResponse$, RoleCredentials$, GetRoleCredentials$;
var init_schemas_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/schemas/schemas_0.js"() {
    init_esm();
    init_schema();
    init_errors();
    init_SSOServiceException();
    _ATT = "AccessTokenType";
    _GRC = "GetRoleCredentials";
    _GRCR = "GetRoleCredentialsRequest";
    _GRCRe = "GetRoleCredentialsResponse";
    _IRE = "InvalidRequestException";
    _RC = "RoleCredentials";
    _RNFE = "ResourceNotFoundException";
    _SAKT = "SecretAccessKeyType";
    _STT = "SessionTokenType";
    _TMRE = "TooManyRequestsException";
    _UE = "UnauthorizedException";
    _aI = "accountId";
    _aKI = "accessKeyId";
    _aT = "accessToken";
    _ai = "account_id";
    _c = "client";
    _e = "error";
    _ex = "expiration";
    _h = "http";
    _hE = "httpError";
    _hH = "httpHeader";
    _hQ = "httpQuery";
    _m = "message";
    _rC = "roleCredentials";
    _rN = "roleName";
    _rn = "role_name";
    _s = "smithy.ts.sdk.synthetic.com.amazonaws.sso";
    _sAK = "secretAccessKey";
    _sT = "sessionToken";
    _xasbt = "x-amz-sso_bearer_token";
    n0 = "com.amazonaws.sso";
    _s_registry = TypeRegistry.for(_s);
    SSOServiceException$ = [-3, _s, "SSOServiceException", 0, [], []];
    _s_registry.registerError(SSOServiceException$, SSOServiceException);
    n0_registry = TypeRegistry.for(n0);
    InvalidRequestException$ = [-3, n0, _IRE, { [_e]: _c, [_hE]: 400 }, [_m], [0]];
    n0_registry.registerError(InvalidRequestException$, InvalidRequestException);
    ResourceNotFoundException$ = [-3, n0, _RNFE, { [_e]: _c, [_hE]: 404 }, [_m], [0]];
    n0_registry.registerError(ResourceNotFoundException$, ResourceNotFoundException);
    TooManyRequestsException$ = [-3, n0, _TMRE, { [_e]: _c, [_hE]: 429 }, [_m], [0]];
    n0_registry.registerError(TooManyRequestsException$, TooManyRequestsException);
    UnauthorizedException$ = [-3, n0, _UE, { [_e]: _c, [_hE]: 401 }, [_m], [0]];
    n0_registry.registerError(UnauthorizedException$, UnauthorizedException);
    errorTypeRegistries = [_s_registry, n0_registry];
    AccessTokenType = [0, n0, _ATT, 8, 0];
    SecretAccessKeyType = [0, n0, _SAKT, 8, 0];
    SessionTokenType = [0, n0, _STT, 8, 0];
    GetRoleCredentialsRequest$ = [
      3,
      n0,
      _GRCR,
      0,
      [_rN, _aI, _aT],
      [
        [0, { [_hQ]: _rn }],
        [0, { [_hQ]: _ai }],
        [() => AccessTokenType, { [_hH]: _xasbt }]
      ],
      3
    ];
    GetRoleCredentialsResponse$ = [
      3,
      n0,
      _GRCRe,
      0,
      [_rC],
      [[() => RoleCredentials$, 0]]
    ];
    RoleCredentials$ = [
      3,
      n0,
      _RC,
      0,
      [_aKI, _sAK, _sT, _ex],
      [0, [() => SecretAccessKeyType, 0], [() => SessionTokenType, 0], 1]
    ];
    GetRoleCredentials$ = [
      9,
      n0,
      _GRC,
      { [_h]: ["GET", "/federation/credentials", 200] },
      () => GetRoleCredentialsRequest$,
      () => GetRoleCredentialsResponse$
    ];
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeConfig.shared.js
var import_smithy_client2, import_url_parser, import_util_base64, import_util_utf8, getRuntimeConfig;
var init_runtimeConfig_shared = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeConfig.shared.js"() {
    init_esm();
    init_httpAuthSchemes();
    init_protocols();
    init_dist_es();
    import_smithy_client2 = __toESM(require_dist_cjs11());
    import_url_parser = __toESM(require_dist_cjs10());
    import_util_base64 = __toESM(require_dist_cjs4());
    import_util_utf8 = __toESM(require_dist_cjs3());
    init_httpAuthSchemeProvider();
    init_endpointResolver();
    init_schemas_0();
    getRuntimeConfig = /* @__PURE__ */ __name((config) => {
      return {
        apiVersion: "2019-06-10",
        base64Decoder: config?.base64Decoder ?? import_util_base64.fromBase64,
        base64Encoder: config?.base64Encoder ?? import_util_base64.toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSSOHttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4"), "identityProvider"),
            signer: new AwsSdkSigV4Signer()
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})), "identityProvider"),
            signer: new NoAuthSigner()
          }
        ],
        logger: config?.logger ?? new import_smithy_client2.NoOpLogger(),
        protocol: config?.protocol ?? AwsRestJsonProtocol,
        protocolSettings: config?.protocolSettings ?? {
          defaultNamespace: "com.amazonaws.sso",
          errorTypeRegistries,
          version: "2019-06-10",
          serviceTarget: "SWBPortalService"
        },
        serviceId: config?.serviceId ?? "SSO",
        urlParser: config?.urlParser ?? import_url_parser.parseUrl,
        utf8Decoder: config?.utf8Decoder ?? import_util_utf8.fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? import_util_utf8.toUtf8
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeConfig.js
var import_util_user_agent_node, import_config_resolver, import_hash_node, import_middleware_retry, import_node_config_provider, import_node_http_handler, import_smithy_client3, import_util_body_length_node, import_util_defaults_mode_node, import_util_retry, getRuntimeConfig2;
var init_runtimeConfig = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeConfig.js"() {
    init_esm();
    init_package();
    init_client();
    init_httpAuthSchemes();
    import_util_user_agent_node = __toESM(require_dist_cjs22());
    import_config_resolver = __toESM(require_dist_cjs15());
    import_hash_node = __toESM(require_dist_cjs23());
    import_middleware_retry = __toESM(require_dist_cjs21());
    import_node_config_provider = __toESM(require_dist_cjs19());
    import_node_http_handler = __toESM(require_dist_cjs5());
    import_smithy_client3 = __toESM(require_dist_cjs11());
    import_util_body_length_node = __toESM(require_dist_cjs24());
    import_util_defaults_mode_node = __toESM(require_dist_cjs25());
    import_util_retry = __toESM(require_dist_cjs2());
    init_runtimeConfig_shared();
    getRuntimeConfig2 = /* @__PURE__ */ __name((config) => {
      (0, import_smithy_client3.emitWarningIfUnsupportedVersion)(process.version);
      const defaultsMode = (0, import_util_defaults_mode_node.resolveDefaultsModeConfig)(config);
      const defaultConfigProvider = /* @__PURE__ */ __name(() => defaultsMode().then(import_smithy_client3.loadConfigsForDefaultMode), "defaultConfigProvider");
      const clientSharedValues = getRuntimeConfig(config);
      emitWarningIfUnsupportedVersion(process.version);
      const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger
      };
      return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? (0, import_node_config_provider.loadConfig)(NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? import_util_body_length_node.calculateBodyLength,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ?? (0, import_util_user_agent_node.createDefaultUserAgentProvider)({ serviceId: clientSharedValues.serviceId, clientVersion: package_default.version }),
        maxAttempts: config?.maxAttempts ?? (0, import_node_config_provider.loadConfig)(import_middleware_retry.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ?? (0, import_node_config_provider.loadConfig)(import_config_resolver.NODE_REGION_CONFIG_OPTIONS, { ...import_config_resolver.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: import_node_http_handler.NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
        retryMode: config?.retryMode ?? (0, import_node_config_provider.loadConfig)({
          ...import_middleware_retry.NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: /* @__PURE__ */ __name(async () => (await defaultConfigProvider()).retryMode || import_util_retry.DEFAULT_RETRY_MODE, "default")
        }, config),
        sha256: config?.sha256 ?? import_hash_node.Hash.bind(null, "sha256"),
        streamCollector: config?.streamCollector ?? import_node_http_handler.streamCollector,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? (0, import_node_config_provider.loadConfig)(import_config_resolver.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? (0, import_node_config_provider.loadConfig)(import_config_resolver.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? (0, import_node_config_provider.loadConfig)(import_util_user_agent_node.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration, resolveHttpAuthRuntimeConfig;
var init_httpAuthExtensionConfiguration = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/auth/httpAuthExtensionConfiguration.js"() {
    init_esm();
    getHttpAuthExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
      let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
      let _credentials = runtimeConfig.credentials;
      return {
        setHttpAuthScheme(httpAuthScheme) {
          const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
          if (index === -1) {
            _httpAuthSchemes.push(httpAuthScheme);
          } else {
            _httpAuthSchemes.splice(index, 1, httpAuthScheme);
          }
        },
        httpAuthSchemes() {
          return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
          _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
          return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
          _credentials = credentials;
        },
        credentials() {
          return _credentials;
        }
      };
    }, "getHttpAuthExtensionConfiguration");
    resolveHttpAuthRuntimeConfig = /* @__PURE__ */ __name((config) => {
      return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials()
      };
    }, "resolveHttpAuthRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeExtensions.js
var import_region_config_resolver, import_protocol_http, import_smithy_client4, resolveRuntimeExtensions;
var init_runtimeExtensions = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/runtimeExtensions.js"() {
    init_esm();
    import_region_config_resolver = __toESM(require_dist_cjs26());
    import_protocol_http = __toESM(require_dist_cjs());
    import_smithy_client4 = __toESM(require_dist_cjs11());
    init_httpAuthExtensionConfiguration();
    resolveRuntimeExtensions = /* @__PURE__ */ __name((runtimeConfig, extensions) => {
      const extensionConfiguration = Object.assign((0, import_region_config_resolver.getAwsRegionExtensionConfiguration)(runtimeConfig), (0, import_smithy_client4.getDefaultExtensionConfiguration)(runtimeConfig), (0, import_protocol_http.getHttpHandlerExtensionConfiguration)(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
      extensions.forEach((extension) => extension.configure(extensionConfiguration));
      return Object.assign(runtimeConfig, (0, import_region_config_resolver.resolveAwsRegionExtensionConfiguration)(extensionConfiguration), (0, import_smithy_client4.resolveDefaultRuntimeConfig)(extensionConfiguration), (0, import_protocol_http.resolveHttpHandlerRuntimeConfig)(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
    }, "resolveRuntimeExtensions");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/SSOClient.js
var import_middleware_host_header, import_middleware_logger, import_middleware_recursion_detection, import_middleware_user_agent, import_config_resolver2, import_middleware_content_length, import_middleware_endpoint, import_middleware_retry2, import_smithy_client5, SSOClient;
var init_SSOClient = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/SSOClient.js"() {
    init_esm();
    import_middleware_host_header = __toESM(require_dist_cjs7());
    import_middleware_logger = __toESM(require_dist_cjs8());
    import_middleware_recursion_detection = __toESM(require_dist_cjs9());
    import_middleware_user_agent = __toESM(require_dist_cjs14());
    import_config_resolver2 = __toESM(require_dist_cjs15());
    init_dist_es();
    init_schema();
    import_middleware_content_length = __toESM(require_dist_cjs16());
    import_middleware_endpoint = __toESM(require_dist_cjs20());
    import_middleware_retry2 = __toESM(require_dist_cjs21());
    import_smithy_client5 = __toESM(require_dist_cjs11());
    init_httpAuthSchemeProvider();
    init_EndpointParameters();
    init_runtimeConfig();
    init_runtimeExtensions();
    SSOClient = class extends import_smithy_client5.Client {
      static {
        __name(this, "SSOClient");
      }
      config;
      constructor(...[configuration]) {
        const _config_0 = getRuntimeConfig2(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = (0, import_middleware_user_agent.resolveUserAgentConfig)(_config_1);
        const _config_3 = (0, import_middleware_retry2.resolveRetryConfig)(_config_2);
        const _config_4 = (0, import_config_resolver2.resolveRegionConfig)(_config_3);
        const _config_5 = (0, import_middleware_host_header.resolveHostHeaderConfig)(_config_4);
        const _config_6 = (0, import_middleware_endpoint.resolveEndpointConfig)(_config_5);
        const _config_7 = resolveHttpAuthSchemeConfig(_config_6);
        const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(getSchemaSerdePlugin(this.config));
        this.middlewareStack.use((0, import_middleware_user_agent.getUserAgentPlugin)(this.config));
        this.middlewareStack.use((0, import_middleware_retry2.getRetryPlugin)(this.config));
        this.middlewareStack.use((0, import_middleware_content_length.getContentLengthPlugin)(this.config));
        this.middlewareStack.use((0, import_middleware_host_header.getHostHeaderPlugin)(this.config));
        this.middlewareStack.use((0, import_middleware_logger.getLoggerPlugin)(this.config));
        this.middlewareStack.use((0, import_middleware_recursion_detection.getRecursionDetectionPlugin)(this.config));
        this.middlewareStack.use(getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: defaultSSOHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials
          }), "identityProviderConfigProvider")
        }));
        this.middlewareStack.use(getHttpSigningPlugin(this.config));
      }
      destroy() {
        super.destroy();
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commands/GetRoleCredentialsCommand.js
var import_middleware_endpoint2, import_smithy_client6, GetRoleCredentialsCommand;
var init_GetRoleCredentialsCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commands/GetRoleCredentialsCommand.js"() {
    init_esm();
    import_middleware_endpoint2 = __toESM(require_dist_cjs20());
    import_smithy_client6 = __toESM(require_dist_cjs11());
    init_EndpointParameters();
    init_schemas_0();
    GetRoleCredentialsCommand = class extends import_smithy_client6.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
      return [(0, import_middleware_endpoint2.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())];
    }).s("SWBPortalService", "GetRoleCredentials", {}).n("SSOClient", "GetRoleCredentialsCommand").sc(GetRoleCredentials$).build() {
      static {
        __name(this, "GetRoleCredentialsCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/SSO.js
var import_smithy_client7, commands, SSO;
var init_SSO = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/SSO.js"() {
    init_esm();
    import_smithy_client7 = __toESM(require_dist_cjs11());
    init_GetRoleCredentialsCommand();
    init_SSOClient();
    commands = {
      GetRoleCredentialsCommand
    };
    SSO = class extends SSOClient {
      static {
        __name(this, "SSO");
      }
    };
    (0, import_smithy_client7.createAggregatedClient)(commands, SSO);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commands/index.js
var init_commands = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/commands/index.js"() {
    init_esm();
    init_GetRoleCredentialsCommand();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/models_0.js
var init_models_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/models/models_0.js"() {
    init_esm();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/index.js
var sso_exports = {};
__export(sso_exports, {
  $Command: () => import_smithy_client6.Command,
  GetRoleCredentials$: () => GetRoleCredentials$,
  GetRoleCredentialsCommand: () => GetRoleCredentialsCommand,
  GetRoleCredentialsRequest$: () => GetRoleCredentialsRequest$,
  GetRoleCredentialsResponse$: () => GetRoleCredentialsResponse$,
  InvalidRequestException: () => InvalidRequestException,
  InvalidRequestException$: () => InvalidRequestException$,
  ResourceNotFoundException: () => ResourceNotFoundException,
  ResourceNotFoundException$: () => ResourceNotFoundException$,
  RoleCredentials$: () => RoleCredentials$,
  SSO: () => SSO,
  SSOClient: () => SSOClient,
  SSOServiceException: () => SSOServiceException,
  SSOServiceException$: () => SSOServiceException$,
  TooManyRequestsException: () => TooManyRequestsException,
  TooManyRequestsException$: () => TooManyRequestsException$,
  UnauthorizedException: () => UnauthorizedException,
  UnauthorizedException$: () => UnauthorizedException$,
  __Client: () => import_smithy_client5.Client,
  errorTypeRegistries: () => errorTypeRegistries
});
var init_sso = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso/index.js"() {
    init_esm();
    init_SSOClient();
    init_SSO();
    init_commands();
    init_schemas_0();
    init_errors();
    init_models_0();
    init_SSOServiceException();
  }
});

// node_modules/@aws-sdk/credential-provider-sso/dist-cjs/loadSso-BKDNrsal.js
var require_loadSso_BKDNrsal = __commonJS({
  "node_modules/@aws-sdk/credential-provider-sso/dist-cjs/loadSso-BKDNrsal.js"(exports) {
    "use strict";
    init_esm();
    var sso = (init_sso(), __toCommonJS(sso_exports));
    exports.GetRoleCredentialsCommand = sso.GetRoleCredentialsCommand;
    exports.SSOClient = sso.SSOClient;
  }
});

// node_modules/@aws-sdk/credential-provider-sso/dist-cjs/index.js
var require_dist_cjs28 = __commonJS({
  "node_modules/@aws-sdk/credential-provider-sso/dist-cjs/index.js"(exports) {
    init_esm();
    var propertyProvider = require_dist_cjs17();
    var sharedIniFileLoader = require_dist_cjs18();
    var client = (init_client(), __toCommonJS(client_exports));
    var tokenProviders = require_dist_cjs27();
    var isSsoProfile = /* @__PURE__ */ __name((arg) => arg && (typeof arg.sso_start_url === "string" || typeof arg.sso_account_id === "string" || typeof arg.sso_session === "string" || typeof arg.sso_region === "string" || typeof arg.sso_role_name === "string"), "isSsoProfile");
    var SHOULD_FAIL_CREDENTIAL_CHAIN = false;
    var resolveSSOCredentials = /* @__PURE__ */ __name(async ({ ssoStartUrl, ssoSession, ssoAccountId, ssoRegion, ssoRoleName, ssoClient, clientConfig, parentClientConfig, callerClientConfig, profile, filepath, configFilepath, ignoreCache, logger }) => {
      let token;
      const refreshMessage = `To refresh this SSO session run aws sso login with the corresponding profile.`;
      if (ssoSession) {
        try {
          const _token = await tokenProviders.fromSso({
            profile,
            filepath,
            configFilepath,
            ignoreCache
          })();
          token = {
            accessToken: _token.token,
            expiresAt: new Date(_token.expiration).toISOString()
          };
        } catch (e2) {
          throw new propertyProvider.CredentialsProviderError(e2.message, {
            tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
            logger
          });
        }
      } else {
        try {
          token = await sharedIniFileLoader.getSSOTokenFromFile(ssoStartUrl);
        } catch (e2) {
          throw new propertyProvider.CredentialsProviderError(`The SSO session associated with this profile is invalid. ${refreshMessage}`, {
            tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
            logger
          });
        }
      }
      if (new Date(token.expiresAt).getTime() - Date.now() <= 0) {
        throw new propertyProvider.CredentialsProviderError(`The SSO session associated with this profile has expired. ${refreshMessage}`, {
          tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
          logger
        });
      }
      const { accessToken } = token;
      const { SSOClient: SSOClient2, GetRoleCredentialsCommand: GetRoleCredentialsCommand2 } = await Promise.resolve().then(function() {
        return require_loadSso_BKDNrsal();
      });
      const sso = ssoClient || new SSOClient2(Object.assign({}, clientConfig ?? {}, {
        logger: clientConfig?.logger ?? callerClientConfig?.logger ?? parentClientConfig?.logger,
        region: clientConfig?.region ?? ssoRegion,
        userAgentAppId: clientConfig?.userAgentAppId ?? callerClientConfig?.userAgentAppId ?? parentClientConfig?.userAgentAppId
      }));
      let ssoResp;
      try {
        ssoResp = await sso.send(new GetRoleCredentialsCommand2({
          accountId: ssoAccountId,
          roleName: ssoRoleName,
          accessToken
        }));
      } catch (e2) {
        throw new propertyProvider.CredentialsProviderError(e2, {
          tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
          logger
        });
      }
      const { roleCredentials: { accessKeyId, secretAccessKey, sessionToken, expiration, credentialScope, accountId } = {} } = ssoResp;
      if (!accessKeyId || !secretAccessKey || !sessionToken || !expiration) {
        throw new propertyProvider.CredentialsProviderError("SSO returns an invalid temporary credential.", {
          tryNextLink: SHOULD_FAIL_CREDENTIAL_CHAIN,
          logger
        });
      }
      const credentials = {
        accessKeyId,
        secretAccessKey,
        sessionToken,
        expiration: new Date(expiration),
        ...credentialScope && { credentialScope },
        ...accountId && { accountId }
      };
      if (ssoSession) {
        client.setCredentialFeature(credentials, "CREDENTIALS_SSO", "s");
      } else {
        client.setCredentialFeature(credentials, "CREDENTIALS_SSO_LEGACY", "u");
      }
      return credentials;
    }, "resolveSSOCredentials");
    var validateSsoProfile = /* @__PURE__ */ __name((profile, logger) => {
      const { sso_start_url, sso_account_id, sso_region, sso_role_name } = profile;
      if (!sso_start_url || !sso_account_id || !sso_region || !sso_role_name) {
        throw new propertyProvider.CredentialsProviderError(`Profile is configured with invalid SSO credentials. Required parameters "sso_account_id", "sso_region", "sso_role_name", "sso_start_url". Got ${Object.keys(profile).join(", ")}
Reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html`, { tryNextLink: false, logger });
      }
      return profile;
    }, "validateSsoProfile");
    var fromSSO = /* @__PURE__ */ __name((init = {}) => async ({ callerClientConfig } = {}) => {
      init.logger?.debug("@aws-sdk/credential-provider-sso - fromSSO");
      const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
      const { ssoClient } = init;
      const profileName = sharedIniFileLoader.getProfileName({
        profile: init.profile ?? callerClientConfig?.profile
      });
      if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
        const profiles = await sharedIniFileLoader.parseKnownFiles(init);
        const profile = profiles[profileName];
        if (!profile) {
          throw new propertyProvider.CredentialsProviderError(`Profile ${profileName} was not found.`, { logger: init.logger });
        }
        if (!isSsoProfile(profile)) {
          throw new propertyProvider.CredentialsProviderError(`Profile ${profileName} is not configured with SSO credentials.`, {
            logger: init.logger
          });
        }
        if (profile?.sso_session) {
          const ssoSessions = await sharedIniFileLoader.loadSsoSessionData(init);
          const session = ssoSessions[profile.sso_session];
          const conflictMsg = ` configurations in profile ${profileName} and sso-session ${profile.sso_session}`;
          if (ssoRegion && ssoRegion !== session.sso_region) {
            throw new propertyProvider.CredentialsProviderError(`Conflicting SSO region` + conflictMsg, {
              tryNextLink: false,
              logger: init.logger
            });
          }
          if (ssoStartUrl && ssoStartUrl !== session.sso_start_url) {
            throw new propertyProvider.CredentialsProviderError(`Conflicting SSO start_url` + conflictMsg, {
              tryNextLink: false,
              logger: init.logger
            });
          }
          profile.sso_region = session.sso_region;
          profile.sso_start_url = session.sso_start_url;
        }
        const { sso_start_url, sso_account_id, sso_region, sso_role_name, sso_session } = validateSsoProfile(profile, init.logger);
        return resolveSSOCredentials({
          ssoStartUrl: sso_start_url,
          ssoSession: sso_session,
          ssoAccountId: sso_account_id,
          ssoRegion: sso_region,
          ssoRoleName: sso_role_name,
          ssoClient,
          clientConfig: init.clientConfig,
          parentClientConfig: init.parentClientConfig,
          callerClientConfig: init.callerClientConfig,
          profile: profileName,
          filepath: init.filepath,
          configFilepath: init.configFilepath,
          ignoreCache: init.ignoreCache,
          logger: init.logger
        });
      } else if (!ssoStartUrl || !ssoAccountId || !ssoRegion || !ssoRoleName) {
        throw new propertyProvider.CredentialsProviderError('Incomplete configuration. The fromSSO() argument hash must include "ssoStartUrl", "ssoAccountId", "ssoRegion", "ssoRoleName"', { tryNextLink: false, logger: init.logger });
      } else {
        return resolveSSOCredentials({
          ssoStartUrl,
          ssoSession,
          ssoAccountId,
          ssoRegion,
          ssoRoleName,
          ssoClient,
          clientConfig: init.clientConfig,
          parentClientConfig: init.parentClientConfig,
          callerClientConfig: init.callerClientConfig,
          profile: profileName,
          filepath: init.filepath,
          configFilepath: init.configFilepath,
          ignoreCache: init.ignoreCache,
          logger: init.logger
        });
      }
    }, "fromSSO");
    exports.fromSSO = fromSSO;
    exports.isSsoProfile = isSsoProfile;
    exports.validateSsoProfile = validateSsoProfile;
  }
});
export default require_dist_cjs28();
//# sourceMappingURL=dist-cjs-3EWUSYY4.mjs.map
