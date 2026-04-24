import {
  init_package,
  package_default
} from "./chunk-3KZINXDK.mjs";
import {
  require_dist_cjs3 as require_dist_cjs20
} from "./chunk-LZMIKRF7.mjs";
import {
  AwsQueryProtocol,
  AwsSdkSigV4ASigner,
  AwsSdkSigV4Signer,
  DefaultIdentityProviderConfig,
  NODE_AUTH_SCHEME_PREFERENCE_OPTIONS,
  NODE_SIGV4A_CONFIG_OPTIONS,
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
  require_dist_cjs13 as require_dist_cjs21,
  require_dist_cjs14 as require_dist_cjs22,
  require_dist_cjs15 as require_dist_cjs23,
  require_dist_cjs16 as require_dist_cjs24,
  require_dist_cjs17 as require_dist_cjs25,
  require_dist_cjs2 as require_dist_cjs8,
  require_dist_cjs3 as require_dist_cjs9,
  require_dist_cjs6 as require_dist_cjs12,
  require_dist_cjs7 as require_dist_cjs13,
  require_dist_cjs8 as require_dist_cjs14,
  require_dist_cjs9 as require_dist_cjs15,
  resolveAwsSdkSigV4AConfig,
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
  require_dist_cjs2,
  setCredentialFeature
} from "./chunk-IAJ5C443.mjs";
import {
  require_dist_cjs as require_dist_cjs17
} from "./chunk-HVKOIMR6.mjs";
import {
  require_dist_cjs as require_dist_cjs10
} from "./chunk-Q4T5MCLT.mjs";
import {
  __esm,
  __export,
  __name,
  __toESM,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/bdd.js
var import_util_endpoints, q, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, _data, root, r, nodes, bdd;
var init_bdd = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/bdd.js"() {
    init_esm();
    import_util_endpoints = __toESM(require_dist_cjs12());
    q = "ref";
    a = -1;
    b = true;
    c = "isSet";
    d = "PartitionResult";
    e = "booleanEquals";
    f = "stringEquals";
    g = "getAttr";
    h = "us-east-1";
    i = "sigv4";
    j = "sts";
    k = "https://sts.{Region}.{PartitionResult#dnsSuffix}";
    l = { [q]: "Endpoint" };
    m = { [q]: "Region" };
    n = { [q]: d };
    o = {};
    p = [m];
    _data = {
      conditions: [
        [c, [l]],
        [c, p],
        ["aws.partition", p, d],
        [e, [{ [q]: "UseFIPS" }, b]],
        [e, [{ [q]: "UseDualStack" }, b]],
        [f, [m, "aws-global"]],
        [e, [{ [q]: "UseGlobalEndpoint" }, b]],
        [f, [m, "eu-central-1"]],
        [e, [{ fn: g, argv: [n, "supportsDualStack"] }, b]],
        [e, [{ fn: g, argv: [n, "supportsFIPS"] }, b]],
        [f, [m, "ap-south-1"]],
        [f, [m, "eu-north-1"]],
        [f, [m, "eu-west-1"]],
        [f, [m, "eu-west-2"]],
        [f, [m, "eu-west-3"]],
        [f, [m, "sa-east-1"]],
        [f, [m, h]],
        [f, [m, "us-east-2"]],
        [f, [m, "us-west-2"]],
        [f, [m, "us-west-1"]],
        [f, [m, "ca-central-1"]],
        [f, [m, "ap-southeast-1"]],
        [f, [m, "ap-northeast-1"]],
        [f, [m, "ap-southeast-2"]],
        [f, [{ fn: g, argv: [n, "name"] }, "aws-us-gov"]]
      ],
      results: [
        [a],
        ["https://sts.amazonaws.com", { authSchemes: [{ name: i, signingName: j, signingRegion: h }] }],
        [k, { authSchemes: [{ name: i, signingName: j, signingRegion: "{Region}" }] }],
        [a, "Invalid Configuration: FIPS and custom endpoint are not supported"],
        [a, "Invalid Configuration: Dualstack and custom endpoint are not supported"],
        [l, o],
        ["https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", o],
        [a, "FIPS and DualStack are enabled, but this partition does not support one or both"],
        ["https://sts.{Region}.amazonaws.com", o],
        ["https://sts-fips.{Region}.{PartitionResult#dnsSuffix}", o],
        [a, "FIPS is enabled but this partition does not support FIPS"],
        ["https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}", o],
        [a, "DualStack is enabled but this partition does not support DualStack"],
        [k, o],
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
      30,
      3,
      1,
      4,
      r + 14,
      2,
      5,
      r + 14,
      3,
      25,
      6,
      4,
      24,
      7,
      5,
      r + 1,
      8,
      6,
      9,
      r + 13,
      7,
      r + 1,
      10,
      10,
      r + 1,
      11,
      11,
      r + 1,
      12,
      12,
      r + 1,
      13,
      13,
      r + 1,
      14,
      14,
      r + 1,
      15,
      15,
      r + 1,
      16,
      16,
      r + 1,
      17,
      17,
      r + 1,
      18,
      18,
      r + 1,
      19,
      19,
      r + 1,
      20,
      20,
      r + 1,
      21,
      21,
      r + 1,
      22,
      22,
      r + 1,
      23,
      23,
      r + 1,
      r + 2,
      8,
      r + 11,
      r + 12,
      4,
      28,
      26,
      9,
      27,
      r + 10,
      24,
      r + 8,
      r + 9,
      8,
      29,
      r + 7,
      9,
      r + 6,
      r + 7,
      3,
      r + 3,
      31,
      4,
      r + 4,
      r + 5
    ]);
    bdd = import_util_endpoints.BinaryDecisionDiagram.from(nodes, root, _data.conditions, _data.results);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/endpointResolver.js
var import_util_endpoints2, import_util_endpoints3, cache, defaultEndpointResolver;
var init_endpointResolver = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/endpointResolver.js"() {
    init_esm();
    import_util_endpoints2 = __toESM(require_dist_cjs13());
    import_util_endpoints3 = __toESM(require_dist_cjs12());
    init_bdd();
    cache = new import_util_endpoints3.EndpointCache({
      size: 50,
      params: ["Endpoint", "Region", "UseDualStack", "UseFIPS", "UseGlobalEndpoint"]
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/auth/httpAuthSchemeProvider.js
function createAwsAuthSigv4HttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4",
    signingProperties: {
      name: "sts",
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
function createAwsAuthSigv4aHttpAuthOption(authParameters) {
  return {
    schemeId: "aws.auth#sigv4a",
    signingProperties: {
      name: "sts",
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
var import_signature_v4_multi_region, import_middleware_endpoint, import_util_middleware, createEndpointRuleSetHttpAuthSchemeParametersProvider, _defaultSTSHttpAuthSchemeParametersProvider, defaultSTSHttpAuthSchemeParametersProvider, createEndpointRuleSetHttpAuthSchemeProvider, _defaultSTSHttpAuthSchemeProvider, defaultSTSHttpAuthSchemeProvider, resolveStsAuthConfig, resolveHttpAuthSchemeConfig;
var init_httpAuthSchemeProvider = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/auth/httpAuthSchemeProvider.js"() {
    init_esm();
    init_httpAuthSchemes();
    import_signature_v4_multi_region = __toESM(require_dist_cjs20());
    import_middleware_endpoint = __toESM(require_dist_cjs18());
    import_util_middleware = __toESM(require_dist_cjs6());
    init_endpointResolver();
    init_STSClient();
    createEndpointRuleSetHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name((defaultHttpAuthSchemeParametersProvider) => async (config, context, input) => {
      if (!input) {
        throw new Error("Could not find `input` for `defaultEndpointRuleSetHttpAuthSchemeParametersProvider`");
      }
      const defaultParameters = await defaultHttpAuthSchemeParametersProvider(config, context, input);
      const instructionsFn = (0, import_util_middleware.getSmithyContext)(context)?.commandInstance?.constructor?.getEndpointParameterInstructions;
      if (!instructionsFn) {
        throw new Error(`getEndpointParameterInstructions() is not defined on '${context.commandName}'`);
      }
      const endpointParameters = await (0, import_middleware_endpoint.resolveParams)(input, { getEndpointParameterInstructions: instructionsFn }, config);
      return Object.assign(defaultParameters, endpointParameters);
    }, "createEndpointRuleSetHttpAuthSchemeParametersProvider");
    _defaultSTSHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: (0, import_util_middleware.getSmithyContext)(context).operation,
        region: await (0, import_util_middleware.normalizeProvider)(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "_defaultSTSHttpAuthSchemeParametersProvider");
    defaultSTSHttpAuthSchemeParametersProvider = createEndpointRuleSetHttpAuthSchemeParametersProvider(_defaultSTSHttpAuthSchemeParametersProvider);
    __name(createAwsAuthSigv4HttpAuthOption, "createAwsAuthSigv4HttpAuthOption");
    __name(createAwsAuthSigv4aHttpAuthOption, "createAwsAuthSigv4aHttpAuthOption");
    __name(createSmithyApiNoAuthHttpAuthOption, "createSmithyApiNoAuthHttpAuthOption");
    createEndpointRuleSetHttpAuthSchemeProvider = /* @__PURE__ */ __name((defaultEndpointResolver2, defaultHttpAuthSchemeResolver, createHttpAuthOptionFunctions) => {
      const endpointRuleSetHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
        const endpoint = defaultEndpointResolver2(authParameters);
        const authSchemes = endpoint.properties?.authSchemes;
        if (!authSchemes) {
          return defaultHttpAuthSchemeResolver(authParameters);
        }
        const options = [];
        for (const scheme of authSchemes) {
          const { name: resolvedName, properties = {}, ...rest } = scheme;
          const name = resolvedName.toLowerCase();
          if (resolvedName !== name) {
            console.warn(`HttpAuthScheme has been normalized with lowercasing: '${resolvedName}' to '${name}'`);
          }
          let schemeId;
          if (name === "sigv4a") {
            schemeId = "aws.auth#sigv4a";
            const sigv4Present = authSchemes.find((s) => {
              const name2 = s.name.toLowerCase();
              return name2 !== "sigv4a" && name2.startsWith("sigv4");
            });
            if (import_signature_v4_multi_region.SignatureV4MultiRegion.sigv4aDependency() === "none" && sigv4Present) {
              continue;
            }
          } else if (name.startsWith("sigv4")) {
            schemeId = "aws.auth#sigv4";
          } else {
            throw new Error(`Unknown HttpAuthScheme found in '@smithy.rules#endpointRuleSet': '${name}'`);
          }
          const createOption = createHttpAuthOptionFunctions[schemeId];
          if (!createOption) {
            throw new Error(`Could not find HttpAuthOption create function for '${schemeId}'`);
          }
          const option = createOption(authParameters);
          option.schemeId = schemeId;
          option.signingProperties = { ...option.signingProperties || {}, ...rest, ...properties };
          options.push(option);
        }
        return options;
      }, "endpointRuleSetHttpAuthSchemeProvider");
      return endpointRuleSetHttpAuthSchemeProvider;
    }, "createEndpointRuleSetHttpAuthSchemeProvider");
    _defaultSTSHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        case "AssumeRoleWithWebIdentity": {
          options.push(createSmithyApiNoAuthHttpAuthOption(authParameters));
          options.push(createAwsAuthSigv4aHttpAuthOption(authParameters));
          break;
        }
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
          options.push(createAwsAuthSigv4aHttpAuthOption(authParameters));
        }
      }
      return options;
    }, "_defaultSTSHttpAuthSchemeProvider");
    defaultSTSHttpAuthSchemeProvider = createEndpointRuleSetHttpAuthSchemeProvider(defaultEndpointResolver, _defaultSTSHttpAuthSchemeProvider, {
      "aws.auth#sigv4": createAwsAuthSigv4HttpAuthOption,
      "aws.auth#sigv4a": createAwsAuthSigv4aHttpAuthOption,
      "smithy.api#noAuth": createSmithyApiNoAuthHttpAuthOption
    });
    resolveStsAuthConfig = /* @__PURE__ */ __name((input) => Object.assign(input, {
      stsClientCtor: STSClient
    }), "resolveStsAuthConfig");
    resolveHttpAuthSchemeConfig = /* @__PURE__ */ __name((config) => {
      const config_0 = resolveStsAuthConfig(config);
      const config_1 = resolveAwsSdkSigV4Config(config_0);
      const config_2 = resolveAwsSdkSigV4AConfig(config_1);
      return Object.assign(config_2, {
        authSchemePreference: (0, import_util_middleware.normalizeProvider)(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/EndpointParameters.js
var resolveClientEndpointParameters, commonParams;
var init_EndpointParameters = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/endpoint/EndpointParameters.js"() {
    init_esm();
    resolveClientEndpointParameters = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        useGlobalEndpoint: options.useGlobalEndpoint ?? false,
        defaultSigningName: "sts"
      });
    }, "resolveClientEndpointParameters");
    commonParams = {
      UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/STSServiceException.js
var import_smithy_client, STSServiceException;
var init_STSServiceException = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/STSServiceException.js"() {
    init_esm();
    import_smithy_client = __toESM(require_dist_cjs11());
    STSServiceException = class _STSServiceException extends import_smithy_client.ServiceException {
      static {
        __name(this, "STSServiceException");
      }
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _STSServiceException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/errors.js
var ExpiredTokenException, MalformedPolicyDocumentException, PackedPolicyTooLargeException, RegionDisabledException, IDPRejectedClaimException, InvalidIdentityTokenException, IDPCommunicationErrorException;
var init_errors = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/errors.js"() {
    init_esm();
    init_STSServiceException();
    ExpiredTokenException = class _ExpiredTokenException extends STSServiceException {
      static {
        __name(this, "ExpiredTokenException");
      }
      name = "ExpiredTokenException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "ExpiredTokenException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ExpiredTokenException.prototype);
      }
    };
    MalformedPolicyDocumentException = class _MalformedPolicyDocumentException extends STSServiceException {
      static {
        __name(this, "MalformedPolicyDocumentException");
      }
      name = "MalformedPolicyDocumentException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "MalformedPolicyDocumentException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _MalformedPolicyDocumentException.prototype);
      }
    };
    PackedPolicyTooLargeException = class _PackedPolicyTooLargeException extends STSServiceException {
      static {
        __name(this, "PackedPolicyTooLargeException");
      }
      name = "PackedPolicyTooLargeException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "PackedPolicyTooLargeException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _PackedPolicyTooLargeException.prototype);
      }
    };
    RegionDisabledException = class _RegionDisabledException extends STSServiceException {
      static {
        __name(this, "RegionDisabledException");
      }
      name = "RegionDisabledException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "RegionDisabledException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _RegionDisabledException.prototype);
      }
    };
    IDPRejectedClaimException = class _IDPRejectedClaimException extends STSServiceException {
      static {
        __name(this, "IDPRejectedClaimException");
      }
      name = "IDPRejectedClaimException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "IDPRejectedClaimException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _IDPRejectedClaimException.prototype);
      }
    };
    InvalidIdentityTokenException = class _InvalidIdentityTokenException extends STSServiceException {
      static {
        __name(this, "InvalidIdentityTokenException");
      }
      name = "InvalidIdentityTokenException";
      $fault = "client";
      constructor(opts) {
        super({
          name: "InvalidIdentityTokenException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidIdentityTokenException.prototype);
      }
    };
    IDPCommunicationErrorException = class _IDPCommunicationErrorException extends STSServiceException {
      static {
        __name(this, "IDPCommunicationErrorException");
      }
      name = "IDPCommunicationErrorException";
      $fault = "client";
      $retryable = {};
      constructor(opts) {
        super({
          name: "IDPCommunicationErrorException",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _IDPCommunicationErrorException.prototype);
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/schemas/schemas_0.js
var _A, _AKI, _AR, _ARI, _ARR, _ARRs, _ARU, _ARWWI, _ARWWIR, _ARWWIRs, _Au, _C, _CA, _DS, _E, _EI, _ETE, _IDPCEE, _IDPRCE, _IITE, _K, _MPDE, _P, _PA, _PAr, _PC, _PCLT, _PCr, _PDT, _PI, _PPS, _PPTLE, _Pr, _RA, _RDE, _RSN, _SAK, _SFWIT, _SI, _SN, _ST, _T, _TC, _TTK, _Ta, _V, _WIT, _a, _aKST, _aQE, _c, _cTT, _e, _hE, _m, _pDLT, _s, _tLT, n0, _s_registry, STSServiceException$, n0_registry, ExpiredTokenException$, IDPCommunicationErrorException$, IDPRejectedClaimException$, InvalidIdentityTokenException$, MalformedPolicyDocumentException$, PackedPolicyTooLargeException$, RegionDisabledException$, errorTypeRegistries, accessKeySecretType, clientTokenType, AssumedRoleUser$, AssumeRoleRequest$, AssumeRoleResponse$, AssumeRoleWithWebIdentityRequest$, AssumeRoleWithWebIdentityResponse$, Credentials$, PolicyDescriptorType$, ProvidedContext$, Tag$, policyDescriptorListType, ProvidedContextsListType, tagKeyListType, tagListType, AssumeRole$, AssumeRoleWithWebIdentity$;
var init_schemas_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/schemas/schemas_0.js"() {
    init_esm();
    init_schema();
    init_errors();
    init_STSServiceException();
    _A = "Arn";
    _AKI = "AccessKeyId";
    _AR = "AssumeRole";
    _ARI = "AssumedRoleId";
    _ARR = "AssumeRoleRequest";
    _ARRs = "AssumeRoleResponse";
    _ARU = "AssumedRoleUser";
    _ARWWI = "AssumeRoleWithWebIdentity";
    _ARWWIR = "AssumeRoleWithWebIdentityRequest";
    _ARWWIRs = "AssumeRoleWithWebIdentityResponse";
    _Au = "Audience";
    _C = "Credentials";
    _CA = "ContextAssertion";
    _DS = "DurationSeconds";
    _E = "Expiration";
    _EI = "ExternalId";
    _ETE = "ExpiredTokenException";
    _IDPCEE = "IDPCommunicationErrorException";
    _IDPRCE = "IDPRejectedClaimException";
    _IITE = "InvalidIdentityTokenException";
    _K = "Key";
    _MPDE = "MalformedPolicyDocumentException";
    _P = "Policy";
    _PA = "PolicyArns";
    _PAr = "ProviderArn";
    _PC = "ProvidedContexts";
    _PCLT = "ProvidedContextsListType";
    _PCr = "ProvidedContext";
    _PDT = "PolicyDescriptorType";
    _PI = "ProviderId";
    _PPS = "PackedPolicySize";
    _PPTLE = "PackedPolicyTooLargeException";
    _Pr = "Provider";
    _RA = "RoleArn";
    _RDE = "RegionDisabledException";
    _RSN = "RoleSessionName";
    _SAK = "SecretAccessKey";
    _SFWIT = "SubjectFromWebIdentityToken";
    _SI = "SourceIdentity";
    _SN = "SerialNumber";
    _ST = "SessionToken";
    _T = "Tags";
    _TC = "TokenCode";
    _TTK = "TransitiveTagKeys";
    _Ta = "Tag";
    _V = "Value";
    _WIT = "WebIdentityToken";
    _a = "arn";
    _aKST = "accessKeySecretType";
    _aQE = "awsQueryError";
    _c = "client";
    _cTT = "clientTokenType";
    _e = "error";
    _hE = "httpError";
    _m = "message";
    _pDLT = "policyDescriptorListType";
    _s = "smithy.ts.sdk.synthetic.com.amazonaws.sts";
    _tLT = "tagListType";
    n0 = "com.amazonaws.sts";
    _s_registry = TypeRegistry.for(_s);
    STSServiceException$ = [-3, _s, "STSServiceException", 0, [], []];
    _s_registry.registerError(STSServiceException$, STSServiceException);
    n0_registry = TypeRegistry.for(n0);
    ExpiredTokenException$ = [
      -3,
      n0,
      _ETE,
      { [_aQE]: [`ExpiredTokenException`, 400], [_e]: _c, [_hE]: 400 },
      [_m],
      [0]
    ];
    n0_registry.registerError(ExpiredTokenException$, ExpiredTokenException);
    IDPCommunicationErrorException$ = [
      -3,
      n0,
      _IDPCEE,
      { [_aQE]: [`IDPCommunicationError`, 400], [_e]: _c, [_hE]: 400 },
      [_m],
      [0]
    ];
    n0_registry.registerError(IDPCommunicationErrorException$, IDPCommunicationErrorException);
    IDPRejectedClaimException$ = [
      -3,
      n0,
      _IDPRCE,
      { [_aQE]: [`IDPRejectedClaim`, 403], [_e]: _c, [_hE]: 403 },
      [_m],
      [0]
    ];
    n0_registry.registerError(IDPRejectedClaimException$, IDPRejectedClaimException);
    InvalidIdentityTokenException$ = [
      -3,
      n0,
      _IITE,
      { [_aQE]: [`InvalidIdentityToken`, 400], [_e]: _c, [_hE]: 400 },
      [_m],
      [0]
    ];
    n0_registry.registerError(InvalidIdentityTokenException$, InvalidIdentityTokenException);
    MalformedPolicyDocumentException$ = [
      -3,
      n0,
      _MPDE,
      { [_aQE]: [`MalformedPolicyDocument`, 400], [_e]: _c, [_hE]: 400 },
      [_m],
      [0]
    ];
    n0_registry.registerError(MalformedPolicyDocumentException$, MalformedPolicyDocumentException);
    PackedPolicyTooLargeException$ = [
      -3,
      n0,
      _PPTLE,
      { [_aQE]: [`PackedPolicyTooLarge`, 400], [_e]: _c, [_hE]: 400 },
      [_m],
      [0]
    ];
    n0_registry.registerError(PackedPolicyTooLargeException$, PackedPolicyTooLargeException);
    RegionDisabledException$ = [
      -3,
      n0,
      _RDE,
      { [_aQE]: [`RegionDisabledException`, 403], [_e]: _c, [_hE]: 403 },
      [_m],
      [0]
    ];
    n0_registry.registerError(RegionDisabledException$, RegionDisabledException);
    errorTypeRegistries = [_s_registry, n0_registry];
    accessKeySecretType = [0, n0, _aKST, 8, 0];
    clientTokenType = [0, n0, _cTT, 8, 0];
    AssumedRoleUser$ = [3, n0, _ARU, 0, [_ARI, _A], [0, 0], 2];
    AssumeRoleRequest$ = [
      3,
      n0,
      _ARR,
      0,
      [_RA, _RSN, _PA, _P, _DS, _T, _TTK, _EI, _SN, _TC, _SI, _PC],
      [0, 0, () => policyDescriptorListType, 0, 1, () => tagListType, 64 | 0, 0, 0, 0, 0, () => ProvidedContextsListType],
      2
    ];
    AssumeRoleResponse$ = [
      3,
      n0,
      _ARRs,
      0,
      [_C, _ARU, _PPS, _SI],
      [[() => Credentials$, 0], () => AssumedRoleUser$, 1, 0]
    ];
    AssumeRoleWithWebIdentityRequest$ = [
      3,
      n0,
      _ARWWIR,
      0,
      [_RA, _RSN, _WIT, _PI, _PA, _P, _DS],
      [0, 0, [() => clientTokenType, 0], 0, () => policyDescriptorListType, 0, 1],
      3
    ];
    AssumeRoleWithWebIdentityResponse$ = [
      3,
      n0,
      _ARWWIRs,
      0,
      [_C, _SFWIT, _ARU, _PPS, _Pr, _Au, _SI],
      [[() => Credentials$, 0], 0, () => AssumedRoleUser$, 1, 0, 0, 0]
    ];
    Credentials$ = [
      3,
      n0,
      _C,
      0,
      [_AKI, _SAK, _ST, _E],
      [0, [() => accessKeySecretType, 0], 0, 4],
      4
    ];
    PolicyDescriptorType$ = [3, n0, _PDT, 0, [_a], [0]];
    ProvidedContext$ = [3, n0, _PCr, 0, [_PAr, _CA], [0, 0]];
    Tag$ = [3, n0, _Ta, 0, [_K, _V], [0, 0], 2];
    policyDescriptorListType = [1, n0, _pDLT, 0, () => PolicyDescriptorType$];
    ProvidedContextsListType = [1, n0, _PCLT, 0, () => ProvidedContext$];
    tagKeyListType = 64 | 0;
    tagListType = [1, n0, _tLT, 0, () => Tag$];
    AssumeRole$ = [9, n0, _AR, 0, () => AssumeRoleRequest$, () => AssumeRoleResponse$];
    AssumeRoleWithWebIdentity$ = [
      9,
      n0,
      _ARWWI,
      0,
      () => AssumeRoleWithWebIdentityRequest$,
      () => AssumeRoleWithWebIdentityResponse$
    ];
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeConfig.shared.js
var import_signature_v4_multi_region2, import_smithy_client2, import_url_parser, import_util_base64, import_util_utf8, getRuntimeConfig;
var init_runtimeConfig_shared = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeConfig.shared.js"() {
    init_esm();
    init_httpAuthSchemes();
    init_protocols();
    import_signature_v4_multi_region2 = __toESM(require_dist_cjs20());
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
        apiVersion: "2011-06-15",
        base64Decoder: config?.base64Decoder ?? import_util_base64.fromBase64,
        base64Encoder: config?.base64Encoder ?? import_util_base64.toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
        extensions: config?.extensions ?? [],
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? defaultSTSHttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4"), "identityProvider"),
            signer: new AwsSdkSigV4Signer()
          },
          {
            schemeId: "aws.auth#sigv4a",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4a"), "identityProvider"),
            signer: new AwsSdkSigV4ASigner()
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})), "identityProvider"),
            signer: new NoAuthSigner()
          }
        ],
        logger: config?.logger ?? new import_smithy_client2.NoOpLogger(),
        protocol: config?.protocol ?? AwsQueryProtocol,
        protocolSettings: config?.protocolSettings ?? {
          defaultNamespace: "com.amazonaws.sts",
          errorTypeRegistries,
          xmlNamespace: "https://sts.amazonaws.com/doc/2011-06-15/",
          version: "2011-06-15",
          serviceTarget: "AWSSecurityTokenServiceV20110615"
        },
        serviceId: config?.serviceId ?? "STS",
        signerConstructor: config?.signerConstructor ?? import_signature_v4_multi_region2.SignatureV4MultiRegion,
        urlParser: config?.urlParser ?? import_url_parser.parseUrl,
        utf8Decoder: config?.utf8Decoder ?? import_util_utf8.fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? import_util_utf8.toUtf8
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeConfig.js
var import_util_user_agent_node, import_config_resolver, import_hash_node, import_middleware_retry, import_node_config_provider, import_node_http_handler, import_smithy_client3, import_util_body_length_node, import_util_defaults_mode_node, import_util_retry, getRuntimeConfig2;
var init_runtimeConfig = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeConfig.js"() {
    init_esm();
    init_package();
    init_client();
    init_httpAuthSchemes();
    import_util_user_agent_node = __toESM(require_dist_cjs21());
    import_config_resolver = __toESM(require_dist_cjs15());
    init_dist_es();
    import_hash_node = __toESM(require_dist_cjs22());
    import_middleware_retry = __toESM(require_dist_cjs19());
    import_node_config_provider = __toESM(require_dist_cjs17());
    import_node_http_handler = __toESM(require_dist_cjs5());
    import_smithy_client3 = __toESM(require_dist_cjs11());
    import_util_body_length_node = __toESM(require_dist_cjs23());
    import_util_defaults_mode_node = __toESM(require_dist_cjs24());
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
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4") || (async (idProps) => await config.credentialDefaultProvider(idProps?.__config || {})()), "identityProvider"),
            signer: new AwsSdkSigV4Signer()
          },
          {
            schemeId: "aws.auth#sigv4a",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4a"), "identityProvider"),
            signer: new AwsSdkSigV4ASigner()
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("smithy.api#noAuth") || (async () => ({})), "identityProvider"),
            signer: new NoAuthSigner()
          }
        ],
        maxAttempts: config?.maxAttempts ?? (0, import_node_config_provider.loadConfig)(import_middleware_retry.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        region: config?.region ?? (0, import_node_config_provider.loadConfig)(import_config_resolver.NODE_REGION_CONFIG_OPTIONS, { ...import_config_resolver.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestHandler: import_node_http_handler.NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
        retryMode: config?.retryMode ?? (0, import_node_config_provider.loadConfig)({
          ...import_middleware_retry.NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: /* @__PURE__ */ __name(async () => (await defaultConfigProvider()).retryMode || import_util_retry.DEFAULT_RETRY_MODE, "default")
        }, config),
        sha256: config?.sha256 ?? import_hash_node.Hash.bind(null, "sha256"),
        sigv4aSigningRegionSet: config?.sigv4aSigningRegionSet ?? (0, import_node_config_provider.loadConfig)(NODE_SIGV4A_CONFIG_OPTIONS, loaderConfig),
        streamCollector: config?.streamCollector ?? import_node_http_handler.streamCollector,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? (0, import_node_config_provider.loadConfig)(import_config_resolver.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? (0, import_node_config_provider.loadConfig)(import_config_resolver.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? (0, import_node_config_provider.loadConfig)(import_util_user_agent_node.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
      };
    }, "getRuntimeConfig");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/auth/httpAuthExtensionConfiguration.js
var getHttpAuthExtensionConfiguration, resolveHttpAuthRuntimeConfig;
var init_httpAuthExtensionConfiguration = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/auth/httpAuthExtensionConfiguration.js"() {
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeExtensions.js
var import_region_config_resolver, import_protocol_http, import_smithy_client4, resolveRuntimeExtensions;
var init_runtimeExtensions = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/runtimeExtensions.js"() {
    init_esm();
    import_region_config_resolver = __toESM(require_dist_cjs25());
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/STSClient.js
var import_middleware_host_header, import_middleware_logger, import_middleware_recursion_detection, import_middleware_user_agent, import_config_resolver2, import_middleware_content_length, import_middleware_endpoint2, import_middleware_retry2, import_smithy_client5, STSClient;
var init_STSClient = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/STSClient.js"() {
    init_esm();
    import_middleware_host_header = __toESM(require_dist_cjs7());
    import_middleware_logger = __toESM(require_dist_cjs8());
    import_middleware_recursion_detection = __toESM(require_dist_cjs9());
    import_middleware_user_agent = __toESM(require_dist_cjs14());
    import_config_resolver2 = __toESM(require_dist_cjs15());
    init_dist_es();
    init_schema();
    import_middleware_content_length = __toESM(require_dist_cjs16());
    import_middleware_endpoint2 = __toESM(require_dist_cjs18());
    import_middleware_retry2 = __toESM(require_dist_cjs19());
    import_smithy_client5 = __toESM(require_dist_cjs11());
    init_httpAuthSchemeProvider();
    init_EndpointParameters();
    init_runtimeConfig();
    init_runtimeExtensions();
    STSClient = class extends import_smithy_client5.Client {
      static {
        __name(this, "STSClient");
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
        const _config_6 = (0, import_middleware_endpoint2.resolveEndpointConfig)(_config_5);
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
          httpAuthSchemeParametersProvider: defaultSTSHttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials,
            "aws.auth#sigv4a": config.credentials
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

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/AssumeRoleCommand.js
var import_middleware_endpoint3, import_smithy_client6, AssumeRoleCommand;
var init_AssumeRoleCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/AssumeRoleCommand.js"() {
    init_esm();
    import_middleware_endpoint3 = __toESM(require_dist_cjs18());
    import_smithy_client6 = __toESM(require_dist_cjs11());
    init_EndpointParameters();
    init_schemas_0();
    AssumeRoleCommand = class extends import_smithy_client6.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o2) {
      return [(0, import_middleware_endpoint3.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())];
    }).s("AWSSecurityTokenServiceV20110615", "AssumeRole", {}).n("STSClient", "AssumeRoleCommand").sc(AssumeRole$).build() {
      static {
        __name(this, "AssumeRoleCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/AssumeRoleWithWebIdentityCommand.js
var import_middleware_endpoint4, import_smithy_client7, AssumeRoleWithWebIdentityCommand;
var init_AssumeRoleWithWebIdentityCommand = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/AssumeRoleWithWebIdentityCommand.js"() {
    init_esm();
    import_middleware_endpoint4 = __toESM(require_dist_cjs18());
    import_smithy_client7 = __toESM(require_dist_cjs11());
    init_EndpointParameters();
    init_schemas_0();
    AssumeRoleWithWebIdentityCommand = class extends import_smithy_client7.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o2) {
      return [(0, import_middleware_endpoint4.getEndpointPlugin)(config, Command.getEndpointParameterInstructions())];
    }).s("AWSSecurityTokenServiceV20110615", "AssumeRoleWithWebIdentity", {}).n("STSClient", "AssumeRoleWithWebIdentityCommand").sc(AssumeRoleWithWebIdentity$).build() {
      static {
        __name(this, "AssumeRoleWithWebIdentityCommand");
      }
    };
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/STS.js
var import_smithy_client8, commands, STS;
var init_STS = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/STS.js"() {
    init_esm();
    import_smithy_client8 = __toESM(require_dist_cjs11());
    init_AssumeRoleCommand();
    init_AssumeRoleWithWebIdentityCommand();
    init_STSClient();
    commands = {
      AssumeRoleCommand,
      AssumeRoleWithWebIdentityCommand
    };
    STS = class extends STSClient {
      static {
        __name(this, "STS");
      }
    };
    (0, import_smithy_client8.createAggregatedClient)(commands, STS);
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/index.js
var init_commands = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/commands/index.js"() {
    init_esm();
    init_AssumeRoleCommand();
    init_AssumeRoleWithWebIdentityCommand();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/models_0.js
var init_models_0 = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/models/models_0.js"() {
    init_esm();
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/defaultStsRoleAssumers.js
var import_region_config_resolver2, getAccountIdFromAssumedRoleUser, resolveRegion, getDefaultRoleAssumer, getDefaultRoleAssumerWithWebIdentity, isH2;
var init_defaultStsRoleAssumers = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/defaultStsRoleAssumers.js"() {
    init_esm();
    init_client();
    import_region_config_resolver2 = __toESM(require_dist_cjs25());
    init_AssumeRoleCommand();
    init_AssumeRoleWithWebIdentityCommand();
    getAccountIdFromAssumedRoleUser = /* @__PURE__ */ __name((assumedRoleUser) => {
      if (typeof assumedRoleUser?.Arn === "string") {
        const arnComponents = assumedRoleUser.Arn.split(":");
        if (arnComponents.length > 4 && arnComponents[4] !== "") {
          return arnComponents[4];
        }
      }
      return void 0;
    }, "getAccountIdFromAssumedRoleUser");
    resolveRegion = /* @__PURE__ */ __name(async (_region, _parentRegion, credentialProviderLogger, loaderConfig = {}) => {
      const region = typeof _region === "function" ? await _region() : _region;
      const parentRegion = typeof _parentRegion === "function" ? await _parentRegion() : _parentRegion;
      let stsDefaultRegion = "";
      const resolvedRegion = region ?? parentRegion ?? (stsDefaultRegion = await (0, import_region_config_resolver2.stsRegionDefaultResolver)(loaderConfig)());
      credentialProviderLogger?.debug?.("@aws-sdk/client-sts::resolveRegion", "accepting first of:", `${region} (credential provider clientConfig)`, `${parentRegion} (contextual client)`, `${stsDefaultRegion} (STS default: AWS_REGION, profile region, or us-east-1)`);
      return resolvedRegion;
    }, "resolveRegion");
    getDefaultRoleAssumer = /* @__PURE__ */ __name((stsOptions, STSClient2) => {
      let stsClient;
      let closureSourceCreds;
      return async (sourceCreds, params) => {
        closureSourceCreds = sourceCreds;
        if (!stsClient) {
          const { logger = stsOptions?.parentClientConfig?.logger, profile = stsOptions?.parentClientConfig?.profile, region, requestHandler = stsOptions?.parentClientConfig?.requestHandler, credentialProviderLogger, userAgentAppId = stsOptions?.parentClientConfig?.userAgentAppId } = stsOptions;
          const resolvedRegion = await resolveRegion(region, stsOptions?.parentClientConfig?.region, credentialProviderLogger, {
            logger,
            profile
          });
          const isCompatibleRequestHandler = !isH2(requestHandler);
          stsClient = new STSClient2({
            ...stsOptions,
            userAgentAppId,
            profile,
            credentialDefaultProvider: /* @__PURE__ */ __name(() => async () => closureSourceCreds, "credentialDefaultProvider"),
            region: resolvedRegion,
            requestHandler: isCompatibleRequestHandler ? requestHandler : void 0,
            logger
          });
        }
        const { Credentials, AssumedRoleUser } = await stsClient.send(new AssumeRoleCommand(params));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
          throw new Error(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`);
        }
        const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser);
        const credentials = {
          accessKeyId: Credentials.AccessKeyId,
          secretAccessKey: Credentials.SecretAccessKey,
          sessionToken: Credentials.SessionToken,
          expiration: Credentials.Expiration,
          ...Credentials.CredentialScope && { credentialScope: Credentials.CredentialScope },
          ...accountId && { accountId }
        };
        setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE", "i");
        return credentials;
      };
    }, "getDefaultRoleAssumer");
    getDefaultRoleAssumerWithWebIdentity = /* @__PURE__ */ __name((stsOptions, STSClient2) => {
      let stsClient;
      return async (params) => {
        if (!stsClient) {
          const { logger = stsOptions?.parentClientConfig?.logger, profile = stsOptions?.parentClientConfig?.profile, region, requestHandler = stsOptions?.parentClientConfig?.requestHandler, credentialProviderLogger, userAgentAppId = stsOptions?.parentClientConfig?.userAgentAppId } = stsOptions;
          const resolvedRegion = await resolveRegion(region, stsOptions?.parentClientConfig?.region, credentialProviderLogger, {
            logger,
            profile
          });
          const isCompatibleRequestHandler = !isH2(requestHandler);
          stsClient = new STSClient2({
            ...stsOptions,
            userAgentAppId,
            profile,
            region: resolvedRegion,
            requestHandler: isCompatibleRequestHandler ? requestHandler : void 0,
            logger
          });
        }
        const { Credentials, AssumedRoleUser } = await stsClient.send(new AssumeRoleWithWebIdentityCommand(params));
        if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
          throw new Error(`Invalid response from STS.assumeRoleWithWebIdentity call with role ${params.RoleArn}`);
        }
        const accountId = getAccountIdFromAssumedRoleUser(AssumedRoleUser);
        const credentials = {
          accessKeyId: Credentials.AccessKeyId,
          secretAccessKey: Credentials.SecretAccessKey,
          sessionToken: Credentials.SessionToken,
          expiration: Credentials.Expiration,
          ...Credentials.CredentialScope && { credentialScope: Credentials.CredentialScope },
          ...accountId && { accountId }
        };
        if (accountId) {
          setCredentialFeature(credentials, "RESOLVED_ACCOUNT_ID", "T");
        }
        setCredentialFeature(credentials, "CREDENTIALS_STS_ASSUME_ROLE_WEB_ID", "k");
        return credentials;
      };
    }, "getDefaultRoleAssumerWithWebIdentity");
    isH2 = /* @__PURE__ */ __name((requestHandler) => {
      return requestHandler?.metadata?.handlerProtocol === "h2";
    }, "isH2");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/defaultRoleAssumers.js
var getCustomizableStsClientCtor, getDefaultRoleAssumer2, getDefaultRoleAssumerWithWebIdentity2, decorateDefaultCredentialProvider;
var init_defaultRoleAssumers = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/defaultRoleAssumers.js"() {
    init_esm();
    init_defaultStsRoleAssumers();
    init_STSClient();
    getCustomizableStsClientCtor = /* @__PURE__ */ __name((baseCtor, customizations) => {
      if (!customizations)
        return baseCtor;
      else
        return class CustomizableSTSClient extends baseCtor {
          static {
            __name(this, "CustomizableSTSClient");
          }
          constructor(config) {
            super(config);
            for (const customization of customizations) {
              this.middlewareStack.use(customization);
            }
          }
        };
    }, "getCustomizableStsClientCtor");
    getDefaultRoleAssumer2 = /* @__PURE__ */ __name((stsOptions = {}, stsPlugins) => getDefaultRoleAssumer(stsOptions, getCustomizableStsClientCtor(STSClient, stsPlugins)), "getDefaultRoleAssumer");
    getDefaultRoleAssumerWithWebIdentity2 = /* @__PURE__ */ __name((stsOptions = {}, stsPlugins) => getDefaultRoleAssumerWithWebIdentity(stsOptions, getCustomizableStsClientCtor(STSClient, stsPlugins)), "getDefaultRoleAssumerWithWebIdentity");
    decorateDefaultCredentialProvider = /* @__PURE__ */ __name((provider) => (input) => provider({
      roleAssumer: getDefaultRoleAssumer2(input),
      roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity2(input),
      ...input
    }), "decorateDefaultCredentialProvider");
  }
});

// node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/index.js
var sts_exports = {};
__export(sts_exports, {
  AssumeRole$: () => AssumeRole$,
  AssumeRoleCommand: () => AssumeRoleCommand,
  AssumeRoleRequest$: () => AssumeRoleRequest$,
  AssumeRoleResponse$: () => AssumeRoleResponse$,
  AssumeRoleWithWebIdentity$: () => AssumeRoleWithWebIdentity$,
  AssumeRoleWithWebIdentityCommand: () => AssumeRoleWithWebIdentityCommand,
  AssumeRoleWithWebIdentityRequest$: () => AssumeRoleWithWebIdentityRequest$,
  AssumeRoleWithWebIdentityResponse$: () => AssumeRoleWithWebIdentityResponse$,
  AssumedRoleUser$: () => AssumedRoleUser$,
  Credentials$: () => Credentials$,
  ExpiredTokenException: () => ExpiredTokenException,
  ExpiredTokenException$: () => ExpiredTokenException$,
  IDPCommunicationErrorException: () => IDPCommunicationErrorException,
  IDPCommunicationErrorException$: () => IDPCommunicationErrorException$,
  IDPRejectedClaimException: () => IDPRejectedClaimException,
  IDPRejectedClaimException$: () => IDPRejectedClaimException$,
  InvalidIdentityTokenException: () => InvalidIdentityTokenException,
  InvalidIdentityTokenException$: () => InvalidIdentityTokenException$,
  MalformedPolicyDocumentException: () => MalformedPolicyDocumentException,
  MalformedPolicyDocumentException$: () => MalformedPolicyDocumentException$,
  PackedPolicyTooLargeException: () => PackedPolicyTooLargeException,
  PackedPolicyTooLargeException$: () => PackedPolicyTooLargeException$,
  PolicyDescriptorType$: () => PolicyDescriptorType$,
  ProvidedContext$: () => ProvidedContext$,
  RegionDisabledException: () => RegionDisabledException,
  RegionDisabledException$: () => RegionDisabledException$,
  STS: () => STS,
  STSClient: () => STSClient,
  STSServiceException: () => STSServiceException,
  STSServiceException$: () => STSServiceException$,
  Tag$: () => Tag$,
  __Client: () => import_smithy_client5.Client,
  decorateDefaultCredentialProvider: () => decorateDefaultCredentialProvider,
  errorTypeRegistries: () => errorTypeRegistries,
  getDefaultRoleAssumer: () => getDefaultRoleAssumer2,
  getDefaultRoleAssumerWithWebIdentity: () => getDefaultRoleAssumerWithWebIdentity2
});
var init_sts = __esm({
  "node_modules/@aws-sdk/nested-clients/dist-es/submodules/sts/index.js"() {
    init_esm();
    init_STSClient();
    init_STS();
    init_commands();
    init_schemas_0();
    init_errors();
    init_models_0();
    init_defaultRoleAssumers();
    init_STSServiceException();
  }
});

export {
  STSServiceException,
  ExpiredTokenException,
  MalformedPolicyDocumentException,
  PackedPolicyTooLargeException,
  RegionDisabledException,
  IDPRejectedClaimException,
  InvalidIdentityTokenException,
  IDPCommunicationErrorException,
  STSServiceException$,
  ExpiredTokenException$,
  IDPCommunicationErrorException$,
  IDPRejectedClaimException$,
  InvalidIdentityTokenException$,
  MalformedPolicyDocumentException$,
  PackedPolicyTooLargeException$,
  RegionDisabledException$,
  errorTypeRegistries,
  AssumedRoleUser$,
  AssumeRoleRequest$,
  AssumeRoleResponse$,
  AssumeRoleWithWebIdentityRequest$,
  AssumeRoleWithWebIdentityResponse$,
  Credentials$,
  PolicyDescriptorType$,
  ProvidedContext$,
  Tag$,
  AssumeRole$,
  AssumeRoleWithWebIdentity$,
  import_smithy_client5 as import_smithy_client,
  STSClient,
  AssumeRoleCommand,
  AssumeRoleWithWebIdentityCommand,
  STS,
  getDefaultRoleAssumer2 as getDefaultRoleAssumer,
  getDefaultRoleAssumerWithWebIdentity2 as getDefaultRoleAssumerWithWebIdentity,
  decorateDefaultCredentialProvider,
  sts_exports,
  init_sts
};
//# sourceMappingURL=chunk-QB7NXAQV.mjs.map
