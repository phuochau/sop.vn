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
  init_dist_es,
  init_httpAuthSchemes,
  init_protocols,
  require_dist_cjs as require_dist_cjs7,
  require_dist_cjs10 as require_dist_cjs16,
  require_dist_cjs11 as require_dist_cjs18,
  require_dist_cjs12 as require_dist_cjs19,
  require_dist_cjs13 as require_dist_cjs20,
  require_dist_cjs14 as require_dist_cjs21,
  require_dist_cjs15 as require_dist_cjs22,
  require_dist_cjs16 as require_dist_cjs23,
  require_dist_cjs17 as require_dist_cjs24,
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
  emitWarningIfUnsupportedVersion,
  init_client,
  require_dist_cjs2
} from "./chunk-IAJ5C443.mjs";
import {
  require_dist_cjs as require_dist_cjs17
} from "./chunk-HVKOIMR6.mjs";
import {
  require_dist_cjs as require_dist_cjs10
} from "./chunk-Q4T5MCLT.mjs";
import "./chunk-IIMKTLY7.mjs";
import "./chunk-YPLDPGBH.mjs";
import "./chunk-RIFC2BQV.mjs";
import {
  __esm,
  __name,
  __toESM,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "sso-oauth",
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
var import_util_middleware, defaultSSOOIDCHttpAuthSchemeParametersProvider, defaultSSOOIDCHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig;
var init_httpAuthSchemeProvider = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthSchemeProvider.js"() {
    init_esm();
    init_httpAuthSchemes();
    import_util_middleware = __toESM(require_dist_cjs6());
    defaultSSOOIDCHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: (0, import_util_middleware.getSmithyContext)(context).operation,
        region: await (0, import_util_middleware.normalizeProvider)(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "defaultSSOOIDCHttpAuthSchemeParametersProvider");
    __name(createAwsAuthSigv4HttpAuthOption, "createAwsAuthSigv4HttpAuthOption");
    __name(createSmithyApiNoAuthHttpAuthOption, "createSmithyApiNoAuthHttpAuthOption");
    defaultSSOOIDCHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        case "CreateToken": {
          options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
          break;
        }
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
        }
      }
      return options;
    }, "defaultSSOOIDCHttpAuthSchemeProvider");
    resolveHttpAuthSchemeConfig = /* @__PURE__ */ __name((config) => {
      const config_0 = resolveAwsSdkSigV4Config(config);
      return Object.assign(config_0, {
        authSchemePreference: (0, import_util_middleware.normalizeProvider)(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/EndpointParameters.js
var resolveClientEndpointParameters, commonParams;
var init_EndpointParameters = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/EndpointParameters.js"() {
    init_esm();
    resolveClientEndpointParameters = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "sso-oauth"
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/bdd.js
var import_util_endpoints, k, a, b, c, d, e, f, g, h, i, j, _data, root, r, nodes, bdd;
var init_bdd = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/bdd.js"() {
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
        ["https://oidc-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
        [a, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://oidc.{Region}.amazonaws.com", i],
        ["https://oidc-fips.{Region}.{PartitionResult#dnsSuffix}", i],
        [a, "FIPS is enabled but this partition does not support FIPS"],
        ["https://oidc.{Region}.{PartitionResult#dualStackDnsSuffix}", i],
        [a, "DualStack is enabled but this partition does not support DualStack"],
        ["https://oidc.{Region}.{PartitionResult#dnsSuffix}", i],
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/endpointResolver.js
var import_util_endpoints2, import_util_endpoints3, cache, defaultEndpointResolver;
var init_endpointResolver = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/endpoint/endpointResolver.js"() {
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/SSOOIDCServiceException.js
var import_smithy_client, SSOOIDCServiceException;
var init_SSOOIDCServiceException = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/SSOOIDCServiceException.js"() {
    init_esm();
    import_smithy_client = __toESM(require_dist_cjs11());
    SSOOIDCServiceException = class _SSOOIDCServiceException extends import_smithy_client.ServiceException {
      static {
        __name(this, "SSOOIDCServiceException");
      }
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _SSOOIDCServiceException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/errors.js
var AccessDeniedException, AuthorizationPendingException, ExpiredTokenException, InternalServerException, InvalidClientException, InvalidGrantException, InvalidRequestException, InvalidScopeException, SlowDownException, UnauthorizedClientException, UnsupportedGrantTypeException;
var init_errors = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/errors.js"() {
    init_esm();
    init_SSOOIDCServiceException();
    AccessDeniedException = class _AccessDeniedException extends SSOOIDCServiceException {
      static {
        __name(this, "AccessDeniedException");
      }
      name = "AccessDeniedException";
      $fault = "client";
      error;
      reason;
      error_description;
      constructor(opts) {
        super({
          name: "AccessDeniedException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _AccessDeniedException.prototype);
        this.error = opts.error;
        this.reason = opts.reason;
        this.error_description = opts.error_description;
      }
    };
    AuthorizationPendingException = class _AuthorizationPendingException extends SSOOIDCServiceException {
      static {
        __name(this, "AuthorizationPendingException");
      }
      name = "AuthorizationPendingException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "AuthorizationPendingException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _AuthorizationPendingException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    ExpiredTokenException = class _ExpiredTokenException extends SSOOIDCServiceException {
      static {
        __name(this, "ExpiredTokenException");
      }
      name = "ExpiredTokenException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "ExpiredTokenException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ExpiredTokenException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    InternalServerException = class _InternalServerException extends SSOOIDCServiceException {
      static {
        __name(this, "InternalServerException");
      }
      name = "InternalServerException";
      $fault = "server";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InternalServerException",
          $fault: "server",
          ...opts
        });
        Object.setPrototypeOf(this, _InternalServerException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    InvalidClientException = class _InvalidClientException extends SSOOIDCServiceException {
      static {
        __name(this, "InvalidClientException");
      }
      name = "InvalidClientException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidClientException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidClientException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    InvalidGrantException = class _InvalidGrantException extends SSOOIDCServiceException {
      static {
        __name(this, "InvalidGrantException");
      }
      name = "InvalidGrantException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidGrantException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidGrantException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    InvalidRequestException = class _InvalidRequestException extends SSOOIDCServiceException {
      static {
        __name(this, "InvalidRequestException");
      }
      name = "InvalidRequestException";
      $fault = "client";
      error;
      reason;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidRequestException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidRequestException.prototype);
        this.error = opts.error;
        this.reason = opts.reason;
        this.error_description = opts.error_description;
      }
    };
    InvalidScopeException = class _InvalidScopeException extends SSOOIDCServiceException {
      static {
        __name(this, "InvalidScopeException");
      }
      name = "InvalidScopeException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "InvalidScopeException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidScopeException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    SlowDownException = class _SlowDownException extends SSOOIDCServiceException {
      static {
        __name(this, "SlowDownException");
      }
      name = "SlowDownException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "SlowDownException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _SlowDownException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    UnauthorizedClientException = class _UnauthorizedClientException extends SSOOIDCServiceException {
      static {
        __name(this, "UnauthorizedClientException");
      }
      name = "UnauthorizedClientException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "UnauthorizedClientException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _UnauthorizedClientException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
    UnsupportedGrantTypeException = class _UnsupportedGrantTypeException extends SSOOIDCServiceException {
      static {
        __name(this, "UnsupportedGrantTypeException");
      }
      name = "UnsupportedGrantTypeException";
      $fault = "client";
      error;
      error_description;
      constructor(opts) {
        super({
          name: "UnsupportedGrantTypeException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _UnsupportedGrantTypeException.prototype);
        this.error = opts.error;
        this.error_description = opts.error_description;
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/schemas/schemas_0.js
var _ADE, _APE, _AT, _CS, _CT, _CTR, _CTRr, _CV, _ETE, _ICE, _IGE, _IRE, _ISE, _ISEn, _IT, _RT, _SDE, _UCE, _UGTE, _aT, _c, _cI, _cS, _cV, _co, _dC, _e, _eI, _ed, _gT, _h, _hE, _iT, _r, _rT, _rU, _s, _sc, _se, _tT, n0, _s_registry, SSOOIDCServiceException$, n0_registry, AccessDeniedException$, AuthorizationPendingException$, ExpiredTokenException$, InternalServerException$, InvalidClientException$, InvalidGrantException$, InvalidRequestException$, InvalidScopeException$, SlowDownException$, UnauthorizedClientException$, UnsupportedGrantTypeException$, errorTypeRegistries, AccessToken, ClientSecret, CodeVerifier, IdToken, RefreshToken, CreateTokenRequest$, CreateTokenResponse$, Scopes, CreateToken$;
var init_schemas_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/schemas/schemas_0.js"() {
    init_esm();
    init_schema();
    init_errors();
    init_SSOOIDCServiceException();
    _ADE = "AccessDeniedException";
    _APE = "AuthorizationPendingException";
    _AT = "AccessToken";
    _CS = "ClientSecret";
    _CT = "CreateToken";
    _CTR = "CreateTokenRequest";
    _CTRr = "CreateTokenResponse";
    _CV = "CodeVerifier";
    _ETE = "ExpiredTokenException";
    _ICE = "InvalidClientException";
    _IGE = "InvalidGrantException";
    _IRE = "InvalidRequestException";
    _ISE = "InternalServerException";
    _ISEn = "InvalidScopeException";
    _IT = "IdToken";
    _RT = "RefreshToken";
    _SDE = "SlowDownException";
    _UCE = "UnauthorizedClientException";
    _UGTE = "UnsupportedGrantTypeException";
    _aT = "accessToken";
    _c = "client";
    _cI = "clientId";
    _cS = "clientSecret";
    _cV = "codeVerifier";
    _co = "code";
    _dC = "deviceCode";
    _e = "error";
    _eI = "expiresIn";
    _ed = "error_description";
    _gT = "grantType";
    _h = "http";
    _hE = "httpError";
    _iT = "idToken";
    _r = "reason";
    _rT = "refreshToken";
    _rU = "redirectUri";
    _s = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc";
    _sc = "scope";
    _se = "server";
    _tT = "tokenType";
    n0 = "com.amazonaws.ssooidc";
    _s_registry = TypeRegistry.for(_s);
    SSOOIDCServiceException$ = [-3, _s, "SSOOIDCServiceException", 0, [], []];
    _s_registry.registerError(SSOOIDCServiceException$, SSOOIDCServiceException);
    n0_registry = TypeRegistry.for(n0);
    AccessDeniedException$ = [
      -3,
      n0,
      _ADE,
      { [_e]: _c, [_hE]: 400 },
      [_e, _r, _ed],
      [0, 0, 0]
    ];
    n0_registry.registerError(AccessDeniedException$, AccessDeniedException);
    AuthorizationPendingException$ = [
      -3,
      n0,
      _APE,
      { [_e]: _c, [_hE]: 400 },
      [_e, _ed],
      [0, 0]
    ];
    n0_registry.registerError(AuthorizationPendingException$, AuthorizationPendingException);
    ExpiredTokenException$ = [-3, n0, _ETE, { [_e]: _c, [_hE]: 400 }, [_e, _ed], [0, 0]];
    n0_registry.registerError(ExpiredTokenException$, ExpiredTokenException);
    InternalServerException$ = [-3, n0, _ISE, { [_e]: _se, [_hE]: 500 }, [_e, _ed], [0, 0]];
    n0_registry.registerError(InternalServerException$, InternalServerException);
    InvalidClientException$ = [-3, n0, _ICE, { [_e]: _c, [_hE]: 401 }, [_e, _ed], [0, 0]];
    n0_registry.registerError(InvalidClientException$, InvalidClientException);
    InvalidGrantException$ = [-3, n0, _IGE, { [_e]: _c, [_hE]: 400 }, [_e, _ed], [0, 0]];
    n0_registry.registerError(InvalidGrantException$, InvalidGrantException);
    InvalidRequestException$ = [
      -3,
      n0,
      _IRE,
      { [_e]: _c, [_hE]: 400 },
      [_e, _r, _ed],
      [0, 0, 0]
    ];
    n0_registry.registerError(InvalidRequestException$, InvalidRequestException);
    InvalidScopeException$ = [-3, n0, _ISEn, { [_e]: _c, [_hE]: 400 }, [_e, _ed], [0, 0]];
    n0_registry.registerError(InvalidScopeException$, InvalidScopeException);
    SlowDownException$ = [-3, n0, _SDE, { [_e]: _c, [_hE]: 400 }, [_e, _ed], [0, 0]];
    n0_registry.registerError(SlowDownException$, SlowDownException);
    UnauthorizedClientException$ = [
      -3,
      n0,
      _UCE,
      { [_e]: _c, [_hE]: 400 },
      [_e, _ed],
      [0, 0]
    ];
    n0_registry.registerError(UnauthorizedClientException$, UnauthorizedClientException);
    UnsupportedGrantTypeException$ = [
      -3,
      n0,
      _UGTE,
      { [_e]: _c, [_hE]: 400 },
      [_e, _ed],
      [0, 0]
    ];
    n0_registry.registerError(UnsupportedGrantTypeException$, UnsupportedGrantTypeException);
    errorTypeRegistries = [_s_registry, n0_registry];
    AccessToken = [0, n0, _AT, 8, 0];
    ClientSecret = [0, n0, _CS, 8, 0];
    CodeVerifier = [0, n0, _CV, 8, 0];
    IdToken = [0, n0, _IT, 8, 0];
    RefreshToken = [0, n0, _RT, 8, 0];
    CreateTokenRequest$ = [
      3,
      n0,
      _CTR,
      0,
      [_cI, _cS, _gT, _dC, _co, _rT, _sc, _rU, _cV],
      [0, [() => ClientSecret, 0], 0, 0, 0, [() => RefreshToken, 0], 64 | 0, 0, [() => CodeVerifier, 0]],
      3
    ];
    CreateTokenResponse$ = [
      3,
      n0,
      _CTRr,
      0,
      [_aT, _tT, _eI, _rT, _iT],
      [[() => AccessToken, 0], 0, 1, [() => RefreshToken, 0], [() => IdToken, 0]]
    ];
    Scopes = 64 | 0;
    CreateToken$ = [
      9,
      n0,
      _CT,
      { [_h]: ["POST", "/token", 200] },
      () => CreateTokenRequest$,
      () => CreateTokenResponse$
    ];
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.shared.js
var import_smithy_client2, import_url_parser, import_util_base64, import_util_utf8, getRuntimeConfig;
var init_runtimeConfig_shared = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.shared.js"() {
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
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSSOOIDCHttpAuthSchemeProvider,
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
          defaultNamespace: "com.amazonaws.ssooidc",
          errorTypeRegistries,
          version: "2019-06-10",
          serviceTarget: "AWSSSOOIDCService"
        },
        serviceId: config?.serviceId ?? "SSO OIDC",
        urlParser: config?.urlParser ?? import_url_parser.parseUrl,
        utf8Decoder: config?.utf8Decoder ?? import_util_utf8.fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? import_util_utf8.toUtf8
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.js
var import_util_user_agent_node, import_config_resolver, import_hash_node, import_middleware_retry, import_node_config_provider, import_node_http_handler, import_smithy_client3, import_util_body_length_node, import_util_defaults_mode_node, import_util_retry, getRuntimeConfig2;
var init_runtimeConfig = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeConfig.js"() {
    init_esm();
    init_package();
    init_client();
    init_httpAuthSchemes();
    import_util_user_agent_node = __toESM(require_dist_cjs20());
    import_config_resolver = __toESM(require_dist_cjs15());
    import_hash_node = __toESM(require_dist_cjs21());
    import_middleware_retry = __toESM(require_dist_cjs19());
    import_node_config_provider = __toESM(require_dist_cjs17());
    import_node_http_handler = __toESM(require_dist_cjs5());
    import_smithy_client3 = __toESM(require_dist_cjs11());
    import_util_body_length_node = __toESM(require_dist_cjs22());
    import_util_defaults_mode_node = __toESM(require_dist_cjs23());
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration, resolveHttpAuthRuntimeConfig;
var init_httpAuthExtensionConfiguration = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/auth/httpAuthExtensionConfiguration.js"() {
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeExtensions.js
var import_region_config_resolver, import_protocol_http, import_smithy_client4, resolveRuntimeExtensions;
var init_runtimeExtensions = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/runtimeExtensions.js"() {
    init_esm();
    import_region_config_resolver = __toESM(require_dist_cjs24());
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDCClient.js
var import_middleware_host_header, import_middleware_logger, import_middleware_recursion_detection, import_middleware_user_agent, import_config_resolver2, import_middleware_content_length, import_middleware_endpoint, import_middleware_retry2, import_smithy_client5, SSOOIDCClient;
var init_SSOOIDCClient = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDCClient.js"() {
    init_esm();
    import_middleware_host_header = __toESM(require_dist_cjs7());
    import_middleware_logger = __toESM(require_dist_cjs8());
    import_middleware_recursion_detection = __toESM(require_dist_cjs9());
    import_middleware_user_agent = __toESM(require_dist_cjs14());
    import_config_resolver2 = __toESM(require_dist_cjs15());
    init_dist_es();
    init_schema();
    import_middleware_content_length = __toESM(require_dist_cjs16());
    import_middleware_endpoint = __toESM(require_dist_cjs18());
    import_middleware_retry2 = __toESM(require_dist_cjs19());
    import_smithy_client5 = __toESM(require_dist_cjs11());
    init_httpAuthSchemeProvider();
    init_EndpointParameters();
    init_runtimeConfig();
    init_runtimeExtensions();
    SSOOIDCClient = class extends import_smithy_client5.Client {
      static {
        __name(this, "SSOOIDCClient");
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
          httpAuthSchemeParametersProvider: defaultSSOOIDCHttpAuthSchemeParametersProvider,
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/CreateTokenCommand.js
var import_middleware_endpoint2, import_smithy_client6, CreateTokenCommand;
var init_CreateTokenCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/CreateTokenCommand.js"() {
    init_esm();
    import_middleware_endpoint2 = __toESM(require_dist_cjs18());
    import_smithy_client6 = __toESM(require_dist_cjs11());
    init_EndpointParameters();
    init_schemas_0();
    CreateTokenCommand = class extends import_smithy_client6.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
      return [(0, import_middleware_endpoint2.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())];
    }).s("AWSSSOOIDCService", "CreateToken", {}).n("SSOOIDCClient", "CreateTokenCommand").sc(CreateToken$).build() {
      static {
        __name(this, "CreateTokenCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDC.js
var import_smithy_client7, commands, SSOOIDC;
var init_SSOOIDC = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/SSOOIDC.js"() {
    init_esm();
    import_smithy_client7 = __toESM(require_dist_cjs11());
    init_CreateTokenCommand();
    init_SSOOIDCClient();
    commands = {
      CreateTokenCommand
    };
    SSOOIDC = class extends SSOOIDCClient {
      static {
        __name(this, "SSOOIDC");
      }
    };
    (0, import_smithy_client7.createAggregatedClient)(commands, SSOOIDC);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/index.js
var init_commands = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/commands/index.js"() {
    init_esm();
    init_CreateTokenCommand();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/enums.js
var AccessDeniedExceptionReason, InvalidRequestExceptionReason;
var init_enums = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/enums.js"() {
    init_esm();
    AccessDeniedExceptionReason = {
      KMS_ACCESS_DENIED: "KMS_AccessDeniedException"
    };
    InvalidRequestExceptionReason = {
      KMS_DISABLED_KEY: "KMS_DisabledException",
      KMS_INVALID_KEY_USAGE: "KMS_InvalidKeyUsageException",
      KMS_INVALID_STATE: "KMS_InvalidStateException",
      KMS_KEY_NOT_FOUND: "KMS_NotFoundException"
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/models_0.js
var init_models_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/models/models_0.js"() {
    init_esm();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/index.js
var init_sso_oidc = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sso-oidc/index.js"() {
    init_esm();
    init_SSOOIDCClient();
    init_SSOOIDC();
    init_commands();
    init_schemas_0();
    init_enums();
    init_errors();
    init_models_0();
    init_SSOOIDCServiceException();
  }
});
init_sso_oidc();
var export_$Command = import_smithy_client6.Command;
var export___Client = import_smithy_client5.Client;
export {
  export_$Command as $Command,
  AccessDeniedException,
  AccessDeniedException$,
  AccessDeniedExceptionReason,
  AuthorizationPendingException,
  AuthorizationPendingException$,
  CreateToken$,
  CreateTokenCommand,
  CreateTokenRequest$,
  CreateTokenResponse$,
  ExpiredTokenException,
  ExpiredTokenException$,
  InternalServerException,
  InternalServerException$,
  InvalidClientException,
  InvalidClientException$,
  InvalidGrantException,
  InvalidGrantException$,
  InvalidRequestException,
  InvalidRequestException$,
  InvalidRequestExceptionReason,
  InvalidScopeException,
  InvalidScopeException$,
  SSOOIDC,
  SSOOIDCClient,
  SSOOIDCServiceException,
  SSOOIDCServiceException$,
  SlowDownException,
  SlowDownException$,
  UnauthorizedClientException,
  UnauthorizedClientException$,
  UnsupportedGrantTypeException,
  UnsupportedGrantTypeException$,
  export___Client as __Client,
  errorTypeRegistries
};
//# sourceMappingURL=sso-oidc-OMB2LEAC.mjs.map
