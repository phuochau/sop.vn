import {
  __commonJS,
  __name,
  __require,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@smithy/is-array-buffer/dist-cjs/index.js
var require_dist_cjs = __commonJS({
  "node_modules/@smithy/is-array-buffer/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var isArrayBuffer = /* @__PURE__ */ __name((arg) => typeof ArrayBuffer === "function" && arg instanceof ArrayBuffer || Object.prototype.toString.call(arg) === "[object ArrayBuffer]", "isArrayBuffer");
    exports.isArrayBuffer = isArrayBuffer;
  }
});

// node_modules/@smithy/util-buffer-from/dist-cjs/index.js
var require_dist_cjs2 = __commonJS({
  "node_modules/@smithy/util-buffer-from/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var isArrayBuffer = require_dist_cjs();
    var buffer = __require("buffer");
    var fromArrayBuffer = /* @__PURE__ */ __name((input, offset = 0, length = input.byteLength - offset) => {
      if (!isArrayBuffer.isArrayBuffer(input)) {
        throw new TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
      }
      return buffer.Buffer.from(input, offset, length);
    }, "fromArrayBuffer");
    var fromString = /* @__PURE__ */ __name((input, encoding) => {
      if (typeof input !== "string") {
        throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
      }
      return encoding ? buffer.Buffer.from(input, encoding) : buffer.Buffer.from(input);
    }, "fromString");
    exports.fromArrayBuffer = fromArrayBuffer;
    exports.fromString = fromString;
  }
});

// node_modules/@smithy/util-utf8/dist-cjs/index.js
var require_dist_cjs3 = __commonJS({
  "node_modules/@smithy/util-utf8/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var utilBufferFrom = require_dist_cjs2();
    var fromUtf8 = /* @__PURE__ */ __name((input) => {
      const buf = utilBufferFrom.fromString(input, "utf8");
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }, "fromUtf8");
    var toUint8Array = /* @__PURE__ */ __name((data) => {
      if (typeof data === "string") {
        return fromUtf8(data);
      }
      if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
      }
      return new Uint8Array(data);
    }, "toUint8Array");
    var toUtf8 = /* @__PURE__ */ __name((input) => {
      if (typeof input === "string") {
        return input;
      }
      if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
      }
      return utilBufferFrom.fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength).toString("utf8");
    }, "toUtf8");
    exports.fromUtf8 = fromUtf8;
    exports.toUint8Array = toUint8Array;
    exports.toUtf8 = toUtf8;
  }
});

export {
  require_dist_cjs,
  require_dist_cjs2,
  require_dist_cjs3
};
//# sourceMappingURL=chunk-TPR7ISAF.mjs.map
