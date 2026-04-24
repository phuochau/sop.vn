import {
  client_exports,
  init_client
} from "./chunk-IAJ5C443.mjs";
import {
  require_dist_cjs
} from "./chunk-RIFC2BQV.mjs";
import {
  __commonJS,
  __name,
  __toCommonJS,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@aws-sdk/credential-provider-env/dist-cjs/index.js
var require_dist_cjs2 = __commonJS({
  "node_modules/@aws-sdk/credential-provider-env/dist-cjs/index.js"(exports) {
    init_esm();
    var client = (init_client(), __toCommonJS(client_exports));
    var propertyProvider = require_dist_cjs();
    var ENV_KEY = "AWS_ACCESS_KEY_ID";
    var ENV_SECRET = "AWS_SECRET_ACCESS_KEY";
    var ENV_SESSION = "AWS_SESSION_TOKEN";
    var ENV_EXPIRATION = "AWS_CREDENTIAL_EXPIRATION";
    var ENV_CREDENTIAL_SCOPE = "AWS_CREDENTIAL_SCOPE";
    var ENV_ACCOUNT_ID = "AWS_ACCOUNT_ID";
    var fromEnv = /* @__PURE__ */ __name((init) => async () => {
      init?.logger?.debug("@aws-sdk/credential-provider-env - fromEnv");
      const accessKeyId = process.env[ENV_KEY];
      const secretAccessKey = process.env[ENV_SECRET];
      const sessionToken = process.env[ENV_SESSION];
      const expiry = process.env[ENV_EXPIRATION];
      const credentialScope = process.env[ENV_CREDENTIAL_SCOPE];
      const accountId = process.env[ENV_ACCOUNT_ID];
      if (accessKeyId && secretAccessKey) {
        const credentials = {
          accessKeyId,
          secretAccessKey,
          ...sessionToken && { sessionToken },
          ...expiry && { expiration: new Date(expiry) },
          ...credentialScope && { credentialScope },
          ...accountId && { accountId }
        };
        client.setCredentialFeature(credentials, "CREDENTIALS_ENV_VARS", "g");
        return credentials;
      }
      throw new propertyProvider.CredentialsProviderError("Unable to find environment variable credentials.", { logger: init?.logger });
    }, "fromEnv");
    exports.ENV_ACCOUNT_ID = ENV_ACCOUNT_ID;
    exports.ENV_CREDENTIAL_SCOPE = ENV_CREDENTIAL_SCOPE;
    exports.ENV_EXPIRATION = ENV_EXPIRATION;
    exports.ENV_KEY = ENV_KEY;
    exports.ENV_SECRET = ENV_SECRET;
    exports.ENV_SESSION = ENV_SESSION;
    exports.fromEnv = fromEnv;
  }
});

export {
  require_dist_cjs2 as require_dist_cjs
};
//# sourceMappingURL=chunk-NKFPF6YF.mjs.map
