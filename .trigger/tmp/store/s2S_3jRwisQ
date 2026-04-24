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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "signin",
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
var import_util_middleware, defaultSigninHttpAuthSchemeParametersProvider, defaultSigninHttpAuthSchemeProvider, resolveHttpAuthSchemeConfig;
var init_httpAuthSchemeProvider = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthSchemeProvider.js"() {
    init_esm();
    init_httpAuthSchemes();
    import_util_middleware = __toESM(require_dist_cjs6());
    defaultSigninHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: (0, import_util_middleware.getSmithyContext)(context).operation,
        region: await (0, import_util_middleware.normalizeProvider)(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "defaultSigninHttpAuthSchemeParametersProvider");
    __name(createAwsAuthSigv4HttpAuthOption, "createAwsAuthSigv4HttpAuthOption");
    __name(createSmithyApiNoAuthHttpAuthOption, "createSmithyApiNoAuthHttpAuthOption");
    defaultSigninHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        case "CreateOAuth2Token": {
          options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
          break;
        }
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
        }
      }
      return options;
    }, "defaultSigninHttpAuthSchemeProvider");
    resolveHttpAuthSchemeConfig = /* @__PURE__ */ __name((config) => {
      const config_0 = resolveAwsSdkSigV4Config(config);
      return Object.assign(config_0, {
        authSchemePreference: (0, import_util_middleware.normalizeProvider)(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/EndpointParameters.js
var resolveClientEndpointParameters, commonParams;
var init_EndpointParameters = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/EndpointParameters.js"() {
    init_esm();
    resolveClientEndpointParameters = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "signin"
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/bdd.js
var import_util_endpoints, m, a, b, c, d, e, f, g, h, i, j, k, l, _data, root, r, nodes, bdd;
var init_bdd = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/bdd.js"() {
    init_esm();
    import_util_endpoints = __toESM(require_dist_cjs12());
    m = "ref";
    a = -1;
    b = true;
    c = "isSet";
    d = "PartitionResult";
    e = "booleanEquals";
    f = "getAttr";
    g = "stringEquals";
    h = { [m]: "Endpoint" };
    i = { [m]: d };
    j = { fn: f, argv: [i, "name"] };
    k = {};
    l = [{ [m]: "Region" }];
    _data = {
      conditions: [
        [c, [h]],
        [c, l],
        ["aws.partition", l, d],
        [e, [{ [m]: "UseFIPS" }, b]],
        [e, [{ [m]: "UseDualStack" }, b]],
        [e, [{ fn: f, argv: [i, "supportsDualStack"] }, b]],
        [e, [{ fn: f, argv: [i, "supportsFIPS"] }, b]],
        [g, [j, "aws"]],
        [g, [j, "aws-cn"]],
        [g, [j, "aws-us-gov"]]
      ],
      results: [
        [a],
        [a, "Invalid Configuration: FIPS and custom endpoint are not supported"],
        [a, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
        [h, k],
        ["https://{Region}.signin.aws.amazon.com", k],
        ["https://{Region}.signin.amazonaws.cn", k],
        ["https://{Region}.signin.amazonaws-us-gov.com", k],
        ["https://signin-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", k],
        [a, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://signin-fips.{Region}.{PartitionResult#dnsSuffix}", k],
        [a, "FIPS is enabled but this partition does not support FIPS"],
        ["https://signin.{Region}.{PartitionResult#dualStackDnsSuffix}", k],
        [a, "DualStack is enabled but this partition does not support DualStack"],
        ["https://signin.{Region}.{PartitionResult#dnsSuffix}", k],
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
      15,
      3,
      1,
      4,
      r + 14,
      2,
      5,
      r + 14,
      3,
      11,
      6,
      4,
      10,
      7,
      7,
      r + 4,
      8,
      8,
      r + 5,
      9,
      9,
      r + 6,
      r + 13,
      5,
      r + 11,
      r + 12,
      4,
      13,
      12,
      6,
      r + 9,
      r + 10,
      5,
      14,
      r + 8,
      6,
      r + 7,
      r + 8,
      3,
      r + 1,
      16,
      4,
      r + 2,
      r + 3
    ]);
    bdd = import_util_endpoints.BinaryDecisionDiagram.from(nodes, root, _data.conditions, _data.results);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/endpointResolver.js
var import_util_endpoints2, import_util_endpoints3, cache, defaultEndpointResolver;
var init_endpointResolver = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/endpoint/endpointResolver.js"() {
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/SigninServiceException.js
var import_smithy_client, SigninServiceException;
var init_SigninServiceException = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/SigninServiceException.js"() {
    init_esm();
    import_smithy_client = __toESM(require_dist_cjs11());
    SigninServiceException = class _SigninServiceException extends import_smithy_client.ServiceException {
      static {
        __name(this, "SigninServiceException");
      }
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _SigninServiceException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/errors.js
var AccessDeniedException, InternalServerException, TooManyRequestsError, ValidationException;
var init_errors = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/errors.js"() {
    init_esm();
    init_SigninServiceException();
    AccessDeniedException = class _AccessDeniedException extends SigninServiceException {
      static {
        __name(this, "AccessDeniedException");
      }
      name = "AccessDeniedException";
      $fault = "client";
      error;
      constructor(opts) {
        super({
          name: "AccessDeniedException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _AccessDeniedException.prototype);
        this.error = opts.error;
      }
    };
    InternalServerException = class _InternalServerException extends SigninServiceException {
      static {
        __name(this, "InternalServerException");
      }
      name = "InternalServerException";
      $fault = "server";
      error;
      constructor(opts) {
        super({
          name: "InternalServerException",
          $fault: "server",
          ...opts
        });
        Object.setPrototypeOf(this, _InternalServerException.prototype);
        this.error = opts.error;
      }
    };
    TooManyRequestsError = class _TooManyRequestsError extends SigninServiceException {
      static {
        __name(this, "TooManyRequestsError");
      }
      name = "TooManyRequestsError";
      $fault = "client";
      error;
      constructor(opts) {
        super({
          name: "TooManyRequestsError",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _TooManyRequestsError.prototype);
        this.error = opts.error;
      }
    };
    ValidationException = class _ValidationException extends SigninServiceException {
      static {
        __name(this, "ValidationException");
      }
      name = "ValidationException";
      $fault = "client";
      error;
      constructor(opts) {
        super({
          name: "ValidationException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ValidationException.prototype);
        this.error = opts.error;
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/schemas/schemas_0.js
var _ADE, _AT, _COAT, _COATR, _COATRB, _COATRBr, _COATRr, _ISE, _RT, _TMRE, _VE, _aKI, _aT, _c, _cI, _cV, _co, _e, _eI, _gT, _h, _hE, _iT, _jN, _m, _rT, _rU, _s, _sAK, _sT, _se, _tI, _tO, _tT, n0, _s_registry, SigninServiceException$, n0_registry, AccessDeniedException$, InternalServerException$, TooManyRequestsError$, ValidationException$, errorTypeRegistries, RefreshToken, AccessToken$, CreateOAuth2TokenRequest$, CreateOAuth2TokenRequestBody$, CreateOAuth2TokenResponse$, CreateOAuth2TokenResponseBody$, CreateOAuth2Token$;
var init_schemas_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/schemas/schemas_0.js"() {
    init_esm();
    init_schema();
    init_errors();
    init_SigninServiceException();
    _ADE = "AccessDeniedException";
    _AT = "AccessToken";
    _COAT = "CreateOAuth2Token";
    _COATR = "CreateOAuth2TokenRequest";
    _COATRB = "CreateOAuth2TokenRequestBody";
    _COATRBr = "CreateOAuth2TokenResponseBody";
    _COATRr = "CreateOAuth2TokenResponse";
    _ISE = "InternalServerException";
    _RT = "RefreshToken";
    _TMRE = "TooManyRequestsError";
    _VE = "ValidationException";
    _aKI = "accessKeyId";
    _aT = "accessToken";
    _c = "client";
    _cI = "clientId";
    _cV = "codeVerifier";
    _co = "code";
    _e = "error";
    _eI = "expiresIn";
    _gT = "grantType";
    _h = "http";
    _hE = "httpError";
    _iT = "idToken";
    _jN = "jsonName";
    _m = "message";
    _rT = "refreshToken";
    _rU = "redirectUri";
    _s = "smithy.ts.sdk.synthetic.com.amazonaws.signin";
    _sAK = "secretAccessKey";
    _sT = "sessionToken";
    _se = "server";
    _tI = "tokenInput";
    _tO = "tokenOutput";
    _tT = "tokenType";
    n0 = "com.amazonaws.signin";
    _s_registry = TypeRegistry.for(_s);
    SigninServiceException$ = [-3, _s, "SigninServiceException", 0, [], []];
    _s_registry.registerError(SigninServiceException$, SigninServiceException);
    n0_registry = TypeRegistry.for(n0);
    AccessDeniedException$ = [-3, n0, _ADE, { [_e]: _c }, [_e, _m], [0, 0], 2];
    n0_registry.registerError(AccessDeniedException$, AccessDeniedException);
    InternalServerException$ = [-3, n0, _ISE, { [_e]: _se, [_hE]: 500 }, [_e, _m], [0, 0], 2];
    n0_registry.registerError(InternalServerException$, InternalServerException);
    TooManyRequestsError$ = [-3, n0, _TMRE, { [_e]: _c, [_hE]: 429 }, [_e, _m], [0, 0], 2];
    n0_registry.registerError(TooManyRequestsError$, TooManyRequestsError);
    ValidationException$ = [-3, n0, _VE, { [_e]: _c, [_hE]: 400 }, [_e, _m], [0, 0], 2];
    n0_registry.registerError(ValidationException$, ValidationException);
    errorTypeRegistries = [_s_registry, n0_registry];
    RefreshToken = [0, n0, _RT, 8, 0];
    AccessToken$ = [
      3,
      n0,
      _AT,
      8,
      [_aKI, _sAK, _sT],
      [
        [0, { [_jN]: _aKI }],
        [0, { [_jN]: _sAK }],
        [0, { [_jN]: _sT }]
      ],
      3
    ];
    CreateOAuth2TokenRequest$ = [
      3,
      n0,
      _COATR,
      0,
      [_tI],
      [[() => CreateOAuth2TokenRequestBody$, 16]],
      1
    ];
    CreateOAuth2TokenRequestBody$ = [
      3,
      n0,
      _COATRB,
      0,
      [_cI, _gT, _co, _rU, _cV, _rT],
      [
        [0, { [_jN]: _cI }],
        [0, { [_jN]: _gT }],
        0,
        [0, { [_jN]: _rU }],
        [0, { [_jN]: _cV }],
        [() => RefreshToken, { [_jN]: _rT }]
      ],
      2
    ];
    CreateOAuth2TokenResponse$ = [
      3,
      n0,
      _COATRr,
      0,
      [_tO],
      [[() => CreateOAuth2TokenResponseBody$, 16]],
      1
    ];
    CreateOAuth2TokenResponseBody$ = [
      3,
      n0,
      _COATRBr,
      0,
      [_aT, _tT, _eI, _rT, _iT],
      [
        [() => AccessToken$, { [_jN]: _aT }],
        [0, { [_jN]: _tT }],
        [1, { [_jN]: _eI }],
        [() => RefreshToken, { [_jN]: _rT }],
        [0, { [_jN]: _iT }]
      ],
      4
    ];
    CreateOAuth2Token$ = [
      9,
      n0,
      _COAT,
      { [_h]: ["POST", "/v1/token", 200] },
      () => CreateOAuth2TokenRequest$,
      () => CreateOAuth2TokenResponse$
    ];
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.shared.js
var import_smithy_client2, import_url_parser, import_util_base64, import_util_utf8, getRuntimeConfig;
var init_runtimeConfig_shared = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.shared.js"() {
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
        apiVersion: "2023-01-01",
        base64Decoder: config?.base64Decoder ?? import_util_base64.fromBase64,
        base64Encoder: config?.base64Encoder ?? import_util_base64.toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSigninHttpAuthSchemeProvider,
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
          defaultNamespace: "com.amazonaws.signin",
          errorTypeRegistries,
          version: "2023-01-01",
          serviceTarget: "Signin"
        },
        serviceId: config?.serviceId ?? "Signin",
        urlParser: config?.urlParser ?? import_url_parser.parseUrl,
        utf8Decoder: config?.utf8Decoder ?? import_util_utf8.fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? import_util_utf8.toUtf8
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.js
var import_util_user_agent_node, import_config_resolver, import_hash_node, import_middleware_retry, import_node_config_provider, import_node_http_handler, import_smithy_client3, import_util_body_length_node, import_util_defaults_mode_node, import_util_retry, getRuntimeConfig2;
var init_runtimeConfig = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeConfig.js"() {
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration, resolveHttpAuthRuntimeConfig;
var init_httpAuthExtensionConfiguration = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/auth/httpAuthExtensionConfiguration.js"() {
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeExtensions.js
var import_region_config_resolver, import_protocol_http, import_smithy_client4, resolveRuntimeExtensions;
var init_runtimeExtensions = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/runtimeExtensions.js"() {
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/SigninClient.js
var import_middleware_host_header, import_middleware_logger, import_middleware_recursion_detection, import_middleware_user_agent, import_config_resolver2, import_middleware_content_length, import_middleware_endpoint, import_middleware_retry2, import_smithy_client5, SigninClient;
var init_SigninClient = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/SigninClient.js"() {
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
    SigninClient = class extends import_smithy_client5.Client {
      static {
        __name(this, "SigninClient");
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
          httpAuthSchemeParametersProvider: defaultSigninHttpAuthSchemeParametersProvider,
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/CreateOAuth2TokenCommand.js
var import_middleware_endpoint2, import_smithy_client6, CreateOAuth2TokenCommand;
var init_CreateOAuth2TokenCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/CreateOAuth2TokenCommand.js"() {
    init_esm();
    import_middleware_endpoint2 = __toESM(require_dist_cjs18());
    import_smithy_client6 = __toESM(require_dist_cjs11());
    init_EndpointParameters();
    init_schemas_0();
    CreateOAuth2TokenCommand = class extends import_smithy_client6.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
      return [(0, import_middleware_endpoint2.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())];
    }).s("Signin", "CreateOAuth2Token", {}).n("SigninClient", "CreateOAuth2TokenCommand").sc(CreateOAuth2Token$).build() {
      static {
        __name(this, "CreateOAuth2TokenCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/Signin.js
var import_smithy_client7, commands, Signin;
var init_Signin = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/Signin.js"() {
    init_esm();
    import_smithy_client7 = __toESM(require_dist_cjs11());
    init_CreateOAuth2TokenCommand();
    init_SigninClient();
    commands = {
      CreateOAuth2TokenCommand
    };
    Signin = class extends SigninClient {
      static {
        __name(this, "Signin");
      }
    };
    (0, import_smithy_client7.createAggregatedClient)(commands, Signin);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/index.js
var init_commands = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/commands/index.js"() {
    init_esm();
    init_CreateOAuth2TokenCommand();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/enums.js
var OAuth2ErrorCode;
var init_enums = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/enums.js"() {
    init_esm();
    OAuth2ErrorCode = {
      AUTHCODE_EXPIRED: "AUTHCODE_EXPIRED",
      INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
      INVALID_REQUEST: "INVALID_REQUEST",
      SERVER_ERROR: "server_error",
      TOKEN_EXPIRED: "TOKEN_EXPIRED",
      USER_CREDENTIALS_CHANGED: "USER_CREDENTIALS_CHANGED"
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/models_0.js
var init_models_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/models/models_0.js"() {
    init_esm();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/index.js
var init_signin = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/signin/index.js"() {
    init_esm();
    init_SigninClient();
    init_Signin();
    init_commands();
    init_schemas_0();
    init_enums();
    init_errors();
    init_models_0();
    init_SigninServiceException();
  }
});
init_signin();
var export_$Command = import_smithy_client6.Command;
var export___Client = import_smithy_client5.Client;
export {
  export_$Command as $Command,
  AccessDeniedException,
  AccessDeniedException$,
  AccessToken$,
  CreateOAuth2Token$,
  CreateOAuth2TokenCommand,
  CreateOAuth2TokenRequest$,
  CreateOAuth2TokenRequestBody$,
  CreateOAuth2TokenResponse$,
  CreateOAuth2TokenResponseBody$,
  InternalServerException,
  InternalServerException$,
  OAuth2ErrorCode,
  Signin,
  SigninClient,
  SigninServiceException,
  SigninServiceException$,
  TooManyRequestsError,
  TooManyRequestsError$,
  ValidationException,
  ValidationException$,
  export___Client as __Client,
  errorTypeRegistries
};
//# sourceMappingURL=signin-FECZ4ZRM.mjs.map
