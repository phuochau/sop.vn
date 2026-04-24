import {
  require_dist_cjs
} from "./chunk-AJILZ5WZ.mjs";
import {
  client_exports,
  init_client
} from "./chunk-IAJ5C443.mjs";
import {
  require_dist_cjs as require_dist_cjs3
} from "./chunk-IIMKTLY7.mjs";
import "./chunk-YPLDPGBH.mjs";
import {
  require_dist_cjs as require_dist_cjs2
} from "./chunk-RIFC2BQV.mjs";
import {
  __commonJS,
  __name,
  __require,
  __toCommonJS,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@aws-sdk/credential-provider-login/dist-cjs/index.js
var require_dist_cjs4 = __commonJS({
  "node_modules/@aws-sdk/credential-provider-login/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var client = (init_client(), __toCommonJS(client_exports));
    var propertyProvider = require_dist_cjs2();
    var sharedIniFileLoader = require_dist_cjs3();
    var protocolHttp = require_dist_cjs();
    var node_crypto = __require("node:crypto");
    var node_fs = __require("node:fs");
    var node_os = __require("node:os");
    var node_path = __require("node:path");
    var LoginCredentialsFetcher = class _LoginCredentialsFetcher {
      static {
        __name(this, "LoginCredentialsFetcher");
      }
      profileData;
      init;
      callerClientConfig;
      static REFRESH_THRESHOLD = 5 * 60 * 1e3;
      constructor(profileData, init, callerClientConfig) {
        this.profileData = profileData;
        this.init = init;
        this.callerClientConfig = callerClientConfig;
      }
      async loadCredentials() {
        const token = await this.loadToken();
        if (!token) {
          throw new propertyProvider.CredentialsProviderError(`Failed to load a token for session ${this.loginSession}, please re-authenticate using aws login`, { tryNextLink: false, logger: this.logger });
        }
        const accessToken = token.accessToken;
        const now = Date.now();
        const expiryTime = new Date(accessToken.expiresAt).getTime();
        const timeUntilExpiry = expiryTime - now;
        if (timeUntilExpiry <= _LoginCredentialsFetcher.REFRESH_THRESHOLD) {
          return this.refresh(token);
        }
        return {
          accessKeyId: accessToken.accessKeyId,
          secretAccessKey: accessToken.secretAccessKey,
          sessionToken: accessToken.sessionToken,
          accountId: accessToken.accountId,
          expiration: new Date(accessToken.expiresAt)
        };
      }
      get logger() {
        return this.init?.logger;
      }
      get loginSession() {
        return this.profileData.login_session;
      }
      async refresh(token) {
        const { SigninClient, CreateOAuth2TokenCommand } = await import("./signin-FECZ4ZRM.mjs");
        const { logger, userAgentAppId } = this.callerClientConfig ?? {};
        const isH2 = /* @__PURE__ */ __name((requestHandler2) => {
          return requestHandler2?.metadata?.handlerProtocol === "h2";
        }, "isH2");
        const requestHandler = isH2(this.callerClientConfig?.requestHandler) ? void 0 : this.callerClientConfig?.requestHandler;
        const region = this.profileData.region ?? await this.callerClientConfig?.region?.() ?? process.env.AWS_REGION;
        const client2 = new SigninClient({
          credentials: {
            accessKeyId: "",
            secretAccessKey: ""
          },
          region,
          requestHandler,
          logger,
          userAgentAppId,
          ...this.init?.clientConfig
        });
        this.createDPoPInterceptor(client2.middlewareStack);
        const commandInput = {
          tokenInput: {
            clientId: token.clientId,
            refreshToken: token.refreshToken,
            grantType: "refresh_token"
          }
        };
        try {
          const response = await client2.send(new CreateOAuth2TokenCommand(commandInput));
          const { accessKeyId, secretAccessKey, sessionToken } = response.tokenOutput?.accessToken ?? {};
          const { refreshToken, expiresIn } = response.tokenOutput ?? {};
          if (!accessKeyId || !secretAccessKey || !sessionToken || !refreshToken) {
            throw new propertyProvider.CredentialsProviderError("Token refresh response missing required fields", {
              logger: this.logger,
              tryNextLink: false
            });
          }
          const expiresInMs = (expiresIn ?? 900) * 1e3;
          const expiration = new Date(Date.now() + expiresInMs);
          const updatedToken = {
            ...token,
            accessToken: {
              ...token.accessToken,
              accessKeyId,
              secretAccessKey,
              sessionToken,
              expiresAt: expiration.toISOString()
            },
            refreshToken
          };
          await this.saveToken(updatedToken);
          const newAccessToken = updatedToken.accessToken;
          return {
            accessKeyId: newAccessToken.accessKeyId,
            secretAccessKey: newAccessToken.secretAccessKey,
            sessionToken: newAccessToken.sessionToken,
            accountId: newAccessToken.accountId,
            expiration
          };
        } catch (error) {
          if (error.name === "AccessDeniedException") {
            const errorType = error.error;
            let message;
            switch (errorType) {
              case "TOKEN_EXPIRED":
                message = "Your session has expired. Please reauthenticate.";
                break;
              case "USER_CREDENTIALS_CHANGED":
                message = "Unable to refresh credentials because of a change in your password. Please reauthenticate with your new password.";
                break;
              case "INSUFFICIENT_PERMISSIONS":
                message = "Unable to refresh credentials due to insufficient permissions. You may be missing permission for the 'CreateOAuth2Token' action.";
                break;
              default:
                message = `Failed to refresh token: ${String(error)}. Please re-authenticate using \`aws login\``;
            }
            throw new propertyProvider.CredentialsProviderError(message, { logger: this.logger, tryNextLink: false });
          }
          throw new propertyProvider.CredentialsProviderError(`Failed to refresh token: ${String(error)}. Please re-authenticate using aws login`, { logger: this.logger });
        }
      }
      async loadToken() {
        const tokenFilePath = this.getTokenFilePath();
        try {
          let tokenData;
          try {
            tokenData = await sharedIniFileLoader.readFile(tokenFilePath, { ignoreCache: this.init?.ignoreCache });
          } catch {
            tokenData = await node_fs.promises.readFile(tokenFilePath, "utf8");
          }
          const token = JSON.parse(tokenData);
          const missingFields = ["accessToken", "clientId", "refreshToken", "dpopKey"].filter((k) => !token[k]);
          if (!token.accessToken?.accountId) {
            missingFields.push("accountId");
          }
          if (missingFields.length > 0) {
            throw new propertyProvider.CredentialsProviderError(`Token validation failed, missing fields: ${missingFields.join(", ")}`, {
              logger: this.logger,
              tryNextLink: false
            });
          }
          return token;
        } catch (error) {
          throw new propertyProvider.CredentialsProviderError(`Failed to load token from ${tokenFilePath}: ${String(error)}`, {
            logger: this.logger,
            tryNextLink: false
          });
        }
      }
      async saveToken(token) {
        const tokenFilePath = this.getTokenFilePath();
        const directory = node_path.dirname(tokenFilePath);
        try {
          await node_fs.promises.mkdir(directory, { recursive: true });
        } catch (error) {
        }
        await node_fs.promises.writeFile(tokenFilePath, JSON.stringify(token, null, 2), "utf8");
      }
      getTokenFilePath() {
        const directory = process.env.AWS_LOGIN_CACHE_DIRECTORY ?? node_path.join(node_os.homedir(), ".aws", "login", "cache");
        const loginSessionBytes = Buffer.from(this.loginSession, "utf8");
        const loginSessionSha256 = node_crypto.createHash("sha256").update(loginSessionBytes).digest("hex");
        return node_path.join(directory, `${loginSessionSha256}.json`);
      }
      derToRawSignature(derSignature) {
        let offset = 2;
        if (derSignature[offset] !== 2) {
          throw new Error("Invalid DER signature");
        }
        offset++;
        const rLength = derSignature[offset++];
        let r = derSignature.subarray(offset, offset + rLength);
        offset += rLength;
        if (derSignature[offset] !== 2) {
          throw new Error("Invalid DER signature");
        }
        offset++;
        const sLength = derSignature[offset++];
        let s = derSignature.subarray(offset, offset + sLength);
        r = r[0] === 0 ? r.subarray(1) : r;
        s = s[0] === 0 ? s.subarray(1) : s;
        const rPadded = Buffer.concat([Buffer.alloc(32 - r.length), r]);
        const sPadded = Buffer.concat([Buffer.alloc(32 - s.length), s]);
        return Buffer.concat([rPadded, sPadded]);
      }
      createDPoPInterceptor(middlewareStack) {
        middlewareStack.add((next) => async (args) => {
          if (protocolHttp.HttpRequest.isInstance(args.request)) {
            const request = args.request;
            const actualEndpoint = `${request.protocol}//${request.hostname}${request.port ? `:${request.port}` : ""}${request.path}`;
            const dpop = await this.generateDpop(request.method, actualEndpoint);
            request.headers = {
              ...request.headers,
              DPoP: dpop
            };
          }
          return next(args);
        }, {
          step: "finalizeRequest",
          name: "dpopInterceptor",
          override: true
        });
      }
      async generateDpop(method = "POST", endpoint) {
        const token = await this.loadToken();
        try {
          const privateKey = node_crypto.createPrivateKey({
            key: token.dpopKey,
            format: "pem",
            type: "sec1"
          });
          const publicKey = node_crypto.createPublicKey(privateKey);
          const publicDer = publicKey.export({ format: "der", type: "spki" });
          let pointStart = -1;
          for (let i = 0; i < publicDer.length; i++) {
            if (publicDer[i] === 4) {
              pointStart = i;
              break;
            }
          }
          const x = publicDer.slice(pointStart + 1, pointStart + 33);
          const y = publicDer.slice(pointStart + 33, pointStart + 65);
          const header = {
            alg: "ES256",
            typ: "dpop+jwt",
            jwk: {
              kty: "EC",
              crv: "P-256",
              x: x.toString("base64url"),
              y: y.toString("base64url")
            }
          };
          const payload = {
            jti: crypto.randomUUID(),
            htm: method,
            htu: endpoint,
            iat: Math.floor(Date.now() / 1e3)
          };
          const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
          const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
          const message = `${headerB64}.${payloadB64}`;
          const asn1Signature = node_crypto.sign("sha256", Buffer.from(message), privateKey);
          const rawSignature = this.derToRawSignature(asn1Signature);
          const signatureB64 = rawSignature.toString("base64url");
          return `${message}.${signatureB64}`;
        } catch (error) {
          throw new propertyProvider.CredentialsProviderError(`Failed to generate Dpop proof: ${error instanceof Error ? error.message : String(error)}`, { logger: this.logger, tryNextLink: false });
        }
      }
    };
    var fromLoginCredentials = /* @__PURE__ */ __name((init) => async ({ callerClientConfig } = {}) => {
      init?.logger?.debug?.("@aws-sdk/credential-providers - fromLoginCredentials");
      const profiles = await sharedIniFileLoader.parseKnownFiles(init || {});
      const profileName = sharedIniFileLoader.getProfileName({
        profile: init?.profile ?? callerClientConfig?.profile
      });
      const profile = profiles[profileName];
      if (!profile?.login_session) {
        throw new propertyProvider.CredentialsProviderError(`Profile ${profileName} does not contain login_session.`, {
          tryNextLink: true,
          logger: init?.logger
        });
      }
      const fetcher = new LoginCredentialsFetcher(profile, init, callerClientConfig);
      const credentials = await fetcher.loadCredentials();
      return client.setCredentialFeature(credentials, "CREDENTIALS_LOGIN", "AD");
    }, "fromLoginCredentials");
    exports.fromLoginCredentials = fromLoginCredentials;
  }
});

// node_modules/@aws-sdk/credential-provider-ini/dist-cjs/index.js
var require_dist_cjs5 = __commonJS({
  "node_modules/@aws-sdk/credential-provider-ini/dist-cjs/index.js"(exports) {
    init_esm();
    var sharedIniFileLoader = require_dist_cjs3();
    var propertyProvider = require_dist_cjs2();
    var client = (init_client(), __toCommonJS(client_exports));
    var credentialProviderLogin = require_dist_cjs4();
    var resolveCredentialSource = /* @__PURE__ */ __name((credentialSource, profileName, logger) => {
      const sourceProvidersMap = {
        EcsContainer: /* @__PURE__ */ __name(async (options) => {
          const { fromHttp } = await import("./dist-cjs-V2YDHTFN.mjs");
          const { fromContainerMetadata } = await import("./dist-cjs-HMVR4K7Y.mjs");
          logger?.debug("@aws-sdk/credential-provider-ini - credential_source is EcsContainer");
          return async () => propertyProvider.chain(fromHttp(options ?? {}), fromContainerMetadata(options))().then(setNamedProvider);
        }, "EcsContainer"),
        Ec2InstanceMetadata: /* @__PURE__ */ __name(async (options) => {
          logger?.debug("@aws-sdk/credential-provider-ini - credential_source is Ec2InstanceMetadata");
          const { fromInstanceMetadata } = await import("./dist-cjs-HMVR4K7Y.mjs");
          return async () => fromInstanceMetadata(options)().then(setNamedProvider);
        }, "Ec2InstanceMetadata"),
        Environment: /* @__PURE__ */ __name(async (options) => {
          logger?.debug("@aws-sdk/credential-provider-ini - credential_source is Environment");
          const { fromEnv } = await import("./dist-cjs-CXGIQD3A.mjs");
          return async () => fromEnv(options)().then(setNamedProvider);
        }, "Environment")
      };
      if (credentialSource in sourceProvidersMap) {
        return sourceProvidersMap[credentialSource];
      } else {
        throw new propertyProvider.CredentialsProviderError(`Unsupported credential source in profile ${profileName}. Got ${credentialSource}, expected EcsContainer or Ec2InstanceMetadata or Environment.`, { logger });
      }
    }, "resolveCredentialSource");
    var setNamedProvider = /* @__PURE__ */ __name((creds) => client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_NAMED_PROVIDER", "p"), "setNamedProvider");
    var isAssumeRoleProfile = /* @__PURE__ */ __name((arg, { profile = "default", logger } = {}) => {
      return Boolean(arg) && typeof arg === "object" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1 && ["undefined", "string"].indexOf(typeof arg.external_id) > -1 && ["undefined", "string"].indexOf(typeof arg.mfa_serial) > -1 && (isAssumeRoleWithSourceProfile(arg, { profile, logger }) || isCredentialSourceProfile(arg, { profile, logger }));
    }, "isAssumeRoleProfile");
    var isAssumeRoleWithSourceProfile = /* @__PURE__ */ __name((arg, { profile, logger }) => {
      const withSourceProfile = typeof arg.source_profile === "string" && typeof arg.credential_source === "undefined";
      if (withSourceProfile) {
        logger?.debug?.(`    ${profile} isAssumeRoleWithSourceProfile source_profile=${arg.source_profile}`);
      }
      return withSourceProfile;
    }, "isAssumeRoleWithSourceProfile");
    var isCredentialSourceProfile = /* @__PURE__ */ __name((arg, { profile, logger }) => {
      const withProviderProfile = typeof arg.credential_source === "string" && typeof arg.source_profile === "undefined";
      if (withProviderProfile) {
        logger?.debug?.(`    ${profile} isCredentialSourceProfile credential_source=${arg.credential_source}`);
      }
      return withProviderProfile;
    }, "isCredentialSourceProfile");
    var resolveAssumeRoleCredentials = /* @__PURE__ */ __name(async (profileName, profiles, options, callerClientConfig, visitedProfiles = {}, resolveProfileData2) => {
      options.logger?.debug("@aws-sdk/credential-provider-ini - resolveAssumeRoleCredentials (STS)");
      const profileData = profiles[profileName];
      const { source_profile, region } = profileData;
      if (!options.roleAssumer) {
        const { getDefaultRoleAssumer } = await import("./sts-TILTG2JJ.mjs");
        options.roleAssumer = getDefaultRoleAssumer({
          ...options.clientConfig,
          credentialProviderLogger: options.logger,
          parentClientConfig: {
            ...callerClientConfig,
            ...options?.parentClientConfig,
            region: region ?? options?.parentClientConfig?.region ?? callerClientConfig?.region
          }
        }, options.clientPlugins);
      }
      if (source_profile && source_profile in visitedProfiles) {
        throw new propertyProvider.CredentialsProviderError(`Detected a cycle attempting to resolve credentials for profile ${sharedIniFileLoader.getProfileName(options)}. Profiles visited: ` + Object.keys(visitedProfiles).join(", "), { logger: options.logger });
      }
      options.logger?.debug(`@aws-sdk/credential-provider-ini - finding credential resolver using ${source_profile ? `source_profile=[${source_profile}]` : `profile=[${profileName}]`}`);
      const sourceCredsProvider = source_profile ? resolveProfileData2(source_profile, profiles, options, callerClientConfig, {
        ...visitedProfiles,
        [source_profile]: true
      }, isCredentialSourceWithoutRoleArn(profiles[source_profile] ?? {})) : (await resolveCredentialSource(profileData.credential_source, profileName, options.logger)(options))();
      if (isCredentialSourceWithoutRoleArn(profileData)) {
        return sourceCredsProvider.then((creds) => client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
      } else {
        const params = {
          RoleArn: profileData.role_arn,
          RoleSessionName: profileData.role_session_name || `aws-sdk-js-${Date.now()}`,
          ExternalId: profileData.external_id,
          DurationSeconds: parseInt(profileData.duration_seconds || "3600", 10)
        };
        const { mfa_serial } = profileData;
        if (mfa_serial) {
          if (!options.mfaCodeProvider) {
            throw new propertyProvider.CredentialsProviderError(`Profile ${profileName} requires multi-factor authentication, but no MFA code callback was provided.`, { logger: options.logger, tryNextLink: false });
          }
          params.SerialNumber = mfa_serial;
          params.TokenCode = await options.mfaCodeProvider(mfa_serial);
        }
        const sourceCreds = await sourceCredsProvider;
        return options.roleAssumer(sourceCreds, params).then((creds) => client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SOURCE_PROFILE", "o"));
      }
    }, "resolveAssumeRoleCredentials");
    var isCredentialSourceWithoutRoleArn = /* @__PURE__ */ __name((section) => {
      return !section.role_arn && !!section.credential_source;
    }, "isCredentialSourceWithoutRoleArn");
    var isLoginProfile = /* @__PURE__ */ __name((data) => {
      return Boolean(data && data.login_session);
    }, "isLoginProfile");
    var resolveLoginCredentials = /* @__PURE__ */ __name(async (profileName, options, callerClientConfig) => {
      const credentials = await credentialProviderLogin.fromLoginCredentials({
        ...options,
        profile: profileName
      })({ callerClientConfig });
      return client.setCredentialFeature(credentials, "CREDENTIALS_PROFILE_LOGIN", "AC");
    }, "resolveLoginCredentials");
    var isProcessProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.credential_process === "string", "isProcessProfile");
    var resolveProcessCredentials = /* @__PURE__ */ __name(async (options, profile) => import("./dist-cjs-VRBWMVPU.mjs").then(({ fromProcess }) => fromProcess({
      ...options,
      profile
    })().then((creds) => client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_PROCESS", "v"))), "resolveProcessCredentials");
    var resolveSsoCredentials = /* @__PURE__ */ __name(async (profile, profileData, options = {}, callerClientConfig) => {
      const { fromSSO } = await import("./dist-cjs-3EWUSYY4.mjs");
      return fromSSO({
        profile,
        logger: options.logger,
        parentClientConfig: options.parentClientConfig,
        clientConfig: options.clientConfig
      })({
        callerClientConfig
      }).then((creds) => {
        if (profileData.sso_session) {
          return client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO", "r");
        } else {
          return client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_SSO_LEGACY", "t");
        }
      });
    }, "resolveSsoCredentials");
    var isSsoProfile = /* @__PURE__ */ __name((arg) => arg && (typeof arg.sso_start_url === "string" || typeof arg.sso_account_id === "string" || typeof arg.sso_session === "string" || typeof arg.sso_region === "string" || typeof arg.sso_role_name === "string"), "isSsoProfile");
    var isStaticCredsProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.aws_access_key_id === "string" && typeof arg.aws_secret_access_key === "string" && ["undefined", "string"].indexOf(typeof arg.aws_session_token) > -1 && ["undefined", "string"].indexOf(typeof arg.aws_account_id) > -1, "isStaticCredsProfile");
    var resolveStaticCredentials = /* @__PURE__ */ __name(async (profile, options) => {
      options?.logger?.debug("@aws-sdk/credential-provider-ini - resolveStaticCredentials");
      const credentials = {
        accessKeyId: profile.aws_access_key_id,
        secretAccessKey: profile.aws_secret_access_key,
        sessionToken: profile.aws_session_token,
        ...profile.aws_credential_scope && { credentialScope: profile.aws_credential_scope },
        ...profile.aws_account_id && { accountId: profile.aws_account_id }
      };
      return client.setCredentialFeature(credentials, "CREDENTIALS_PROFILE", "n");
    }, "resolveStaticCredentials");
    var isWebIdentityProfile = /* @__PURE__ */ __name((arg) => Boolean(arg) && typeof arg === "object" && typeof arg.web_identity_token_file === "string" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1, "isWebIdentityProfile");
    var resolveWebIdentityCredentials = /* @__PURE__ */ __name(async (profile, options, callerClientConfig) => import("./dist-cjs-GPJDWDAL.mjs").then(({ fromTokenFile }) => fromTokenFile({
      webIdentityTokenFile: profile.web_identity_token_file,
      roleArn: profile.role_arn,
      roleSessionName: profile.role_session_name,
      roleAssumerWithWebIdentity: options.roleAssumerWithWebIdentity,
      logger: options.logger,
      parentClientConfig: options.parentClientConfig
    })({
      callerClientConfig
    }).then((creds) => client.setCredentialFeature(creds, "CREDENTIALS_PROFILE_STS_WEB_ID_TOKEN", "q"))), "resolveWebIdentityCredentials");
    var resolveProfileData = /* @__PURE__ */ __name(async (profileName, profiles, options, callerClientConfig, visitedProfiles = {}, isAssumeRoleRecursiveCall = false) => {
      const data = profiles[profileName];
      if (Object.keys(visitedProfiles).length > 0 && isStaticCredsProfile(data)) {
        return resolveStaticCredentials(data, options);
      }
      if (isAssumeRoleRecursiveCall || isAssumeRoleProfile(data, { profile: profileName, logger: options.logger })) {
        return resolveAssumeRoleCredentials(profileName, profiles, options, callerClientConfig, visitedProfiles, resolveProfileData);
      }
      if (isStaticCredsProfile(data)) {
        return resolveStaticCredentials(data, options);
      }
      if (isWebIdentityProfile(data)) {
        return resolveWebIdentityCredentials(data, options, callerClientConfig);
      }
      if (isProcessProfile(data)) {
        return resolveProcessCredentials(options, profileName);
      }
      if (isSsoProfile(data)) {
        return await resolveSsoCredentials(profileName, data, options, callerClientConfig);
      }
      if (isLoginProfile(data)) {
        return resolveLoginCredentials(profileName, options, callerClientConfig);
      }
      throw new propertyProvider.CredentialsProviderError(`Could not resolve credentials using profile: [${profileName}] in configuration/credentials file(s).`, { logger: options.logger });
    }, "resolveProfileData");
    var fromIni = /* @__PURE__ */ __name((init = {}) => async ({ callerClientConfig } = {}) => {
      init.logger?.debug("@aws-sdk/credential-provider-ini - fromIni");
      const profiles = await sharedIniFileLoader.parseKnownFiles(init);
      return resolveProfileData(sharedIniFileLoader.getProfileName({
        profile: init.profile ?? callerClientConfig?.profile
      }), profiles, init, callerClientConfig);
    }, "fromIni");
    exports.fromIni = fromIni;
  }
});
export default require_dist_cjs5();
//# sourceMappingURL=dist-cjs-IKURTPNL.mjs.map
