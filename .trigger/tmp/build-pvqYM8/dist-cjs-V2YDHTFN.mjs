import {
  init_tslib_es6,
  require_dist_cjs4 as require_dist_cjs2,
  require_dist_cjs6 as require_dist_cjs3,
  require_dist_cjs9 as require_dist_cjs4,
  tslib_es6_exports
} from "./chunk-TYTCKKP3.mjs";
import {
  require_dist_cjs
} from "./chunk-AJILZ5WZ.mjs";
import "./chunk-TPR7ISAF.mjs";
import {
  client_exports,
  init_client
} from "./chunk-IAJ5C443.mjs";
import "./chunk-Q4T5MCLT.mjs";
import "./chunk-YPLDPGBH.mjs";
import {
  require_dist_cjs as require_dist_cjs5
} from "./chunk-RIFC2BQV.mjs";
import {
  __commonJS,
  __name,
  __require,
  __toCommonJS,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@aws-sdk/credential-provider-http/dist-cjs/fromHttp/checkUrl.js
var require_checkUrl = __commonJS({
  "node_modules/@aws-sdk/credential-provider-http/dist-cjs/fromHttp/checkUrl.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.checkUrl = void 0;
    var property_provider_1 = require_dist_cjs5();
    var ECS_CONTAINER_HOST = "169.254.170.2";
    var EKS_CONTAINER_HOST_IPv4 = "169.254.170.23";
    var EKS_CONTAINER_HOST_IPv6 = "[fd00:ec2::23]";
    var checkUrl = /* @__PURE__ */ __name((url, logger) => {
      if (url.protocol === "https:") {
        return;
      }
      if (url.hostname === ECS_CONTAINER_HOST || url.hostname === EKS_CONTAINER_HOST_IPv4 || url.hostname === EKS_CONTAINER_HOST_IPv6) {
        return;
      }
      if (url.hostname.includes("[")) {
        if (url.hostname === "[::1]" || url.hostname === "[0000:0000:0000:0000:0000:0000:0000:0001]") {
          return;
        }
      } else {
        if (url.hostname === "localhost") {
          return;
        }
        const ipComponents = url.hostname.split(".");
        const inRange = /* @__PURE__ */ __name((component) => {
          const num = parseInt(component, 10);
          return 0 <= num && num <= 255;
        }, "inRange");
        if (ipComponents[0] === "127" && inRange(ipComponents[1]) && inRange(ipComponents[2]) && inRange(ipComponents[3]) && ipComponents.length === 4) {
          return;
        }
      }
      throw new property_provider_1.CredentialsProviderError(`URL not accepted. It must either be HTTPS or match one of the following:
  - loopback CIDR 127.0.0.0/8 or [::1/128]
  - ECS container host 169.254.170.2
  - EKS container host 169.254.170.23 or [fd00:ec2::23]`, { logger });
    }, "checkUrl");
    exports.checkUrl = checkUrl;
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-cjs/fromHttp/requestHelpers.js
var require_requestHelpers = __commonJS({
  "node_modules/@aws-sdk/credential-provider-http/dist-cjs/fromHttp/requestHelpers.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createGetRequest = createGetRequest;
    exports.getCredentials = getCredentials;
    var property_provider_1 = require_dist_cjs5();
    var protocol_http_1 = require_dist_cjs();
    var smithy_client_1 = require_dist_cjs4();
    var util_stream_1 = require_dist_cjs3();
    function createGetRequest(url) {
      return new protocol_http_1.HttpRequest({
        protocol: url.protocol,
        hostname: url.hostname,
        port: Number(url.port),
        path: url.pathname,
        query: Array.from(url.searchParams.entries()).reduce((acc, [k, v]) => {
          acc[k] = v;
          return acc;
        }, {}),
        fragment: url.hash
      });
    }
    __name(createGetRequest, "createGetRequest");
    async function getCredentials(response, logger) {
      const stream = (0, util_stream_1.sdkStreamMixin)(response.body);
      const str = await stream.transformToString();
      if (response.statusCode === 200) {
        const parsed = JSON.parse(str);
        if (typeof parsed.AccessKeyId !== "string" || typeof parsed.SecretAccessKey !== "string" || typeof parsed.Token !== "string" || typeof parsed.Expiration !== "string") {
          throw new property_provider_1.CredentialsProviderError("HTTP credential provider response not of the required format, an object matching: { AccessKeyId: string, SecretAccessKey: string, Token: string, Expiration: string(rfc3339) }", { logger });
        }
        return {
          accessKeyId: parsed.AccessKeyId,
          secretAccessKey: parsed.SecretAccessKey,
          sessionToken: parsed.Token,
          expiration: (0, smithy_client_1.parseRfc3339DateTime)(parsed.Expiration)
        };
      }
      if (response.statusCode >= 400 && response.statusCode < 500) {
        let parsedBody = {};
        try {
          parsedBody = JSON.parse(str);
        } catch (e) {
        }
        throw Object.assign(new property_provider_1.CredentialsProviderError(`Server responded with status: ${response.statusCode}`, { logger }), {
          Code: parsedBody.Code,
          Message: parsedBody.Message
        });
      }
      throw new property_provider_1.CredentialsProviderError(`Server responded with status: ${response.statusCode}`, { logger });
    }
    __name(getCredentials, "getCredentials");
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-cjs/fromHttp/retry-wrapper.js
var require_retry_wrapper = __commonJS({
  "node_modules/@aws-sdk/credential-provider-http/dist-cjs/fromHttp/retry-wrapper.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.retryWrapper = void 0;
    var retryWrapper = /* @__PURE__ */ __name((toRetry, maxRetries, delayMs) => {
      return async () => {
        for (let i = 0; i < maxRetries; ++i) {
          try {
            return await toRetry();
          } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
        return await toRetry();
      };
    }, "retryWrapper");
    exports.retryWrapper = retryWrapper;
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-cjs/fromHttp/fromHttp.js
var require_fromHttp = __commonJS({
  "node_modules/@aws-sdk/credential-provider-http/dist-cjs/fromHttp/fromHttp.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.fromHttp = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var client_1 = (init_client(), __toCommonJS(client_exports));
    var node_http_handler_1 = require_dist_cjs2();
    var property_provider_1 = require_dist_cjs5();
    var promises_1 = tslib_1.__importDefault(__require("node:fs/promises"));
    var checkUrl_1 = require_checkUrl();
    var requestHelpers_1 = require_requestHelpers();
    var retry_wrapper_1 = require_retry_wrapper();
    var AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI";
    var DEFAULT_LINK_LOCAL_HOST = "http://169.254.170.2";
    var AWS_CONTAINER_CREDENTIALS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI";
    var AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE = "AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE";
    var AWS_CONTAINER_AUTHORIZATION_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN";
    var fromHttp = /* @__PURE__ */ __name((options = {}) => {
      options.logger?.debug("@aws-sdk/credential-provider-http - fromHttp");
      let host;
      const relative = options.awsContainerCredentialsRelativeUri ?? process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI];
      const full = options.awsContainerCredentialsFullUri ?? process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI];
      const token = options.awsContainerAuthorizationToken ?? process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN];
      const tokenFile = options.awsContainerAuthorizationTokenFile ?? process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE];
      const warn = options.logger?.constructor?.name === "NoOpLogger" || !options.logger?.warn ? console.warn : options.logger.warn.bind(options.logger);
      if (relative && full) {
        warn("@aws-sdk/credential-provider-http: you have set both awsContainerCredentialsRelativeUri and awsContainerCredentialsFullUri.");
        warn("awsContainerCredentialsFullUri will take precedence.");
      }
      if (token && tokenFile) {
        warn("@aws-sdk/credential-provider-http: you have set both awsContainerAuthorizationToken and awsContainerAuthorizationTokenFile.");
        warn("awsContainerAuthorizationToken will take precedence.");
      }
      if (full) {
        host = full;
      } else if (relative) {
        host = `${DEFAULT_LINK_LOCAL_HOST}${relative}`;
      } else {
        throw new property_provider_1.CredentialsProviderError(`No HTTP credential provider host provided.
Set AWS_CONTAINER_CREDENTIALS_FULL_URI or AWS_CONTAINER_CREDENTIALS_RELATIVE_URI.`, { logger: options.logger });
      }
      const url = new URL(host);
      (0, checkUrl_1.checkUrl)(url, options.logger);
      const requestHandler = node_http_handler_1.NodeHttpHandler.create({
        requestTimeout: options.timeout ?? 1e3,
        connectionTimeout: options.timeout ?? 1e3
      });
      return (0, retry_wrapper_1.retryWrapper)(async () => {
        const request = (0, requestHelpers_1.createGetRequest)(url);
        if (token) {
          request.headers.Authorization = token;
        } else if (tokenFile) {
          request.headers.Authorization = (await promises_1.default.readFile(tokenFile)).toString();
        }
        try {
          const result = await requestHandler.handle(request);
          return (0, requestHelpers_1.getCredentials)(result.response).then((creds) => (0, client_1.setCredentialFeature)(creds, "CREDENTIALS_HTTP", "z"));
        } catch (e) {
          throw new property_provider_1.CredentialsProviderError(String(e), { logger: options.logger });
        }
      }, options.maxRetries ?? 3, options.timeout ?? 1e3);
    }, "fromHttp");
    exports.fromHttp = fromHttp;
  }
});

// node_modules/@aws-sdk/credential-provider-http/dist-cjs/index.js
var require_dist_cjs6 = __commonJS({
  "node_modules/@aws-sdk/credential-provider-http/dist-cjs/index.js"(exports) {
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.fromHttp = void 0;
    var fromHttp_1 = require_fromHttp();
    Object.defineProperty(exports, "fromHttp", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return fromHttp_1.fromHttp;
    }, "get") });
  }
});
export default require_dist_cjs6();
//# sourceMappingURL=dist-cjs-V2YDHTFN.mjs.map
