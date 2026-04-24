import {
  __commonJS,
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@smithy/types/dist-cjs/index.js
var require_dist_cjs = __commonJS({
  "node_modules/@smithy/types/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    exports.HttpAuthLocation = void 0;
    (function(HttpAuthLocation) {
      HttpAuthLocation["HEADER"] = "header";
      HttpAuthLocation["QUERY"] = "query";
    })(exports.HttpAuthLocation || (exports.HttpAuthLocation = {}));
    exports.HttpApiKeyAuthLocation = void 0;
    (function(HttpApiKeyAuthLocation) {
      HttpApiKeyAuthLocation["HEADER"] = "header";
      HttpApiKeyAuthLocation["QUERY"] = "query";
    })(exports.HttpApiKeyAuthLocation || (exports.HttpApiKeyAuthLocation = {}));
    exports.EndpointURLScheme = void 0;
    (function(EndpointURLScheme) {
      EndpointURLScheme["HTTP"] = "http";
      EndpointURLScheme["HTTPS"] = "https";
    })(exports.EndpointURLScheme || (exports.EndpointURLScheme = {}));
    exports.AlgorithmId = void 0;
    (function(AlgorithmId) {
      AlgorithmId["MD5"] = "md5";
      AlgorithmId["CRC32"] = "crc32";
      AlgorithmId["CRC32C"] = "crc32c";
      AlgorithmId["SHA1"] = "sha1";
      AlgorithmId["SHA256"] = "sha256";
    })(exports.AlgorithmId || (exports.AlgorithmId = {}));
    var getChecksumConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      const checksumAlgorithms = [];
      if (runtimeConfig.sha256 !== void 0) {
        checksumAlgorithms.push({
          algorithmId: /* @__PURE__ */ __name(() => exports.AlgorithmId.SHA256, "algorithmId"),
          checksumConstructor: /* @__PURE__ */ __name(() => runtimeConfig.sha256, "checksumConstructor")
        });
      }
      if (runtimeConfig.md5 != void 0) {
        checksumAlgorithms.push({
          algorithmId: /* @__PURE__ */ __name(() => exports.AlgorithmId.MD5, "algorithmId"),
          checksumConstructor: /* @__PURE__ */ __name(() => runtimeConfig.md5, "checksumConstructor")
        });
      }
      return {
        addChecksumAlgorithm(algo) {
          checksumAlgorithms.push(algo);
        },
        checksumAlgorithms() {
          return checksumAlgorithms;
        }
      };
    }, "getChecksumConfiguration");
    var resolveChecksumRuntimeConfig = /* @__PURE__ */ __name((clientConfig) => {
      const runtimeConfig = {};
      clientConfig.checksumAlgorithms().forEach((checksumAlgorithm) => {
        runtimeConfig[checksumAlgorithm.algorithmId()] = checksumAlgorithm.checksumConstructor();
      });
      return runtimeConfig;
    }, "resolveChecksumRuntimeConfig");
    var getDefaultClientConfiguration = /* @__PURE__ */ __name((runtimeConfig) => {
      return getChecksumConfiguration(runtimeConfig);
    }, "getDefaultClientConfiguration");
    var resolveDefaultRuntimeConfig = /* @__PURE__ */ __name((config) => {
      return resolveChecksumRuntimeConfig(config);
    }, "resolveDefaultRuntimeConfig");
    exports.FieldPosition = void 0;
    (function(FieldPosition) {
      FieldPosition[FieldPosition["HEADER"] = 0] = "HEADER";
      FieldPosition[FieldPosition["TRAILER"] = 1] = "TRAILER";
    })(exports.FieldPosition || (exports.FieldPosition = {}));
    var SMITHY_CONTEXT_KEY = "__smithy_context";
    exports.IniSectionType = void 0;
    (function(IniSectionType) {
      IniSectionType["PROFILE"] = "profile";
      IniSectionType["SSO_SESSION"] = "sso-session";
      IniSectionType["SERVICES"] = "services";
    })(exports.IniSectionType || (exports.IniSectionType = {}));
    exports.RequestHandlerProtocol = void 0;
    (function(RequestHandlerProtocol) {
      RequestHandlerProtocol["HTTP_0_9"] = "http/0.9";
      RequestHandlerProtocol["HTTP_1_0"] = "http/1.0";
      RequestHandlerProtocol["TDS_8_0"] = "tds/8.0";
    })(exports.RequestHandlerProtocol || (exports.RequestHandlerProtocol = {}));
    exports.SMITHY_CONTEXT_KEY = SMITHY_CONTEXT_KEY;
    exports.getDefaultClientConfiguration = getDefaultClientConfiguration;
    exports.resolveDefaultRuntimeConfig = resolveDefaultRuntimeConfig;
  }
});

export {
  require_dist_cjs
};
//# sourceMappingURL=chunk-YPLDPGBH.mjs.map
