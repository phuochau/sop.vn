import {
  __commonJS,
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@smithy/querystring-parser/dist-cjs/index.js
var require_dist_cjs = __commonJS({
  "node_modules/@smithy/querystring-parser/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    function parseQueryString(querystring) {
      const query = {};
      querystring = querystring.replace(/^\?/, "");
      if (querystring) {
        for (const pair of querystring.split("&")) {
          let [key, value = null] = pair.split("=");
          key = decodeURIComponent(key);
          if (value) {
            value = decodeURIComponent(value);
          }
          if (!(key in query)) {
            query[key] = value;
          } else if (Array.isArray(query[key])) {
            query[key].push(value);
          } else {
            query[key] = [query[key], value];
          }
        }
      }
      return query;
    }
    __name(parseQueryString, "parseQueryString");
    exports.parseQueryString = parseQueryString;
  }
});

// node_modules/@smithy/url-parser/dist-cjs/index.js
var require_dist_cjs2 = __commonJS({
  "node_modules/@smithy/url-parser/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var querystringParser = require_dist_cjs();
    var parseUrl = /* @__PURE__ */ __name((url) => {
      if (typeof url === "string") {
        return parseUrl(new URL(url));
      }
      const { hostname, pathname, port, protocol, search } = url;
      let query;
      if (search) {
        query = querystringParser.parseQueryString(search);
      }
      return {
        hostname,
        port: port ? parseInt(port) : void 0,
        protocol,
        path: pathname,
        query
      };
    }, "parseUrl");
    exports.parseUrl = parseUrl;
  }
});

export {
  require_dist_cjs2 as require_dist_cjs
};
//# sourceMappingURL=chunk-Q4T5MCLT.mjs.map
