import {
  require_dist_cjs as require_dist_cjs16,
  require_dist_cjs2 as require_dist_cjs18,
  require_dist_cjs3 as require_dist_cjs29
} from "./chunk-LZMIKRF7.mjs";
import {
  dist_es_exports,
  httpAuthSchemes_exports,
  init_dist_es,
  init_httpAuthSchemes,
  require_dist_cjs as require_dist_cjs11,
  require_dist_cjs10 as require_dist_cjs23,
  require_dist_cjs11 as require_dist_cjs27,
  require_dist_cjs12 as require_dist_cjs28,
  require_dist_cjs13 as require_dist_cjs31,
  require_dist_cjs14 as require_dist_cjs32,
  require_dist_cjs15 as require_dist_cjs33,
  require_dist_cjs16 as require_dist_cjs34,
  require_dist_cjs17 as require_dist_cjs35,
  require_dist_cjs2 as require_dist_cjs12,
  require_dist_cjs3 as require_dist_cjs13,
  require_dist_cjs5 as require_dist_cjs17,
  require_dist_cjs6 as require_dist_cjs19,
  require_dist_cjs7 as require_dist_cjs20,
  require_dist_cjs8 as require_dist_cjs21,
  require_dist_cjs9 as require_dist_cjs22
} from "./chunk-QGEXMNHO.mjs";
import {
  init_schema,
  init_tslib_es6,
  require_dist_cjs as require_dist_cjs5,
  require_dist_cjs3 as require_dist_cjs6,
  require_dist_cjs4 as require_dist_cjs7,
  require_dist_cjs5 as require_dist_cjs8,
  require_dist_cjs6 as require_dist_cjs9,
  require_dist_cjs7 as require_dist_cjs10,
  require_dist_cjs9 as require_dist_cjs15,
  schema_exports,
  tslib_es6_exports
} from "./chunk-TYTCKKP3.mjs";
import {
  require_dist_cjs
} from "./chunk-AJILZ5WZ.mjs";
import {
  require_dist_cjs as require_dist_cjs3,
  require_dist_cjs3 as require_dist_cjs4
} from "./chunk-TPR7ISAF.mjs";
import {
  require_dist_cjs as require_dist_cjs30
} from "./chunk-NKFPF6YF.mjs";
import {
  client_exports,
  init_client,
  require_dist_cjs2
} from "./chunk-IAJ5C443.mjs";
import {
  require_dist_cjs as require_dist_cjs26
} from "./chunk-HVKOIMR6.mjs";
import {
  require_dist_cjs as require_dist_cjs14
} from "./chunk-Q4T5MCLT.mjs";
import {
  require_dist_cjs as require_dist_cjs25
} from "./chunk-IIMKTLY7.mjs";
import {
  require_dist_cjs as require_dist_cjs24
} from "./chunk-RIFC2BQV.mjs";
import {
  __commonJS,
  __name,
  __require,
  __toCommonJS,
  __toESM,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// node_modules/@aws-sdk/middleware-expect-continue/dist-cjs/index.js
var require_dist_cjs36 = __commonJS({
  "node_modules/@aws-sdk/middleware-expect-continue/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var protocolHttp = require_dist_cjs();
    function addExpectContinueMiddleware(options) {
      return (next) => async (args) => {
        const { request } = args;
        if (options.expectContinueHeader !== false && protocolHttp.HttpRequest.isInstance(request) && request.body && options.runtime === "node" && options.requestHandler?.constructor?.name !== "FetchHttpHandler") {
          let sendHeader = true;
          if (typeof options.expectContinueHeader === "number") {
            try {
              const bodyLength = Number(request.headers?.["content-length"]) ?? options.bodyLengthChecker?.(request.body) ?? Infinity;
              sendHeader = bodyLength >= options.expectContinueHeader;
            } catch (e) {
            }
          } else {
            sendHeader = !!options.expectContinueHeader;
          }
          if (sendHeader) {
            request.headers.Expect = "100-continue";
          }
        }
        return next({
          ...args,
          request
        });
      };
    }
    __name(addExpectContinueMiddleware, "addExpectContinueMiddleware");
    var addExpectContinueMiddlewareOptions = {
      step: "build",
      tags: ["SET_EXPECT_HEADER", "EXPECT_HEADER"],
      name: "addExpectContinueMiddleware",
      override: true
    };
    var getAddExpectContinuePlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(addExpectContinueMiddleware(options), addExpectContinueMiddlewareOptions);
      }, "applyToStack")
    }), "getAddExpectContinuePlugin");
    exports.addExpectContinueMiddleware = addExpectContinueMiddleware;
    exports.addExpectContinueMiddlewareOptions = addExpectContinueMiddlewareOptions;
    exports.getAddExpectContinuePlugin = getAddExpectContinuePlugin;
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/is-array-buffer/dist-cjs/index.js
var require_dist_cjs37 = __commonJS({
  "node_modules/@aws-crypto/util/node_modules/@smithy/is-array-buffer/dist-cjs/index.js"(exports, module) {
    init_esm();
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", { value, configurable: true }), "__name");
    var __export = /* @__PURE__ */ __name((target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    }, "__export");
    var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    }, "__copyProps");
    var __toCommonJS2 = /* @__PURE__ */ __name((mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod), "__toCommonJS");
    var src_exports = {};
    __export(src_exports, {
      isArrayBuffer: /* @__PURE__ */ __name(() => isArrayBuffer, "isArrayBuffer")
    });
    module.exports = __toCommonJS2(src_exports);
    var isArrayBuffer = /* @__PURE__ */ __name2((arg) => typeof ArrayBuffer === "function" && arg instanceof ArrayBuffer || Object.prototype.toString.call(arg) === "[object ArrayBuffer]", "isArrayBuffer");
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/util-buffer-from/dist-cjs/index.js
var require_dist_cjs38 = __commonJS({
  "node_modules/@aws-crypto/util/node_modules/@smithy/util-buffer-from/dist-cjs/index.js"(exports, module) {
    init_esm();
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", { value, configurable: true }), "__name");
    var __export = /* @__PURE__ */ __name((target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    }, "__export");
    var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    }, "__copyProps");
    var __toCommonJS2 = /* @__PURE__ */ __name((mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod), "__toCommonJS");
    var src_exports = {};
    __export(src_exports, {
      fromArrayBuffer: /* @__PURE__ */ __name(() => fromArrayBuffer, "fromArrayBuffer"),
      fromString: /* @__PURE__ */ __name(() => fromString, "fromString")
    });
    module.exports = __toCommonJS2(src_exports);
    var import_is_array_buffer = require_dist_cjs37();
    var import_buffer = __require("buffer");
    var fromArrayBuffer = /* @__PURE__ */ __name2((input, offset = 0, length = input.byteLength - offset) => {
      if (!(0, import_is_array_buffer.isArrayBuffer)(input)) {
        throw new TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
      }
      return import_buffer.Buffer.from(input, offset, length);
    }, "fromArrayBuffer");
    var fromString = /* @__PURE__ */ __name2((input, encoding) => {
      if (typeof input !== "string") {
        throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
      }
      return encoding ? import_buffer.Buffer.from(input, encoding) : import_buffer.Buffer.from(input);
    }, "fromString");
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-cjs/index.js
var require_dist_cjs39 = __commonJS({
  "node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-cjs/index.js"(exports, module) {
    init_esm();
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __name2 = /* @__PURE__ */ __name((target, value) => __defProp(target, "name", { value, configurable: true }), "__name");
    var __export = /* @__PURE__ */ __name((target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    }, "__export");
    var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    }, "__copyProps");
    var __toCommonJS2 = /* @__PURE__ */ __name((mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod), "__toCommonJS");
    var src_exports = {};
    __export(src_exports, {
      fromUtf8: /* @__PURE__ */ __name(() => fromUtf8, "fromUtf8"),
      toUint8Array: /* @__PURE__ */ __name(() => toUint8Array, "toUint8Array"),
      toUtf8: /* @__PURE__ */ __name(() => toUtf8, "toUtf8")
    });
    module.exports = __toCommonJS2(src_exports);
    var import_util_buffer_from = require_dist_cjs38();
    var fromUtf8 = /* @__PURE__ */ __name2((input) => {
      const buf = (0, import_util_buffer_from.fromString)(input, "utf8");
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }, "fromUtf8");
    var toUint8Array = /* @__PURE__ */ __name2((data) => {
      if (typeof data === "string") {
        return fromUtf8(data);
      }
      if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
      }
      return new Uint8Array(data);
    }, "toUint8Array");
    var toUtf8 = /* @__PURE__ */ __name2((input) => {
      if (typeof input === "string") {
        return input;
      }
      if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
      }
      return (0, import_util_buffer_from.fromArrayBuffer)(input.buffer, input.byteOffset, input.byteLength).toString("utf8");
    }, "toUtf8");
  }
});

// node_modules/@aws-crypto/util/build/main/convertToBuffer.js
var require_convertToBuffer = __commonJS({
  "node_modules/@aws-crypto/util/build/main/convertToBuffer.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.convertToBuffer = void 0;
    var util_utf8_1 = require_dist_cjs39();
    var fromUtf8 = typeof Buffer !== "undefined" && Buffer.from ? function(input) {
      return Buffer.from(input, "utf8");
    } : util_utf8_1.fromUtf8;
    function convertToBuffer(data) {
      if (data instanceof Uint8Array)
        return data;
      if (typeof data === "string") {
        return fromUtf8(data);
      }
      if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
      }
      return new Uint8Array(data);
    }
    __name(convertToBuffer, "convertToBuffer");
    exports.convertToBuffer = convertToBuffer;
  }
});

// node_modules/@aws-crypto/util/build/main/isEmptyData.js
var require_isEmptyData = __commonJS({
  "node_modules/@aws-crypto/util/build/main/isEmptyData.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isEmptyData = void 0;
    function isEmptyData(data) {
      if (typeof data === "string") {
        return data.length === 0;
      }
      return data.byteLength === 0;
    }
    __name(isEmptyData, "isEmptyData");
    exports.isEmptyData = isEmptyData;
  }
});

// node_modules/@aws-crypto/util/build/main/numToUint8.js
var require_numToUint8 = __commonJS({
  "node_modules/@aws-crypto/util/build/main/numToUint8.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.numToUint8 = void 0;
    function numToUint8(num) {
      return new Uint8Array([
        (num & 4278190080) >> 24,
        (num & 16711680) >> 16,
        (num & 65280) >> 8,
        num & 255
      ]);
    }
    __name(numToUint8, "numToUint8");
    exports.numToUint8 = numToUint8;
  }
});

// node_modules/@aws-crypto/util/build/main/uint32ArrayFrom.js
var require_uint32ArrayFrom = __commonJS({
  "node_modules/@aws-crypto/util/build/main/uint32ArrayFrom.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.uint32ArrayFrom = void 0;
    function uint32ArrayFrom(a_lookUpTable) {
      if (!Uint32Array.from) {
        var return_array = new Uint32Array(a_lookUpTable.length);
        var a_index = 0;
        while (a_index < a_lookUpTable.length) {
          return_array[a_index] = a_lookUpTable[a_index];
          a_index += 1;
        }
        return return_array;
      }
      return Uint32Array.from(a_lookUpTable);
    }
    __name(uint32ArrayFrom, "uint32ArrayFrom");
    exports.uint32ArrayFrom = uint32ArrayFrom;
  }
});

// node_modules/@aws-crypto/util/build/main/index.js
var require_main = __commonJS({
  "node_modules/@aws-crypto/util/build/main/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.uint32ArrayFrom = exports.numToUint8 = exports.isEmptyData = exports.convertToBuffer = void 0;
    var convertToBuffer_1 = require_convertToBuffer();
    Object.defineProperty(exports, "convertToBuffer", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return convertToBuffer_1.convertToBuffer;
    }, "get") });
    var isEmptyData_1 = require_isEmptyData();
    Object.defineProperty(exports, "isEmptyData", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return isEmptyData_1.isEmptyData;
    }, "get") });
    var numToUint8_1 = require_numToUint8();
    Object.defineProperty(exports, "numToUint8", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return numToUint8_1.numToUint8;
    }, "get") });
    var uint32ArrayFrom_1 = require_uint32ArrayFrom();
    Object.defineProperty(exports, "uint32ArrayFrom", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return uint32ArrayFrom_1.uint32ArrayFrom;
    }, "get") });
  }
});

// node_modules/@aws-crypto/crc32c/build/main/aws_crc32c.js
var require_aws_crc32c = __commonJS({
  "node_modules/@aws-crypto/crc32c/build/main/aws_crc32c.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AwsCrc32c = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var util_1 = require_main();
    var index_1 = require_main2();
    var AwsCrc32c = (
      /** @class */
      function() {
        function AwsCrc32c2() {
          this.crc32c = new index_1.Crc32c();
        }
        __name(AwsCrc32c2, "AwsCrc32c");
        AwsCrc32c2.prototype.update = function(toHash) {
          if ((0, util_1.isEmptyData)(toHash))
            return;
          this.crc32c.update((0, util_1.convertToBuffer)(toHash));
        };
        AwsCrc32c2.prototype.digest = function() {
          return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
              return [2, (0, util_1.numToUint8)(this.crc32c.digest())];
            });
          });
        };
        AwsCrc32c2.prototype.reset = function() {
          this.crc32c = new index_1.Crc32c();
        };
        return AwsCrc32c2;
      }()
    );
    exports.AwsCrc32c = AwsCrc32c;
  }
});

// node_modules/@aws-crypto/crc32c/build/main/index.js
var require_main2 = __commonJS({
  "node_modules/@aws-crypto/crc32c/build/main/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AwsCrc32c = exports.Crc32c = exports.crc32c = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var util_1 = require_main();
    function crc32c(data) {
      return new Crc32c().update(data).digest();
    }
    __name(crc32c, "crc32c");
    exports.crc32c = crc32c;
    var Crc32c = (
      /** @class */
      function() {
        function Crc32c2() {
          this.checksum = 4294967295;
        }
        __name(Crc32c2, "Crc32c");
        Crc32c2.prototype.update = function(data) {
          var e_1, _a;
          try {
            for (var data_1 = tslib_1.__values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
              var byte = data_1_1.value;
              this.checksum = this.checksum >>> 8 ^ lookupTable[(this.checksum ^ byte) & 255];
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
            } finally {
              if (e_1) throw e_1.error;
            }
          }
          return this;
        };
        Crc32c2.prototype.digest = function() {
          return (this.checksum ^ 4294967295) >>> 0;
        };
        return Crc32c2;
      }()
    );
    exports.Crc32c = Crc32c;
    var a_lookupTable = [
      0,
      4067132163,
      3778769143,
      324072436,
      3348797215,
      904991772,
      648144872,
      3570033899,
      2329499855,
      2024987596,
      1809983544,
      2575936315,
      1296289744,
      3207089363,
      2893594407,
      1578318884,
      274646895,
      3795141740,
      4049975192,
      51262619,
      3619967088,
      632279923,
      922689671,
      3298075524,
      2592579488,
      1760304291,
      2075979607,
      2312596564,
      1562183871,
      2943781820,
      3156637768,
      1313733451,
      549293790,
      3537243613,
      3246849577,
      871202090,
      3878099393,
      357341890,
      102525238,
      4101499445,
      2858735121,
      1477399826,
      1264559846,
      3107202533,
      1845379342,
      2677391885,
      2361733625,
      2125378298,
      820201905,
      3263744690,
      3520608582,
      598981189,
      4151959214,
      85089709,
      373468761,
      3827903834,
      3124367742,
      1213305469,
      1526817161,
      2842354314,
      2107672161,
      2412447074,
      2627466902,
      1861252501,
      1098587580,
      3004210879,
      2688576843,
      1378610760,
      2262928035,
      1955203488,
      1742404180,
      2511436119,
      3416409459,
      969524848,
      714683780,
      3639785095,
      205050476,
      4266873199,
      3976438427,
      526918040,
      1361435347,
      2739821008,
      2954799652,
      1114974503,
      2529119692,
      1691668175,
      2005155131,
      2247081528,
      3690758684,
      697762079,
      986182379,
      3366744552,
      476452099,
      3993867776,
      4250756596,
      255256311,
      1640403810,
      2477592673,
      2164122517,
      1922457750,
      2791048317,
      1412925310,
      1197962378,
      3037525897,
      3944729517,
      427051182,
      170179418,
      4165941337,
      746937522,
      3740196785,
      3451792453,
      1070968646,
      1905808397,
      2213795598,
      2426610938,
      1657317369,
      3053634322,
      1147748369,
      1463399397,
      2773627110,
      4215344322,
      153784257,
      444234805,
      3893493558,
      1021025245,
      3467647198,
      3722505002,
      797665321,
      2197175160,
      1889384571,
      1674398607,
      2443626636,
      1164749927,
      3070701412,
      2757221520,
      1446797203,
      137323447,
      4198817972,
      3910406976,
      461344835,
      3484808360,
      1037989803,
      781091935,
      3705997148,
      2460548119,
      1623424788,
      1939049696,
      2180517859,
      1429367560,
      2807687179,
      3020495871,
      1180866812,
      410100952,
      3927582683,
      4182430767,
      186734380,
      3756733383,
      763408580,
      1053836080,
      3434856499,
      2722870694,
      1344288421,
      1131464017,
      2971354706,
      1708204729,
      2545590714,
      2229949006,
      1988219213,
      680717673,
      3673779818,
      3383336350,
      1002577565,
      4010310262,
      493091189,
      238226049,
      4233660802,
      2987750089,
      1082061258,
      1395524158,
      2705686845,
      1972364758,
      2279892693,
      2494862625,
      1725896226,
      952904198,
      3399985413,
      3656866545,
      731699698,
      4283874585,
      222117402,
      510512622,
      3959836397,
      3280807620,
      837199303,
      582374963,
      3504198960,
      68661723,
      4135334616,
      3844915500,
      390545967,
      1230274059,
      3141532936,
      2825850620,
      1510247935,
      2395924756,
      2091215383,
      1878366691,
      2644384480,
      3553878443,
      565732008,
      854102364,
      3229815391,
      340358836,
      3861050807,
      4117890627,
      119113024,
      1493875044,
      2875275879,
      3090270611,
      1247431312,
      2660249211,
      1828433272,
      2141937292,
      2378227087,
      3811616794,
      291187481,
      34330861,
      4032846830,
      615137029,
      3603020806,
      3314634738,
      939183345,
      1776939221,
      2609017814,
      2295496738,
      2058945313,
      2926798794,
      1545135305,
      1330124605,
      3173225534,
      4084100981,
      17165430,
      307568514,
      3762199681,
      888469610,
      3332340585,
      3587147933,
      665062302,
      2042050490,
      2346497209,
      2559330125,
      1793573966,
      3190661285,
      1279665062,
      1595330642,
      2910671697
    ];
    var lookupTable = (0, util_1.uint32ArrayFrom)(a_lookupTable);
    var aws_crc32c_1 = require_aws_crc32c();
    Object.defineProperty(exports, "AwsCrc32c", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return aws_crc32c_1.AwsCrc32c;
    }, "get") });
  }
});

// node_modules/@aws-sdk/crc64-nvme/dist-cjs/index.js
var require_dist_cjs40 = __commonJS({
  "node_modules/@aws-sdk/crc64-nvme/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var generateCRC64NVMETable = /* @__PURE__ */ __name(() => {
      const sliceLength = 8;
      const tables = new Array(sliceLength);
      for (let slice = 0; slice < sliceLength; slice++) {
        const table = new Array(512);
        for (let i = 0; i < 256; i++) {
          let crc = BigInt(i);
          for (let j = 0; j < 8 * (slice + 1); j++) {
            if (crc & 1n) {
              crc = crc >> 1n ^ 0x9a6c9329ac4bc9b5n;
            } else {
              crc = crc >> 1n;
            }
          }
          table[i * 2] = Number(crc >> 32n & 0xffffffffn);
          table[i * 2 + 1] = Number(crc & 0xffffffffn);
        }
        tables[slice] = new Uint32Array(table);
      }
      return tables;
    }, "generateCRC64NVMETable");
    var CRC64_NVME_REVERSED_TABLE;
    var t0;
    var t1;
    var t2;
    var t3;
    var t4;
    var t5;
    var t6;
    var t7;
    var ensureTablesInitialized = /* @__PURE__ */ __name(() => {
      if (!CRC64_NVME_REVERSED_TABLE) {
        CRC64_NVME_REVERSED_TABLE = generateCRC64NVMETable();
        [t0, t1, t2, t3, t4, t5, t6, t7] = CRC64_NVME_REVERSED_TABLE;
      }
    }, "ensureTablesInitialized");
    var Crc64Nvme = class {
      static {
        __name(this, "Crc64Nvme");
      }
      c1 = 0;
      c2 = 0;
      constructor() {
        ensureTablesInitialized();
        this.reset();
      }
      update(data) {
        const len = data.length;
        let i = 0;
        let crc1 = this.c1;
        let crc2 = this.c2;
        while (i + 8 <= len) {
          const idx0 = ((crc2 ^ data[i++]) & 255) << 1;
          const idx1 = ((crc2 >>> 8 ^ data[i++]) & 255) << 1;
          const idx2 = ((crc2 >>> 16 ^ data[i++]) & 255) << 1;
          const idx3 = ((crc2 >>> 24 ^ data[i++]) & 255) << 1;
          const idx4 = ((crc1 ^ data[i++]) & 255) << 1;
          const idx5 = ((crc1 >>> 8 ^ data[i++]) & 255) << 1;
          const idx6 = ((crc1 >>> 16 ^ data[i++]) & 255) << 1;
          const idx7 = ((crc1 >>> 24 ^ data[i++]) & 255) << 1;
          crc1 = t7[idx0] ^ t6[idx1] ^ t5[idx2] ^ t4[idx3] ^ t3[idx4] ^ t2[idx5] ^ t1[idx6] ^ t0[idx7];
          crc2 = t7[idx0 + 1] ^ t6[idx1 + 1] ^ t5[idx2 + 1] ^ t4[idx3 + 1] ^ t3[idx4 + 1] ^ t2[idx5 + 1] ^ t1[idx6 + 1] ^ t0[idx7 + 1];
        }
        while (i < len) {
          const idx = ((crc2 ^ data[i]) & 255) << 1;
          crc2 = (crc2 >>> 8 | (crc1 & 255) << 24) >>> 0;
          crc1 = crc1 >>> 8 ^ t0[idx];
          crc2 ^= t0[idx + 1];
          i++;
        }
        this.c1 = crc1;
        this.c2 = crc2;
      }
      async digest() {
        const c1 = this.c1 ^ 4294967295;
        const c2 = this.c2 ^ 4294967295;
        return new Uint8Array([
          c1 >>> 24,
          c1 >>> 16 & 255,
          c1 >>> 8 & 255,
          c1 & 255,
          c2 >>> 24,
          c2 >>> 16 & 255,
          c2 >>> 8 & 255,
          c2 & 255
        ]);
      }
      reset() {
        this.c1 = 4294967295;
        this.c2 = 4294967295;
      }
    };
    var crc64NvmeCrtContainer = {
      CrtCrc64Nvme: null
    };
    exports.Crc64Nvme = Crc64Nvme;
    exports.crc64NvmeCrtContainer = crc64NvmeCrtContainer;
  }
});

// node_modules/@aws-crypto/crc32/build/main/aws_crc32.js
var require_aws_crc32 = __commonJS({
  "node_modules/@aws-crypto/crc32/build/main/aws_crc32.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AwsCrc32 = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var util_1 = require_main();
    var index_1 = require_main3();
    var AwsCrc32 = (
      /** @class */
      function() {
        function AwsCrc322() {
          this.crc32 = new index_1.Crc32();
        }
        __name(AwsCrc322, "AwsCrc32");
        AwsCrc322.prototype.update = function(toHash) {
          if ((0, util_1.isEmptyData)(toHash))
            return;
          this.crc32.update((0, util_1.convertToBuffer)(toHash));
        };
        AwsCrc322.prototype.digest = function() {
          return tslib_1.__awaiter(this, void 0, void 0, function() {
            return tslib_1.__generator(this, function(_a) {
              return [2, (0, util_1.numToUint8)(this.crc32.digest())];
            });
          });
        };
        AwsCrc322.prototype.reset = function() {
          this.crc32 = new index_1.Crc32();
        };
        return AwsCrc322;
      }()
    );
    exports.AwsCrc32 = AwsCrc32;
  }
});

// node_modules/@aws-crypto/crc32/build/main/index.js
var require_main3 = __commonJS({
  "node_modules/@aws-crypto/crc32/build/main/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AwsCrc32 = exports.Crc32 = exports.crc32 = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var util_1 = require_main();
    function crc32(data) {
      return new Crc32().update(data).digest();
    }
    __name(crc32, "crc32");
    exports.crc32 = crc32;
    var Crc32 = (
      /** @class */
      function() {
        function Crc322() {
          this.checksum = 4294967295;
        }
        __name(Crc322, "Crc32");
        Crc322.prototype.update = function(data) {
          var e_1, _a;
          try {
            for (var data_1 = tslib_1.__values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
              var byte = data_1_1.value;
              this.checksum = this.checksum >>> 8 ^ lookupTable[(this.checksum ^ byte) & 255];
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (data_1_1 && !data_1_1.done && (_a = data_1.return)) _a.call(data_1);
            } finally {
              if (e_1) throw e_1.error;
            }
          }
          return this;
        };
        Crc322.prototype.digest = function() {
          return (this.checksum ^ 4294967295) >>> 0;
        };
        return Crc322;
      }()
    );
    exports.Crc32 = Crc32;
    var a_lookUpTable = [
      0,
      1996959894,
      3993919788,
      2567524794,
      124634137,
      1886057615,
      3915621685,
      2657392035,
      249268274,
      2044508324,
      3772115230,
      2547177864,
      162941995,
      2125561021,
      3887607047,
      2428444049,
      498536548,
      1789927666,
      4089016648,
      2227061214,
      450548861,
      1843258603,
      4107580753,
      2211677639,
      325883990,
      1684777152,
      4251122042,
      2321926636,
      335633487,
      1661365465,
      4195302755,
      2366115317,
      997073096,
      1281953886,
      3579855332,
      2724688242,
      1006888145,
      1258607687,
      3524101629,
      2768942443,
      901097722,
      1119000684,
      3686517206,
      2898065728,
      853044451,
      1172266101,
      3705015759,
      2882616665,
      651767980,
      1373503546,
      3369554304,
      3218104598,
      565507253,
      1454621731,
      3485111705,
      3099436303,
      671266974,
      1594198024,
      3322730930,
      2970347812,
      795835527,
      1483230225,
      3244367275,
      3060149565,
      1994146192,
      31158534,
      2563907772,
      4023717930,
      1907459465,
      112637215,
      2680153253,
      3904427059,
      2013776290,
      251722036,
      2517215374,
      3775830040,
      2137656763,
      141376813,
      2439277719,
      3865271297,
      1802195444,
      476864866,
      2238001368,
      4066508878,
      1812370925,
      453092731,
      2181625025,
      4111451223,
      1706088902,
      314042704,
      2344532202,
      4240017532,
      1658658271,
      366619977,
      2362670323,
      4224994405,
      1303535960,
      984961486,
      2747007092,
      3569037538,
      1256170817,
      1037604311,
      2765210733,
      3554079995,
      1131014506,
      879679996,
      2909243462,
      3663771856,
      1141124467,
      855842277,
      2852801631,
      3708648649,
      1342533948,
      654459306,
      3188396048,
      3373015174,
      1466479909,
      544179635,
      3110523913,
      3462522015,
      1591671054,
      702138776,
      2966460450,
      3352799412,
      1504918807,
      783551873,
      3082640443,
      3233442989,
      3988292384,
      2596254646,
      62317068,
      1957810842,
      3939845945,
      2647816111,
      81470997,
      1943803523,
      3814918930,
      2489596804,
      225274430,
      2053790376,
      3826175755,
      2466906013,
      167816743,
      2097651377,
      4027552580,
      2265490386,
      503444072,
      1762050814,
      4150417245,
      2154129355,
      426522225,
      1852507879,
      4275313526,
      2312317920,
      282753626,
      1742555852,
      4189708143,
      2394877945,
      397917763,
      1622183637,
      3604390888,
      2714866558,
      953729732,
      1340076626,
      3518719985,
      2797360999,
      1068828381,
      1219638859,
      3624741850,
      2936675148,
      906185462,
      1090812512,
      3747672003,
      2825379669,
      829329135,
      1181335161,
      3412177804,
      3160834842,
      628085408,
      1382605366,
      3423369109,
      3138078467,
      570562233,
      1426400815,
      3317316542,
      2998733608,
      733239954,
      1555261956,
      3268935591,
      3050360625,
      752459403,
      1541320221,
      2607071920,
      3965973030,
      1969922972,
      40735498,
      2617837225,
      3943577151,
      1913087877,
      83908371,
      2512341634,
      3803740692,
      2075208622,
      213261112,
      2463272603,
      3855990285,
      2094854071,
      198958881,
      2262029012,
      4057260610,
      1759359992,
      534414190,
      2176718541,
      4139329115,
      1873836001,
      414664567,
      2282248934,
      4279200368,
      1711684554,
      285281116,
      2405801727,
      4167216745,
      1634467795,
      376229701,
      2685067896,
      3608007406,
      1308918612,
      956543938,
      2808555105,
      3495958263,
      1231636301,
      1047427035,
      2932959818,
      3654703836,
      1088359270,
      936918e3,
      2847714899,
      3736837829,
      1202900863,
      817233897,
      3183342108,
      3401237130,
      1404277552,
      615818150,
      3134207493,
      3453421203,
      1423857449,
      601450431,
      3009837614,
      3294710456,
      1567103746,
      711928724,
      3020668471,
      3272380065,
      1510334235,
      755167117
    ];
    var lookupTable = (0, util_1.uint32ArrayFrom)(a_lookUpTable);
    var aws_crc32_1 = require_aws_crc32();
    Object.defineProperty(exports, "AwsCrc32", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return aws_crc32_1.AwsCrc32;
    }, "get") });
  }
});

// node_modules/@aws-sdk/middleware-flexible-checksums/dist-cjs/getCrc32ChecksumAlgorithmFunction.js
var require_getCrc32ChecksumAlgorithmFunction = __commonJS({
  "node_modules/@aws-sdk/middleware-flexible-checksums/dist-cjs/getCrc32ChecksumAlgorithmFunction.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getCrc32ChecksumAlgorithmFunction = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var crc32_1 = require_main3();
    var util_1 = require_main();
    var zlib = tslib_1.__importStar(__require("node:zlib"));
    var NodeCrc32 = class {
      static {
        __name(this, "NodeCrc32");
      }
      checksum = 0;
      update(data) {
        this.checksum = zlib.crc32(data, this.checksum);
      }
      async digest() {
        return (0, util_1.numToUint8)(this.checksum);
      }
      reset() {
        this.checksum = 0;
      }
    };
    var getCrc32ChecksumAlgorithmFunction = /* @__PURE__ */ __name(() => {
      if (typeof zlib.crc32 === "undefined") {
        return crc32_1.AwsCrc32;
      }
      return NodeCrc32;
    }, "getCrc32ChecksumAlgorithmFunction");
    exports.getCrc32ChecksumAlgorithmFunction = getCrc32ChecksumAlgorithmFunction;
  }
});

// node_modules/@aws-sdk/middleware-flexible-checksums/dist-cjs/index.js
var require_dist_cjs41 = __commonJS({
  "node_modules/@aws-sdk/middleware-flexible-checksums/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var client = (init_client(), __toCommonJS(client_exports));
    var protocolHttp = require_dist_cjs();
    var utilStream = require_dist_cjs9();
    var isArrayBuffer = require_dist_cjs3();
    var crc32c = require_main2();
    var crc64Nvme = require_dist_cjs40();
    var getCrc32ChecksumAlgorithmFunction = require_getCrc32ChecksumAlgorithmFunction();
    var utilUtf8 = require_dist_cjs4();
    var utilMiddleware = require_dist_cjs10();
    var RequestChecksumCalculation = {
      WHEN_SUPPORTED: "WHEN_SUPPORTED",
      WHEN_REQUIRED: "WHEN_REQUIRED"
    };
    var DEFAULT_REQUEST_CHECKSUM_CALCULATION = RequestChecksumCalculation.WHEN_SUPPORTED;
    var ResponseChecksumValidation = {
      WHEN_SUPPORTED: "WHEN_SUPPORTED",
      WHEN_REQUIRED: "WHEN_REQUIRED"
    };
    var DEFAULT_RESPONSE_CHECKSUM_VALIDATION = RequestChecksumCalculation.WHEN_SUPPORTED;
    exports.ChecksumAlgorithm = void 0;
    (function(ChecksumAlgorithm) {
      ChecksumAlgorithm["MD5"] = "MD5";
      ChecksumAlgorithm["CRC32"] = "CRC32";
      ChecksumAlgorithm["CRC32C"] = "CRC32C";
      ChecksumAlgorithm["CRC64NVME"] = "CRC64NVME";
      ChecksumAlgorithm["SHA1"] = "SHA1";
      ChecksumAlgorithm["SHA256"] = "SHA256";
    })(exports.ChecksumAlgorithm || (exports.ChecksumAlgorithm = {}));
    exports.ChecksumLocation = void 0;
    (function(ChecksumLocation) {
      ChecksumLocation["HEADER"] = "header";
      ChecksumLocation["TRAILER"] = "trailer";
    })(exports.ChecksumLocation || (exports.ChecksumLocation = {}));
    var DEFAULT_CHECKSUM_ALGORITHM = exports.ChecksumAlgorithm.CRC32;
    var SelectorType;
    (function(SelectorType2) {
      SelectorType2["ENV"] = "env";
      SelectorType2["CONFIG"] = "shared config entry";
    })(SelectorType || (SelectorType = {}));
    var stringUnionSelector = /* @__PURE__ */ __name((obj, key, union, type) => {
      if (!(key in obj))
        return void 0;
      const value = obj[key].toUpperCase();
      if (!Object.values(union).includes(value)) {
        throw new TypeError(`Cannot load ${type} '${key}'. Expected one of ${Object.values(union)}, got '${obj[key]}'.`);
      }
      return value;
    }, "stringUnionSelector");
    var ENV_REQUEST_CHECKSUM_CALCULATION = "AWS_REQUEST_CHECKSUM_CALCULATION";
    var CONFIG_REQUEST_CHECKSUM_CALCULATION = "request_checksum_calculation";
    var NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => stringUnionSelector(env, ENV_REQUEST_CHECKSUM_CALCULATION, RequestChecksumCalculation, SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => stringUnionSelector(profile, CONFIG_REQUEST_CHECKSUM_CALCULATION, RequestChecksumCalculation, SelectorType.CONFIG), "configFileSelector"),
      default: DEFAULT_REQUEST_CHECKSUM_CALCULATION
    };
    var ENV_RESPONSE_CHECKSUM_VALIDATION = "AWS_RESPONSE_CHECKSUM_VALIDATION";
    var CONFIG_RESPONSE_CHECKSUM_VALIDATION = "response_checksum_validation";
    var NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => stringUnionSelector(env, ENV_RESPONSE_CHECKSUM_VALIDATION, ResponseChecksumValidation, SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => stringUnionSelector(profile, CONFIG_RESPONSE_CHECKSUM_VALIDATION, ResponseChecksumValidation, SelectorType.CONFIG), "configFileSelector"),
      default: DEFAULT_RESPONSE_CHECKSUM_VALIDATION
    };
    var getChecksumAlgorithmForRequest = /* @__PURE__ */ __name((input, { requestChecksumRequired, requestAlgorithmMember, requestChecksumCalculation }) => {
      if (!requestAlgorithmMember) {
        return requestChecksumCalculation === RequestChecksumCalculation.WHEN_SUPPORTED || requestChecksumRequired ? DEFAULT_CHECKSUM_ALGORITHM : void 0;
      }
      if (!input[requestAlgorithmMember]) {
        return void 0;
      }
      const checksumAlgorithm = input[requestAlgorithmMember];
      return checksumAlgorithm;
    }, "getChecksumAlgorithmForRequest");
    var getChecksumLocationName = /* @__PURE__ */ __name((algorithm) => algorithm === exports.ChecksumAlgorithm.MD5 ? "content-md5" : `x-amz-checksum-${algorithm.toLowerCase()}`, "getChecksumLocationName");
    var hasHeader = /* @__PURE__ */ __name((header, headers) => {
      const soughtHeader = header.toLowerCase();
      for (const headerName of Object.keys(headers)) {
        if (soughtHeader === headerName.toLowerCase()) {
          return true;
        }
      }
      return false;
    }, "hasHeader");
    var hasHeaderWithPrefix = /* @__PURE__ */ __name((headerPrefix, headers) => {
      const soughtHeaderPrefix = headerPrefix.toLowerCase();
      for (const headerName of Object.keys(headers)) {
        if (headerName.toLowerCase().startsWith(soughtHeaderPrefix)) {
          return true;
        }
      }
      return false;
    }, "hasHeaderWithPrefix");
    var isStreaming = /* @__PURE__ */ __name((body) => body !== void 0 && typeof body !== "string" && !ArrayBuffer.isView(body) && !isArrayBuffer.isArrayBuffer(body), "isStreaming");
    var CLIENT_SUPPORTED_ALGORITHMS = [
      exports.ChecksumAlgorithm.CRC32,
      exports.ChecksumAlgorithm.CRC32C,
      exports.ChecksumAlgorithm.CRC64NVME,
      exports.ChecksumAlgorithm.SHA1,
      exports.ChecksumAlgorithm.SHA256
    ];
    var PRIORITY_ORDER_ALGORITHMS = [
      exports.ChecksumAlgorithm.SHA256,
      exports.ChecksumAlgorithm.SHA1,
      exports.ChecksumAlgorithm.CRC32,
      exports.ChecksumAlgorithm.CRC32C,
      exports.ChecksumAlgorithm.CRC64NVME
    ];
    var selectChecksumAlgorithmFunction = /* @__PURE__ */ __name((checksumAlgorithm, config) => {
      const { checksumAlgorithms = {} } = config;
      switch (checksumAlgorithm) {
        case exports.ChecksumAlgorithm.MD5:
          return checksumAlgorithms?.MD5 ?? config.md5;
        case exports.ChecksumAlgorithm.CRC32:
          return checksumAlgorithms?.CRC32 ?? getCrc32ChecksumAlgorithmFunction.getCrc32ChecksumAlgorithmFunction();
        case exports.ChecksumAlgorithm.CRC32C:
          return checksumAlgorithms?.CRC32C ?? crc32c.AwsCrc32c;
        case exports.ChecksumAlgorithm.CRC64NVME:
          if (typeof crc64Nvme.crc64NvmeCrtContainer.CrtCrc64Nvme !== "function") {
            return checksumAlgorithms?.CRC64NVME ?? crc64Nvme.Crc64Nvme;
          }
          return checksumAlgorithms?.CRC64NVME ?? crc64Nvme.crc64NvmeCrtContainer.CrtCrc64Nvme;
        case exports.ChecksumAlgorithm.SHA1:
          return checksumAlgorithms?.SHA1 ?? config.sha1;
        case exports.ChecksumAlgorithm.SHA256:
          return checksumAlgorithms?.SHA256 ?? config.sha256;
        default:
          if (checksumAlgorithms?.[checksumAlgorithm]) {
            return checksumAlgorithms[checksumAlgorithm];
          }
          throw new Error(`The checksum algorithm "${checksumAlgorithm}" is not supported by the client. Select one of ${CLIENT_SUPPORTED_ALGORITHMS}, or provide an implementation to  the client constructor checksums field.`);
      }
    }, "selectChecksumAlgorithmFunction");
    var stringHasher = /* @__PURE__ */ __name((checksumAlgorithmFn, body) => {
      const hash = new checksumAlgorithmFn();
      hash.update(utilUtf8.toUint8Array(body || ""));
      return hash.digest();
    }, "stringHasher");
    var flexibleChecksumsMiddlewareOptions = {
      name: "flexibleChecksumsMiddleware",
      step: "build",
      tags: ["BODY_CHECKSUM"],
      override: true
    };
    var flexibleChecksumsMiddleware = /* @__PURE__ */ __name((config, middlewareConfig) => (next, context) => async (args) => {
      if (!protocolHttp.HttpRequest.isInstance(args.request)) {
        return next(args);
      }
      if (hasHeaderWithPrefix("x-amz-checksum-", args.request.headers)) {
        return next(args);
      }
      const { request, input } = args;
      const { body: requestBody, headers } = request;
      const { base64Encoder, streamHasher } = config;
      const { requestChecksumRequired, requestAlgorithmMember } = middlewareConfig;
      const requestChecksumCalculation = await config.requestChecksumCalculation();
      const requestAlgorithmMemberName = requestAlgorithmMember?.name;
      const requestAlgorithmMemberHttpHeader = requestAlgorithmMember?.httpHeader;
      if (requestAlgorithmMemberName && !input[requestAlgorithmMemberName]) {
        if (requestChecksumCalculation === RequestChecksumCalculation.WHEN_SUPPORTED || requestChecksumRequired) {
          input[requestAlgorithmMemberName] = DEFAULT_CHECKSUM_ALGORITHM;
          if (requestAlgorithmMemberHttpHeader) {
            headers[requestAlgorithmMemberHttpHeader] = DEFAULT_CHECKSUM_ALGORITHM;
          }
        }
      }
      const checksumAlgorithm = getChecksumAlgorithmForRequest(input, {
        requestChecksumRequired,
        requestAlgorithmMember: requestAlgorithmMember?.name,
        requestChecksumCalculation
      });
      let updatedBody = requestBody;
      let updatedHeaders = headers;
      if (checksumAlgorithm) {
        switch (checksumAlgorithm) {
          case exports.ChecksumAlgorithm.CRC32:
            client.setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_CRC32", "U");
            break;
          case exports.ChecksumAlgorithm.CRC32C:
            client.setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_CRC32C", "V");
            break;
          case exports.ChecksumAlgorithm.CRC64NVME:
            client.setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_CRC64", "W");
            break;
          case exports.ChecksumAlgorithm.SHA1:
            client.setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_SHA1", "X");
            break;
          case exports.ChecksumAlgorithm.SHA256:
            client.setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_SHA256", "Y");
            break;
        }
        const checksumLocationName = getChecksumLocationName(checksumAlgorithm);
        const checksumAlgorithmFn = selectChecksumAlgorithmFunction(checksumAlgorithm, config);
        if (isStreaming(requestBody)) {
          const { getAwsChunkedEncodingStream, bodyLengthChecker } = config;
          updatedBody = getAwsChunkedEncodingStream(typeof config.requestStreamBufferSize === "number" && config.requestStreamBufferSize >= 8 * 1024 ? utilStream.createBufferedReadable(requestBody, config.requestStreamBufferSize, context.logger) : requestBody, {
            base64Encoder,
            bodyLengthChecker,
            checksumLocationName,
            checksumAlgorithmFn,
            streamHasher
          });
          updatedHeaders = {
            ...headers,
            "content-encoding": headers["content-encoding"] ? `${headers["content-encoding"]},aws-chunked` : "aws-chunked",
            "transfer-encoding": "chunked",
            "x-amz-decoded-content-length": headers["content-length"],
            "x-amz-content-sha256": "STREAMING-UNSIGNED-PAYLOAD-TRAILER",
            "x-amz-trailer": checksumLocationName
          };
          delete updatedHeaders["content-length"];
        } else if (!hasHeader(checksumLocationName, headers)) {
          const rawChecksum = await stringHasher(checksumAlgorithmFn, requestBody);
          updatedHeaders = {
            ...headers,
            [checksumLocationName]: base64Encoder(rawChecksum)
          };
        }
      }
      try {
        const result = await next({
          ...args,
          request: {
            ...request,
            headers: updatedHeaders,
            body: updatedBody
          }
        });
        return result;
      } catch (e) {
        if (e instanceof Error && e.name === "InvalidChunkSizeError") {
          try {
            if (!e.message.endsWith(".")) {
              e.message += ".";
            }
            e.message += " Set [requestStreamBufferSize=number e.g. 65_536] in client constructor to instruct AWS SDK to buffer your input stream.";
          } catch (ignored) {
          }
        }
        throw e;
      }
    }, "flexibleChecksumsMiddleware");
    var flexibleChecksumsInputMiddlewareOptions = {
      name: "flexibleChecksumsInputMiddleware",
      toMiddleware: "serializerMiddleware",
      relation: "before",
      tags: ["BODY_CHECKSUM"],
      override: true
    };
    var flexibleChecksumsInputMiddleware = /* @__PURE__ */ __name((config, middlewareConfig) => (next, context) => async (args) => {
      const input = args.input;
      const { requestValidationModeMember } = middlewareConfig;
      const requestChecksumCalculation = await config.requestChecksumCalculation();
      const responseChecksumValidation = await config.responseChecksumValidation();
      switch (requestChecksumCalculation) {
        case RequestChecksumCalculation.WHEN_REQUIRED:
          client.setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_WHEN_REQUIRED", "a");
          break;
        case RequestChecksumCalculation.WHEN_SUPPORTED:
          client.setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_WHEN_SUPPORTED", "Z");
          break;
      }
      switch (responseChecksumValidation) {
        case ResponseChecksumValidation.WHEN_REQUIRED:
          client.setFeature(context, "FLEXIBLE_CHECKSUMS_RES_WHEN_REQUIRED", "c");
          break;
        case ResponseChecksumValidation.WHEN_SUPPORTED:
          client.setFeature(context, "FLEXIBLE_CHECKSUMS_RES_WHEN_SUPPORTED", "b");
          break;
      }
      if (requestValidationModeMember && !input[requestValidationModeMember]) {
        if (responseChecksumValidation === ResponseChecksumValidation.WHEN_SUPPORTED) {
          input[requestValidationModeMember] = "ENABLED";
        }
      }
      return next(args);
    }, "flexibleChecksumsInputMiddleware");
    var getChecksumAlgorithmListForResponse = /* @__PURE__ */ __name((responseAlgorithms = []) => {
      const validChecksumAlgorithms = [];
      let i = PRIORITY_ORDER_ALGORITHMS.length;
      for (const algorithm of responseAlgorithms) {
        const priority = PRIORITY_ORDER_ALGORITHMS.indexOf(algorithm);
        if (priority !== -1) {
          validChecksumAlgorithms[priority] = algorithm;
        } else {
          validChecksumAlgorithms[i++] = algorithm;
        }
      }
      return validChecksumAlgorithms.filter(Boolean);
    }, "getChecksumAlgorithmListForResponse");
    var isChecksumWithPartNumber = /* @__PURE__ */ __name((checksum) => {
      const lastHyphenIndex = checksum.lastIndexOf("-");
      if (lastHyphenIndex !== -1) {
        const numberPart = checksum.slice(lastHyphenIndex + 1);
        if (!numberPart.startsWith("0")) {
          const number = parseInt(numberPart, 10);
          if (!isNaN(number) && number >= 1 && number <= 1e4) {
            return true;
          }
        }
      }
      return false;
    }, "isChecksumWithPartNumber");
    var getChecksum = /* @__PURE__ */ __name(async (body, { checksumAlgorithmFn, base64Encoder }) => base64Encoder(await stringHasher(checksumAlgorithmFn, body)), "getChecksum");
    var validateChecksumFromResponse = /* @__PURE__ */ __name(async (response, { config, responseAlgorithms, logger }) => {
      const checksumAlgorithms = getChecksumAlgorithmListForResponse(responseAlgorithms);
      const { body: responseBody, headers: responseHeaders } = response;
      for (const algorithm of checksumAlgorithms) {
        const responseHeader = getChecksumLocationName(algorithm);
        const checksumFromResponse = responseHeaders[responseHeader];
        if (checksumFromResponse) {
          let checksumAlgorithmFn;
          try {
            checksumAlgorithmFn = selectChecksumAlgorithmFunction(algorithm, config);
          } catch (error) {
            if (algorithm === exports.ChecksumAlgorithm.CRC64NVME) {
              logger?.warn(`Skipping ${exports.ChecksumAlgorithm.CRC64NVME} checksum validation: ${error.message}`);
              continue;
            }
            throw error;
          }
          const { base64Encoder } = config;
          if (isStreaming(responseBody)) {
            response.body = utilStream.createChecksumStream({
              expectedChecksum: checksumFromResponse,
              checksumSourceLocation: responseHeader,
              checksum: new checksumAlgorithmFn(),
              source: responseBody,
              base64Encoder
            });
            return;
          }
          const checksum = await getChecksum(responseBody, { checksumAlgorithmFn, base64Encoder });
          if (checksum === checksumFromResponse) {
            break;
          }
          throw new Error(`Checksum mismatch: expected "${checksum}" but received "${checksumFromResponse}" in response header "${responseHeader}".`);
        }
      }
    }, "validateChecksumFromResponse");
    var flexibleChecksumsResponseMiddlewareOptions = {
      name: "flexibleChecksumsResponseMiddleware",
      toMiddleware: "deserializerMiddleware",
      relation: "after",
      tags: ["BODY_CHECKSUM"],
      override: true
    };
    var flexibleChecksumsResponseMiddleware = /* @__PURE__ */ __name((config, middlewareConfig) => (next, context) => async (args) => {
      if (!protocolHttp.HttpRequest.isInstance(args.request)) {
        return next(args);
      }
      const input = args.input;
      const result = await next(args);
      const response = result.response;
      const { requestValidationModeMember, responseAlgorithms } = middlewareConfig;
      if (requestValidationModeMember && input[requestValidationModeMember] === "ENABLED") {
        const { clientName, commandName } = context;
        const customChecksumAlgorithms = Object.keys(config.checksumAlgorithms ?? {}).filter((algorithm) => {
          const responseHeader = getChecksumLocationName(algorithm);
          return response.headers[responseHeader] !== void 0;
        });
        const algoList = getChecksumAlgorithmListForResponse([
          ...responseAlgorithms ?? [],
          ...customChecksumAlgorithms
        ]);
        const isS3WholeObjectMultipartGetResponseChecksum = clientName === "S3Client" && commandName === "GetObjectCommand" && algoList.every((algorithm) => {
          const responseHeader = getChecksumLocationName(algorithm);
          const checksumFromResponse = response.headers[responseHeader];
          return !checksumFromResponse || isChecksumWithPartNumber(checksumFromResponse);
        });
        if (isS3WholeObjectMultipartGetResponseChecksum) {
          return result;
        }
        await validateChecksumFromResponse(response, {
          config,
          responseAlgorithms: algoList,
          logger: context.logger
        });
      }
      return result;
    }, "flexibleChecksumsResponseMiddleware");
    var getFlexibleChecksumsPlugin = /* @__PURE__ */ __name((config, middlewareConfig) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(flexibleChecksumsMiddleware(config, middlewareConfig), flexibleChecksumsMiddlewareOptions);
        clientStack.addRelativeTo(flexibleChecksumsInputMiddleware(config, middlewareConfig), flexibleChecksumsInputMiddlewareOptions);
        clientStack.addRelativeTo(flexibleChecksumsResponseMiddleware(config, middlewareConfig), flexibleChecksumsResponseMiddlewareOptions);
      }, "applyToStack")
    }), "getFlexibleChecksumsPlugin");
    var resolveFlexibleChecksumsConfig = /* @__PURE__ */ __name((input) => {
      const { requestChecksumCalculation, responseChecksumValidation, requestStreamBufferSize } = input;
      return Object.assign(input, {
        requestChecksumCalculation: utilMiddleware.normalizeProvider(requestChecksumCalculation ?? DEFAULT_REQUEST_CHECKSUM_CALCULATION),
        responseChecksumValidation: utilMiddleware.normalizeProvider(responseChecksumValidation ?? DEFAULT_RESPONSE_CHECKSUM_VALIDATION),
        requestStreamBufferSize: Number(requestStreamBufferSize ?? 0),
        checksumAlgorithms: input.checksumAlgorithms ?? {}
      });
    }, "resolveFlexibleChecksumsConfig");
    exports.CONFIG_REQUEST_CHECKSUM_CALCULATION = CONFIG_REQUEST_CHECKSUM_CALCULATION;
    exports.CONFIG_RESPONSE_CHECKSUM_VALIDATION = CONFIG_RESPONSE_CHECKSUM_VALIDATION;
    exports.DEFAULT_CHECKSUM_ALGORITHM = DEFAULT_CHECKSUM_ALGORITHM;
    exports.DEFAULT_REQUEST_CHECKSUM_CALCULATION = DEFAULT_REQUEST_CHECKSUM_CALCULATION;
    exports.DEFAULT_RESPONSE_CHECKSUM_VALIDATION = DEFAULT_RESPONSE_CHECKSUM_VALIDATION;
    exports.ENV_REQUEST_CHECKSUM_CALCULATION = ENV_REQUEST_CHECKSUM_CALCULATION;
    exports.ENV_RESPONSE_CHECKSUM_VALIDATION = ENV_RESPONSE_CHECKSUM_VALIDATION;
    exports.NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS = NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS;
    exports.NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS = NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS;
    exports.RequestChecksumCalculation = RequestChecksumCalculation;
    exports.ResponseChecksumValidation = ResponseChecksumValidation;
    exports.flexibleChecksumsMiddleware = flexibleChecksumsMiddleware;
    exports.flexibleChecksumsMiddlewareOptions = flexibleChecksumsMiddlewareOptions;
    exports.getFlexibleChecksumsPlugin = getFlexibleChecksumsPlugin;
    exports.resolveFlexibleChecksumsConfig = resolveFlexibleChecksumsConfig;
  }
});

// node_modules/@smithy/eventstream-serde-config-resolver/dist-cjs/index.js
var require_dist_cjs42 = __commonJS({
  "node_modules/@smithy/eventstream-serde-config-resolver/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var resolveEventStreamSerdeConfig = /* @__PURE__ */ __name((input) => Object.assign(input, {
      eventStreamMarshaller: input.eventStreamSerdeProvider(input)
    }), "resolveEventStreamSerdeConfig");
    exports.resolveEventStreamSerdeConfig = resolveEventStreamSerdeConfig;
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/endpoint/bdd.js
var require_bdd = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/endpoint/bdd.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.bdd = void 0;
    var util_endpoints_1 = require_dist_cjs19();
    var av = "ref";
    var aw = "argv";
    var ax = "backend";
    var ay = "authSchemes";
    var az = "disableDoubleEncoding";
    var aA = "signingName";
    var aB = "signingRegion";
    var aC = "signingRegionSet";
    var a = -1;
    var b = true;
    var c = false;
    var d = "isSet";
    var e = "booleanEquals";
    var f = "stringEquals";
    var g = "coalesce";
    var h = "substring";
    var i = "";
    var j = "aws.partition";
    var k = "partitionResult";
    var l = "accessPointSuffix";
    var m = "regionPrefix";
    var n = /* @__PURE__ */ __name((n2) => "outpostId_ssa_" + n2 + i, "n");
    var o = "hardwareType";
    var p = "ite";
    var q = "isValidHostLabel";
    var s = "sigv4";
    var t = "aws.isVirtualHostableS3Bucket";
    var u = "url";
    var v = "getAttr";
    var w = "bucketArn";
    var x = "--";
    var y = "arnType";
    var z = "accesspoint";
    var A = /* @__PURE__ */ __name((n2) => "accessPointName_ssa_" + n2 + i, "A");
    var B = "s3-object-lambda";
    var C = "s3-outposts";
    var D = "bucketPartition";
    var E = "us-east-1";
    var F = "outpostType";
    var G = "name";
    var H = "s3";
    var I = "{url#scheme}://{Bucket}.{url#authority}{url#path}";
    var J = "{url#scheme}://{url#authority}{url#path}";
    var K = "{url#scheme}://{url#authority}{url#normalizedPath}{Bucket}";
    var L = "https://{Bucket}.s3-accelerate.{partitionResult#dnsSuffix}";
    var M = "https://{Bucket}.s3.{partitionResult#dnsSuffix}";
    var N = /* @__PURE__ */ __name((n2) => "{url#scheme}://{accessPointName_ssa_" + n2 + "}-{bucketArn#accountId}.{url#authority}{url#path}", "N");
    var O = "sigv4a";
    var P = "{url#scheme}://{url#authority}{url#normalizedPath}{uri_encoded_bucket}";
    var Q = "https://s3.{partitionResult#dnsSuffix}/{uri_encoded_bucket}";
    var R = "https://s3.{partitionResult#dnsSuffix}";
    var S = { [av]: "UseFIPS" };
    var T = { [av]: "UseDualStack" };
    var U = { [av]: "Bucket" };
    var V = { "fn": v, [aw]: [{ [av]: k }, G] };
    var W = { [av]: u };
    var X = { [av]: "Region" };
    var Y = { [av]: w };
    var Z = { [av]: y };
    var aa = { [av]: "accessPointName_ssa_1" };
    var ab = { "fn": v, [aw]: [Y, "region"] };
    var ac = { [av]: o };
    var ad = { "fn": v, [aw]: [Y, "service"] };
    var ae = { "fn": v, [aw]: [Y, "accountId"] };
    var af = { [ax]: "S3Express", [ay]: [{ [az]: true, [G]: "{_s3e_auth}", [aA]: "s3express", [aB]: "{Region}" }] };
    var ag = { [ax]: "S3Express", [ay]: [{ [az]: true, [G]: s, [aA]: "s3express", [aB]: "{Region}" }] };
    var ah = { [ay]: [{ [az]: true, [G]: O, [aA]: C, [aC]: ["*"] }, { [az]: true, [G]: s, [aA]: C, [aB]: "{Region}" }] };
    var ai = { [ay]: [{ [az]: true, [G]: s, [aA]: H, [aB]: E }] };
    var aj = { [ay]: [{ [az]: true, [G]: s, [aA]: H, [aB]: "{Region}" }] };
    var ak = { [ay]: [{ [az]: true, [G]: s, [aA]: B, [aB]: "{bucketArn#region}" }] };
    var al = { [ay]: [{ [az]: true, [G]: s, [aA]: H, [aB]: "{bucketArn#region}" }] };
    var am = { [ay]: [{ [az]: true, [G]: O, [aA]: C, [aC]: ["*"] }, { [az]: true, [G]: s, [aA]: C, [aB]: "{bucketArn#region}" }] };
    var an = { [ay]: [{ [az]: true, [G]: s, [aA]: B, [aB]: "{Region}" }] };
    var ao = [X];
    var ap = [{ [av]: "Endpoint" }];
    var aq = [U];
    var as = [U, 0, 7, true];
    var at = [Y, "resourceId[1]"];
    var au = ["*"];
    var _data = {
      conditions: [
        [d, ao],
        [e, [{ [av]: "Accelerate" }, b]],
        [e, [S, b]],
        [e, [T, b]],
        [d, ap],
        [d, aq],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 0, 6, b] }, i] }, "--x-s3"]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: as }, i] }, "--xa-s3"]],
        [j, ao, k],
        [h, as, l],
        [f, [{ [av]: l }, "--op-s3"]],
        [h, [U, 8, 12, b], m],
        [h, [U, 32, 49, b], n(2)],
        [h, [U, 49, 50, b], o],
        [e, [{ [av]: "ForcePathStyle" }, b]],
        [f, [V, "aws-cn"]],
        [p, [T, ".dualstack", i], "_s3e_ds"],
        [q, [{ [av]: n(2) }, c]],
        [p, [S, "-fips", i], "_s3e_fips"],
        [p, [{ fn: g, [aw]: [{ [av]: "DisableS3ExpressSessionAuth" }, c] }, s, "sigv4-s3express"], "_s3e_auth"],
        [t, [U, c]],
        ["parseURL", ap, u],
        [e, [{ fn: g, [aw]: [{ [av]: "UseS3ExpressControlEndpoint" }, c] }, b]],
        [t, [U, b]],
        [f, [{ fn: v, [aw]: [W, "scheme"] }, "http"]],
        [q, [X, c]],
        ["aws.parseArn", aq, w],
        [v, [{ fn: "split", [aw]: [U, x, 0] }, "[-2]"], "s3expressAvailabilityZoneId"],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 0, 4, c] }, i] }, "arn:"]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 16, 18, b] }, i] }, x]],
        [e, [{ fn: v, [aw]: [W, "isIp"] }, b]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 21, 23, b] }, i] }, x]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 27, 29, b] }, i] }, x]],
        [f, [{ [av]: m }, "beta"]],
        ["uriEncode", aq, "uri_encoded_bucket"],
        [q, [X, b]],
        [e, [{ fn: g, [aw]: [{ [av]: "UseObjectLambdaEndpoint" }, c] }, b]],
        [v, [Y, "resourceId[0]"], y],
        [f, [Z, i]],
        [f, [Z, z]],
        [v, at, A(1)],
        [f, [aa, i]],
        [f, [ab, i]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 14, 16, b] }, i] }, x]],
        [f, [ac, "e"]],
        [f, [ac, "o"]],
        [f, [X, "aws-global"]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 19, 21, b] }, i] }, x]],
        [f, [ad, B]],
        [e, [{ fn: g, [aw]: [{ [av]: "DisableAccessPoints" }, c] }, b]],
        [f, [ad, C]],
        [j, [ab], D],
        [q, [aa, b]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 26, 28, b] }, i] }, x]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 15, 17, b] }, i] }, x]],
        [v, [Y, "resourceId[4]"]],
        [f, [{ fn: g, [aw]: [{ fn: h, [aw]: [U, 20, 22, b] }, i] }, x]],
        [e, [{ [av]: "UseGlobalEndpoint" }, b]],
        [f, [X, E]],
        [v, at, n(1)],
        [e, [{ fn: g, [aw]: [{ [av]: "UseArnRegion" }, b] }, b]],
        [q, [{ [av]: n(1) }, c]],
        [v, [Y, "resourceId[2]"], F],
        [f, [X, ab]],
        [f, [{ fn: v, [aw]: [{ [av]: D }, G] }, V]],
        [e, [{ [av]: "DisableMultiRegionAccessPoints" }, b]],
        [q, [ab, b]],
        [f, [{ fn: v, [aw]: [Y, "partition"] }, V]],
        [f, [ae, i]],
        [f, [ad, H]],
        [q, [ae, c]],
        [v, [Y, "resourceId[3]"], A(2)],
        [q, [aa, c]],
        [f, [{ [av]: F }, z]]
      ],
      results: [
        [a],
        [a, "Accelerate cannot be used with FIPS"],
        [a, "Cannot set dual-stack in combination with a custom endpoint."],
        [a, "A custom endpoint cannot be combined with FIPS"],
        [a, "A custom endpoint cannot be combined with S3 Accelerate"],
        [a, "Partition does not support FIPS"],
        [a, "S3Express does not support S3 Accelerate."],
        ["{url#scheme}://{url#authority}/{uri_encoded_bucket}{url#path}", af],
        [I, af],
        [a, "S3Express bucket name is not a valid virtual hostable name."],
        ["https://s3express-control{_s3e_fips}{_s3e_ds}.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}", ag],
        ["https://{Bucket}.s3express{_s3e_fips}-{s3expressAvailabilityZoneId}{_s3e_ds}.{Region}.{partitionResult#dnsSuffix}", af],
        [a, "Unrecognized S3Express bucket name format."],
        [J, af],
        ["https://s3express-control{_s3e_fips}{_s3e_ds}.{Region}.{partitionResult#dnsSuffix}", ag],
        [a, "Expected a endpoint to be specified but no endpoint was found"],
        ["https://{Bucket}.ec2.{url#authority}", ah],
        ["https://{Bucket}.ec2.s3-outposts.{Region}.{partitionResult#dnsSuffix}", ah],
        ["https://{Bucket}.op-{outpostId_ssa_2}.{url#authority}", ah],
        ["https://{Bucket}.op-{outpostId_ssa_2}.s3-outposts.{Region}.{partitionResult#dnsSuffix}", ah],
        [a, 'Unrecognized hardware type: "Expected hardware type o or e but got {hardwareType}"'],
        [a, "Invalid Outposts Bucket alias - it must be a valid bucket name."],
        [a, "Invalid ARN: The outpost Id must only contain a-z, A-Z, 0-9 and `-`."],
        [a, "Custom endpoint `{Endpoint}` was not a valid URI"],
        [a, "S3 Accelerate cannot be used in this region"],
        ["https://{Bucket}.s3-fips.dualstack.us-east-1.{partitionResult#dnsSuffix}", ai],
        ["https://{Bucket}.s3-fips.dualstack.{Region}.{partitionResult#dnsSuffix}", aj],
        ["https://{Bucket}.s3-fips.us-east-1.{partitionResult#dnsSuffix}", ai],
        ["https://{Bucket}.s3-fips.{Region}.{partitionResult#dnsSuffix}", aj],
        ["https://{Bucket}.s3-accelerate.dualstack.us-east-1.{partitionResult#dnsSuffix}", ai],
        ["https://{Bucket}.s3-accelerate.dualstack.{partitionResult#dnsSuffix}", aj],
        ["https://{Bucket}.s3.dualstack.us-east-1.{partitionResult#dnsSuffix}", ai],
        ["https://{Bucket}.s3.dualstack.{Region}.{partitionResult#dnsSuffix}", aj],
        [K, ai],
        [I, ai],
        [K, aj],
        [I, aj],
        [L, ai],
        [L, aj],
        [M, ai],
        [M, aj],
        ["https://{Bucket}.s3.{Region}.{partitionResult#dnsSuffix}", aj],
        [a, "Invalid region: region was not a valid DNS name."],
        [a, "S3 Object Lambda does not support Dual-stack"],
        [a, "S3 Object Lambda does not support S3 Accelerate"],
        [a, "Access points are not supported for this operation"],
        [a, "Invalid configuration: region from ARN `{bucketArn#region}` does not match client region `{Region}` and UseArnRegion is `false`"],
        [a, "Invalid ARN: Missing account id"],
        [N(1), ak],
        ["https://{accessPointName_ssa_1}-{bucketArn#accountId}.s3-object-lambda-fips.{bucketArn#region}.{bucketPartition#dnsSuffix}", ak],
        ["https://{accessPointName_ssa_1}-{bucketArn#accountId}.s3-object-lambda.{bucketArn#region}.{bucketPartition#dnsSuffix}", ak],
        [a, "Invalid ARN: The access point name may only contain a-z, A-Z, 0-9 and `-`. Found: `{accessPointName_ssa_1}`"],
        [a, "Invalid ARN: The account id may only contain a-z, A-Z, 0-9 and `-`. Found: `{bucketArn#accountId}`"],
        [a, "Invalid region in ARN: `{bucketArn#region}` (invalid DNS name)"],
        [a, "Client was configured for partition `{partitionResult#name}` but ARN (`{Bucket}`) has `{bucketPartition#name}`"],
        [a, "Invalid ARN: The ARN may only contain a single resource component after `accesspoint`."],
        [a, "Invalid ARN: bucket ARN is missing a region"],
        [a, "Invalid ARN: Expected a resource of the format `accesspoint:<accesspoint name>` but no name was provided"],
        [a, "Invalid ARN: Object Lambda ARNs only support `accesspoint` arn types, but found: `{arnType}`"],
        [a, "Access Points do not support S3 Accelerate"],
        ["https://{accessPointName_ssa_1}-{bucketArn#accountId}.s3-accesspoint-fips.dualstack.{bucketArn#region}.{bucketPartition#dnsSuffix}", al],
        ["https://{accessPointName_ssa_1}-{bucketArn#accountId}.s3-accesspoint-fips.{bucketArn#region}.{bucketPartition#dnsSuffix}", al],
        ["https://{accessPointName_ssa_1}-{bucketArn#accountId}.s3-accesspoint.dualstack.{bucketArn#region}.{bucketPartition#dnsSuffix}", al],
        [N(1), al],
        ["https://{accessPointName_ssa_1}-{bucketArn#accountId}.s3-accesspoint.{bucketArn#region}.{bucketPartition#dnsSuffix}", al],
        [a, "Invalid ARN: The ARN was not for the S3 service, found: {bucketArn#service}"],
        [a, "S3 MRAP does not support dual-stack"],
        [a, "S3 MRAP does not support FIPS"],
        [a, "S3 MRAP does not support S3 Accelerate"],
        [a, "Invalid configuration: Multi-Region Access Point ARNs are disabled."],
        ["https://{accessPointName_ssa_1}.accesspoint.s3-global.{partitionResult#dnsSuffix}", { [ay]: [{ [az]: b, name: O, [aA]: H, [aC]: au }] }],
        [a, "Client was configured for partition `{partitionResult#name}` but bucket referred to partition `{bucketArn#partition}`"],
        [a, "Invalid Access Point Name"],
        [a, "S3 Outposts does not support Dual-stack"],
        [a, "S3 Outposts does not support FIPS"],
        [a, "S3 Outposts does not support S3 Accelerate"],
        [a, "Invalid Arn: Outpost Access Point ARN contains sub resources"],
        ["https://{accessPointName_ssa_2}-{bucketArn#accountId}.{outpostId_ssa_1}.{url#authority}", am],
        ["https://{accessPointName_ssa_2}-{bucketArn#accountId}.{outpostId_ssa_1}.s3-outposts.{bucketArn#region}.{bucketPartition#dnsSuffix}", am],
        [a, "Expected an outpost type `accesspoint`, found {outpostType}"],
        [a, "Invalid ARN: expected an access point name"],
        [a, "Invalid ARN: Expected a 4-component resource"],
        [a, "Invalid ARN: The outpost Id may only contain a-z, A-Z, 0-9 and `-`. Found: `{outpostId_ssa_1}`"],
        [a, "Invalid ARN: The Outpost Id was not set"],
        [a, "Invalid ARN: Unrecognized format: {Bucket} (type: {arnType})"],
        [a, "Invalid ARN: No ARN type specified"],
        [a, "Invalid ARN: `{Bucket}` was not a valid ARN"],
        [a, "Path-style addressing cannot be used with ARN buckets"],
        ["https://s3-fips.dualstack.us-east-1.{partitionResult#dnsSuffix}/{uri_encoded_bucket}", ai],
        ["https://s3-fips.dualstack.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}", aj],
        ["https://s3-fips.us-east-1.{partitionResult#dnsSuffix}/{uri_encoded_bucket}", ai],
        ["https://s3-fips.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}", aj],
        ["https://s3.dualstack.us-east-1.{partitionResult#dnsSuffix}/{uri_encoded_bucket}", ai],
        ["https://s3.dualstack.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}", aj],
        [P, ai],
        [P, aj],
        [Q, ai],
        [Q, aj],
        ["https://s3.{Region}.{partitionResult#dnsSuffix}/{uri_encoded_bucket}", aj],
        [a, "Path-style addressing cannot be used with S3 Accelerate"],
        [J, an],
        ["https://s3-object-lambda-fips.{Region}.{partitionResult#dnsSuffix}", an],
        ["https://s3-object-lambda.{Region}.{partitionResult#dnsSuffix}", an],
        ["https://s3-fips.dualstack.us-east-1.{partitionResult#dnsSuffix}", ai],
        ["https://s3-fips.dualstack.{Region}.{partitionResult#dnsSuffix}", aj],
        ["https://s3-fips.us-east-1.{partitionResult#dnsSuffix}", ai],
        ["https://s3-fips.{Region}.{partitionResult#dnsSuffix}", aj],
        ["https://s3.dualstack.us-east-1.{partitionResult#dnsSuffix}", ai],
        ["https://s3.dualstack.{Region}.{partitionResult#dnsSuffix}", aj],
        [J, ai],
        [J, aj],
        [R, ai],
        [R, aj],
        ["https://s3.{Region}.{partitionResult#dnsSuffix}", aj],
        [a, "A region must be set when sending requests to S3."]
      ]
    };
    var root = 2;
    var r = 1e8;
    var nodes = new Int32Array([
      -1,
      1,
      -1,
      0,
      3,
      r + 114,
      1,
      422,
      4,
      2,
      270,
      5,
      3,
      231,
      6,
      4,
      84,
      7,
      5,
      15,
      8,
      8,
      9,
      r + 114,
      16,
      10,
      13,
      18,
      11,
      13,
      19,
      12,
      13,
      22,
      r + 14,
      13,
      35,
      14,
      r + 42,
      36,
      r + 102,
      433,
      6,
      269,
      16,
      7,
      268,
      17,
      8,
      19,
      18,
      14,
      499,
      105,
      9,
      20,
      24,
      10,
      21,
      24,
      11,
      22,
      24,
      12,
      23,
      24,
      13,
      545,
      24,
      14,
      76,
      25,
      20,
      72,
      26,
      26,
      27,
      77,
      37,
      28,
      r + 85,
      38,
      r + 85,
      29,
      39,
      46,
      30,
      48,
      r + 58,
      31,
      50,
      32,
      r + 84,
      51,
      33,
      135,
      55,
      r + 76,
      34,
      59,
      35,
      r + 83,
      60,
      39,
      36,
      61,
      37,
      r + 82,
      62,
      38,
      145,
      63,
      41,
      r + 46,
      61,
      40,
      r + 82,
      62,
      41,
      149,
      64,
      42,
      r + 54,
      66,
      43,
      r + 53,
      70,
      44,
      r + 52,
      71,
      45,
      r + 80,
      73,
      r + 78,
      r + 79,
      40,
      47,
      r + 57,
      41,
      r + 57,
      48,
      42,
      183,
      49,
      48,
      61,
      50,
      49,
      r + 45,
      51,
      51,
      52,
      524,
      60,
      55,
      53,
      62,
      r + 55,
      54,
      63,
      56,
      r + 46,
      62,
      r + 55,
      56,
      64,
      57,
      r + 54,
      66,
      58,
      r + 53,
      69,
      59,
      r + 65,
      70,
      60,
      r + 52,
      72,
      r + 64,
      r + 51,
      49,
      r + 45,
      62,
      51,
      63,
      524,
      60,
      66,
      64,
      62,
      r + 55,
      65,
      63,
      67,
      r + 46,
      62,
      r + 55,
      67,
      64,
      68,
      r + 54,
      66,
      69,
      r + 53,
      68,
      r + 47,
      70,
      70,
      71,
      r + 52,
      72,
      r + 50,
      r + 51,
      25,
      73,
      r + 42,
      46,
      r + 39,
      74,
      57,
      75,
      r + 41,
      58,
      r + 40,
      r + 41,
      26,
      r + 87,
      77,
      28,
      r + 86,
      78,
      34,
      81,
      79,
      35,
      80,
      543,
      36,
      r + 102,
      r + 114,
      46,
      r + 96,
      82,
      57,
      83,
      r + 98,
      58,
      r + 97,
      r + 98,
      5,
      100,
      85,
      8,
      86,
      r + 114,
      16,
      87,
      88,
      18,
      90,
      88,
      19,
      89,
      91,
      21,
      96,
      94,
      19,
      92,
      91,
      21,
      97,
      94,
      21,
      96,
      93,
      22,
      r + 14,
      94,
      35,
      95,
      r + 42,
      36,
      r + 102,
      r + 42,
      22,
      r + 13,
      97,
      35,
      98,
      r + 42,
      36,
      r + 100,
      99,
      46,
      r + 109,
      r + 110,
      6,
      212,
      101,
      7,
      206,
      102,
      8,
      118,
      103,
      14,
      117,
      104,
      21,
      105,
      r + 23,
      26,
      106,
      500,
      37,
      107,
      r + 85,
      38,
      r + 85,
      108,
      39,
      111,
      109,
      48,
      r + 58,
      110,
      50,
      135,
      r + 84,
      40,
      112,
      r + 57,
      41,
      r + 57,
      113,
      42,
      114,
      498,
      48,
      r + 56,
      115,
      52,
      116,
      r + 72,
      65,
      r + 69,
      r + 72,
      21,
      499,
      r + 23,
      9,
      119,
      123,
      10,
      120,
      123,
      11,
      121,
      123,
      12,
      122,
      123,
      13,
      200,
      123,
      14,
      193,
      124,
      20,
      188,
      125,
      21,
      126,
      r + 23,
      23,
      127,
      128,
      24,
      187,
      128,
      26,
      129,
      195,
      37,
      130,
      r + 85,
      38,
      r + 85,
      131,
      39,
      157,
      132,
      48,
      r + 58,
      133,
      50,
      134,
      r + 84,
      51,
      140,
      135,
      55,
      r + 76,
      136,
      59,
      137,
      r + 83,
      60,
      r + 82,
      138,
      61,
      139,
      r + 82,
      63,
      r + 82,
      r + 46,
      55,
      r + 76,
      141,
      59,
      142,
      r + 83,
      60,
      147,
      143,
      61,
      144,
      r + 82,
      62,
      146,
      145,
      63,
      149,
      r + 46,
      63,
      152,
      r + 46,
      61,
      148,
      r + 82,
      62,
      152,
      149,
      64,
      150,
      r + 54,
      66,
      151,
      r + 53,
      70,
      r + 81,
      r + 52,
      64,
      153,
      r + 54,
      66,
      154,
      r + 53,
      70,
      155,
      r + 52,
      71,
      156,
      r + 80,
      73,
      r + 77,
      r + 79,
      40,
      158,
      r + 57,
      41,
      r + 57,
      159,
      42,
      183,
      160,
      48,
      172,
      161,
      49,
      r + 45,
      162,
      51,
      163,
      524,
      60,
      166,
      164,
      62,
      r + 55,
      165,
      63,
      167,
      r + 46,
      62,
      r + 55,
      167,
      64,
      168,
      r + 54,
      66,
      169,
      r + 53,
      69,
      170,
      r + 65,
      70,
      171,
      r + 52,
      72,
      r + 63,
      r + 51,
      49,
      r + 45,
      173,
      51,
      174,
      524,
      60,
      177,
      175,
      62,
      r + 55,
      176,
      63,
      178,
      r + 46,
      62,
      r + 55,
      178,
      64,
      179,
      r + 54,
      66,
      180,
      r + 53,
      68,
      r + 47,
      181,
      70,
      182,
      r + 52,
      72,
      r + 48,
      r + 51,
      48,
      r + 56,
      184,
      52,
      185,
      r + 72,
      65,
      r + 69,
      186,
      67,
      r + 70,
      r + 71,
      25,
      r + 36,
      r + 42,
      21,
      189,
      r + 23,
      25,
      190,
      r + 42,
      30,
      192,
      191,
      46,
      r + 34,
      r + 36,
      46,
      r + 33,
      r + 35,
      21,
      194,
      r + 23,
      26,
      r + 87,
      195,
      28,
      r + 86,
      196,
      34,
      199,
      197,
      35,
      198,
      543,
      36,
      r + 100,
      r + 114,
      46,
      r + 94,
      r + 95,
      17,
      201,
      r + 22,
      20,
      202,
      r + 21,
      21,
      203,
      548,
      33,
      204,
      548,
      44,
      r + 16,
      205,
      45,
      r + 18,
      r + 20,
      8,
      207,
      213,
      16,
      208,
      218,
      18,
      209,
      218,
      19,
      210,
      222,
      20,
      211,
      225,
      21,
      229,
      399,
      8,
      216,
      213,
      19,
      214,
      r + 9,
      20,
      215,
      225,
      21,
      229,
      r + 9,
      16,
      217,
      218,
      18,
      221,
      218,
      19,
      219,
      222,
      20,
      220,
      225,
      21,
      229,
      r + 12,
      19,
      224,
      222,
      20,
      223,
      r + 9,
      21,
      r + 9,
      r + 12,
      20,
      228,
      225,
      21,
      226,
      r + 9,
      30,
      227,
      r + 9,
      34,
      r + 7,
      r + 9,
      21,
      229,
      413,
      30,
      230,
      r + 8,
      34,
      r + 7,
      r + 8,
      4,
      r + 2,
      232,
      5,
      233,
      478,
      6,
      269,
      234,
      7,
      268,
      235,
      8,
      236,
      489,
      9,
      237,
      241,
      10,
      238,
      241,
      11,
      239,
      241,
      12,
      240,
      241,
      13,
      545,
      241,
      14,
      264,
      242,
      20,
      262,
      243,
      26,
      244,
      265,
      37,
      245,
      r + 85,
      38,
      r + 85,
      246,
      39,
      247,
      516,
      40,
      248,
      r + 57,
      41,
      r + 57,
      249,
      42,
      536,
      250,
      48,
      r + 43,
      251,
      49,
      r + 45,
      252,
      51,
      253,
      524,
      60,
      256,
      254,
      62,
      r + 55,
      255,
      63,
      257,
      r + 46,
      62,
      r + 55,
      257,
      64,
      258,
      r + 54,
      66,
      259,
      r + 53,
      69,
      260,
      r + 65,
      70,
      261,
      r + 52,
      72,
      r + 62,
      r + 51,
      25,
      263,
      r + 42,
      46,
      r + 31,
      r + 32,
      26,
      r + 87,
      265,
      28,
      r + 86,
      266,
      34,
      267,
      542,
      46,
      r + 92,
      r + 93,
      8,
      395,
      r + 9,
      8,
      405,
      r + 9,
      3,
      344,
      271,
      4,
      r + 3,
      272,
      5,
      282,
      273,
      8,
      274,
      r + 114,
      15,
      r + 5,
      275,
      16,
      276,
      279,
      18,
      277,
      279,
      19,
      278,
      279,
      22,
      r + 14,
      279,
      35,
      280,
      r + 42,
      36,
      r + 101,
      281,
      46,
      r + 105,
      r + 106,
      6,
      403,
      283,
      7,
      393,
      284,
      8,
      293,
      285,
      14,
      499,
      286,
      26,
      287,
      500,
      37,
      288,
      r + 85,
      38,
      r + 85,
      289,
      39,
      290,
      305,
      40,
      291,
      r + 57,
      41,
      r + 57,
      292,
      42,
      333,
      498,
      9,
      294,
      298,
      10,
      295,
      298,
      11,
      296,
      298,
      12,
      297,
      298,
      13,
      392,
      298,
      14,
      337,
      299,
      15,
      r + 5,
      300,
      20,
      335,
      301,
      26,
      302,
      339,
      37,
      303,
      r + 85,
      38,
      r + 85,
      304,
      39,
      307,
      305,
      48,
      r + 58,
      306,
      50,
      r + 74,
      r + 84,
      40,
      308,
      r + 57,
      41,
      r + 57,
      309,
      42,
      333,
      310,
      48,
      322,
      311,
      49,
      r + 45,
      312,
      51,
      313,
      524,
      60,
      316,
      314,
      62,
      r + 55,
      315,
      63,
      317,
      r + 46,
      62,
      r + 55,
      317,
      64,
      318,
      r + 54,
      66,
      319,
      r + 53,
      69,
      320,
      r + 65,
      70,
      321,
      r + 52,
      72,
      r + 61,
      r + 51,
      49,
      r + 45,
      323,
      51,
      324,
      524,
      60,
      327,
      325,
      62,
      r + 55,
      326,
      63,
      328,
      r + 46,
      62,
      r + 55,
      328,
      64,
      329,
      r + 54,
      66,
      330,
      r + 53,
      68,
      r + 47,
      331,
      70,
      332,
      r + 52,
      72,
      r + 49,
      r + 51,
      48,
      r + 56,
      334,
      52,
      r + 67,
      r + 72,
      25,
      336,
      r + 42,
      46,
      r + 27,
      r + 28,
      15,
      r + 5,
      338,
      26,
      r + 87,
      339,
      28,
      r + 86,
      340,
      34,
      343,
      341,
      35,
      342,
      543,
      36,
      r + 101,
      r + 114,
      46,
      r + 90,
      r + 91,
      4,
      r + 2,
      345,
      5,
      355,
      346,
      8,
      347,
      r + 114,
      15,
      r + 5,
      348,
      16,
      349,
      352,
      18,
      350,
      352,
      19,
      351,
      352,
      22,
      r + 14,
      352,
      35,
      353,
      r + 42,
      36,
      r + 43,
      354,
      46,
      r + 103,
      r + 104,
      6,
      403,
      356,
      7,
      393,
      357,
      8,
      358,
      489,
      9,
      359,
      363,
      10,
      360,
      363,
      11,
      361,
      363,
      12,
      362,
      363,
      13,
      392,
      363,
      14,
      387,
      364,
      15,
      r + 5,
      365,
      20,
      385,
      366,
      26,
      367,
      389,
      37,
      368,
      r + 85,
      38,
      r + 85,
      369,
      39,
      370,
      516,
      40,
      371,
      r + 57,
      41,
      r + 57,
      372,
      42,
      536,
      373,
      48,
      r + 43,
      374,
      49,
      r + 45,
      375,
      51,
      376,
      524,
      60,
      379,
      377,
      62,
      r + 55,
      378,
      63,
      380,
      r + 46,
      62,
      r + 55,
      380,
      64,
      381,
      r + 54,
      66,
      382,
      r + 53,
      69,
      383,
      r + 65,
      70,
      384,
      r + 52,
      72,
      r + 60,
      r + 51,
      25,
      386,
      r + 42,
      46,
      r + 25,
      r + 26,
      15,
      r + 5,
      388,
      26,
      r + 87,
      389,
      28,
      r + 86,
      390,
      34,
      391,
      542,
      46,
      r + 88,
      r + 89,
      15,
      r + 5,
      545,
      8,
      394,
      r + 9,
      15,
      r + 5,
      395,
      16,
      396,
      408,
      18,
      397,
      408,
      19,
      398,
      408,
      20,
      399,
      r + 9,
      27,
      400,
      r + 12,
      29,
      r + 11,
      401,
      31,
      r + 11,
      402,
      32,
      r + 11,
      420,
      8,
      404,
      r + 9,
      15,
      r + 5,
      405,
      16,
      406,
      408,
      18,
      407,
      408,
      19,
      409,
      408,
      20,
      r + 12,
      r + 9,
      20,
      412,
      410,
      22,
      411,
      r + 9,
      34,
      r + 10,
      r + 9,
      22,
      414,
      413,
      27,
      417,
      r + 12,
      27,
      416,
      415,
      34,
      r + 10,
      r + 12,
      34,
      r + 10,
      417,
      43,
      r + 11,
      418,
      47,
      r + 11,
      419,
      53,
      r + 11,
      420,
      54,
      r + 11,
      421,
      56,
      r + 11,
      r + 12,
      2,
      r + 1,
      423,
      3,
      476,
      424,
      4,
      r + 4,
      425,
      5,
      436,
      426,
      8,
      427,
      r + 114,
      16,
      428,
      431,
      18,
      429,
      431,
      19,
      430,
      431,
      22,
      r + 14,
      431,
      35,
      432,
      r + 42,
      36,
      r + 44,
      433,
      46,
      r + 111,
      434,
      57,
      435,
      r + 113,
      58,
      r + 112,
      r + 113,
      6,
      r + 6,
      437,
      7,
      r + 6,
      438,
      8,
      448,
      439,
      14,
      499,
      440,
      26,
      441,
      500,
      37,
      442,
      r + 85,
      38,
      r + 85,
      443,
      39,
      444,
      463,
      40,
      445,
      r + 57,
      41,
      r + 57,
      446,
      42,
      469,
      447,
      48,
      r + 44,
      498,
      9,
      449,
      453,
      10,
      450,
      453,
      11,
      451,
      453,
      12,
      452,
      453,
      13,
      545,
      453,
      14,
      471,
      454,
      15,
      458,
      455,
      20,
      456,
      459,
      25,
      457,
      r + 42,
      46,
      r + 37,
      r + 38,
      20,
      538,
      459,
      26,
      460,
      472,
      37,
      461,
      r + 85,
      38,
      r + 85,
      462,
      39,
      465,
      463,
      48,
      r + 58,
      464,
      50,
      r + 75,
      r + 84,
      40,
      466,
      r + 57,
      41,
      r + 57,
      467,
      42,
      469,
      468,
      48,
      r + 44,
      522,
      48,
      r + 44,
      470,
      52,
      r + 68,
      r + 72,
      26,
      r + 87,
      472,
      28,
      r + 86,
      473,
      34,
      r + 99,
      474,
      35,
      475,
      543,
      36,
      r + 44,
      r + 114,
      4,
      r + 2,
      477,
      5,
      486,
      478,
      8,
      479,
      r + 114,
      16,
      480,
      483,
      18,
      481,
      483,
      19,
      482,
      483,
      22,
      r + 14,
      483,
      35,
      484,
      r + 42,
      36,
      r + 43,
      485,
      46,
      r + 107,
      r + 108,
      6,
      r + 6,
      487,
      7,
      r + 6,
      488,
      8,
      501,
      489,
      14,
      499,
      490,
      26,
      491,
      500,
      37,
      492,
      r + 85,
      38,
      r + 85,
      493,
      39,
      494,
      516,
      40,
      495,
      r + 57,
      41,
      r + 57,
      496,
      42,
      536,
      497,
      48,
      r + 43,
      498,
      49,
      r + 45,
      524,
      26,
      r + 87,
      500,
      28,
      r + 86,
      r + 114,
      9,
      502,
      506,
      10,
      503,
      506,
      11,
      504,
      506,
      12,
      505,
      506,
      13,
      545,
      506,
      14,
      539,
      507,
      15,
      511,
      508,
      20,
      509,
      512,
      25,
      510,
      r + 42,
      46,
      r + 29,
      r + 30,
      20,
      538,
      512,
      26,
      513,
      540,
      37,
      514,
      r + 85,
      38,
      r + 85,
      515,
      39,
      518,
      516,
      48,
      r + 58,
      517,
      50,
      r + 73,
      r + 84,
      40,
      519,
      r + 57,
      41,
      r + 57,
      520,
      42,
      536,
      521,
      48,
      r + 43,
      522,
      49,
      r + 45,
      523,
      51,
      527,
      524,
      60,
      r + 55,
      525,
      62,
      r + 55,
      526,
      63,
      r + 55,
      r + 46,
      60,
      530,
      528,
      62,
      r + 55,
      529,
      63,
      531,
      r + 46,
      62,
      r + 55,
      531,
      64,
      532,
      r + 54,
      66,
      533,
      r + 53,
      69,
      534,
      r + 65,
      70,
      535,
      r + 52,
      72,
      r + 59,
      r + 51,
      48,
      r + 43,
      537,
      52,
      r + 66,
      r + 72,
      25,
      r + 24,
      r + 42,
      26,
      r + 87,
      540,
      28,
      r + 86,
      541,
      34,
      r + 99,
      542,
      35,
      544,
      543,
      36,
      r + 42,
      r + 114,
      36,
      r + 43,
      r + 114,
      17,
      546,
      r + 22,
      20,
      547,
      r + 21,
      33,
      550,
      548,
      44,
      r + 17,
      549,
      45,
      r + 19,
      r + 20,
      44,
      r + 15,
      551,
      45,
      r + 15,
      r + 20
    ]);
    exports.bdd = util_endpoints_1.BinaryDecisionDiagram.from(nodes, root, _data.conditions, _data.results);
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/endpoint/endpointResolver.js
var require_endpointResolver = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/endpoint/endpointResolver.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultEndpointResolver = void 0;
    var util_endpoints_1 = require_dist_cjs20();
    var util_endpoints_2 = require_dist_cjs19();
    var bdd_1 = require_bdd();
    var cache = new util_endpoints_2.EndpointCache({
      size: 50,
      params: [
        "Accelerate",
        "Bucket",
        "DisableAccessPoints",
        "DisableMultiRegionAccessPoints",
        "DisableS3ExpressSessionAuth",
        "Endpoint",
        "ForcePathStyle",
        "Region",
        "UseArnRegion",
        "UseDualStack",
        "UseFIPS",
        "UseGlobalEndpoint",
        "UseObjectLambdaEndpoint",
        "UseS3ExpressControlEndpoint"
      ]
    });
    var defaultEndpointResolver = /* @__PURE__ */ __name((endpointParams, context = {}) => {
      return cache.get(endpointParams, () => (0, util_endpoints_2.decideEndpoint)(bdd_1.bdd, {
        endpointParams,
        logger: context.logger
      }));
    }, "defaultEndpointResolver");
    exports.defaultEndpointResolver = defaultEndpointResolver;
    util_endpoints_2.customEndpointFunctions.aws = util_endpoints_1.awsEndpointFunctions;
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/auth/httpAuthSchemeProvider.js
var require_httpAuthSchemeProvider = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/auth/httpAuthSchemeProvider.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resolveHttpAuthSchemeConfig = exports.defaultS3HttpAuthSchemeProvider = exports.defaultS3HttpAuthSchemeParametersProvider = void 0;
    var httpAuthSchemes_1 = (init_httpAuthSchemes(), __toCommonJS(httpAuthSchemes_exports));
    var signature_v4_multi_region_1 = require_dist_cjs29();
    var middleware_endpoint_1 = require_dist_cjs27();
    var util_middleware_1 = require_dist_cjs10();
    var endpointResolver_1 = require_endpointResolver();
    var createEndpointRuleSetHttpAuthSchemeParametersProvider = /* @__PURE__ */ __name((defaultHttpAuthSchemeParametersProvider) => async (config, context, input) => {
      if (!input) {
        throw new Error("Could not find `input` for `defaultEndpointRuleSetHttpAuthSchemeParametersProvider`");
      }
      const defaultParameters = await defaultHttpAuthSchemeParametersProvider(config, context, input);
      const instructionsFn = (0, util_middleware_1.getSmithyContext)(context)?.commandInstance?.constructor?.getEndpointParameterInstructions;
      if (!instructionsFn) {
        throw new Error(`getEndpointParameterInstructions() is not defined on '${context.commandName}'`);
      }
      const endpointParameters = await (0, middleware_endpoint_1.resolveParams)(input, { getEndpointParameterInstructions: instructionsFn }, config);
      return Object.assign(defaultParameters, endpointParameters);
    }, "createEndpointRuleSetHttpAuthSchemeParametersProvider");
    var _defaultS3HttpAuthSchemeParametersProvider = /* @__PURE__ */ __name(async (config, context, input) => {
      return {
        operation: (0, util_middleware_1.getSmithyContext)(context).operation,
        region: await (0, util_middleware_1.normalizeProvider)(config.region)() || (() => {
          throw new Error("expected `region` to be configured for `aws.auth#sigv4`");
        })()
      };
    }, "_defaultS3HttpAuthSchemeParametersProvider");
    exports.defaultS3HttpAuthSchemeParametersProvider = createEndpointRuleSetHttpAuthSchemeParametersProvider(_defaultS3HttpAuthSchemeParametersProvider);
    function createAwsAuthSigv4HttpAuthOption(authParameters) {
      return {
        schemeId: "aws.auth#sigv4",
        signingProperties: {
          name: "s3",
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
    __name(createAwsAuthSigv4HttpAuthOption, "createAwsAuthSigv4HttpAuthOption");
    function createAwsAuthSigv4aHttpAuthOption(authParameters) {
      return {
        schemeId: "aws.auth#sigv4a",
        signingProperties: {
          name: "s3",
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
    __name(createAwsAuthSigv4aHttpAuthOption, "createAwsAuthSigv4aHttpAuthOption");
    var createEndpointRuleSetHttpAuthSchemeProvider = /* @__PURE__ */ __name((defaultEndpointResolver, defaultHttpAuthSchemeResolver, createHttpAuthOptionFunctions) => {
      const endpointRuleSetHttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
        const endpoint = defaultEndpointResolver(authParameters);
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
            if (signature_v4_multi_region_1.SignatureV4MultiRegion.sigv4aDependency() === "none" && sigv4Present) {
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
    var _defaultS3HttpAuthSchemeProvider = /* @__PURE__ */ __name((authParameters) => {
      const options = [];
      switch (authParameters.operation) {
        default: {
          options.push(createAwsAuthSigv4HttpAuthOption(authParameters));
          options.push(createAwsAuthSigv4aHttpAuthOption(authParameters));
        }
      }
      return options;
    }, "_defaultS3HttpAuthSchemeProvider");
    exports.defaultS3HttpAuthSchemeProvider = createEndpointRuleSetHttpAuthSchemeProvider(endpointResolver_1.defaultEndpointResolver, _defaultS3HttpAuthSchemeProvider, {
      "aws.auth#sigv4": createAwsAuthSigv4HttpAuthOption,
      "aws.auth#sigv4a": createAwsAuthSigv4aHttpAuthOption
    });
    var resolveHttpAuthSchemeConfig = /* @__PURE__ */ __name((config) => {
      const config_0 = (0, httpAuthSchemes_1.resolveAwsSdkSigV4Config)(config);
      const config_1 = (0, httpAuthSchemes_1.resolveAwsSdkSigV4AConfig)(config_0);
      return Object.assign(config_1, {
        authSchemePreference: (0, util_middleware_1.normalizeProvider)(config.authSchemePreference ?? [])
      });
    }, "resolveHttpAuthSchemeConfig");
    exports.resolveHttpAuthSchemeConfig = resolveHttpAuthSchemeConfig;
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/models/S3ServiceException.js
var require_S3ServiceException = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/models/S3ServiceException.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.S3ServiceException = exports.__ServiceException = void 0;
    var smithy_client_1 = require_dist_cjs15();
    Object.defineProperty(exports, "__ServiceException", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return smithy_client_1.ServiceException;
    }, "get") });
    var S3ServiceException = class _S3ServiceException extends smithy_client_1.ServiceException {
      static {
        __name(this, "S3ServiceException");
      }
      constructor(options) {
        super(options);
        Object.setPrototypeOf(this, _S3ServiceException.prototype);
      }
    };
    exports.S3ServiceException = S3ServiceException;
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/models/errors.js
var require_errors = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/models/errors.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ObjectAlreadyInActiveTierError = exports.IdempotencyParameterMismatch = exports.TooManyParts = exports.InvalidWriteOffset = exports.InvalidRequest = exports.EncryptionTypeMismatch = exports.NotFound = exports.NoSuchKey = exports.InvalidObjectState = exports.NoSuchBucket = exports.BucketAlreadyOwnedByYou = exports.BucketAlreadyExists = exports.ObjectNotInActiveTierError = exports.AccessDenied = exports.NoSuchUpload = void 0;
    var S3ServiceException_1 = require_S3ServiceException();
    var NoSuchUpload = class _NoSuchUpload extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "NoSuchUpload");
      }
      name = "NoSuchUpload";
      $fault = "client";
      constructor(opts) {
        super({
          name: "NoSuchUpload",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _NoSuchUpload.prototype);
      }
    };
    exports.NoSuchUpload = NoSuchUpload;
    var AccessDenied = class _AccessDenied extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "AccessDenied");
      }
      name = "AccessDenied";
      $fault = "client";
      constructor(opts) {
        super({
          name: "AccessDenied",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _AccessDenied.prototype);
      }
    };
    exports.AccessDenied = AccessDenied;
    var ObjectNotInActiveTierError = class _ObjectNotInActiveTierError extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "ObjectNotInActiveTierError");
      }
      name = "ObjectNotInActiveTierError";
      $fault = "client";
      constructor(opts) {
        super({
          name: "ObjectNotInActiveTierError",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ObjectNotInActiveTierError.prototype);
      }
    };
    exports.ObjectNotInActiveTierError = ObjectNotInActiveTierError;
    var BucketAlreadyExists = class _BucketAlreadyExists extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "BucketAlreadyExists");
      }
      name = "BucketAlreadyExists";
      $fault = "client";
      constructor(opts) {
        super({
          name: "BucketAlreadyExists",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _BucketAlreadyExists.prototype);
      }
    };
    exports.BucketAlreadyExists = BucketAlreadyExists;
    var BucketAlreadyOwnedByYou = class _BucketAlreadyOwnedByYou extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "BucketAlreadyOwnedByYou");
      }
      name = "BucketAlreadyOwnedByYou";
      $fault = "client";
      constructor(opts) {
        super({
          name: "BucketAlreadyOwnedByYou",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _BucketAlreadyOwnedByYou.prototype);
      }
    };
    exports.BucketAlreadyOwnedByYou = BucketAlreadyOwnedByYou;
    var NoSuchBucket = class _NoSuchBucket extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "NoSuchBucket");
      }
      name = "NoSuchBucket";
      $fault = "client";
      constructor(opts) {
        super({
          name: "NoSuchBucket",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _NoSuchBucket.prototype);
      }
    };
    exports.NoSuchBucket = NoSuchBucket;
    var InvalidObjectState = class _InvalidObjectState extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "InvalidObjectState");
      }
      name = "InvalidObjectState";
      $fault = "client";
      StorageClass;
      AccessTier;
      constructor(opts) {
        super({
          name: "InvalidObjectState",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidObjectState.prototype);
        this.StorageClass = opts.StorageClass;
        this.AccessTier = opts.AccessTier;
      }
    };
    exports.InvalidObjectState = InvalidObjectState;
    var NoSuchKey = class _NoSuchKey extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "NoSuchKey");
      }
      name = "NoSuchKey";
      $fault = "client";
      constructor(opts) {
        super({
          name: "NoSuchKey",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _NoSuchKey.prototype);
      }
    };
    exports.NoSuchKey = NoSuchKey;
    var NotFound = class _NotFound extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "NotFound");
      }
      name = "NotFound";
      $fault = "client";
      constructor(opts) {
        super({
          name: "NotFound",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _NotFound.prototype);
      }
    };
    exports.NotFound = NotFound;
    var EncryptionTypeMismatch = class _EncryptionTypeMismatch extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "EncryptionTypeMismatch");
      }
      name = "EncryptionTypeMismatch";
      $fault = "client";
      constructor(opts) {
        super({
          name: "EncryptionTypeMismatch",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _EncryptionTypeMismatch.prototype);
      }
    };
    exports.EncryptionTypeMismatch = EncryptionTypeMismatch;
    var InvalidRequest = class _InvalidRequest extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "InvalidRequest");
      }
      name = "InvalidRequest";
      $fault = "client";
      constructor(opts) {
        super({
          name: "InvalidRequest",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidRequest.prototype);
      }
    };
    exports.InvalidRequest = InvalidRequest;
    var InvalidWriteOffset = class _InvalidWriteOffset extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "InvalidWriteOffset");
      }
      name = "InvalidWriteOffset";
      $fault = "client";
      constructor(opts) {
        super({
          name: "InvalidWriteOffset",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _InvalidWriteOffset.prototype);
      }
    };
    exports.InvalidWriteOffset = InvalidWriteOffset;
    var TooManyParts = class _TooManyParts extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "TooManyParts");
      }
      name = "TooManyParts";
      $fault = "client";
      constructor(opts) {
        super({
          name: "TooManyParts",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _TooManyParts.prototype);
      }
    };
    exports.TooManyParts = TooManyParts;
    var IdempotencyParameterMismatch = class _IdempotencyParameterMismatch extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "IdempotencyParameterMismatch");
      }
      name = "IdempotencyParameterMismatch";
      $fault = "client";
      constructor(opts) {
        super({
          name: "IdempotencyParameterMismatch",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _IdempotencyParameterMismatch.prototype);
      }
    };
    exports.IdempotencyParameterMismatch = IdempotencyParameterMismatch;
    var ObjectAlreadyInActiveTierError = class _ObjectAlreadyInActiveTierError extends S3ServiceException_1.S3ServiceException {
      static {
        __name(this, "ObjectAlreadyInActiveTierError");
      }
      name = "ObjectAlreadyInActiveTierError";
      $fault = "client";
      constructor(opts) {
        super({
          name: "ObjectAlreadyInActiveTierError",
          $fault: "client",
          ...opts
        });
        Object.setPrototypeOf(this, _ObjectAlreadyInActiveTierError.prototype);
      }
    };
    exports.ObjectAlreadyInActiveTierError = ObjectAlreadyInActiveTierError;
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/schemas/schemas_0.js
var require_schemas_0 = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/schemas/schemas_0.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CreateBucketMetadataTableConfigurationRequest$ = exports.CreateBucketMetadataConfigurationRequest$ = exports.CreateBucketConfiguration$ = exports.CORSRule$ = exports.CORSConfiguration$ = exports.CopyPartResult$ = exports.CopyObjectResult$ = exports.CopyObjectRequest$ = exports.CopyObjectOutput$ = exports.ContinuationEvent$ = exports.Condition$ = exports.CompleteMultipartUploadRequest$ = exports.CompleteMultipartUploadOutput$ = exports.CompletedPart$ = exports.CompletedMultipartUpload$ = exports.CommonPrefix$ = exports.Checksum$ = exports.BucketLoggingStatus$ = exports.BucketLifecycleConfiguration$ = exports.BucketInfo$ = exports.Bucket$ = exports.BlockedEncryptionTypes$ = exports.AnalyticsS3BucketDestination$ = exports.AnalyticsExportDestination$ = exports.AnalyticsConfiguration$ = exports.AnalyticsAndOperator$ = exports.AccessControlTranslation$ = exports.AccessControlPolicy$ = exports.AccelerateConfiguration$ = exports.AbortMultipartUploadRequest$ = exports.AbortMultipartUploadOutput$ = exports.AbortIncompleteMultipartUpload$ = exports.AbacStatus$ = exports.errorTypeRegistries = exports.TooManyParts$ = exports.ObjectNotInActiveTierError$ = exports.ObjectAlreadyInActiveTierError$ = exports.NotFound$ = exports.NoSuchUpload$ = exports.NoSuchKey$ = exports.NoSuchBucket$ = exports.InvalidWriteOffset$ = exports.InvalidRequest$ = exports.InvalidObjectState$ = exports.IdempotencyParameterMismatch$ = exports.EncryptionTypeMismatch$ = exports.BucketAlreadyOwnedByYou$ = exports.BucketAlreadyExists$ = exports.AccessDenied$ = exports.S3ServiceException$ = void 0;
    exports.GetBucketAccelerateConfigurationRequest$ = exports.GetBucketAccelerateConfigurationOutput$ = exports.GetBucketAbacRequest$ = exports.GetBucketAbacOutput$ = exports.FilterRule$ = exports.ExistingObjectReplication$ = exports.EventBridgeConfiguration$ = exports.ErrorDocument$ = exports.ErrorDetails$ = exports._Error$ = exports.EndEvent$ = exports.EncryptionConfiguration$ = exports.Encryption$ = exports.DestinationResult$ = exports.Destination$ = exports.DeletePublicAccessBlockRequest$ = exports.DeleteObjectTaggingRequest$ = exports.DeleteObjectTaggingOutput$ = exports.DeleteObjectsRequest$ = exports.DeleteObjectsOutput$ = exports.DeleteObjectRequest$ = exports.DeleteObjectOutput$ = exports.DeleteMarkerReplication$ = exports.DeleteMarkerEntry$ = exports.DeletedObject$ = exports.DeleteBucketWebsiteRequest$ = exports.DeleteBucketTaggingRequest$ = exports.DeleteBucketRequest$ = exports.DeleteBucketReplicationRequest$ = exports.DeleteBucketPolicyRequest$ = exports.DeleteBucketOwnershipControlsRequest$ = exports.DeleteBucketMetricsConfigurationRequest$ = exports.DeleteBucketMetadataTableConfigurationRequest$ = exports.DeleteBucketMetadataConfigurationRequest$ = exports.DeleteBucketLifecycleRequest$ = exports.DeleteBucketInventoryConfigurationRequest$ = exports.DeleteBucketIntelligentTieringConfigurationRequest$ = exports.DeleteBucketEncryptionRequest$ = exports.DeleteBucketCorsRequest$ = exports.DeleteBucketAnalyticsConfigurationRequest$ = exports.Delete$ = exports.DefaultRetention$ = exports.CSVOutput$ = exports.CSVInput$ = exports.CreateSessionRequest$ = exports.CreateSessionOutput$ = exports.CreateMultipartUploadRequest$ = exports.CreateMultipartUploadOutput$ = exports.CreateBucketRequest$ = exports.CreateBucketOutput$ = void 0;
    exports.GetObjectLegalHoldRequest$ = exports.GetObjectLegalHoldOutput$ = exports.GetObjectAttributesRequest$ = exports.GetObjectAttributesParts$ = exports.GetObjectAttributesOutput$ = exports.GetObjectAclRequest$ = exports.GetObjectAclOutput$ = exports.GetBucketWebsiteRequest$ = exports.GetBucketWebsiteOutput$ = exports.GetBucketVersioningRequest$ = exports.GetBucketVersioningOutput$ = exports.GetBucketTaggingRequest$ = exports.GetBucketTaggingOutput$ = exports.GetBucketRequestPaymentRequest$ = exports.GetBucketRequestPaymentOutput$ = exports.GetBucketReplicationRequest$ = exports.GetBucketReplicationOutput$ = exports.GetBucketPolicyStatusRequest$ = exports.GetBucketPolicyStatusOutput$ = exports.GetBucketPolicyRequest$ = exports.GetBucketPolicyOutput$ = exports.GetBucketOwnershipControlsRequest$ = exports.GetBucketOwnershipControlsOutput$ = exports.GetBucketNotificationConfigurationRequest$ = exports.GetBucketMetricsConfigurationRequest$ = exports.GetBucketMetricsConfigurationOutput$ = exports.GetBucketMetadataTableConfigurationResult$ = exports.GetBucketMetadataTableConfigurationRequest$ = exports.GetBucketMetadataTableConfigurationOutput$ = exports.GetBucketMetadataConfigurationResult$ = exports.GetBucketMetadataConfigurationRequest$ = exports.GetBucketMetadataConfigurationOutput$ = exports.GetBucketLoggingRequest$ = exports.GetBucketLoggingOutput$ = exports.GetBucketLocationRequest$ = exports.GetBucketLocationOutput$ = exports.GetBucketLifecycleConfigurationRequest$ = exports.GetBucketLifecycleConfigurationOutput$ = exports.GetBucketInventoryConfigurationRequest$ = exports.GetBucketInventoryConfigurationOutput$ = exports.GetBucketIntelligentTieringConfigurationRequest$ = exports.GetBucketIntelligentTieringConfigurationOutput$ = exports.GetBucketEncryptionRequest$ = exports.GetBucketEncryptionOutput$ = exports.GetBucketCorsRequest$ = exports.GetBucketCorsOutput$ = exports.GetBucketAnalyticsConfigurationRequest$ = exports.GetBucketAnalyticsConfigurationOutput$ = exports.GetBucketAclRequest$ = exports.GetBucketAclOutput$ = void 0;
    exports.ListBucketInventoryConfigurationsRequest$ = exports.ListBucketInventoryConfigurationsOutput$ = exports.ListBucketIntelligentTieringConfigurationsRequest$ = exports.ListBucketIntelligentTieringConfigurationsOutput$ = exports.ListBucketAnalyticsConfigurationsRequest$ = exports.ListBucketAnalyticsConfigurationsOutput$ = exports.LifecycleRuleFilter$ = exports.LifecycleRuleAndOperator$ = exports.LifecycleRule$ = exports.LifecycleExpiration$ = exports.LambdaFunctionConfiguration$ = exports.JSONOutput$ = exports.JSONInput$ = exports.JournalTableConfigurationUpdates$ = exports.JournalTableConfigurationResult$ = exports.JournalTableConfiguration$ = exports.InventoryTableConfigurationUpdates$ = exports.InventoryTableConfigurationResult$ = exports.InventoryTableConfiguration$ = exports.InventorySchedule$ = exports.InventoryS3BucketDestination$ = exports.InventoryFilter$ = exports.InventoryEncryption$ = exports.InventoryDestination$ = exports.InventoryConfiguration$ = exports.IntelligentTieringFilter$ = exports.IntelligentTieringConfiguration$ = exports.IntelligentTieringAndOperator$ = exports.InputSerialization$ = exports.Initiator$ = exports.IndexDocument$ = exports.HeadObjectRequest$ = exports.HeadObjectOutput$ = exports.HeadBucketRequest$ = exports.HeadBucketOutput$ = exports.Grantee$ = exports.Grant$ = exports.GlacierJobParameters$ = exports.GetPublicAccessBlockRequest$ = exports.GetPublicAccessBlockOutput$ = exports.GetObjectTorrentRequest$ = exports.GetObjectTorrentOutput$ = exports.GetObjectTaggingRequest$ = exports.GetObjectTaggingOutput$ = exports.GetObjectRetentionRequest$ = exports.GetObjectRetentionOutput$ = exports.GetObjectRequest$ = exports.GetObjectOutput$ = exports.GetObjectLockConfigurationRequest$ = exports.GetObjectLockConfigurationOutput$ = void 0;
    exports.Progress$ = exports.PolicyStatus$ = exports.PartitionedPrefix$ = exports.Part$ = exports.ParquetInput$ = exports.OwnershipControlsRule$ = exports.OwnershipControls$ = exports.Owner$ = exports.OutputSerialization$ = exports.OutputLocation$ = exports.ObjectVersion$ = exports.ObjectPart$ = exports.ObjectLockRule$ = exports.ObjectLockRetention$ = exports.ObjectLockLegalHold$ = exports.ObjectLockConfiguration$ = exports.ObjectIdentifier$ = exports._Object$ = exports.NotificationConfigurationFilter$ = exports.NotificationConfiguration$ = exports.NoncurrentVersionTransition$ = exports.NoncurrentVersionExpiration$ = exports.MultipartUpload$ = exports.MetricsConfiguration$ = exports.MetricsAndOperator$ = exports.Metrics$ = exports.MetadataTableEncryptionConfiguration$ = exports.MetadataTableConfigurationResult$ = exports.MetadataTableConfiguration$ = exports.MetadataEntry$ = exports.MetadataConfigurationResult$ = exports.MetadataConfiguration$ = exports.LoggingEnabled$ = exports.LocationInfo$ = exports.ListPartsRequest$ = exports.ListPartsOutput$ = exports.ListObjectVersionsRequest$ = exports.ListObjectVersionsOutput$ = exports.ListObjectsV2Request$ = exports.ListObjectsV2Output$ = exports.ListObjectsRequest$ = exports.ListObjectsOutput$ = exports.ListMultipartUploadsRequest$ = exports.ListMultipartUploadsOutput$ = exports.ListDirectoryBucketsRequest$ = exports.ListDirectoryBucketsOutput$ = exports.ListBucketsRequest$ = exports.ListBucketsOutput$ = exports.ListBucketMetricsConfigurationsRequest$ = exports.ListBucketMetricsConfigurationsOutput$ = void 0;
    exports.RequestPaymentConfiguration$ = exports.ReplicationTimeValue$ = exports.ReplicationTime$ = exports.ReplicationRuleFilter$ = exports.ReplicationRuleAndOperator$ = exports.ReplicationRule$ = exports.ReplicationConfiguration$ = exports.ReplicaModifications$ = exports.RenameObjectRequest$ = exports.RenameObjectOutput$ = exports.RedirectAllRequestsTo$ = exports.Redirect$ = exports.RecordsEvent$ = exports.RecordExpiration$ = exports.QueueConfiguration$ = exports.PutPublicAccessBlockRequest$ = exports.PutObjectTaggingRequest$ = exports.PutObjectTaggingOutput$ = exports.PutObjectRetentionRequest$ = exports.PutObjectRetentionOutput$ = exports.PutObjectRequest$ = exports.PutObjectOutput$ = exports.PutObjectLockConfigurationRequest$ = exports.PutObjectLockConfigurationOutput$ = exports.PutObjectLegalHoldRequest$ = exports.PutObjectLegalHoldOutput$ = exports.PutObjectAclRequest$ = exports.PutObjectAclOutput$ = exports.PutBucketWebsiteRequest$ = exports.PutBucketVersioningRequest$ = exports.PutBucketTaggingRequest$ = exports.PutBucketRequestPaymentRequest$ = exports.PutBucketReplicationRequest$ = exports.PutBucketPolicyRequest$ = exports.PutBucketOwnershipControlsRequest$ = exports.PutBucketNotificationConfigurationRequest$ = exports.PutBucketMetricsConfigurationRequest$ = exports.PutBucketLoggingRequest$ = exports.PutBucketLifecycleConfigurationRequest$ = exports.PutBucketLifecycleConfigurationOutput$ = exports.PutBucketInventoryConfigurationRequest$ = exports.PutBucketIntelligentTieringConfigurationRequest$ = exports.PutBucketEncryptionRequest$ = exports.PutBucketCorsRequest$ = exports.PutBucketAnalyticsConfigurationRequest$ = exports.PutBucketAclRequest$ = exports.PutBucketAccelerateConfigurationRequest$ = exports.PutBucketAbacRequest$ = exports.PublicAccessBlockConfiguration$ = exports.ProgressEvent$ = void 0;
    exports.SelectObjectContentEventStream$ = exports.ObjectEncryption$ = exports.MetricsFilter$ = exports.AnalyticsFilter$ = exports.WriteGetObjectResponseRequest$ = exports.WebsiteConfiguration$ = exports.VersioningConfiguration$ = exports.UploadPartRequest$ = exports.UploadPartOutput$ = exports.UploadPartCopyRequest$ = exports.UploadPartCopyOutput$ = exports.UpdateObjectEncryptionResponse$ = exports.UpdateObjectEncryptionRequest$ = exports.UpdateBucketMetadataJournalTableConfigurationRequest$ = exports.UpdateBucketMetadataInventoryTableConfigurationRequest$ = exports.Transition$ = exports.TopicConfiguration$ = exports.Tiering$ = exports.TargetObjectKeyFormat$ = exports.TargetGrant$ = exports.Tagging$ = exports.Tag$ = exports.StorageClassAnalysisDataExport$ = exports.StorageClassAnalysis$ = exports.StatsEvent$ = exports.Stats$ = exports.SSES3$ = exports.SSEKMSEncryption$ = exports.SseKmsEncryptedObjects$ = exports.SSEKMS$ = exports.SourceSelectionCriteria$ = exports.SimplePrefix$ = exports.SessionCredentials$ = exports.ServerSideEncryptionRule$ = exports.ServerSideEncryptionConfiguration$ = exports.ServerSideEncryptionByDefault$ = exports.SelectParameters$ = exports.SelectObjectContentRequest$ = exports.SelectObjectContentOutput$ = exports.ScanRange$ = exports.S3TablesDestinationResult$ = exports.S3TablesDestination$ = exports.S3Location$ = exports.S3KeyFilter$ = exports.RoutingRule$ = exports.RestoreStatus$ = exports.RestoreRequest$ = exports.RestoreObjectRequest$ = exports.RestoreObjectOutput$ = exports.RequestProgress$ = void 0;
    exports.GetBucketWebsite$ = exports.GetBucketVersioning$ = exports.GetBucketTagging$ = exports.GetBucketRequestPayment$ = exports.GetBucketReplication$ = exports.GetBucketPolicyStatus$ = exports.GetBucketPolicy$ = exports.GetBucketOwnershipControls$ = exports.GetBucketNotificationConfiguration$ = exports.GetBucketMetricsConfiguration$ = exports.GetBucketMetadataTableConfiguration$ = exports.GetBucketMetadataConfiguration$ = exports.GetBucketLogging$ = exports.GetBucketLocation$ = exports.GetBucketLifecycleConfiguration$ = exports.GetBucketInventoryConfiguration$ = exports.GetBucketIntelligentTieringConfiguration$ = exports.GetBucketEncryption$ = exports.GetBucketCors$ = exports.GetBucketAnalyticsConfiguration$ = exports.GetBucketAcl$ = exports.GetBucketAccelerateConfiguration$ = exports.GetBucketAbac$ = exports.DeletePublicAccessBlock$ = exports.DeleteObjectTagging$ = exports.DeleteObjects$ = exports.DeleteObject$ = exports.DeleteBucketWebsite$ = exports.DeleteBucketTagging$ = exports.DeleteBucketReplication$ = exports.DeleteBucketPolicy$ = exports.DeleteBucketOwnershipControls$ = exports.DeleteBucketMetricsConfiguration$ = exports.DeleteBucketMetadataTableConfiguration$ = exports.DeleteBucketMetadataConfiguration$ = exports.DeleteBucketLifecycle$ = exports.DeleteBucketInventoryConfiguration$ = exports.DeleteBucketIntelligentTieringConfiguration$ = exports.DeleteBucketEncryption$ = exports.DeleteBucketCors$ = exports.DeleteBucketAnalyticsConfiguration$ = exports.DeleteBucket$ = exports.CreateSession$ = exports.CreateMultipartUpload$ = exports.CreateBucketMetadataTableConfiguration$ = exports.CreateBucketMetadataConfiguration$ = exports.CreateBucket$ = exports.CopyObject$ = exports.CompleteMultipartUpload$ = exports.AbortMultipartUpload$ = void 0;
    exports.RestoreObject$ = exports.RenameObject$ = exports.PutPublicAccessBlock$ = exports.PutObjectTagging$ = exports.PutObjectRetention$ = exports.PutObjectLockConfiguration$ = exports.PutObjectLegalHold$ = exports.PutObjectAcl$ = exports.PutObject$ = exports.PutBucketWebsite$ = exports.PutBucketVersioning$ = exports.PutBucketTagging$ = exports.PutBucketRequestPayment$ = exports.PutBucketReplication$ = exports.PutBucketPolicy$ = exports.PutBucketOwnershipControls$ = exports.PutBucketNotificationConfiguration$ = exports.PutBucketMetricsConfiguration$ = exports.PutBucketLogging$ = exports.PutBucketLifecycleConfiguration$ = exports.PutBucketInventoryConfiguration$ = exports.PutBucketIntelligentTieringConfiguration$ = exports.PutBucketEncryption$ = exports.PutBucketCors$ = exports.PutBucketAnalyticsConfiguration$ = exports.PutBucketAcl$ = exports.PutBucketAccelerateConfiguration$ = exports.PutBucketAbac$ = exports.ListParts$ = exports.ListObjectVersions$ = exports.ListObjectsV2$ = exports.ListObjects$ = exports.ListMultipartUploads$ = exports.ListDirectoryBuckets$ = exports.ListBuckets$ = exports.ListBucketMetricsConfigurations$ = exports.ListBucketInventoryConfigurations$ = exports.ListBucketIntelligentTieringConfigurations$ = exports.ListBucketAnalyticsConfigurations$ = exports.HeadObject$ = exports.HeadBucket$ = exports.GetPublicAccessBlock$ = exports.GetObjectTorrent$ = exports.GetObjectTagging$ = exports.GetObjectRetention$ = exports.GetObjectLockConfiguration$ = exports.GetObjectLegalHold$ = exports.GetObjectAttributes$ = exports.GetObjectAcl$ = exports.GetObject$ = void 0;
    exports.WriteGetObjectResponse$ = exports.UploadPartCopy$ = exports.UploadPart$ = exports.UpdateObjectEncryption$ = exports.UpdateBucketMetadataJournalTableConfiguration$ = exports.UpdateBucketMetadataInventoryTableConfiguration$ = exports.SelectObjectContent$ = void 0;
    var _A = "Account";
    var _AAO = "AnalyticsAndOperator";
    var _AC = "AccelerateConfiguration";
    var _ACL = "AccessControlList";
    var _ACL_ = "ACL";
    var _ACLn = "AnalyticsConfigurationList";
    var _ACP = "AccessControlPolicy";
    var _ACT = "AccessControlTranslation";
    var _ACn = "AnalyticsConfiguration";
    var _AD = "AccessDenied";
    var _ADb = "AbortDate";
    var _AED = "AnalyticsExportDestination";
    var _AF = "AnalyticsFilter";
    var _AH = "AllowedHeaders";
    var _AHl = "AllowedHeader";
    var _AI = "AccountId";
    var _AIMU = "AbortIncompleteMultipartUpload";
    var _AKI = "AccessKeyId";
    var _AM = "AllowedMethods";
    var _AMU = "AbortMultipartUpload";
    var _AMUO = "AbortMultipartUploadOutput";
    var _AMUR = "AbortMultipartUploadRequest";
    var _AMl = "AllowedMethod";
    var _AO = "AllowedOrigins";
    var _AOl = "AllowedOrigin";
    var _APA = "AccessPointAlias";
    var _APAc = "AccessPointArn";
    var _AQRD = "AllowQuotedRecordDelimiter";
    var _AR = "AcceptRanges";
    var _ARI = "AbortRuleId";
    var _AS = "AbacStatus";
    var _ASBD = "AnalyticsS3BucketDestination";
    var _ASSEBD = "ApplyServerSideEncryptionByDefault";
    var _ASr = "ArchiveStatus";
    var _AT = "AccessTier";
    var _An = "And";
    var _B = "Bucket";
    var _BA = "BucketArn";
    var _BAE = "BucketAlreadyExists";
    var _BAI = "BucketAccountId";
    var _BAOBY = "BucketAlreadyOwnedByYou";
    var _BET = "BlockedEncryptionTypes";
    var _BGR = "BypassGovernanceRetention";
    var _BI = "BucketInfo";
    var _BKE = "BucketKeyEnabled";
    var _BLC = "BucketLifecycleConfiguration";
    var _BLN = "BucketLocationName";
    var _BLS = "BucketLoggingStatus";
    var _BLT = "BucketLocationType";
    var _BN = "BucketNamespace";
    var _BNu = "BucketName";
    var _BP = "BytesProcessed";
    var _BPA = "BlockPublicAcls";
    var _BPP = "BlockPublicPolicy";
    var _BR = "BucketRegion";
    var _BRy = "BytesReturned";
    var _BS = "BytesScanned";
    var _Bo = "Body";
    var _Bu = "Buckets";
    var _C = "Checksum";
    var _CA = "ChecksumAlgorithm";
    var _CACL = "CannedACL";
    var _CB = "CreateBucket";
    var _CBC = "CreateBucketConfiguration";
    var _CBMC = "CreateBucketMetadataConfiguration";
    var _CBMCR = "CreateBucketMetadataConfigurationRequest";
    var _CBMTC = "CreateBucketMetadataTableConfiguration";
    var _CBMTCR = "CreateBucketMetadataTableConfigurationRequest";
    var _CBO = "CreateBucketOutput";
    var _CBR = "CreateBucketRequest";
    var _CC = "CacheControl";
    var _CCRC = "ChecksumCRC32";
    var _CCRCC = "ChecksumCRC32C";
    var _CCRCNVME = "ChecksumCRC64NVME";
    var _CC_ = "Cache-Control";
    var _CD = "CreationDate";
    var _CD_ = "Content-Disposition";
    var _CDo = "ContentDisposition";
    var _CE = "ContinuationEvent";
    var _CE_ = "Content-Encoding";
    var _CEo = "ContentEncoding";
    var _CF = "CloudFunction";
    var _CFC = "CloudFunctionConfiguration";
    var _CL = "ContentLanguage";
    var _CL_ = "Content-Language";
    var _CL__ = "Content-Length";
    var _CLo = "ContentLength";
    var _CM = "Content-MD5";
    var _CMD = "ChecksumMD5";
    var _CMDo = "ContentMD5";
    var _CMU = "CompletedMultipartUpload";
    var _CMUO = "CompleteMultipartUploadOutput";
    var _CMUOr = "CreateMultipartUploadOutput";
    var _CMUR = "CompleteMultipartUploadResult";
    var _CMURo = "CompleteMultipartUploadRequest";
    var _CMURr = "CreateMultipartUploadRequest";
    var _CMUo = "CompleteMultipartUpload";
    var _CMUr = "CreateMultipartUpload";
    var _CMh = "ChecksumMode";
    var _CO = "CopyObject";
    var _COO = "CopyObjectOutput";
    var _COR = "CopyObjectResult";
    var _CORSC = "CORSConfiguration";
    var _CORSR = "CORSRules";
    var _CORSRu = "CORSRule";
    var _CORo = "CopyObjectRequest";
    var _CP = "CommonPrefix";
    var _CPL = "CommonPrefixList";
    var _CPLo = "CompletedPartList";
    var _CPR = "CopyPartResult";
    var _CPo = "CompletedPart";
    var _CPom = "CommonPrefixes";
    var _CR = "ContentRange";
    var _CRSBA = "ConfirmRemoveSelfBucketAccess";
    var _CR_ = "Content-Range";
    var _CS = "CopySource";
    var _CSHA = "ChecksumSHA1";
    var _CSHAh = "ChecksumSHA256";
    var _CSHAhe = "ChecksumSHA512";
    var _CSIM = "CopySourceIfMatch";
    var _CSIMS = "CopySourceIfModifiedSince";
    var _CSINM = "CopySourceIfNoneMatch";
    var _CSIUS = "CopySourceIfUnmodifiedSince";
    var _CSO = "CreateSessionOutput";
    var _CSR = "CreateSessionResult";
    var _CSRo = "CopySourceRange";
    var _CSRr = "CreateSessionRequest";
    var _CSSSECA = "CopySourceSSECustomerAlgorithm";
    var _CSSSECK = "CopySourceSSECustomerKey";
    var _CSSSECKMD = "CopySourceSSECustomerKeyMD5";
    var _CSV = "CSV";
    var _CSVI = "CopySourceVersionId";
    var _CSVIn = "CSVInput";
    var _CSVO = "CSVOutput";
    var _CSo = "ConfigurationState";
    var _CSr = "CreateSession";
    var _CT = "ChecksumType";
    var _CT_ = "Content-Type";
    var _CTl = "ClientToken";
    var _CTo = "ContentType";
    var _CTom = "CompressionType";
    var _CTon = "ContinuationToken";
    var _CXXHASH = "ChecksumXXHASH64";
    var _CXXHASHh = "ChecksumXXHASH3";
    var _CXXHASHhe = "ChecksumXXHASH128";
    var _Co = "Condition";
    var _Cod = "Code";
    var _Com = "Comments";
    var _Con = "Contents";
    var _Cont = "Cont";
    var _Cr = "Credentials";
    var _D = "Days";
    var _DAI = "DaysAfterInitiation";
    var _DB = "DeleteBucket";
    var _DBAC = "DeleteBucketAnalyticsConfiguration";
    var _DBACR = "DeleteBucketAnalyticsConfigurationRequest";
    var _DBC = "DeleteBucketCors";
    var _DBCR = "DeleteBucketCorsRequest";
    var _DBE = "DeleteBucketEncryption";
    var _DBER = "DeleteBucketEncryptionRequest";
    var _DBIC = "DeleteBucketInventoryConfiguration";
    var _DBICR = "DeleteBucketInventoryConfigurationRequest";
    var _DBITC = "DeleteBucketIntelligentTieringConfiguration";
    var _DBITCR = "DeleteBucketIntelligentTieringConfigurationRequest";
    var _DBL = "DeleteBucketLifecycle";
    var _DBLR = "DeleteBucketLifecycleRequest";
    var _DBMC = "DeleteBucketMetadataConfiguration";
    var _DBMCR = "DeleteBucketMetadataConfigurationRequest";
    var _DBMCRe = "DeleteBucketMetricsConfigurationRequest";
    var _DBMCe = "DeleteBucketMetricsConfiguration";
    var _DBMTC = "DeleteBucketMetadataTableConfiguration";
    var _DBMTCR = "DeleteBucketMetadataTableConfigurationRequest";
    var _DBOC = "DeleteBucketOwnershipControls";
    var _DBOCR = "DeleteBucketOwnershipControlsRequest";
    var _DBP = "DeleteBucketPolicy";
    var _DBPR = "DeleteBucketPolicyRequest";
    var _DBR = "DeleteBucketRequest";
    var _DBRR = "DeleteBucketReplicationRequest";
    var _DBRe = "DeleteBucketReplication";
    var _DBT = "DeleteBucketTagging";
    var _DBTR = "DeleteBucketTaggingRequest";
    var _DBW = "DeleteBucketWebsite";
    var _DBWR = "DeleteBucketWebsiteRequest";
    var _DE = "DataExport";
    var _DIM = "DestinationIfMatch";
    var _DIMS = "DestinationIfModifiedSince";
    var _DINM = "DestinationIfNoneMatch";
    var _DIUS = "DestinationIfUnmodifiedSince";
    var _DM = "DeleteMarker";
    var _DME = "DeleteMarkerEntry";
    var _DMR = "DeleteMarkerReplication";
    var _DMVI = "DeleteMarkerVersionId";
    var _DMe = "DeleteMarkers";
    var _DN = "DisplayName";
    var _DO = "DeletedObject";
    var _DOO = "DeleteObjectOutput";
    var _DOOe = "DeleteObjectsOutput";
    var _DOR = "DeleteObjectRequest";
    var _DORe = "DeleteObjectsRequest";
    var _DOT = "DeleteObjectTagging";
    var _DOTO = "DeleteObjectTaggingOutput";
    var _DOTR = "DeleteObjectTaggingRequest";
    var _DOe = "DeletedObjects";
    var _DOel = "DeleteObject";
    var _DOele = "DeleteObjects";
    var _DPAB = "DeletePublicAccessBlock";
    var _DPABR = "DeletePublicAccessBlockRequest";
    var _DR = "DataRedundancy";
    var _DRe = "DefaultRetention";
    var _DRel = "DeleteResult";
    var _DRes = "DestinationResult";
    var _Da = "Date";
    var _De = "Delete";
    var _Del = "Deleted";
    var _Deli = "Delimiter";
    var _Des = "Destination";
    var _Desc = "Description";
    var _Det = "Details";
    var _E = "Expiration";
    var _EA = "EmailAddress";
    var _EBC = "EventBridgeConfiguration";
    var _EBO = "ExpectedBucketOwner";
    var _EC = "EncryptionConfiguration";
    var _ECr = "ErrorCode";
    var _ED = "ErrorDetails";
    var _EDr = "ErrorDocument";
    var _EE = "EndEvent";
    var _EH = "ExposeHeaders";
    var _EHx = "ExposeHeader";
    var _EM = "ErrorMessage";
    var _EODM = "ExpiredObjectDeleteMarker";
    var _EOR = "ExistingObjectReplication";
    var _ES = "ExpiresString";
    var _ESBO = "ExpectedSourceBucketOwner";
    var _ET = "EncryptionType";
    var _ETL = "EncryptionTypeList";
    var _ETM = "EncryptionTypeMismatch";
    var _ETa = "ETag";
    var _ETn = "EncodingType";
    var _ETv = "EventThreshold";
    var _ETx = "ExpressionType";
    var _En = "Encryption";
    var _Ena = "Enabled";
    var _End = "End";
    var _Er = "Errors";
    var _Err = "Error";
    var _Ev = "Events";
    var _Eve = "Event";
    var _Ex = "Expires";
    var _Exp = "Expression";
    var _F = "Filter";
    var _FD = "FieldDelimiter";
    var _FHI = "FileHeaderInfo";
    var _FO = "FetchOwner";
    var _FR = "FilterRule";
    var _FRL = "FilterRuleList";
    var _FRi = "FilterRules";
    var _Fi = "Field";
    var _Fo = "Format";
    var _Fr = "Frequency";
    var _G = "Grants";
    var _GBA = "GetBucketAbac";
    var _GBAC = "GetBucketAccelerateConfiguration";
    var _GBACO = "GetBucketAccelerateConfigurationOutput";
    var _GBACOe = "GetBucketAnalyticsConfigurationOutput";
    var _GBACR = "GetBucketAccelerateConfigurationRequest";
    var _GBACRe = "GetBucketAnalyticsConfigurationRequest";
    var _GBACe = "GetBucketAnalyticsConfiguration";
    var _GBAO = "GetBucketAbacOutput";
    var _GBAOe = "GetBucketAclOutput";
    var _GBAR = "GetBucketAbacRequest";
    var _GBARe = "GetBucketAclRequest";
    var _GBAe = "GetBucketAcl";
    var _GBC = "GetBucketCors";
    var _GBCO = "GetBucketCorsOutput";
    var _GBCR = "GetBucketCorsRequest";
    var _GBE = "GetBucketEncryption";
    var _GBEO = "GetBucketEncryptionOutput";
    var _GBER = "GetBucketEncryptionRequest";
    var _GBIC = "GetBucketInventoryConfiguration";
    var _GBICO = "GetBucketInventoryConfigurationOutput";
    var _GBICR = "GetBucketInventoryConfigurationRequest";
    var _GBITC = "GetBucketIntelligentTieringConfiguration";
    var _GBITCO = "GetBucketIntelligentTieringConfigurationOutput";
    var _GBITCR = "GetBucketIntelligentTieringConfigurationRequest";
    var _GBL = "GetBucketLocation";
    var _GBLC = "GetBucketLifecycleConfiguration";
    var _GBLCO = "GetBucketLifecycleConfigurationOutput";
    var _GBLCR = "GetBucketLifecycleConfigurationRequest";
    var _GBLO = "GetBucketLocationOutput";
    var _GBLOe = "GetBucketLoggingOutput";
    var _GBLR = "GetBucketLocationRequest";
    var _GBLRe = "GetBucketLoggingRequest";
    var _GBLe = "GetBucketLogging";
    var _GBMC = "GetBucketMetadataConfiguration";
    var _GBMCO = "GetBucketMetadataConfigurationOutput";
    var _GBMCOe = "GetBucketMetricsConfigurationOutput";
    var _GBMCR = "GetBucketMetadataConfigurationResult";
    var _GBMCRe = "GetBucketMetadataConfigurationRequest";
    var _GBMCRet = "GetBucketMetricsConfigurationRequest";
    var _GBMCe = "GetBucketMetricsConfiguration";
    var _GBMTC = "GetBucketMetadataTableConfiguration";
    var _GBMTCO = "GetBucketMetadataTableConfigurationOutput";
    var _GBMTCR = "GetBucketMetadataTableConfigurationResult";
    var _GBMTCRe = "GetBucketMetadataTableConfigurationRequest";
    var _GBNC = "GetBucketNotificationConfiguration";
    var _GBNCR = "GetBucketNotificationConfigurationRequest";
    var _GBOC = "GetBucketOwnershipControls";
    var _GBOCO = "GetBucketOwnershipControlsOutput";
    var _GBOCR = "GetBucketOwnershipControlsRequest";
    var _GBP = "GetBucketPolicy";
    var _GBPO = "GetBucketPolicyOutput";
    var _GBPR = "GetBucketPolicyRequest";
    var _GBPS = "GetBucketPolicyStatus";
    var _GBPSO = "GetBucketPolicyStatusOutput";
    var _GBPSR = "GetBucketPolicyStatusRequest";
    var _GBR = "GetBucketReplication";
    var _GBRO = "GetBucketReplicationOutput";
    var _GBRP = "GetBucketRequestPayment";
    var _GBRPO = "GetBucketRequestPaymentOutput";
    var _GBRPR = "GetBucketRequestPaymentRequest";
    var _GBRR = "GetBucketReplicationRequest";
    var _GBT = "GetBucketTagging";
    var _GBTO = "GetBucketTaggingOutput";
    var _GBTR = "GetBucketTaggingRequest";
    var _GBV = "GetBucketVersioning";
    var _GBVO = "GetBucketVersioningOutput";
    var _GBVR = "GetBucketVersioningRequest";
    var _GBW = "GetBucketWebsite";
    var _GBWO = "GetBucketWebsiteOutput";
    var _GBWR = "GetBucketWebsiteRequest";
    var _GFC = "GrantFullControl";
    var _GJP = "GlacierJobParameters";
    var _GO = "GetObject";
    var _GOA = "GetObjectAcl";
    var _GOAO = "GetObjectAclOutput";
    var _GOAOe = "GetObjectAttributesOutput";
    var _GOAP = "GetObjectAttributesParts";
    var _GOAR = "GetObjectAclRequest";
    var _GOARe = "GetObjectAttributesResponse";
    var _GOARet = "GetObjectAttributesRequest";
    var _GOAe = "GetObjectAttributes";
    var _GOLC = "GetObjectLockConfiguration";
    var _GOLCO = "GetObjectLockConfigurationOutput";
    var _GOLCR = "GetObjectLockConfigurationRequest";
    var _GOLH = "GetObjectLegalHold";
    var _GOLHO = "GetObjectLegalHoldOutput";
    var _GOLHR = "GetObjectLegalHoldRequest";
    var _GOO = "GetObjectOutput";
    var _GOR = "GetObjectRequest";
    var _GORO = "GetObjectRetentionOutput";
    var _GORR = "GetObjectRetentionRequest";
    var _GORe = "GetObjectRetention";
    var _GOT = "GetObjectTagging";
    var _GOTO = "GetObjectTaggingOutput";
    var _GOTOe = "GetObjectTorrentOutput";
    var _GOTR = "GetObjectTaggingRequest";
    var _GOTRe = "GetObjectTorrentRequest";
    var _GOTe = "GetObjectTorrent";
    var _GPAB = "GetPublicAccessBlock";
    var _GPABO = "GetPublicAccessBlockOutput";
    var _GPABR = "GetPublicAccessBlockRequest";
    var _GR = "GrantRead";
    var _GRACP = "GrantReadACP";
    var _GW = "GrantWrite";
    var _GWACP = "GrantWriteACP";
    var _Gr = "Grant";
    var _Gra = "Grantee";
    var _HB = "HeadBucket";
    var _HBO = "HeadBucketOutput";
    var _HBR = "HeadBucketRequest";
    var _HECRE = "HttpErrorCodeReturnedEquals";
    var _HN = "HostName";
    var _HO = "HeadObject";
    var _HOO = "HeadObjectOutput";
    var _HOR = "HeadObjectRequest";
    var _HRC = "HttpRedirectCode";
    var _I = "Id";
    var _IC = "InventoryConfiguration";
    var _ICL = "InventoryConfigurationList";
    var _ID = "ID";
    var _IDn = "IndexDocument";
    var _IDnv = "InventoryDestination";
    var _IE = "IsEnabled";
    var _IEn = "InventoryEncryption";
    var _IF = "InventoryFilter";
    var _IL = "IsLatest";
    var _IM = "IfMatch";
    var _IMIT = "IfMatchInitiatedTime";
    var _IMLMT = "IfMatchLastModifiedTime";
    var _IMS = "IfMatchSize";
    var _IMS_ = "If-Modified-Since";
    var _IMSf = "IfModifiedSince";
    var _IMUR = "InitiateMultipartUploadResult";
    var _IM_ = "If-Match";
    var _INM = "IfNoneMatch";
    var _INM_ = "If-None-Match";
    var _IOF = "InventoryOptionalFields";
    var _IOS = "InvalidObjectState";
    var _IOV = "IncludedObjectVersions";
    var _IP = "IsPublic";
    var _IPA = "IgnorePublicAcls";
    var _IPM = "IdempotencyParameterMismatch";
    var _IR = "InvalidRequest";
    var _IRIP = "IsRestoreInProgress";
    var _IS = "InputSerialization";
    var _ISBD = "InventoryS3BucketDestination";
    var _ISn = "InventorySchedule";
    var _IT = "IsTruncated";
    var _ITAO = "IntelligentTieringAndOperator";
    var _ITC = "IntelligentTieringConfiguration";
    var _ITCL = "IntelligentTieringConfigurationList";
    var _ITCR = "InventoryTableConfigurationResult";
    var _ITCU = "InventoryTableConfigurationUpdates";
    var _ITCn = "InventoryTableConfiguration";
    var _ITF = "IntelligentTieringFilter";
    var _IUS = "IfUnmodifiedSince";
    var _IUS_ = "If-Unmodified-Since";
    var _IWO = "InvalidWriteOffset";
    var _In = "Initiator";
    var _Ini = "Initiated";
    var _JSON = "JSON";
    var _JSONI = "JSONInput";
    var _JSONO = "JSONOutput";
    var _JTC = "JournalTableConfiguration";
    var _JTCR = "JournalTableConfigurationResult";
    var _JTCU = "JournalTableConfigurationUpdates";
    var _K = "Key";
    var _KC = "KeyCount";
    var _KI = "KeyId";
    var _KKA = "KmsKeyArn";
    var _KM = "KeyMarker";
    var _KMSC = "KMSContext";
    var _KMSKA = "KMSKeyArn";
    var _KMSKI = "KMSKeyId";
    var _KMSMKID = "KMSMasterKeyID";
    var _KPE = "KeyPrefixEquals";
    var _L = "Location";
    var _LAMBR = "ListAllMyBucketsResult";
    var _LAMDBR = "ListAllMyDirectoryBucketsResult";
    var _LB = "ListBuckets";
    var _LBAC = "ListBucketAnalyticsConfigurations";
    var _LBACO = "ListBucketAnalyticsConfigurationsOutput";
    var _LBACR = "ListBucketAnalyticsConfigurationResult";
    var _LBACRi = "ListBucketAnalyticsConfigurationsRequest";
    var _LBIC = "ListBucketInventoryConfigurations";
    var _LBICO = "ListBucketInventoryConfigurationsOutput";
    var _LBICR = "ListBucketInventoryConfigurationsRequest";
    var _LBITC = "ListBucketIntelligentTieringConfigurations";
    var _LBITCO = "ListBucketIntelligentTieringConfigurationsOutput";
    var _LBITCR = "ListBucketIntelligentTieringConfigurationsRequest";
    var _LBMC = "ListBucketMetricsConfigurations";
    var _LBMCO = "ListBucketMetricsConfigurationsOutput";
    var _LBMCR = "ListBucketMetricsConfigurationsRequest";
    var _LBO = "ListBucketsOutput";
    var _LBR = "ListBucketsRequest";
    var _LBRi = "ListBucketResult";
    var _LC = "LocationConstraint";
    var _LCi = "LifecycleConfiguration";
    var _LDB = "ListDirectoryBuckets";
    var _LDBO = "ListDirectoryBucketsOutput";
    var _LDBR = "ListDirectoryBucketsRequest";
    var _LE = "LoggingEnabled";
    var _LEi = "LifecycleExpiration";
    var _LFA = "LambdaFunctionArn";
    var _LFC = "LambdaFunctionConfiguration";
    var _LFCL = "LambdaFunctionConfigurationList";
    var _LFCa = "LambdaFunctionConfigurations";
    var _LH = "LegalHold";
    var _LI = "LocationInfo";
    var _LICR = "ListInventoryConfigurationsResult";
    var _LM = "LastModified";
    var _LMCR = "ListMetricsConfigurationsResult";
    var _LMT = "LastModifiedTime";
    var _LMU = "ListMultipartUploads";
    var _LMUO = "ListMultipartUploadsOutput";
    var _LMUR = "ListMultipartUploadsResult";
    var _LMURi = "ListMultipartUploadsRequest";
    var _LM_ = "Last-Modified";
    var _LO = "ListObjects";
    var _LOO = "ListObjectsOutput";
    var _LOR = "ListObjectsRequest";
    var _LOV = "ListObjectsV2";
    var _LOVO = "ListObjectsV2Output";
    var _LOVOi = "ListObjectVersionsOutput";
    var _LOVR = "ListObjectsV2Request";
    var _LOVRi = "ListObjectVersionsRequest";
    var _LOVi = "ListObjectVersions";
    var _LP = "ListParts";
    var _LPO = "ListPartsOutput";
    var _LPR = "ListPartsResult";
    var _LPRi = "ListPartsRequest";
    var _LR = "LifecycleRule";
    var _LRAO = "LifecycleRuleAndOperator";
    var _LRF = "LifecycleRuleFilter";
    var _LRi = "LifecycleRules";
    var _LVR = "ListVersionsResult";
    var _M = "Metadata";
    var _MAO = "MetricsAndOperator";
    var _MAS = "MaxAgeSeconds";
    var _MB = "MaxBuckets";
    var _MC = "MetadataConfiguration";
    var _MCL = "MetricsConfigurationList";
    var _MCR = "MetadataConfigurationResult";
    var _MCe = "MetricsConfiguration";
    var _MD = "MetadataDirective";
    var _MDB = "MaxDirectoryBuckets";
    var _MDf = "MfaDelete";
    var _ME = "MetadataEntry";
    var _MF = "MetricsFilter";
    var _MFA = "MFA";
    var _MFAD = "MFADelete";
    var _MK = "MaxKeys";
    var _MM = "MissingMeta";
    var _MOS = "MpuObjectSize";
    var _MP = "MaxParts";
    var _MTC = "MetadataTableConfiguration";
    var _MTCR = "MetadataTableConfigurationResult";
    var _MTEC = "MetadataTableEncryptionConfiguration";
    var _MU = "MultipartUpload";
    var _MUL = "MultipartUploadList";
    var _MUa = "MaxUploads";
    var _Ma = "Marker";
    var _Me = "Metrics";
    var _Mes = "Message";
    var _Mi = "Minutes";
    var _Mo = "Mode";
    var _N = "Name";
    var _NC = "NotificationConfiguration";
    var _NCF = "NotificationConfigurationFilter";
    var _NCT = "NextContinuationToken";
    var _ND = "NoncurrentDays";
    var _NEKKAS = "NonEmptyKmsKeyArnString";
    var _NF = "NotFound";
    var _NKM = "NextKeyMarker";
    var _NM = "NextMarker";
    var _NNV = "NewerNoncurrentVersions";
    var _NPNM = "NextPartNumberMarker";
    var _NSB = "NoSuchBucket";
    var _NSK = "NoSuchKey";
    var _NSU = "NoSuchUpload";
    var _NUIM = "NextUploadIdMarker";
    var _NVE = "NoncurrentVersionExpiration";
    var _NVIM = "NextVersionIdMarker";
    var _NVT = "NoncurrentVersionTransitions";
    var _NVTL = "NoncurrentVersionTransitionList";
    var _NVTo = "NoncurrentVersionTransition";
    var _O = "Owner";
    var _OA = "ObjectAttributes";
    var _OAIATE = "ObjectAlreadyInActiveTierError";
    var _OC = "OwnershipControls";
    var _OCR = "OwnershipControlsRule";
    var _OCRw = "OwnershipControlsRules";
    var _OE = "ObjectEncryption";
    var _OF = "OptionalFields";
    var _OI = "ObjectIdentifier";
    var _OIL = "ObjectIdentifierList";
    var _OL = "OutputLocation";
    var _OLC = "ObjectLockConfiguration";
    var _OLE = "ObjectLockEnabled";
    var _OLEFB = "ObjectLockEnabledForBucket";
    var _OLLH = "ObjectLockLegalHold";
    var _OLLHS = "ObjectLockLegalHoldStatus";
    var _OLM = "ObjectLockMode";
    var _OLR = "ObjectLockRetention";
    var _OLRUD = "ObjectLockRetainUntilDate";
    var _OLRb = "ObjectLockRule";
    var _OLb = "ObjectList";
    var _ONIATE = "ObjectNotInActiveTierError";
    var _OO = "ObjectOwnership";
    var _OOA = "OptionalObjectAttributes";
    var _OP = "ObjectParts";
    var _OPb = "ObjectPart";
    var _OS = "ObjectSize";
    var _OSGT = "ObjectSizeGreaterThan";
    var _OSLT = "ObjectSizeLessThan";
    var _OSV = "OutputSchemaVersion";
    var _OSu = "OutputSerialization";
    var _OV = "ObjectVersion";
    var _OVL = "ObjectVersionList";
    var _Ob = "Objects";
    var _Obj = "Object";
    var _P = "Prefix";
    var _PABC = "PublicAccessBlockConfiguration";
    var _PBA = "PutBucketAbac";
    var _PBAC = "PutBucketAccelerateConfiguration";
    var _PBACR = "PutBucketAccelerateConfigurationRequest";
    var _PBACRu = "PutBucketAnalyticsConfigurationRequest";
    var _PBACu = "PutBucketAnalyticsConfiguration";
    var _PBAR = "PutBucketAbacRequest";
    var _PBARu = "PutBucketAclRequest";
    var _PBAu = "PutBucketAcl";
    var _PBC = "PutBucketCors";
    var _PBCR = "PutBucketCorsRequest";
    var _PBE = "PutBucketEncryption";
    var _PBER = "PutBucketEncryptionRequest";
    var _PBIC = "PutBucketInventoryConfiguration";
    var _PBICR = "PutBucketInventoryConfigurationRequest";
    var _PBITC = "PutBucketIntelligentTieringConfiguration";
    var _PBITCR = "PutBucketIntelligentTieringConfigurationRequest";
    var _PBL = "PutBucketLogging";
    var _PBLC = "PutBucketLifecycleConfiguration";
    var _PBLCO = "PutBucketLifecycleConfigurationOutput";
    var _PBLCR = "PutBucketLifecycleConfigurationRequest";
    var _PBLR = "PutBucketLoggingRequest";
    var _PBMC = "PutBucketMetricsConfiguration";
    var _PBMCR = "PutBucketMetricsConfigurationRequest";
    var _PBNC = "PutBucketNotificationConfiguration";
    var _PBNCR = "PutBucketNotificationConfigurationRequest";
    var _PBOC = "PutBucketOwnershipControls";
    var _PBOCR = "PutBucketOwnershipControlsRequest";
    var _PBP = "PutBucketPolicy";
    var _PBPR = "PutBucketPolicyRequest";
    var _PBR = "PutBucketReplication";
    var _PBRP = "PutBucketRequestPayment";
    var _PBRPR = "PutBucketRequestPaymentRequest";
    var _PBRR = "PutBucketReplicationRequest";
    var _PBT = "PutBucketTagging";
    var _PBTR = "PutBucketTaggingRequest";
    var _PBV = "PutBucketVersioning";
    var _PBVR = "PutBucketVersioningRequest";
    var _PBW = "PutBucketWebsite";
    var _PBWR = "PutBucketWebsiteRequest";
    var _PC = "PartsCount";
    var _PDS = "PartitionDateSource";
    var _PE = "ProgressEvent";
    var _PI = "ParquetInput";
    var _PL = "PartsList";
    var _PN = "PartNumber";
    var _PNM = "PartNumberMarker";
    var _PO = "PutObject";
    var _POA = "PutObjectAcl";
    var _POAO = "PutObjectAclOutput";
    var _POAR = "PutObjectAclRequest";
    var _POLC = "PutObjectLockConfiguration";
    var _POLCO = "PutObjectLockConfigurationOutput";
    var _POLCR = "PutObjectLockConfigurationRequest";
    var _POLH = "PutObjectLegalHold";
    var _POLHO = "PutObjectLegalHoldOutput";
    var _POLHR = "PutObjectLegalHoldRequest";
    var _POO = "PutObjectOutput";
    var _POR = "PutObjectRequest";
    var _PORO = "PutObjectRetentionOutput";
    var _PORR = "PutObjectRetentionRequest";
    var _PORu = "PutObjectRetention";
    var _POT = "PutObjectTagging";
    var _POTO = "PutObjectTaggingOutput";
    var _POTR = "PutObjectTaggingRequest";
    var _PP = "PartitionedPrefix";
    var _PPAB = "PutPublicAccessBlock";
    var _PPABR = "PutPublicAccessBlockRequest";
    var _PS = "PolicyStatus";
    var _Pa = "Parts";
    var _Par = "Part";
    var _Parq = "Parquet";
    var _Pay = "Payer";
    var _Payl = "Payload";
    var _Pe = "Permission";
    var _Po = "Policy";
    var _Pr = "Progress";
    var _Pri = "Priority";
    var _Pro = "Protocol";
    var _Q = "Quiet";
    var _QA = "QueueArn";
    var _QC = "QuoteCharacter";
    var _QCL = "QueueConfigurationList";
    var _QCu = "QueueConfigurations";
    var _QCue = "QueueConfiguration";
    var _QEC = "QuoteEscapeCharacter";
    var _QF = "QuoteFields";
    var _Qu = "Queue";
    var _R = "Rules";
    var _RART = "RedirectAllRequestsTo";
    var _RC = "RequestCharged";
    var _RCC = "ResponseCacheControl";
    var _RCD = "ResponseContentDisposition";
    var _RCE = "ResponseContentEncoding";
    var _RCL = "ResponseContentLanguage";
    var _RCT = "ResponseContentType";
    var _RCe = "ReplicationConfiguration";
    var _RD = "RecordDelimiter";
    var _RE = "ResponseExpires";
    var _RED = "RestoreExpiryDate";
    var _REe = "RecordExpiration";
    var _REec = "RecordsEvent";
    var _RKKID = "ReplicaKmsKeyID";
    var _RKPW = "ReplaceKeyPrefixWith";
    var _RKW = "ReplaceKeyWith";
    var _RM = "ReplicaModifications";
    var _RO = "RenameObject";
    var _ROO = "RenameObjectOutput";
    var _ROOe = "RestoreObjectOutput";
    var _ROP = "RestoreOutputPath";
    var _ROR = "RenameObjectRequest";
    var _RORe = "RestoreObjectRequest";
    var _ROe = "RestoreObject";
    var _RP = "RequestPayer";
    var _RPB = "RestrictPublicBuckets";
    var _RPC = "RequestPaymentConfiguration";
    var _RPe = "RequestProgress";
    var _RR = "RoutingRules";
    var _RRAO = "ReplicationRuleAndOperator";
    var _RRF = "ReplicationRuleFilter";
    var _RRe = "ReplicationRule";
    var _RRep = "ReplicationRules";
    var _RReq = "RequestRoute";
    var _RRes = "RestoreRequest";
    var _RRo = "RoutingRule";
    var _RS = "ReplicationStatus";
    var _RSe = "RestoreStatus";
    var _RSen = "RenameSource";
    var _RT = "ReplicationTime";
    var _RTV = "ReplicationTimeValue";
    var _RTe = "RequestToken";
    var _RUD = "RetainUntilDate";
    var _Ra = "Range";
    var _Re = "Restore";
    var _Rec = "Records";
    var _Red = "Redirect";
    var _Ret = "Retention";
    var _Ro = "Role";
    var _Ru = "Rule";
    var _S = "Status";
    var _SA = "StartAfter";
    var _SAK = "SecretAccessKey";
    var _SAs = "SseAlgorithm";
    var _SB = "StreamingBlob";
    var _SBD = "S3BucketDestination";
    var _SC = "StorageClass";
    var _SCA = "StorageClassAnalysis";
    var _SCADE = "StorageClassAnalysisDataExport";
    var _SCV = "SessionCredentialValue";
    var _SCe = "SessionCredentials";
    var _SCt = "StatusCode";
    var _SDV = "SkipDestinationValidation";
    var _SE = "StatsEvent";
    var _SIM = "SourceIfMatch";
    var _SIMS = "SourceIfModifiedSince";
    var _SINM = "SourceIfNoneMatch";
    var _SIUS = "SourceIfUnmodifiedSince";
    var _SK = "SSE-KMS";
    var _SKEO = "SseKmsEncryptedObjects";
    var _SKF = "S3KeyFilter";
    var _SKe = "S3Key";
    var _SL = "S3Location";
    var _SM = "SessionMode";
    var _SOC = "SelectObjectContent";
    var _SOCES = "SelectObjectContentEventStream";
    var _SOCO = "SelectObjectContentOutput";
    var _SOCR = "SelectObjectContentRequest";
    var _SP = "SelectParameters";
    var _SPi = "SimplePrefix";
    var _SR = "ScanRange";
    var _SS = "SSE-S3";
    var _SSC = "SourceSelectionCriteria";
    var _SSE = "ServerSideEncryption";
    var _SSEA = "SSEAlgorithm";
    var _SSEBD = "ServerSideEncryptionByDefault";
    var _SSEC = "ServerSideEncryptionConfiguration";
    var _SSECA = "SSECustomerAlgorithm";
    var _SSECK = "SSECustomerKey";
    var _SSECKMD = "SSECustomerKeyMD5";
    var _SSEKMS = "SSEKMS";
    var _SSEKMSE = "SSEKMSEncryption";
    var _SSEKMSEC = "SSEKMSEncryptionContext";
    var _SSEKMSKI = "SSEKMSKeyId";
    var _SSER = "ServerSideEncryptionRule";
    var _SSERe = "ServerSideEncryptionRules";
    var _SSES = "SSES3";
    var _ST = "SessionToken";
    var _STD = "S3TablesDestination";
    var _STDR = "S3TablesDestinationResult";
    var _S_ = "S3";
    var _Sc = "Schedule";
    var _Si = "Size";
    var _St = "Start";
    var _Sta = "Stats";
    var _Su = "Suffix";
    var _T = "Tags";
    var _TA = "TableArn";
    var _TAo = "TopicArn";
    var _TB = "TargetBucket";
    var _TBA = "TableBucketArn";
    var _TBT = "TableBucketType";
    var _TC = "TagCount";
    var _TCL = "TopicConfigurationList";
    var _TCo = "TopicConfigurations";
    var _TCop = "TopicConfiguration";
    var _TD = "TaggingDirective";
    var _TDMOS = "TransitionDefaultMinimumObjectSize";
    var _TG = "TargetGrants";
    var _TGa = "TargetGrant";
    var _TL = "TieringList";
    var _TLr = "TransitionList";
    var _TMP = "TooManyParts";
    var _TN = "TableNamespace";
    var _TNa = "TableName";
    var _TOKF = "TargetObjectKeyFormat";
    var _TP = "TargetPrefix";
    var _TPC = "TotalPartsCount";
    var _TS = "TagSet";
    var _TSa = "TableStatus";
    var _Ta = "Tag";
    var _Tag = "Tagging";
    var _Ti = "Tier";
    var _Tie = "Tierings";
    var _Tier = "Tiering";
    var _Tim = "Time";
    var _To = "Token";
    var _Top = "Topic";
    var _Tr = "Transitions";
    var _Tra = "Transition";
    var _Ty = "Type";
    var _U = "Uploads";
    var _UBMITC = "UpdateBucketMetadataInventoryTableConfiguration";
    var _UBMITCR = "UpdateBucketMetadataInventoryTableConfigurationRequest";
    var _UBMJTC = "UpdateBucketMetadataJournalTableConfiguration";
    var _UBMJTCR = "UpdateBucketMetadataJournalTableConfigurationRequest";
    var _UI = "UploadId";
    var _UIM = "UploadIdMarker";
    var _UM = "UserMetadata";
    var _UOE = "UpdateObjectEncryption";
    var _UOER = "UpdateObjectEncryptionRequest";
    var _UOERp = "UpdateObjectEncryptionResponse";
    var _UP = "UploadPart";
    var _UPC = "UploadPartCopy";
    var _UPCO = "UploadPartCopyOutput";
    var _UPCR = "UploadPartCopyRequest";
    var _UPO = "UploadPartOutput";
    var _UPR = "UploadPartRequest";
    var _URI = "URI";
    var _Up = "Upload";
    var _V = "Value";
    var _VC = "VersioningConfiguration";
    var _VI = "VersionId";
    var _VIM = "VersionIdMarker";
    var _Ve = "Versions";
    var _Ver = "Version";
    var _WC = "WebsiteConfiguration";
    var _WGOR = "WriteGetObjectResponse";
    var _WGORR = "WriteGetObjectResponseRequest";
    var _WOB = "WriteOffsetBytes";
    var _WRL = "WebsiteRedirectLocation";
    var _Y = "Years";
    var _ar = "accept-ranges";
    var _br = "bucket-region";
    var _c = "client";
    var _ct = "continuation-token";
    var _d = "delimiter";
    var _e = "error";
    var _eP = "eventPayload";
    var _en = "endpoint";
    var _et = "encoding-type";
    var _fo = "fetch-owner";
    var _h = "http";
    var _hC = "httpChecksum";
    var _hE = "httpError";
    var _hH = "httpHeader";
    var _hL = "hostLabel";
    var _hP = "httpPayload";
    var _hPH = "httpPrefixHeaders";
    var _hQ = "httpQuery";
    var _hi = "http://www.w3.org/2001/XMLSchema-instance";
    var _i = "id";
    var _iT = "idempotencyToken";
    var _km = "key-marker";
    var _m = "marker";
    var _mb = "max-buckets";
    var _mdb = "max-directory-buckets";
    var _mk = "max-keys";
    var _mp = "max-parts";
    var _mu = "max-uploads";
    var _p = "prefix";
    var _pN = "partNumber";
    var _pnm = "part-number-marker";
    var _rcc = "response-cache-control";
    var _rcd = "response-content-disposition";
    var _rce = "response-content-encoding";
    var _rcl = "response-content-language";
    var _rct = "response-content-type";
    var _re = "response-expires";
    var _s = "smithy.ts.sdk.synthetic.com.amazonaws.s3";
    var _sa = "start-after";
    var _st = "streaming";
    var _uI = "uploadId";
    var _uim = "upload-id-marker";
    var _vI = "versionId";
    var _vim = "version-id-marker";
    var _x = "xsi";
    var _xA = "xmlAttribute";
    var _xF = "xmlFlattened";
    var _xN = "xmlName";
    var _xNm = "xmlNamespace";
    var _xaa = "x-amz-acl";
    var _xaad = "x-amz-abort-date";
    var _xaapa = "x-amz-access-point-alias";
    var _xaari = "x-amz-abort-rule-id";
    var _xaas = "x-amz-archive-status";
    var _xaba = "x-amz-bucket-arn";
    var _xabgr = "x-amz-bypass-governance-retention";
    var _xabln = "x-amz-bucket-location-name";
    var _xablt = "x-amz-bucket-location-type";
    var _xabn = "x-amz-bucket-namespace";
    var _xabole = "x-amz-bucket-object-lock-enabled";
    var _xabolt = "x-amz-bucket-object-lock-token";
    var _xabr = "x-amz-bucket-region";
    var _xaca = "x-amz-checksum-algorithm";
    var _xacc = "x-amz-checksum-crc32";
    var _xacc_ = "x-amz-checksum-crc32c";
    var _xacc__ = "x-amz-checksum-crc64nvme";
    var _xacm = "x-amz-checksum-md5";
    var _xacm_ = "x-amz-checksum-mode";
    var _xacrsba = "x-amz-confirm-remove-self-bucket-access";
    var _xacs = "x-amz-checksum-sha1";
    var _xacs_ = "x-amz-checksum-sha256";
    var _xacs__ = "x-amz-checksum-sha512";
    var _xacs___ = "x-amz-copy-source";
    var _xacsim = "x-amz-copy-source-if-match";
    var _xacsims = "x-amz-copy-source-if-modified-since";
    var _xacsinm = "x-amz-copy-source-if-none-match";
    var _xacsius = "x-amz-copy-source-if-unmodified-since";
    var _xacsm = "x-amz-create-session-mode";
    var _xacsr = "x-amz-copy-source-range";
    var _xacssseca = "x-amz-copy-source-server-side-encryption-customer-algorithm";
    var _xacssseck = "x-amz-copy-source-server-side-encryption-customer-key";
    var _xacssseckM = "x-amz-copy-source-server-side-encryption-customer-key-MD5";
    var _xacsvi = "x-amz-copy-source-version-id";
    var _xact = "x-amz-checksum-type";
    var _xact_ = "x-amz-client-token";
    var _xacx = "x-amz-checksum-xxhash64";
    var _xacx_ = "x-amz-checksum-xxhash3";
    var _xacx__ = "x-amz-checksum-xxhash128";
    var _xadm = "x-amz-delete-marker";
    var _xae = "x-amz-expiration";
    var _xaebo = "x-amz-expected-bucket-owner";
    var _xafec = "x-amz-fwd-error-code";
    var _xafem = "x-amz-fwd-error-message";
    var _xafhCC = "x-amz-fwd-header-Cache-Control";
    var _xafhCD = "x-amz-fwd-header-Content-Disposition";
    var _xafhCE = "x-amz-fwd-header-Content-Encoding";
    var _xafhCL = "x-amz-fwd-header-Content-Language";
    var _xafhCR = "x-amz-fwd-header-Content-Range";
    var _xafhCT = "x-amz-fwd-header-Content-Type";
    var _xafhE = "x-amz-fwd-header-ETag";
    var _xafhE_ = "x-amz-fwd-header-Expires";
    var _xafhLM = "x-amz-fwd-header-Last-Modified";
    var _xafhar = "x-amz-fwd-header-accept-ranges";
    var _xafhxacc = "x-amz-fwd-header-x-amz-checksum-crc32";
    var _xafhxacc_ = "x-amz-fwd-header-x-amz-checksum-crc32c";
    var _xafhxacc__ = "x-amz-fwd-header-x-amz-checksum-crc64nvme";
    var _xafhxacm = "x-amz-fwd-header-x-amz-checksum-md5";
    var _xafhxacs = "x-amz-fwd-header-x-amz-checksum-sha1";
    var _xafhxacs_ = "x-amz-fwd-header-x-amz-checksum-sha256";
    var _xafhxacs__ = "x-amz-fwd-header-x-amz-checksum-sha512";
    var _xafhxacx = "x-amz-fwd-header-x-amz-checksum-xxhash64";
    var _xafhxacx_ = "x-amz-fwd-header-x-amz-checksum-xxhash3";
    var _xafhxacx__ = "x-amz-fwd-header-x-amz-checksum-xxhash128";
    var _xafhxadm = "x-amz-fwd-header-x-amz-delete-marker";
    var _xafhxae = "x-amz-fwd-header-x-amz-expiration";
    var _xafhxamm = "x-amz-fwd-header-x-amz-missing-meta";
    var _xafhxampc = "x-amz-fwd-header-x-amz-mp-parts-count";
    var _xafhxaollh = "x-amz-fwd-header-x-amz-object-lock-legal-hold";
    var _xafhxaolm = "x-amz-fwd-header-x-amz-object-lock-mode";
    var _xafhxaolrud = "x-amz-fwd-header-x-amz-object-lock-retain-until-date";
    var _xafhxar = "x-amz-fwd-header-x-amz-restore";
    var _xafhxarc = "x-amz-fwd-header-x-amz-request-charged";
    var _xafhxars = "x-amz-fwd-header-x-amz-replication-status";
    var _xafhxasc = "x-amz-fwd-header-x-amz-storage-class";
    var _xafhxasse = "x-amz-fwd-header-x-amz-server-side-encryption";
    var _xafhxasseakki = "x-amz-fwd-header-x-amz-server-side-encryption-aws-kms-key-id";
    var _xafhxassebke = "x-amz-fwd-header-x-amz-server-side-encryption-bucket-key-enabled";
    var _xafhxasseca = "x-amz-fwd-header-x-amz-server-side-encryption-customer-algorithm";
    var _xafhxasseckM = "x-amz-fwd-header-x-amz-server-side-encryption-customer-key-MD5";
    var _xafhxatc = "x-amz-fwd-header-x-amz-tagging-count";
    var _xafhxavi = "x-amz-fwd-header-x-amz-version-id";
    var _xafs = "x-amz-fwd-status";
    var _xagfc = "x-amz-grant-full-control";
    var _xagr = "x-amz-grant-read";
    var _xagra = "x-amz-grant-read-acp";
    var _xagw = "x-amz-grant-write";
    var _xagwa = "x-amz-grant-write-acp";
    var _xaimit = "x-amz-if-match-initiated-time";
    var _xaimlmt = "x-amz-if-match-last-modified-time";
    var _xaims = "x-amz-if-match-size";
    var _xam = "x-amz-meta-";
    var _xam_ = "x-amz-mfa";
    var _xamd = "x-amz-metadata-directive";
    var _xamm = "x-amz-missing-meta";
    var _xamos = "x-amz-mp-object-size";
    var _xamp = "x-amz-max-parts";
    var _xampc = "x-amz-mp-parts-count";
    var _xaoa = "x-amz-object-attributes";
    var _xaollh = "x-amz-object-lock-legal-hold";
    var _xaolm = "x-amz-object-lock-mode";
    var _xaolrud = "x-amz-object-lock-retain-until-date";
    var _xaoo = "x-amz-object-ownership";
    var _xaooa = "x-amz-optional-object-attributes";
    var _xaos = "x-amz-object-size";
    var _xapnm = "x-amz-part-number-marker";
    var _xar = "x-amz-restore";
    var _xarc = "x-amz-request-charged";
    var _xarop = "x-amz-restore-output-path";
    var _xarp = "x-amz-request-payer";
    var _xarr = "x-amz-request-route";
    var _xars = "x-amz-replication-status";
    var _xars_ = "x-amz-rename-source";
    var _xarsim = "x-amz-rename-source-if-match";
    var _xarsims = "x-amz-rename-source-if-modified-since";
    var _xarsinm = "x-amz-rename-source-if-none-match";
    var _xarsius = "x-amz-rename-source-if-unmodified-since";
    var _xart = "x-amz-request-token";
    var _xasc = "x-amz-storage-class";
    var _xasca = "x-amz-sdk-checksum-algorithm";
    var _xasdv = "x-amz-skip-destination-validation";
    var _xasebo = "x-amz-source-expected-bucket-owner";
    var _xasse = "x-amz-server-side-encryption";
    var _xasseakki = "x-amz-server-side-encryption-aws-kms-key-id";
    var _xassebke = "x-amz-server-side-encryption-bucket-key-enabled";
    var _xassec = "x-amz-server-side-encryption-context";
    var _xasseca = "x-amz-server-side-encryption-customer-algorithm";
    var _xasseck = "x-amz-server-side-encryption-customer-key";
    var _xasseckM = "x-amz-server-side-encryption-customer-key-MD5";
    var _xat = "x-amz-tagging";
    var _xatc = "x-amz-tagging-count";
    var _xatd = "x-amz-tagging-directive";
    var _xatdmos = "x-amz-transition-default-minimum-object-size";
    var _xavi = "x-amz-version-id";
    var _xawob = "x-amz-write-offset-bytes";
    var _xawrl = "x-amz-website-redirect-location";
    var _xs = "xsi:type";
    var n0 = "com.amazonaws.s3";
    var schema_1 = (init_schema(), __toCommonJS(schema_exports));
    var errors_1 = require_errors();
    var S3ServiceException_1 = require_S3ServiceException();
    var _s_registry = schema_1.TypeRegistry.for(_s);
    exports.S3ServiceException$ = [-3, _s, "S3ServiceException", 0, [], []];
    _s_registry.registerError(exports.S3ServiceException$, S3ServiceException_1.S3ServiceException);
    var n0_registry = schema_1.TypeRegistry.for(n0);
    exports.AccessDenied$ = [
      -3,
      n0,
      _AD,
      { [_e]: _c, [_hE]: 403 },
      [],
      []
    ];
    n0_registry.registerError(exports.AccessDenied$, errors_1.AccessDenied);
    exports.BucketAlreadyExists$ = [
      -3,
      n0,
      _BAE,
      { [_e]: _c, [_hE]: 409 },
      [],
      []
    ];
    n0_registry.registerError(exports.BucketAlreadyExists$, errors_1.BucketAlreadyExists);
    exports.BucketAlreadyOwnedByYou$ = [
      -3,
      n0,
      _BAOBY,
      { [_e]: _c, [_hE]: 409 },
      [],
      []
    ];
    n0_registry.registerError(exports.BucketAlreadyOwnedByYou$, errors_1.BucketAlreadyOwnedByYou);
    exports.EncryptionTypeMismatch$ = [
      -3,
      n0,
      _ETM,
      { [_e]: _c, [_hE]: 400 },
      [],
      []
    ];
    n0_registry.registerError(exports.EncryptionTypeMismatch$, errors_1.EncryptionTypeMismatch);
    exports.IdempotencyParameterMismatch$ = [
      -3,
      n0,
      _IPM,
      { [_e]: _c, [_hE]: 400 },
      [],
      []
    ];
    n0_registry.registerError(exports.IdempotencyParameterMismatch$, errors_1.IdempotencyParameterMismatch);
    exports.InvalidObjectState$ = [
      -3,
      n0,
      _IOS,
      { [_e]: _c, [_hE]: 403 },
      [_SC, _AT],
      [0, 0]
    ];
    n0_registry.registerError(exports.InvalidObjectState$, errors_1.InvalidObjectState);
    exports.InvalidRequest$ = [
      -3,
      n0,
      _IR,
      { [_e]: _c, [_hE]: 400 },
      [],
      []
    ];
    n0_registry.registerError(exports.InvalidRequest$, errors_1.InvalidRequest);
    exports.InvalidWriteOffset$ = [
      -3,
      n0,
      _IWO,
      { [_e]: _c, [_hE]: 400 },
      [],
      []
    ];
    n0_registry.registerError(exports.InvalidWriteOffset$, errors_1.InvalidWriteOffset);
    exports.NoSuchBucket$ = [
      -3,
      n0,
      _NSB,
      { [_e]: _c, [_hE]: 404 },
      [],
      []
    ];
    n0_registry.registerError(exports.NoSuchBucket$, errors_1.NoSuchBucket);
    exports.NoSuchKey$ = [
      -3,
      n0,
      _NSK,
      { [_e]: _c, [_hE]: 404 },
      [],
      []
    ];
    n0_registry.registerError(exports.NoSuchKey$, errors_1.NoSuchKey);
    exports.NoSuchUpload$ = [
      -3,
      n0,
      _NSU,
      { [_e]: _c, [_hE]: 404 },
      [],
      []
    ];
    n0_registry.registerError(exports.NoSuchUpload$, errors_1.NoSuchUpload);
    exports.NotFound$ = [
      -3,
      n0,
      _NF,
      { [_e]: _c },
      [],
      []
    ];
    n0_registry.registerError(exports.NotFound$, errors_1.NotFound);
    exports.ObjectAlreadyInActiveTierError$ = [
      -3,
      n0,
      _OAIATE,
      { [_e]: _c, [_hE]: 403 },
      [],
      []
    ];
    n0_registry.registerError(exports.ObjectAlreadyInActiveTierError$, errors_1.ObjectAlreadyInActiveTierError);
    exports.ObjectNotInActiveTierError$ = [
      -3,
      n0,
      _ONIATE,
      { [_e]: _c, [_hE]: 403 },
      [],
      []
    ];
    n0_registry.registerError(exports.ObjectNotInActiveTierError$, errors_1.ObjectNotInActiveTierError);
    exports.TooManyParts$ = [
      -3,
      n0,
      _TMP,
      { [_e]: _c, [_hE]: 400 },
      [],
      []
    ];
    n0_registry.registerError(exports.TooManyParts$, errors_1.TooManyParts);
    exports.errorTypeRegistries = [
      _s_registry,
      n0_registry
    ];
    var CopySourceSSECustomerKey = [0, n0, _CSSSECK, 8, 0];
    var NonEmptyKmsKeyArnString = [0, n0, _NEKKAS, 8, 0];
    var SessionCredentialValue = [0, n0, _SCV, 8, 0];
    var SSECustomerKey = [0, n0, _SSECK, 8, 0];
    var SSEKMSEncryptionContext = [0, n0, _SSEKMSEC, 8, 0];
    var SSEKMSKeyId = [0, n0, _SSEKMSKI, 8, 0];
    var StreamingBlob = [0, n0, _SB, { [_st]: 1 }, 42];
    exports.AbacStatus$ = [
      3,
      n0,
      _AS,
      0,
      [_S],
      [0]
    ];
    exports.AbortIncompleteMultipartUpload$ = [
      3,
      n0,
      _AIMU,
      0,
      [_DAI],
      [1]
    ];
    exports.AbortMultipartUploadOutput$ = [
      3,
      n0,
      _AMUO,
      0,
      [_RC],
      [[0, { [_hH]: _xarc }]]
    ];
    exports.AbortMultipartUploadRequest$ = [
      3,
      n0,
      _AMUR,
      0,
      [_B, _K, _UI, _RP, _EBO, _IMIT],
      [[0, 1], [0, 1], [0, { [_hQ]: _uI }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }], [6, { [_hH]: _xaimit }]],
      3
    ];
    exports.AccelerateConfiguration$ = [
      3,
      n0,
      _AC,
      0,
      [_S],
      [0]
    ];
    exports.AccessControlPolicy$ = [
      3,
      n0,
      _ACP,
      0,
      [_G, _O],
      [[() => Grants, { [_xN]: _ACL }], () => exports.Owner$]
    ];
    exports.AccessControlTranslation$ = [
      3,
      n0,
      _ACT,
      0,
      [_O],
      [0],
      1
    ];
    exports.AnalyticsAndOperator$ = [
      3,
      n0,
      _AAO,
      0,
      [_P, _T],
      [0, [() => TagSet, { [_xF]: 1, [_xN]: _Ta }]]
    ];
    exports.AnalyticsConfiguration$ = [
      3,
      n0,
      _ACn,
      0,
      [_I, _SCA, _F],
      [0, () => exports.StorageClassAnalysis$, [() => exports.AnalyticsFilter$, 0]],
      2
    ];
    exports.AnalyticsExportDestination$ = [
      3,
      n0,
      _AED,
      0,
      [_SBD],
      [() => exports.AnalyticsS3BucketDestination$],
      1
    ];
    exports.AnalyticsS3BucketDestination$ = [
      3,
      n0,
      _ASBD,
      0,
      [_Fo, _B, _BAI, _P],
      [0, 0, 0, 0],
      2
    ];
    exports.BlockedEncryptionTypes$ = [
      3,
      n0,
      _BET,
      0,
      [_ET],
      [[() => EncryptionTypeList, { [_xF]: 1 }]]
    ];
    exports.Bucket$ = [
      3,
      n0,
      _B,
      0,
      [_N, _CD, _BR, _BA],
      [0, 4, 0, 0]
    ];
    exports.BucketInfo$ = [
      3,
      n0,
      _BI,
      0,
      [_DR, _Ty],
      [0, 0]
    ];
    exports.BucketLifecycleConfiguration$ = [
      3,
      n0,
      _BLC,
      0,
      [_R],
      [[() => LifecycleRules, { [_xF]: 1, [_xN]: _Ru }]],
      1
    ];
    exports.BucketLoggingStatus$ = [
      3,
      n0,
      _BLS,
      0,
      [_LE],
      [[() => exports.LoggingEnabled$, 0]]
    ];
    exports.Checksum$ = [
      3,
      n0,
      _C,
      0,
      [_CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _CT],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    exports.CommonPrefix$ = [
      3,
      n0,
      _CP,
      0,
      [_P],
      [0]
    ];
    exports.CompletedMultipartUpload$ = [
      3,
      n0,
      _CMU,
      0,
      [_Pa],
      [[() => CompletedPartList, { [_xF]: 1, [_xN]: _Par }]]
    ];
    exports.CompletedPart$ = [
      3,
      n0,
      _CPo,
      0,
      [_ETa, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _PN],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    ];
    exports.CompleteMultipartUploadOutput$ = [
      3,
      n0,
      _CMUO,
      { [_xN]: _CMUR },
      [_L, _B, _K, _E, _ETa, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _CT, _SSE, _VI, _SSEKMSKI, _BKE, _RC],
      [0, 0, 0, [0, { [_hH]: _xae }], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, [0, { [_hH]: _xasse }], [0, { [_hH]: _xavi }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xarc }]]
    ];
    exports.CompleteMultipartUploadRequest$ = [
      3,
      n0,
      _CMURo,
      0,
      [_B, _K, _UI, _MU, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _CT, _MOS, _RP, _EBO, _IM, _INM, _SSECA, _SSECK, _SSECKMD],
      [[0, 1], [0, 1], [0, { [_hQ]: _uI }], [() => exports.CompletedMultipartUpload$, { [_hP]: 1, [_xN]: _CMUo }], [0, { [_hH]: _xacc }], [0, { [_hH]: _xacc_ }], [0, { [_hH]: _xacc__ }], [0, { [_hH]: _xacs }], [0, { [_hH]: _xacs_ }], [0, { [_hH]: _xacs__ }], [0, { [_hH]: _xacm }], [0, { [_hH]: _xacx }], [0, { [_hH]: _xacx_ }], [0, { [_hH]: _xacx__ }], [0, { [_hH]: _xact }], [1, { [_hH]: _xamos }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _IM_ }], [0, { [_hH]: _INM_ }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }]],
      3
    ];
    exports.Condition$ = [
      3,
      n0,
      _Co,
      0,
      [_HECRE, _KPE],
      [0, 0]
    ];
    exports.ContinuationEvent$ = [
      3,
      n0,
      _CE,
      0,
      [],
      []
    ];
    exports.CopyObjectOutput$ = [
      3,
      n0,
      _COO,
      0,
      [_COR, _E, _CSVI, _VI, _SSE, _SSECA, _SSECKMD, _SSEKMSKI, _SSEKMSEC, _BKE, _RC],
      [[() => exports.CopyObjectResult$, 16], [0, { [_hH]: _xae }], [0, { [_hH]: _xacsvi }], [0, { [_hH]: _xavi }], [0, { [_hH]: _xasse }], [0, { [_hH]: _xasseca }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [() => SSEKMSEncryptionContext, { [_hH]: _xassec }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xarc }]]
    ];
    exports.CopyObjectRequest$ = [
      3,
      n0,
      _CORo,
      0,
      [_B, _CS, _K, _ACL_, _CC, _CA, _CDo, _CEo, _CL, _CTo, _CSIM, _CSIMS, _CSINM, _CSIUS, _Ex, _GFC, _GR, _GRACP, _GWACP, _IM, _INM, _M, _MD, _TD, _SSE, _SC, _WRL, _SSECA, _SSECK, _SSECKMD, _SSEKMSKI, _SSEKMSEC, _BKE, _CSSSECA, _CSSSECK, _CSSSECKMD, _RP, _Tag, _OLM, _OLRUD, _OLLHS, _EBO, _ESBO],
      [[0, 1], [0, { [_hH]: _xacs___ }], [0, 1], [0, { [_hH]: _xaa }], [0, { [_hH]: _CC_ }], [0, { [_hH]: _xaca }], [0, { [_hH]: _CD_ }], [0, { [_hH]: _CE_ }], [0, { [_hH]: _CL_ }], [0, { [_hH]: _CT_ }], [0, { [_hH]: _xacsim }], [4, { [_hH]: _xacsims }], [0, { [_hH]: _xacsinm }], [4, { [_hH]: _xacsius }], [4, { [_hH]: _Ex }], [0, { [_hH]: _xagfc }], [0, { [_hH]: _xagr }], [0, { [_hH]: _xagra }], [0, { [_hH]: _xagwa }], [0, { [_hH]: _IM_ }], [0, { [_hH]: _INM_ }], [128 | 0, { [_hPH]: _xam }], [0, { [_hH]: _xamd }], [0, { [_hH]: _xatd }], [0, { [_hH]: _xasse }], [0, { [_hH]: _xasc }], [0, { [_hH]: _xawrl }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [() => SSEKMSEncryptionContext, { [_hH]: _xassec }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xacssseca }], [() => CopySourceSSECustomerKey, { [_hH]: _xacssseck }], [0, { [_hH]: _xacssseckM }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xat }], [0, { [_hH]: _xaolm }], [5, { [_hH]: _xaolrud }], [0, { [_hH]: _xaollh }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xasebo }]],
      3
    ];
    exports.CopyObjectResult$ = [
      3,
      n0,
      _COR,
      0,
      [_ETa, _LM, _CT, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe],
      [0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    exports.CopyPartResult$ = [
      3,
      n0,
      _CPR,
      0,
      [_ETa, _LM, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe],
      [0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    exports.CORSConfiguration$ = [
      3,
      n0,
      _CORSC,
      0,
      [_CORSR],
      [[() => CORSRules, { [_xF]: 1, [_xN]: _CORSRu }]],
      1
    ];
    exports.CORSRule$ = [
      3,
      n0,
      _CORSRu,
      0,
      [_AM, _AO, _ID, _AH, _EH, _MAS],
      [[64 | 0, { [_xF]: 1, [_xN]: _AMl }], [64 | 0, { [_xF]: 1, [_xN]: _AOl }], 0, [64 | 0, { [_xF]: 1, [_xN]: _AHl }], [64 | 0, { [_xF]: 1, [_xN]: _EHx }], 1],
      2
    ];
    exports.CreateBucketConfiguration$ = [
      3,
      n0,
      _CBC,
      0,
      [_LC, _L, _B, _T],
      [0, () => exports.LocationInfo$, () => exports.BucketInfo$, [() => TagSet, 0]]
    ];
    exports.CreateBucketMetadataConfigurationRequest$ = [
      3,
      n0,
      _CBMCR,
      0,
      [_B, _MC, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.MetadataConfiguration$, { [_hP]: 1, [_xN]: _MC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.CreateBucketMetadataTableConfigurationRequest$ = [
      3,
      n0,
      _CBMTCR,
      0,
      [_B, _MTC, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.MetadataTableConfiguration$, { [_hP]: 1, [_xN]: _MTC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.CreateBucketOutput$ = [
      3,
      n0,
      _CBO,
      0,
      [_L, _BA],
      [[0, { [_hH]: _L }], [0, { [_hH]: _xaba }]]
    ];
    exports.CreateBucketRequest$ = [
      3,
      n0,
      _CBR,
      0,
      [_B, _ACL_, _CBC, _GFC, _GR, _GRACP, _GW, _GWACP, _OLEFB, _OO, _BN],
      [[0, 1], [0, { [_hH]: _xaa }], [() => exports.CreateBucketConfiguration$, { [_hP]: 1, [_xN]: _CBC }], [0, { [_hH]: _xagfc }], [0, { [_hH]: _xagr }], [0, { [_hH]: _xagra }], [0, { [_hH]: _xagw }], [0, { [_hH]: _xagwa }], [2, { [_hH]: _xabole }], [0, { [_hH]: _xaoo }], [0, { [_hH]: _xabn }]],
      1
    ];
    exports.CreateMultipartUploadOutput$ = [
      3,
      n0,
      _CMUOr,
      { [_xN]: _IMUR },
      [_ADb, _ARI, _B, _K, _UI, _SSE, _SSECA, _SSECKMD, _SSEKMSKI, _SSEKMSEC, _BKE, _RC, _CA, _CT],
      [[4, { [_hH]: _xaad }], [0, { [_hH]: _xaari }], [0, { [_xN]: _B }], 0, 0, [0, { [_hH]: _xasse }], [0, { [_hH]: _xasseca }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [() => SSEKMSEncryptionContext, { [_hH]: _xassec }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xarc }], [0, { [_hH]: _xaca }], [0, { [_hH]: _xact }]]
    ];
    exports.CreateMultipartUploadRequest$ = [
      3,
      n0,
      _CMURr,
      0,
      [_B, _K, _ACL_, _CC, _CDo, _CEo, _CL, _CTo, _Ex, _GFC, _GR, _GRACP, _GWACP, _M, _SSE, _SC, _WRL, _SSECA, _SSECK, _SSECKMD, _SSEKMSKI, _SSEKMSEC, _BKE, _RP, _Tag, _OLM, _OLRUD, _OLLHS, _EBO, _CA, _CT],
      [[0, 1], [0, 1], [0, { [_hH]: _xaa }], [0, { [_hH]: _CC_ }], [0, { [_hH]: _CD_ }], [0, { [_hH]: _CE_ }], [0, { [_hH]: _CL_ }], [0, { [_hH]: _CT_ }], [4, { [_hH]: _Ex }], [0, { [_hH]: _xagfc }], [0, { [_hH]: _xagr }], [0, { [_hH]: _xagra }], [0, { [_hH]: _xagwa }], [128 | 0, { [_hPH]: _xam }], [0, { [_hH]: _xasse }], [0, { [_hH]: _xasc }], [0, { [_hH]: _xawrl }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [() => SSEKMSEncryptionContext, { [_hH]: _xassec }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xat }], [0, { [_hH]: _xaolm }], [5, { [_hH]: _xaolrud }], [0, { [_hH]: _xaollh }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xaca }], [0, { [_hH]: _xact }]],
      2
    ];
    exports.CreateSessionOutput$ = [
      3,
      n0,
      _CSO,
      { [_xN]: _CSR },
      [_Cr, _SSE, _SSEKMSKI, _SSEKMSEC, _BKE],
      [[() => exports.SessionCredentials$, { [_xN]: _Cr }], [0, { [_hH]: _xasse }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [() => SSEKMSEncryptionContext, { [_hH]: _xassec }], [2, { [_hH]: _xassebke }]],
      1
    ];
    exports.CreateSessionRequest$ = [
      3,
      n0,
      _CSRr,
      0,
      [_B, _SM, _SSE, _SSEKMSKI, _SSEKMSEC, _BKE],
      [[0, 1], [0, { [_hH]: _xacsm }], [0, { [_hH]: _xasse }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [() => SSEKMSEncryptionContext, { [_hH]: _xassec }], [2, { [_hH]: _xassebke }]],
      1
    ];
    exports.CSVInput$ = [
      3,
      n0,
      _CSVIn,
      0,
      [_FHI, _Com, _QEC, _RD, _FD, _QC, _AQRD],
      [0, 0, 0, 0, 0, 0, 2]
    ];
    exports.CSVOutput$ = [
      3,
      n0,
      _CSVO,
      0,
      [_QF, _QEC, _RD, _FD, _QC],
      [0, 0, 0, 0, 0]
    ];
    exports.DefaultRetention$ = [
      3,
      n0,
      _DRe,
      0,
      [_Mo, _D, _Y],
      [0, 1, 1]
    ];
    exports.Delete$ = [
      3,
      n0,
      _De,
      0,
      [_Ob, _Q],
      [[() => ObjectIdentifierList, { [_xF]: 1, [_xN]: _Obj }], 2],
      1
    ];
    exports.DeleteBucketAnalyticsConfigurationRequest$ = [
      3,
      n0,
      _DBACR,
      0,
      [_B, _I, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.DeleteBucketCorsRequest$ = [
      3,
      n0,
      _DBCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketEncryptionRequest$ = [
      3,
      n0,
      _DBER,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketIntelligentTieringConfigurationRequest$ = [
      3,
      n0,
      _DBITCR,
      0,
      [_B, _I, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.DeleteBucketInventoryConfigurationRequest$ = [
      3,
      n0,
      _DBICR,
      0,
      [_B, _I, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.DeleteBucketLifecycleRequest$ = [
      3,
      n0,
      _DBLR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketMetadataConfigurationRequest$ = [
      3,
      n0,
      _DBMCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketMetadataTableConfigurationRequest$ = [
      3,
      n0,
      _DBMTCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketMetricsConfigurationRequest$ = [
      3,
      n0,
      _DBMCRe,
      0,
      [_B, _I, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.DeleteBucketOwnershipControlsRequest$ = [
      3,
      n0,
      _DBOCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketPolicyRequest$ = [
      3,
      n0,
      _DBPR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketReplicationRequest$ = [
      3,
      n0,
      _DBRR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketRequest$ = [
      3,
      n0,
      _DBR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketTaggingRequest$ = [
      3,
      n0,
      _DBTR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeleteBucketWebsiteRequest$ = [
      3,
      n0,
      _DBWR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.DeletedObject$ = [
      3,
      n0,
      _DO,
      0,
      [_K, _VI, _DM, _DMVI],
      [0, 0, 2, 0]
    ];
    exports.DeleteMarkerEntry$ = [
      3,
      n0,
      _DME,
      0,
      [_O, _K, _VI, _IL, _LM],
      [() => exports.Owner$, 0, 0, 2, 4]
    ];
    exports.DeleteMarkerReplication$ = [
      3,
      n0,
      _DMR,
      0,
      [_S],
      [0]
    ];
    exports.DeleteObjectOutput$ = [
      3,
      n0,
      _DOO,
      0,
      [_DM, _VI, _RC],
      [[2, { [_hH]: _xadm }], [0, { [_hH]: _xavi }], [0, { [_hH]: _xarc }]]
    ];
    exports.DeleteObjectRequest$ = [
      3,
      n0,
      _DOR,
      0,
      [_B, _K, _MFA, _VI, _RP, _BGR, _EBO, _IM, _IMLMT, _IMS],
      [[0, 1], [0, 1], [0, { [_hH]: _xam_ }], [0, { [_hQ]: _vI }], [0, { [_hH]: _xarp }], [2, { [_hH]: _xabgr }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _IM_ }], [6, { [_hH]: _xaimlmt }], [1, { [_hH]: _xaims }]],
      2
    ];
    exports.DeleteObjectsOutput$ = [
      3,
      n0,
      _DOOe,
      { [_xN]: _DRel },
      [_Del, _RC, _Er],
      [[() => DeletedObjects, { [_xF]: 1 }], [0, { [_hH]: _xarc }], [() => Errors, { [_xF]: 1, [_xN]: _Err }]]
    ];
    exports.DeleteObjectsRequest$ = [
      3,
      n0,
      _DORe,
      0,
      [_B, _De, _MFA, _RP, _BGR, _EBO, _CA],
      [[0, 1], [() => exports.Delete$, { [_hP]: 1, [_xN]: _De }], [0, { [_hH]: _xam_ }], [0, { [_hH]: _xarp }], [2, { [_hH]: _xabgr }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xasca }]],
      2
    ];
    exports.DeleteObjectTaggingOutput$ = [
      3,
      n0,
      _DOTO,
      0,
      [_VI],
      [[0, { [_hH]: _xavi }]]
    ];
    exports.DeleteObjectTaggingRequest$ = [
      3,
      n0,
      _DOTR,
      0,
      [_B, _K, _VI, _EBO],
      [[0, 1], [0, 1], [0, { [_hQ]: _vI }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.DeletePublicAccessBlockRequest$ = [
      3,
      n0,
      _DPABR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.Destination$ = [
      3,
      n0,
      _Des,
      0,
      [_B, _A, _SC, _ACT, _EC, _RT, _Me],
      [0, 0, 0, () => exports.AccessControlTranslation$, () => exports.EncryptionConfiguration$, () => exports.ReplicationTime$, () => exports.Metrics$],
      1
    ];
    exports.DestinationResult$ = [
      3,
      n0,
      _DRes,
      0,
      [_TBT, _TBA, _TN],
      [0, 0, 0]
    ];
    exports.Encryption$ = [
      3,
      n0,
      _En,
      0,
      [_ET, _KMSKI, _KMSC],
      [0, [() => SSEKMSKeyId, 0], 0],
      1
    ];
    exports.EncryptionConfiguration$ = [
      3,
      n0,
      _EC,
      0,
      [_RKKID],
      [0]
    ];
    exports.EndEvent$ = [
      3,
      n0,
      _EE,
      0,
      [],
      []
    ];
    exports._Error$ = [
      3,
      n0,
      _Err,
      0,
      [_K, _VI, _Cod, _Mes],
      [0, 0, 0, 0]
    ];
    exports.ErrorDetails$ = [
      3,
      n0,
      _ED,
      0,
      [_ECr, _EM],
      [0, 0]
    ];
    exports.ErrorDocument$ = [
      3,
      n0,
      _EDr,
      0,
      [_K],
      [0],
      1
    ];
    exports.EventBridgeConfiguration$ = [
      3,
      n0,
      _EBC,
      0,
      [],
      []
    ];
    exports.ExistingObjectReplication$ = [
      3,
      n0,
      _EOR,
      0,
      [_S],
      [0],
      1
    ];
    exports.FilterRule$ = [
      3,
      n0,
      _FR,
      0,
      [_N, _V],
      [0, 0]
    ];
    exports.GetBucketAbacOutput$ = [
      3,
      n0,
      _GBAO,
      0,
      [_AS],
      [[() => exports.AbacStatus$, 16]]
    ];
    exports.GetBucketAbacRequest$ = [
      3,
      n0,
      _GBAR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketAccelerateConfigurationOutput$ = [
      3,
      n0,
      _GBACO,
      { [_xN]: _AC },
      [_S, _RC],
      [0, [0, { [_hH]: _xarc }]]
    ];
    exports.GetBucketAccelerateConfigurationRequest$ = [
      3,
      n0,
      _GBACR,
      0,
      [_B, _EBO, _RP],
      [[0, 1], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xarp }]],
      1
    ];
    exports.GetBucketAclOutput$ = [
      3,
      n0,
      _GBAOe,
      { [_xN]: _ACP },
      [_O, _G],
      [() => exports.Owner$, [() => Grants, { [_xN]: _ACL }]]
    ];
    exports.GetBucketAclRequest$ = [
      3,
      n0,
      _GBARe,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketAnalyticsConfigurationOutput$ = [
      3,
      n0,
      _GBACOe,
      0,
      [_ACn],
      [[() => exports.AnalyticsConfiguration$, 16]]
    ];
    exports.GetBucketAnalyticsConfigurationRequest$ = [
      3,
      n0,
      _GBACRe,
      0,
      [_B, _I, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.GetBucketCorsOutput$ = [
      3,
      n0,
      _GBCO,
      { [_xN]: _CORSC },
      [_CORSR],
      [[() => CORSRules, { [_xF]: 1, [_xN]: _CORSRu }]]
    ];
    exports.GetBucketCorsRequest$ = [
      3,
      n0,
      _GBCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketEncryptionOutput$ = [
      3,
      n0,
      _GBEO,
      0,
      [_SSEC],
      [[() => exports.ServerSideEncryptionConfiguration$, 16]]
    ];
    exports.GetBucketEncryptionRequest$ = [
      3,
      n0,
      _GBER,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketIntelligentTieringConfigurationOutput$ = [
      3,
      n0,
      _GBITCO,
      0,
      [_ITC],
      [[() => exports.IntelligentTieringConfiguration$, 16]]
    ];
    exports.GetBucketIntelligentTieringConfigurationRequest$ = [
      3,
      n0,
      _GBITCR,
      0,
      [_B, _I, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.GetBucketInventoryConfigurationOutput$ = [
      3,
      n0,
      _GBICO,
      0,
      [_IC],
      [[() => exports.InventoryConfiguration$, 16]]
    ];
    exports.GetBucketInventoryConfigurationRequest$ = [
      3,
      n0,
      _GBICR,
      0,
      [_B, _I, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.GetBucketLifecycleConfigurationOutput$ = [
      3,
      n0,
      _GBLCO,
      { [_xN]: _LCi },
      [_R, _TDMOS],
      [[() => LifecycleRules, { [_xF]: 1, [_xN]: _Ru }], [0, { [_hH]: _xatdmos }]]
    ];
    exports.GetBucketLifecycleConfigurationRequest$ = [
      3,
      n0,
      _GBLCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketLocationOutput$ = [
      3,
      n0,
      _GBLO,
      { [_xN]: _LC },
      [_LC],
      [0]
    ];
    exports.GetBucketLocationRequest$ = [
      3,
      n0,
      _GBLR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketLoggingOutput$ = [
      3,
      n0,
      _GBLOe,
      { [_xN]: _BLS },
      [_LE],
      [[() => exports.LoggingEnabled$, 0]]
    ];
    exports.GetBucketLoggingRequest$ = [
      3,
      n0,
      _GBLRe,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketMetadataConfigurationOutput$ = [
      3,
      n0,
      _GBMCO,
      0,
      [_GBMCR],
      [[() => exports.GetBucketMetadataConfigurationResult$, 16]]
    ];
    exports.GetBucketMetadataConfigurationRequest$ = [
      3,
      n0,
      _GBMCRe,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketMetadataConfigurationResult$ = [
      3,
      n0,
      _GBMCR,
      0,
      [_MCR],
      [() => exports.MetadataConfigurationResult$],
      1
    ];
    exports.GetBucketMetadataTableConfigurationOutput$ = [
      3,
      n0,
      _GBMTCO,
      0,
      [_GBMTCR],
      [[() => exports.GetBucketMetadataTableConfigurationResult$, 16]]
    ];
    exports.GetBucketMetadataTableConfigurationRequest$ = [
      3,
      n0,
      _GBMTCRe,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketMetadataTableConfigurationResult$ = [
      3,
      n0,
      _GBMTCR,
      0,
      [_MTCR, _S, _Err],
      [() => exports.MetadataTableConfigurationResult$, 0, () => exports.ErrorDetails$],
      2
    ];
    exports.GetBucketMetricsConfigurationOutput$ = [
      3,
      n0,
      _GBMCOe,
      0,
      [_MCe],
      [[() => exports.MetricsConfiguration$, 16]]
    ];
    exports.GetBucketMetricsConfigurationRequest$ = [
      3,
      n0,
      _GBMCRet,
      0,
      [_B, _I, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.GetBucketNotificationConfigurationRequest$ = [
      3,
      n0,
      _GBNCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketOwnershipControlsOutput$ = [
      3,
      n0,
      _GBOCO,
      0,
      [_OC],
      [[() => exports.OwnershipControls$, 16]]
    ];
    exports.GetBucketOwnershipControlsRequest$ = [
      3,
      n0,
      _GBOCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketPolicyOutput$ = [
      3,
      n0,
      _GBPO,
      0,
      [_Po],
      [[0, 16]]
    ];
    exports.GetBucketPolicyRequest$ = [
      3,
      n0,
      _GBPR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketPolicyStatusOutput$ = [
      3,
      n0,
      _GBPSO,
      0,
      [_PS],
      [[() => exports.PolicyStatus$, 16]]
    ];
    exports.GetBucketPolicyStatusRequest$ = [
      3,
      n0,
      _GBPSR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketReplicationOutput$ = [
      3,
      n0,
      _GBRO,
      0,
      [_RCe],
      [[() => exports.ReplicationConfiguration$, 16]]
    ];
    exports.GetBucketReplicationRequest$ = [
      3,
      n0,
      _GBRR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketRequestPaymentOutput$ = [
      3,
      n0,
      _GBRPO,
      { [_xN]: _RPC },
      [_Pay],
      [0]
    ];
    exports.GetBucketRequestPaymentRequest$ = [
      3,
      n0,
      _GBRPR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketTaggingOutput$ = [
      3,
      n0,
      _GBTO,
      { [_xN]: _Tag },
      [_TS],
      [[() => TagSet, 0]],
      1
    ];
    exports.GetBucketTaggingRequest$ = [
      3,
      n0,
      _GBTR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketVersioningOutput$ = [
      3,
      n0,
      _GBVO,
      { [_xN]: _VC },
      [_S, _MFAD],
      [0, [0, { [_xN]: _MDf }]]
    ];
    exports.GetBucketVersioningRequest$ = [
      3,
      n0,
      _GBVR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetBucketWebsiteOutput$ = [
      3,
      n0,
      _GBWO,
      { [_xN]: _WC },
      [_RART, _IDn, _EDr, _RR],
      [() => exports.RedirectAllRequestsTo$, () => exports.IndexDocument$, () => exports.ErrorDocument$, [() => RoutingRules, 0]]
    ];
    exports.GetBucketWebsiteRequest$ = [
      3,
      n0,
      _GBWR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetObjectAclOutput$ = [
      3,
      n0,
      _GOAO,
      { [_xN]: _ACP },
      [_O, _G, _RC],
      [() => exports.Owner$, [() => Grants, { [_xN]: _ACL }], [0, { [_hH]: _xarc }]]
    ];
    exports.GetObjectAclRequest$ = [
      3,
      n0,
      _GOAR,
      0,
      [_B, _K, _VI, _RP, _EBO],
      [[0, 1], [0, 1], [0, { [_hQ]: _vI }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.GetObjectAttributesOutput$ = [
      3,
      n0,
      _GOAOe,
      { [_xN]: _GOARe },
      [_DM, _LM, _VI, _RC, _ETa, _C, _OP, _SC, _OS],
      [[2, { [_hH]: _xadm }], [4, { [_hH]: _LM_ }], [0, { [_hH]: _xavi }], [0, { [_hH]: _xarc }], 0, () => exports.Checksum$, [() => exports.GetObjectAttributesParts$, 0], 0, 1]
    ];
    exports.GetObjectAttributesParts$ = [
      3,
      n0,
      _GOAP,
      0,
      [_TPC, _PNM, _NPNM, _MP, _IT, _Pa],
      [[1, { [_xN]: _PC }], 0, 0, 1, 2, [() => PartsList, { [_xF]: 1, [_xN]: _Par }]]
    ];
    exports.GetObjectAttributesRequest$ = [
      3,
      n0,
      _GOARet,
      0,
      [_B, _K, _OA, _VI, _MP, _PNM, _SSECA, _SSECK, _SSECKMD, _RP, _EBO],
      [[0, 1], [0, 1], [64 | 0, { [_hH]: _xaoa }], [0, { [_hQ]: _vI }], [1, { [_hH]: _xamp }], [0, { [_hH]: _xapnm }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }]],
      3
    ];
    exports.GetObjectLegalHoldOutput$ = [
      3,
      n0,
      _GOLHO,
      0,
      [_LH],
      [[() => exports.ObjectLockLegalHold$, { [_hP]: 1, [_xN]: _LH }]]
    ];
    exports.GetObjectLegalHoldRequest$ = [
      3,
      n0,
      _GOLHR,
      0,
      [_B, _K, _VI, _RP, _EBO],
      [[0, 1], [0, 1], [0, { [_hQ]: _vI }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.GetObjectLockConfigurationOutput$ = [
      3,
      n0,
      _GOLCO,
      0,
      [_OLC],
      [[() => exports.ObjectLockConfiguration$, 16]]
    ];
    exports.GetObjectLockConfigurationRequest$ = [
      3,
      n0,
      _GOLCR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GetObjectOutput$ = [
      3,
      n0,
      _GOO,
      0,
      [_Bo, _DM, _AR, _E, _Re, _LM, _CLo, _ETa, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _CT, _MM, _VI, _CC, _CDo, _CEo, _CL, _CR, _CTo, _Ex, _ES, _WRL, _SSE, _M, _SSECA, _SSECKMD, _SSEKMSKI, _BKE, _SC, _RC, _RS, _PC, _TC, _OLM, _OLRUD, _OLLHS],
      [[() => StreamingBlob, 16], [2, { [_hH]: _xadm }], [0, { [_hH]: _ar }], [0, { [_hH]: _xae }], [0, { [_hH]: _xar }], [4, { [_hH]: _LM_ }], [1, { [_hH]: _CL__ }], [0, { [_hH]: _ETa }], [0, { [_hH]: _xacc }], [0, { [_hH]: _xacc_ }], [0, { [_hH]: _xacc__ }], [0, { [_hH]: _xacs }], [0, { [_hH]: _xacs_ }], [0, { [_hH]: _xacs__ }], [0, { [_hH]: _xacm }], [0, { [_hH]: _xacx }], [0, { [_hH]: _xacx_ }], [0, { [_hH]: _xacx__ }], [0, { [_hH]: _xact }], [1, { [_hH]: _xamm }], [0, { [_hH]: _xavi }], [0, { [_hH]: _CC_ }], [0, { [_hH]: _CD_ }], [0, { [_hH]: _CE_ }], [0, { [_hH]: _CL_ }], [0, { [_hH]: _CR_ }], [0, { [_hH]: _CT_ }], [4, { [_hH]: _Ex }], [0, { [_hH]: _ES }], [0, { [_hH]: _xawrl }], [0, { [_hH]: _xasse }], [128 | 0, { [_hPH]: _xam }], [0, { [_hH]: _xasseca }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xasc }], [0, { [_hH]: _xarc }], [0, { [_hH]: _xars }], [1, { [_hH]: _xampc }], [1, { [_hH]: _xatc }], [0, { [_hH]: _xaolm }], [5, { [_hH]: _xaolrud }], [0, { [_hH]: _xaollh }]]
    ];
    exports.GetObjectRequest$ = [
      3,
      n0,
      _GOR,
      0,
      [_B, _K, _IM, _IMSf, _INM, _IUS, _Ra, _RCC, _RCD, _RCE, _RCL, _RCT, _RE, _VI, _SSECA, _SSECK, _SSECKMD, _RP, _PN, _EBO, _CMh],
      [[0, 1], [0, 1], [0, { [_hH]: _IM_ }], [4, { [_hH]: _IMS_ }], [0, { [_hH]: _INM_ }], [4, { [_hH]: _IUS_ }], [0, { [_hH]: _Ra }], [0, { [_hQ]: _rcc }], [0, { [_hQ]: _rcd }], [0, { [_hQ]: _rce }], [0, { [_hQ]: _rcl }], [0, { [_hQ]: _rct }], [6, { [_hQ]: _re }], [0, { [_hQ]: _vI }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], [0, { [_hH]: _xarp }], [1, { [_hQ]: _pN }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xacm_ }]],
      2
    ];
    exports.GetObjectRetentionOutput$ = [
      3,
      n0,
      _GORO,
      0,
      [_Ret],
      [[() => exports.ObjectLockRetention$, { [_hP]: 1, [_xN]: _Ret }]]
    ];
    exports.GetObjectRetentionRequest$ = [
      3,
      n0,
      _GORR,
      0,
      [_B, _K, _VI, _RP, _EBO],
      [[0, 1], [0, 1], [0, { [_hQ]: _vI }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.GetObjectTaggingOutput$ = [
      3,
      n0,
      _GOTO,
      { [_xN]: _Tag },
      [_TS, _VI],
      [[() => TagSet, 0], [0, { [_hH]: _xavi }]],
      1
    ];
    exports.GetObjectTaggingRequest$ = [
      3,
      n0,
      _GOTR,
      0,
      [_B, _K, _VI, _EBO, _RP],
      [[0, 1], [0, 1], [0, { [_hQ]: _vI }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xarp }]],
      2
    ];
    exports.GetObjectTorrentOutput$ = [
      3,
      n0,
      _GOTOe,
      0,
      [_Bo, _RC],
      [[() => StreamingBlob, 16], [0, { [_hH]: _xarc }]]
    ];
    exports.GetObjectTorrentRequest$ = [
      3,
      n0,
      _GOTRe,
      0,
      [_B, _K, _RP, _EBO],
      [[0, 1], [0, 1], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.GetPublicAccessBlockOutput$ = [
      3,
      n0,
      _GPABO,
      0,
      [_PABC],
      [[() => exports.PublicAccessBlockConfiguration$, 16]]
    ];
    exports.GetPublicAccessBlockRequest$ = [
      3,
      n0,
      _GPABR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.GlacierJobParameters$ = [
      3,
      n0,
      _GJP,
      0,
      [_Ti],
      [0],
      1
    ];
    exports.Grant$ = [
      3,
      n0,
      _Gr,
      0,
      [_Gra, _Pe],
      [[() => exports.Grantee$, { [_xNm]: [_x, _hi] }], 0]
    ];
    exports.Grantee$ = [
      3,
      n0,
      _Gra,
      0,
      [_Ty, _DN, _EA, _ID, _URI],
      [[0, { [_xA]: 1, [_xN]: _xs }], 0, 0, 0, 0],
      1
    ];
    exports.HeadBucketOutput$ = [
      3,
      n0,
      _HBO,
      0,
      [_BA, _BLT, _BLN, _BR, _APA],
      [[0, { [_hH]: _xaba }], [0, { [_hH]: _xablt }], [0, { [_hH]: _xabln }], [0, { [_hH]: _xabr }], [2, { [_hH]: _xaapa }]]
    ];
    exports.HeadBucketRequest$ = [
      3,
      n0,
      _HBR,
      0,
      [_B, _EBO],
      [[0, 1], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.HeadObjectOutput$ = [
      3,
      n0,
      _HOO,
      0,
      [_DM, _AR, _E, _Re, _ASr, _LM, _CLo, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _CT, _ETa, _MM, _VI, _CC, _CDo, _CEo, _CL, _CTo, _CR, _Ex, _ES, _WRL, _SSE, _M, _SSECA, _SSECKMD, _SSEKMSKI, _BKE, _SC, _RC, _RS, _PC, _TC, _OLM, _OLRUD, _OLLHS],
      [[2, { [_hH]: _xadm }], [0, { [_hH]: _ar }], [0, { [_hH]: _xae }], [0, { [_hH]: _xar }], [0, { [_hH]: _xaas }], [4, { [_hH]: _LM_ }], [1, { [_hH]: _CL__ }], [0, { [_hH]: _xacc }], [0, { [_hH]: _xacc_ }], [0, { [_hH]: _xacc__ }], [0, { [_hH]: _xacs }], [0, { [_hH]: _xacs_ }], [0, { [_hH]: _xacs__ }], [0, { [_hH]: _xacm }], [0, { [_hH]: _xacx }], [0, { [_hH]: _xacx_ }], [0, { [_hH]: _xacx__ }], [0, { [_hH]: _xact }], [0, { [_hH]: _ETa }], [1, { [_hH]: _xamm }], [0, { [_hH]: _xavi }], [0, { [_hH]: _CC_ }], [0, { [_hH]: _CD_ }], [0, { [_hH]: _CE_ }], [0, { [_hH]: _CL_ }], [0, { [_hH]: _CT_ }], [0, { [_hH]: _CR_ }], [4, { [_hH]: _Ex }], [0, { [_hH]: _ES }], [0, { [_hH]: _xawrl }], [0, { [_hH]: _xasse }], [128 | 0, { [_hPH]: _xam }], [0, { [_hH]: _xasseca }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xasc }], [0, { [_hH]: _xarc }], [0, { [_hH]: _xars }], [1, { [_hH]: _xampc }], [1, { [_hH]: _xatc }], [0, { [_hH]: _xaolm }], [5, { [_hH]: _xaolrud }], [0, { [_hH]: _xaollh }]]
    ];
    exports.HeadObjectRequest$ = [
      3,
      n0,
      _HOR,
      0,
      [_B, _K, _IM, _IMSf, _INM, _IUS, _Ra, _RCC, _RCD, _RCE, _RCL, _RCT, _RE, _VI, _SSECA, _SSECK, _SSECKMD, _RP, _PN, _EBO, _CMh],
      [[0, 1], [0, 1], [0, { [_hH]: _IM_ }], [4, { [_hH]: _IMS_ }], [0, { [_hH]: _INM_ }], [4, { [_hH]: _IUS_ }], [0, { [_hH]: _Ra }], [0, { [_hQ]: _rcc }], [0, { [_hQ]: _rcd }], [0, { [_hQ]: _rce }], [0, { [_hQ]: _rcl }], [0, { [_hQ]: _rct }], [6, { [_hQ]: _re }], [0, { [_hQ]: _vI }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], [0, { [_hH]: _xarp }], [1, { [_hQ]: _pN }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xacm_ }]],
      2
    ];
    exports.IndexDocument$ = [
      3,
      n0,
      _IDn,
      0,
      [_Su],
      [0],
      1
    ];
    exports.Initiator$ = [
      3,
      n0,
      _In,
      0,
      [_ID, _DN],
      [0, 0]
    ];
    exports.InputSerialization$ = [
      3,
      n0,
      _IS,
      0,
      [_CSV, _CTom, _JSON, _Parq],
      [() => exports.CSVInput$, 0, () => exports.JSONInput$, () => exports.ParquetInput$]
    ];
    exports.IntelligentTieringAndOperator$ = [
      3,
      n0,
      _ITAO,
      0,
      [_P, _T],
      [0, [() => TagSet, { [_xF]: 1, [_xN]: _Ta }]]
    ];
    exports.IntelligentTieringConfiguration$ = [
      3,
      n0,
      _ITC,
      0,
      [_I, _S, _Tie, _F],
      [0, 0, [() => TieringList, { [_xF]: 1, [_xN]: _Tier }], [() => exports.IntelligentTieringFilter$, 0]],
      3
    ];
    exports.IntelligentTieringFilter$ = [
      3,
      n0,
      _ITF,
      0,
      [_P, _Ta, _An],
      [0, () => exports.Tag$, [() => exports.IntelligentTieringAndOperator$, 0]]
    ];
    exports.InventoryConfiguration$ = [
      3,
      n0,
      _IC,
      0,
      [_Des, _IE, _I, _IOV, _Sc, _F, _OF],
      [[() => exports.InventoryDestination$, 0], 2, 0, 0, () => exports.InventorySchedule$, () => exports.InventoryFilter$, [() => InventoryOptionalFields, 0]],
      5
    ];
    exports.InventoryDestination$ = [
      3,
      n0,
      _IDnv,
      0,
      [_SBD],
      [[() => exports.InventoryS3BucketDestination$, 0]],
      1
    ];
    exports.InventoryEncryption$ = [
      3,
      n0,
      _IEn,
      0,
      [_SSES, _SSEKMS],
      [[() => exports.SSES3$, { [_xN]: _SS }], [() => exports.SSEKMS$, { [_xN]: _SK }]]
    ];
    exports.InventoryFilter$ = [
      3,
      n0,
      _IF,
      0,
      [_P],
      [0],
      1
    ];
    exports.InventoryS3BucketDestination$ = [
      3,
      n0,
      _ISBD,
      0,
      [_B, _Fo, _AI, _P, _En],
      [0, 0, 0, 0, [() => exports.InventoryEncryption$, 0]],
      2
    ];
    exports.InventorySchedule$ = [
      3,
      n0,
      _ISn,
      0,
      [_Fr],
      [0],
      1
    ];
    exports.InventoryTableConfiguration$ = [
      3,
      n0,
      _ITCn,
      0,
      [_CSo, _EC],
      [0, () => exports.MetadataTableEncryptionConfiguration$],
      1
    ];
    exports.InventoryTableConfigurationResult$ = [
      3,
      n0,
      _ITCR,
      0,
      [_CSo, _TSa, _Err, _TNa, _TA],
      [0, 0, () => exports.ErrorDetails$, 0, 0],
      1
    ];
    exports.InventoryTableConfigurationUpdates$ = [
      3,
      n0,
      _ITCU,
      0,
      [_CSo, _EC],
      [0, () => exports.MetadataTableEncryptionConfiguration$],
      1
    ];
    exports.JournalTableConfiguration$ = [
      3,
      n0,
      _JTC,
      0,
      [_REe, _EC],
      [() => exports.RecordExpiration$, () => exports.MetadataTableEncryptionConfiguration$],
      1
    ];
    exports.JournalTableConfigurationResult$ = [
      3,
      n0,
      _JTCR,
      0,
      [_TSa, _TNa, _REe, _Err, _TA],
      [0, 0, () => exports.RecordExpiration$, () => exports.ErrorDetails$, 0],
      3
    ];
    exports.JournalTableConfigurationUpdates$ = [
      3,
      n0,
      _JTCU,
      0,
      [_REe],
      [() => exports.RecordExpiration$],
      1
    ];
    exports.JSONInput$ = [
      3,
      n0,
      _JSONI,
      0,
      [_Ty],
      [0]
    ];
    exports.JSONOutput$ = [
      3,
      n0,
      _JSONO,
      0,
      [_RD],
      [0]
    ];
    exports.LambdaFunctionConfiguration$ = [
      3,
      n0,
      _LFC,
      0,
      [_LFA, _Ev, _I, _F],
      [[0, { [_xN]: _CF }], [64 | 0, { [_xF]: 1, [_xN]: _Eve }], 0, [() => exports.NotificationConfigurationFilter$, 0]],
      2
    ];
    exports.LifecycleExpiration$ = [
      3,
      n0,
      _LEi,
      0,
      [_Da, _D, _EODM],
      [5, 1, 2]
    ];
    exports.LifecycleRule$ = [
      3,
      n0,
      _LR,
      0,
      [_S, _E, _ID, _P, _F, _Tr, _NVT, _NVE, _AIMU],
      [0, () => exports.LifecycleExpiration$, 0, 0, [() => exports.LifecycleRuleFilter$, 0], [() => TransitionList, { [_xF]: 1, [_xN]: _Tra }], [() => NoncurrentVersionTransitionList, { [_xF]: 1, [_xN]: _NVTo }], () => exports.NoncurrentVersionExpiration$, () => exports.AbortIncompleteMultipartUpload$],
      1
    ];
    exports.LifecycleRuleAndOperator$ = [
      3,
      n0,
      _LRAO,
      0,
      [_P, _T, _OSGT, _OSLT],
      [0, [() => TagSet, { [_xF]: 1, [_xN]: _Ta }], 1, 1]
    ];
    exports.LifecycleRuleFilter$ = [
      3,
      n0,
      _LRF,
      0,
      [_P, _Ta, _OSGT, _OSLT, _An],
      [0, () => exports.Tag$, 1, 1, [() => exports.LifecycleRuleAndOperator$, 0]]
    ];
    exports.ListBucketAnalyticsConfigurationsOutput$ = [
      3,
      n0,
      _LBACO,
      { [_xN]: _LBACR },
      [_IT, _CTon, _NCT, _ACLn],
      [2, 0, 0, [() => AnalyticsConfigurationList, { [_xF]: 1, [_xN]: _ACn }]]
    ];
    exports.ListBucketAnalyticsConfigurationsRequest$ = [
      3,
      n0,
      _LBACRi,
      0,
      [_B, _CTon, _EBO],
      [[0, 1], [0, { [_hQ]: _ct }], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.ListBucketIntelligentTieringConfigurationsOutput$ = [
      3,
      n0,
      _LBITCO,
      0,
      [_IT, _CTon, _NCT, _ITCL],
      [2, 0, 0, [() => IntelligentTieringConfigurationList, { [_xF]: 1, [_xN]: _ITC }]]
    ];
    exports.ListBucketIntelligentTieringConfigurationsRequest$ = [
      3,
      n0,
      _LBITCR,
      0,
      [_B, _CTon, _EBO],
      [[0, 1], [0, { [_hQ]: _ct }], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.ListBucketInventoryConfigurationsOutput$ = [
      3,
      n0,
      _LBICO,
      { [_xN]: _LICR },
      [_CTon, _ICL, _IT, _NCT],
      [0, [() => InventoryConfigurationList, { [_xF]: 1, [_xN]: _IC }], 2, 0]
    ];
    exports.ListBucketInventoryConfigurationsRequest$ = [
      3,
      n0,
      _LBICR,
      0,
      [_B, _CTon, _EBO],
      [[0, 1], [0, { [_hQ]: _ct }], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.ListBucketMetricsConfigurationsOutput$ = [
      3,
      n0,
      _LBMCO,
      { [_xN]: _LMCR },
      [_IT, _CTon, _NCT, _MCL],
      [2, 0, 0, [() => MetricsConfigurationList, { [_xF]: 1, [_xN]: _MCe }]]
    ];
    exports.ListBucketMetricsConfigurationsRequest$ = [
      3,
      n0,
      _LBMCR,
      0,
      [_B, _CTon, _EBO],
      [[0, 1], [0, { [_hQ]: _ct }], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.ListBucketsOutput$ = [
      3,
      n0,
      _LBO,
      { [_xN]: _LAMBR },
      [_Bu, _O, _CTon, _P],
      [[() => Buckets, 0], () => exports.Owner$, 0, 0]
    ];
    exports.ListBucketsRequest$ = [
      3,
      n0,
      _LBR,
      0,
      [_MB, _CTon, _P, _BR],
      [[1, { [_hQ]: _mb }], [0, { [_hQ]: _ct }], [0, { [_hQ]: _p }], [0, { [_hQ]: _br }]]
    ];
    exports.ListDirectoryBucketsOutput$ = [
      3,
      n0,
      _LDBO,
      { [_xN]: _LAMDBR },
      [_Bu, _CTon],
      [[() => Buckets, 0], 0]
    ];
    exports.ListDirectoryBucketsRequest$ = [
      3,
      n0,
      _LDBR,
      0,
      [_CTon, _MDB],
      [[0, { [_hQ]: _ct }], [1, { [_hQ]: _mdb }]]
    ];
    exports.ListMultipartUploadsOutput$ = [
      3,
      n0,
      _LMUO,
      { [_xN]: _LMUR },
      [_B, _KM, _UIM, _NKM, _P, _Deli, _NUIM, _MUa, _IT, _U, _CPom, _ETn, _RC],
      [0, 0, 0, 0, 0, 0, 0, 1, 2, [() => MultipartUploadList, { [_xF]: 1, [_xN]: _Up }], [() => CommonPrefixList, { [_xF]: 1 }], 0, [0, { [_hH]: _xarc }]]
    ];
    exports.ListMultipartUploadsRequest$ = [
      3,
      n0,
      _LMURi,
      0,
      [_B, _Deli, _ETn, _KM, _MUa, _P, _UIM, _EBO, _RP],
      [[0, 1], [0, { [_hQ]: _d }], [0, { [_hQ]: _et }], [0, { [_hQ]: _km }], [1, { [_hQ]: _mu }], [0, { [_hQ]: _p }], [0, { [_hQ]: _uim }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xarp }]],
      1
    ];
    exports.ListObjectsOutput$ = [
      3,
      n0,
      _LOO,
      { [_xN]: _LBRi },
      [_IT, _Ma, _NM, _Con, _N, _P, _Deli, _MK, _CPom, _ETn, _RC],
      [2, 0, 0, [() => ObjectList, { [_xF]: 1 }], 0, 0, 0, 1, [() => CommonPrefixList, { [_xF]: 1 }], 0, [0, { [_hH]: _xarc }]]
    ];
    exports.ListObjectsRequest$ = [
      3,
      n0,
      _LOR,
      0,
      [_B, _Deli, _ETn, _Ma, _MK, _P, _RP, _EBO, _OOA],
      [[0, 1], [0, { [_hQ]: _d }], [0, { [_hQ]: _et }], [0, { [_hQ]: _m }], [1, { [_hQ]: _mk }], [0, { [_hQ]: _p }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }], [64 | 0, { [_hH]: _xaooa }]],
      1
    ];
    exports.ListObjectsV2Output$ = [
      3,
      n0,
      _LOVO,
      { [_xN]: _LBRi },
      [_IT, _Con, _N, _P, _Deli, _MK, _CPom, _ETn, _KC, _CTon, _NCT, _SA, _RC],
      [2, [() => ObjectList, { [_xF]: 1 }], 0, 0, 0, 1, [() => CommonPrefixList, { [_xF]: 1 }], 0, 1, 0, 0, 0, [0, { [_hH]: _xarc }]]
    ];
    exports.ListObjectsV2Request$ = [
      3,
      n0,
      _LOVR,
      0,
      [_B, _Deli, _ETn, _MK, _P, _CTon, _FO, _SA, _RP, _EBO, _OOA],
      [[0, 1], [0, { [_hQ]: _d }], [0, { [_hQ]: _et }], [1, { [_hQ]: _mk }], [0, { [_hQ]: _p }], [0, { [_hQ]: _ct }], [2, { [_hQ]: _fo }], [0, { [_hQ]: _sa }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }], [64 | 0, { [_hH]: _xaooa }]],
      1
    ];
    exports.ListObjectVersionsOutput$ = [
      3,
      n0,
      _LOVOi,
      { [_xN]: _LVR },
      [_IT, _KM, _VIM, _NKM, _NVIM, _Ve, _DMe, _N, _P, _Deli, _MK, _CPom, _ETn, _RC],
      [2, 0, 0, 0, 0, [() => ObjectVersionList, { [_xF]: 1, [_xN]: _Ver }], [() => DeleteMarkers, { [_xF]: 1, [_xN]: _DM }], 0, 0, 0, 1, [() => CommonPrefixList, { [_xF]: 1 }], 0, [0, { [_hH]: _xarc }]]
    ];
    exports.ListObjectVersionsRequest$ = [
      3,
      n0,
      _LOVRi,
      0,
      [_B, _Deli, _ETn, _KM, _MK, _P, _VIM, _EBO, _RP, _OOA],
      [[0, 1], [0, { [_hQ]: _d }], [0, { [_hQ]: _et }], [0, { [_hQ]: _km }], [1, { [_hQ]: _mk }], [0, { [_hQ]: _p }], [0, { [_hQ]: _vim }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xarp }], [64 | 0, { [_hH]: _xaooa }]],
      1
    ];
    exports.ListPartsOutput$ = [
      3,
      n0,
      _LPO,
      { [_xN]: _LPR },
      [_ADb, _ARI, _B, _K, _UI, _PNM, _NPNM, _MP, _IT, _Pa, _In, _O, _SC, _RC, _CA, _CT],
      [[4, { [_hH]: _xaad }], [0, { [_hH]: _xaari }], 0, 0, 0, 0, 0, 1, 2, [() => Parts, { [_xF]: 1, [_xN]: _Par }], () => exports.Initiator$, () => exports.Owner$, 0, [0, { [_hH]: _xarc }], 0, 0]
    ];
    exports.ListPartsRequest$ = [
      3,
      n0,
      _LPRi,
      0,
      [_B, _K, _UI, _MP, _PNM, _RP, _EBO, _SSECA, _SSECK, _SSECKMD],
      [[0, 1], [0, 1], [0, { [_hQ]: _uI }], [1, { [_hQ]: _mp }], [0, { [_hQ]: _pnm }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }]],
      3
    ];
    exports.LocationInfo$ = [
      3,
      n0,
      _LI,
      0,
      [_Ty, _N],
      [0, 0]
    ];
    exports.LoggingEnabled$ = [
      3,
      n0,
      _LE,
      0,
      [_TB, _TP, _TG, _TOKF],
      [0, 0, [() => TargetGrants, 0], [() => exports.TargetObjectKeyFormat$, 0]],
      2
    ];
    exports.MetadataConfiguration$ = [
      3,
      n0,
      _MC,
      0,
      [_JTC, _ITCn],
      [() => exports.JournalTableConfiguration$, () => exports.InventoryTableConfiguration$],
      1
    ];
    exports.MetadataConfigurationResult$ = [
      3,
      n0,
      _MCR,
      0,
      [_DRes, _JTCR, _ITCR],
      [() => exports.DestinationResult$, () => exports.JournalTableConfigurationResult$, () => exports.InventoryTableConfigurationResult$],
      1
    ];
    exports.MetadataEntry$ = [
      3,
      n0,
      _ME,
      0,
      [_N, _V],
      [0, 0]
    ];
    exports.MetadataTableConfiguration$ = [
      3,
      n0,
      _MTC,
      0,
      [_STD],
      [() => exports.S3TablesDestination$],
      1
    ];
    exports.MetadataTableConfigurationResult$ = [
      3,
      n0,
      _MTCR,
      0,
      [_STDR],
      [() => exports.S3TablesDestinationResult$],
      1
    ];
    exports.MetadataTableEncryptionConfiguration$ = [
      3,
      n0,
      _MTEC,
      0,
      [_SAs, _KKA],
      [0, 0],
      1
    ];
    exports.Metrics$ = [
      3,
      n0,
      _Me,
      0,
      [_S, _ETv],
      [0, () => exports.ReplicationTimeValue$],
      1
    ];
    exports.MetricsAndOperator$ = [
      3,
      n0,
      _MAO,
      0,
      [_P, _T, _APAc],
      [0, [() => TagSet, { [_xF]: 1, [_xN]: _Ta }], 0]
    ];
    exports.MetricsConfiguration$ = [
      3,
      n0,
      _MCe,
      0,
      [_I, _F],
      [0, [() => exports.MetricsFilter$, 0]],
      1
    ];
    exports.MultipartUpload$ = [
      3,
      n0,
      _MU,
      0,
      [_UI, _K, _Ini, _SC, _O, _In, _CA, _CT],
      [0, 0, 4, 0, () => exports.Owner$, () => exports.Initiator$, 0, 0]
    ];
    exports.NoncurrentVersionExpiration$ = [
      3,
      n0,
      _NVE,
      0,
      [_ND, _NNV],
      [1, 1]
    ];
    exports.NoncurrentVersionTransition$ = [
      3,
      n0,
      _NVTo,
      0,
      [_ND, _SC, _NNV],
      [1, 0, 1]
    ];
    exports.NotificationConfiguration$ = [
      3,
      n0,
      _NC,
      0,
      [_TCo, _QCu, _LFCa, _EBC],
      [[() => TopicConfigurationList, { [_xF]: 1, [_xN]: _TCop }], [() => QueueConfigurationList, { [_xF]: 1, [_xN]: _QCue }], [() => LambdaFunctionConfigurationList, { [_xF]: 1, [_xN]: _CFC }], () => exports.EventBridgeConfiguration$]
    ];
    exports.NotificationConfigurationFilter$ = [
      3,
      n0,
      _NCF,
      0,
      [_K],
      [[() => exports.S3KeyFilter$, { [_xN]: _SKe }]]
    ];
    exports._Object$ = [
      3,
      n0,
      _Obj,
      0,
      [_K, _LM, _ETa, _CA, _CT, _Si, _SC, _O, _RSe],
      [0, 4, 0, [64 | 0, { [_xF]: 1 }], 0, 1, 0, () => exports.Owner$, () => exports.RestoreStatus$]
    ];
    exports.ObjectIdentifier$ = [
      3,
      n0,
      _OI,
      0,
      [_K, _VI, _ETa, _LMT, _Si],
      [0, 0, 0, 6, 1],
      1
    ];
    exports.ObjectLockConfiguration$ = [
      3,
      n0,
      _OLC,
      0,
      [_OLE, _Ru],
      [0, () => exports.ObjectLockRule$]
    ];
    exports.ObjectLockLegalHold$ = [
      3,
      n0,
      _OLLH,
      0,
      [_S],
      [0]
    ];
    exports.ObjectLockRetention$ = [
      3,
      n0,
      _OLR,
      0,
      [_Mo, _RUD],
      [0, 5]
    ];
    exports.ObjectLockRule$ = [
      3,
      n0,
      _OLRb,
      0,
      [_DRe],
      [() => exports.DefaultRetention$]
    ];
    exports.ObjectPart$ = [
      3,
      n0,
      _OPb,
      0,
      [_PN, _Si, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    exports.ObjectVersion$ = [
      3,
      n0,
      _OV,
      0,
      [_ETa, _CA, _CT, _Si, _SC, _K, _VI, _IL, _LM, _O, _RSe],
      [0, [64 | 0, { [_xF]: 1 }], 0, 1, 0, 0, 0, 2, 4, () => exports.Owner$, () => exports.RestoreStatus$]
    ];
    exports.OutputLocation$ = [
      3,
      n0,
      _OL,
      0,
      [_S_],
      [[() => exports.S3Location$, 0]]
    ];
    exports.OutputSerialization$ = [
      3,
      n0,
      _OSu,
      0,
      [_CSV, _JSON],
      [() => exports.CSVOutput$, () => exports.JSONOutput$]
    ];
    exports.Owner$ = [
      3,
      n0,
      _O,
      0,
      [_DN, _ID],
      [0, 0]
    ];
    exports.OwnershipControls$ = [
      3,
      n0,
      _OC,
      0,
      [_R],
      [[() => OwnershipControlsRules, { [_xF]: 1, [_xN]: _Ru }]],
      1
    ];
    exports.OwnershipControlsRule$ = [
      3,
      n0,
      _OCR,
      0,
      [_OO],
      [0],
      1
    ];
    exports.ParquetInput$ = [
      3,
      n0,
      _PI,
      0,
      [],
      []
    ];
    exports.Part$ = [
      3,
      n0,
      _Par,
      0,
      [_PN, _LM, _ETa, _Si, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe],
      [1, 4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    exports.PartitionedPrefix$ = [
      3,
      n0,
      _PP,
      { [_xN]: _PP },
      [_PDS],
      [0]
    ];
    exports.PolicyStatus$ = [
      3,
      n0,
      _PS,
      0,
      [_IP],
      [[2, { [_xN]: _IP }]]
    ];
    exports.Progress$ = [
      3,
      n0,
      _Pr,
      0,
      [_BS, _BP, _BRy],
      [1, 1, 1]
    ];
    exports.ProgressEvent$ = [
      3,
      n0,
      _PE,
      0,
      [_Det],
      [[() => exports.Progress$, { [_eP]: 1 }]]
    ];
    exports.PublicAccessBlockConfiguration$ = [
      3,
      n0,
      _PABC,
      0,
      [_BPA, _IPA, _BPP, _RPB],
      [[2, { [_xN]: _BPA }], [2, { [_xN]: _IPA }], [2, { [_xN]: _BPP }], [2, { [_xN]: _RPB }]]
    ];
    exports.PutBucketAbacRequest$ = [
      3,
      n0,
      _PBAR,
      0,
      [_B, _AS, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.AbacStatus$, { [_hP]: 1, [_xN]: _AS }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketAccelerateConfigurationRequest$ = [
      3,
      n0,
      _PBACR,
      0,
      [_B, _AC, _EBO, _CA],
      [[0, 1], [() => exports.AccelerateConfiguration$, { [_hP]: 1, [_xN]: _AC }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xasca }]],
      2
    ];
    exports.PutBucketAclRequest$ = [
      3,
      n0,
      _PBARu,
      0,
      [_B, _ACL_, _ACP, _CMDo, _CA, _GFC, _GR, _GRACP, _GW, _GWACP, _EBO],
      [[0, 1], [0, { [_hH]: _xaa }], [() => exports.AccessControlPolicy$, { [_hP]: 1, [_xN]: _ACP }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xagfc }], [0, { [_hH]: _xagr }], [0, { [_hH]: _xagra }], [0, { [_hH]: _xagw }], [0, { [_hH]: _xagwa }], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.PutBucketAnalyticsConfigurationRequest$ = [
      3,
      n0,
      _PBACRu,
      0,
      [_B, _I, _ACn, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [() => exports.AnalyticsConfiguration$, { [_hP]: 1, [_xN]: _ACn }], [0, { [_hH]: _xaebo }]],
      3
    ];
    exports.PutBucketCorsRequest$ = [
      3,
      n0,
      _PBCR,
      0,
      [_B, _CORSC, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.CORSConfiguration$, { [_hP]: 1, [_xN]: _CORSC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketEncryptionRequest$ = [
      3,
      n0,
      _PBER,
      0,
      [_B, _SSEC, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.ServerSideEncryptionConfiguration$, { [_hP]: 1, [_xN]: _SSEC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketIntelligentTieringConfigurationRequest$ = [
      3,
      n0,
      _PBITCR,
      0,
      [_B, _I, _ITC, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [() => exports.IntelligentTieringConfiguration$, { [_hP]: 1, [_xN]: _ITC }], [0, { [_hH]: _xaebo }]],
      3
    ];
    exports.PutBucketInventoryConfigurationRequest$ = [
      3,
      n0,
      _PBICR,
      0,
      [_B, _I, _IC, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [() => exports.InventoryConfiguration$, { [_hP]: 1, [_xN]: _IC }], [0, { [_hH]: _xaebo }]],
      3
    ];
    exports.PutBucketLifecycleConfigurationOutput$ = [
      3,
      n0,
      _PBLCO,
      0,
      [_TDMOS],
      [[0, { [_hH]: _xatdmos }]]
    ];
    exports.PutBucketLifecycleConfigurationRequest$ = [
      3,
      n0,
      _PBLCR,
      0,
      [_B, _CA, _LCi, _EBO, _TDMOS],
      [[0, 1], [0, { [_hH]: _xasca }], [() => exports.BucketLifecycleConfiguration$, { [_hP]: 1, [_xN]: _LCi }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xatdmos }]],
      1
    ];
    exports.PutBucketLoggingRequest$ = [
      3,
      n0,
      _PBLR,
      0,
      [_B, _BLS, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.BucketLoggingStatus$, { [_hP]: 1, [_xN]: _BLS }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketMetricsConfigurationRequest$ = [
      3,
      n0,
      _PBMCR,
      0,
      [_B, _I, _MCe, _EBO],
      [[0, 1], [0, { [_hQ]: _i }], [() => exports.MetricsConfiguration$, { [_hP]: 1, [_xN]: _MCe }], [0, { [_hH]: _xaebo }]],
      3
    ];
    exports.PutBucketNotificationConfigurationRequest$ = [
      3,
      n0,
      _PBNCR,
      0,
      [_B, _NC, _EBO, _SDV],
      [[0, 1], [() => exports.NotificationConfiguration$, { [_hP]: 1, [_xN]: _NC }], [0, { [_hH]: _xaebo }], [2, { [_hH]: _xasdv }]],
      2
    ];
    exports.PutBucketOwnershipControlsRequest$ = [
      3,
      n0,
      _PBOCR,
      0,
      [_B, _OC, _CMDo, _EBO, _CA],
      [[0, 1], [() => exports.OwnershipControls$, { [_hP]: 1, [_xN]: _OC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xasca }]],
      2
    ];
    exports.PutBucketPolicyRequest$ = [
      3,
      n0,
      _PBPR,
      0,
      [_B, _Po, _CMDo, _CA, _CRSBA, _EBO],
      [[0, 1], [0, 16], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [2, { [_hH]: _xacrsba }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketReplicationRequest$ = [
      3,
      n0,
      _PBRR,
      0,
      [_B, _RCe, _CMDo, _CA, _To, _EBO],
      [[0, 1], [() => exports.ReplicationConfiguration$, { [_hP]: 1, [_xN]: _RCe }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xabolt }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketRequestPaymentRequest$ = [
      3,
      n0,
      _PBRPR,
      0,
      [_B, _RPC, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.RequestPaymentConfiguration$, { [_hP]: 1, [_xN]: _RPC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketTaggingRequest$ = [
      3,
      n0,
      _PBTR,
      0,
      [_B, _Tag, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.Tagging$, { [_hP]: 1, [_xN]: _Tag }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketVersioningRequest$ = [
      3,
      n0,
      _PBVR,
      0,
      [_B, _VC, _CMDo, _CA, _MFA, _EBO],
      [[0, 1], [() => exports.VersioningConfiguration$, { [_hP]: 1, [_xN]: _VC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xam_ }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutBucketWebsiteRequest$ = [
      3,
      n0,
      _PBWR,
      0,
      [_B, _WC, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.WebsiteConfiguration$, { [_hP]: 1, [_xN]: _WC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutObjectAclOutput$ = [
      3,
      n0,
      _POAO,
      0,
      [_RC],
      [[0, { [_hH]: _xarc }]]
    ];
    exports.PutObjectAclRequest$ = [
      3,
      n0,
      _POAR,
      0,
      [_B, _K, _ACL_, _ACP, _CMDo, _CA, _GFC, _GR, _GRACP, _GW, _GWACP, _RP, _VI, _EBO],
      [[0, 1], [0, 1], [0, { [_hH]: _xaa }], [() => exports.AccessControlPolicy$, { [_hP]: 1, [_xN]: _ACP }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xagfc }], [0, { [_hH]: _xagr }], [0, { [_hH]: _xagra }], [0, { [_hH]: _xagw }], [0, { [_hH]: _xagwa }], [0, { [_hH]: _xarp }], [0, { [_hQ]: _vI }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutObjectLegalHoldOutput$ = [
      3,
      n0,
      _POLHO,
      0,
      [_RC],
      [[0, { [_hH]: _xarc }]]
    ];
    exports.PutObjectLegalHoldRequest$ = [
      3,
      n0,
      _POLHR,
      0,
      [_B, _K, _LH, _RP, _VI, _CMDo, _CA, _EBO],
      [[0, 1], [0, 1], [() => exports.ObjectLockLegalHold$, { [_hP]: 1, [_xN]: _LH }], [0, { [_hH]: _xarp }], [0, { [_hQ]: _vI }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutObjectLockConfigurationOutput$ = [
      3,
      n0,
      _POLCO,
      0,
      [_RC],
      [[0, { [_hH]: _xarc }]]
    ];
    exports.PutObjectLockConfigurationRequest$ = [
      3,
      n0,
      _POLCR,
      0,
      [_B, _OLC, _RP, _To, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.ObjectLockConfiguration$, { [_hP]: 1, [_xN]: _OLC }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xabolt }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      1
    ];
    exports.PutObjectOutput$ = [
      3,
      n0,
      _POO,
      0,
      [_E, _ETa, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _CT, _SSE, _VI, _SSECA, _SSECKMD, _SSEKMSKI, _SSEKMSEC, _BKE, _Si, _RC],
      [[0, { [_hH]: _xae }], [0, { [_hH]: _ETa }], [0, { [_hH]: _xacc }], [0, { [_hH]: _xacc_ }], [0, { [_hH]: _xacc__ }], [0, { [_hH]: _xacs }], [0, { [_hH]: _xacs_ }], [0, { [_hH]: _xacs__ }], [0, { [_hH]: _xacm }], [0, { [_hH]: _xacx }], [0, { [_hH]: _xacx_ }], [0, { [_hH]: _xacx__ }], [0, { [_hH]: _xact }], [0, { [_hH]: _xasse }], [0, { [_hH]: _xavi }], [0, { [_hH]: _xasseca }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [() => SSEKMSEncryptionContext, { [_hH]: _xassec }], [2, { [_hH]: _xassebke }], [1, { [_hH]: _xaos }], [0, { [_hH]: _xarc }]]
    ];
    exports.PutObjectRequest$ = [
      3,
      n0,
      _POR,
      0,
      [_B, _K, _ACL_, _Bo, _CC, _CDo, _CEo, _CL, _CLo, _CMDo, _CTo, _CA, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _Ex, _IM, _INM, _GFC, _GR, _GRACP, _GWACP, _WOB, _M, _SSE, _SC, _WRL, _SSECA, _SSECK, _SSECKMD, _SSEKMSKI, _SSEKMSEC, _BKE, _RP, _Tag, _OLM, _OLRUD, _OLLHS, _EBO],
      [[0, 1], [0, 1], [0, { [_hH]: _xaa }], [() => StreamingBlob, 16], [0, { [_hH]: _CC_ }], [0, { [_hH]: _CD_ }], [0, { [_hH]: _CE_ }], [0, { [_hH]: _CL_ }], [1, { [_hH]: _CL__ }], [0, { [_hH]: _CM }], [0, { [_hH]: _CT_ }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xacc }], [0, { [_hH]: _xacc_ }], [0, { [_hH]: _xacc__ }], [0, { [_hH]: _xacs }], [0, { [_hH]: _xacs_ }], [0, { [_hH]: _xacs__ }], [0, { [_hH]: _xacm }], [0, { [_hH]: _xacx }], [0, { [_hH]: _xacx_ }], [0, { [_hH]: _xacx__ }], [4, { [_hH]: _Ex }], [0, { [_hH]: _IM_ }], [0, { [_hH]: _INM_ }], [0, { [_hH]: _xagfc }], [0, { [_hH]: _xagr }], [0, { [_hH]: _xagra }], [0, { [_hH]: _xagwa }], [1, { [_hH]: _xawob }], [128 | 0, { [_hPH]: _xam }], [0, { [_hH]: _xasse }], [0, { [_hH]: _xasc }], [0, { [_hH]: _xawrl }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [() => SSEKMSEncryptionContext, { [_hH]: _xassec }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xat }], [0, { [_hH]: _xaolm }], [5, { [_hH]: _xaolrud }], [0, { [_hH]: _xaollh }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutObjectRetentionOutput$ = [
      3,
      n0,
      _PORO,
      0,
      [_RC],
      [[0, { [_hH]: _xarc }]]
    ];
    exports.PutObjectRetentionRequest$ = [
      3,
      n0,
      _PORR,
      0,
      [_B, _K, _Ret, _RP, _VI, _BGR, _CMDo, _CA, _EBO],
      [[0, 1], [0, 1], [() => exports.ObjectLockRetention$, { [_hP]: 1, [_xN]: _Ret }], [0, { [_hH]: _xarp }], [0, { [_hQ]: _vI }], [2, { [_hH]: _xabgr }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.PutObjectTaggingOutput$ = [
      3,
      n0,
      _POTO,
      0,
      [_VI],
      [[0, { [_hH]: _xavi }]]
    ];
    exports.PutObjectTaggingRequest$ = [
      3,
      n0,
      _POTR,
      0,
      [_B, _K, _Tag, _VI, _CMDo, _CA, _EBO, _RP],
      [[0, 1], [0, 1], [() => exports.Tagging$, { [_hP]: 1, [_xN]: _Tag }], [0, { [_hQ]: _vI }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xarp }]],
      3
    ];
    exports.PutPublicAccessBlockRequest$ = [
      3,
      n0,
      _PPABR,
      0,
      [_B, _PABC, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.PublicAccessBlockConfiguration$, { [_hP]: 1, [_xN]: _PABC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.QueueConfiguration$ = [
      3,
      n0,
      _QCue,
      0,
      [_QA, _Ev, _I, _F],
      [[0, { [_xN]: _Qu }], [64 | 0, { [_xF]: 1, [_xN]: _Eve }], 0, [() => exports.NotificationConfigurationFilter$, 0]],
      2
    ];
    exports.RecordExpiration$ = [
      3,
      n0,
      _REe,
      0,
      [_E, _D],
      [0, 1],
      1
    ];
    exports.RecordsEvent$ = [
      3,
      n0,
      _REec,
      0,
      [_Payl],
      [[21, { [_eP]: 1 }]]
    ];
    exports.Redirect$ = [
      3,
      n0,
      _Red,
      0,
      [_HN, _HRC, _Pro, _RKPW, _RKW],
      [0, 0, 0, 0, 0]
    ];
    exports.RedirectAllRequestsTo$ = [
      3,
      n0,
      _RART,
      0,
      [_HN, _Pro],
      [0, 0],
      1
    ];
    exports.RenameObjectOutput$ = [
      3,
      n0,
      _ROO,
      0,
      [],
      []
    ];
    exports.RenameObjectRequest$ = [
      3,
      n0,
      _ROR,
      0,
      [_B, _K, _RSen, _DIM, _DINM, _DIMS, _DIUS, _SIM, _SINM, _SIMS, _SIUS, _CTl],
      [[0, 1], [0, 1], [0, { [_hH]: _xars_ }], [0, { [_hH]: _IM_ }], [0, { [_hH]: _INM_ }], [4, { [_hH]: _IMS_ }], [4, { [_hH]: _IUS_ }], [0, { [_hH]: _xarsim }], [0, { [_hH]: _xarsinm }], [6, { [_hH]: _xarsims }], [6, { [_hH]: _xarsius }], [0, { [_hH]: _xact_, [_iT]: 1 }]],
      3
    ];
    exports.ReplicaModifications$ = [
      3,
      n0,
      _RM,
      0,
      [_S],
      [0],
      1
    ];
    exports.ReplicationConfiguration$ = [
      3,
      n0,
      _RCe,
      0,
      [_Ro, _R],
      [0, [() => ReplicationRules, { [_xF]: 1, [_xN]: _Ru }]],
      2
    ];
    exports.ReplicationRule$ = [
      3,
      n0,
      _RRe,
      0,
      [_S, _Des, _ID, _Pri, _P, _F, _SSC, _EOR, _DMR],
      [0, () => exports.Destination$, 0, 1, 0, [() => exports.ReplicationRuleFilter$, 0], () => exports.SourceSelectionCriteria$, () => exports.ExistingObjectReplication$, () => exports.DeleteMarkerReplication$],
      2
    ];
    exports.ReplicationRuleAndOperator$ = [
      3,
      n0,
      _RRAO,
      0,
      [_P, _T],
      [0, [() => TagSet, { [_xF]: 1, [_xN]: _Ta }]]
    ];
    exports.ReplicationRuleFilter$ = [
      3,
      n0,
      _RRF,
      0,
      [_P, _Ta, _An],
      [0, () => exports.Tag$, [() => exports.ReplicationRuleAndOperator$, 0]]
    ];
    exports.ReplicationTime$ = [
      3,
      n0,
      _RT,
      0,
      [_S, _Tim],
      [0, () => exports.ReplicationTimeValue$],
      2
    ];
    exports.ReplicationTimeValue$ = [
      3,
      n0,
      _RTV,
      0,
      [_Mi],
      [1]
    ];
    exports.RequestPaymentConfiguration$ = [
      3,
      n0,
      _RPC,
      0,
      [_Pay],
      [0],
      1
    ];
    exports.RequestProgress$ = [
      3,
      n0,
      _RPe,
      0,
      [_Ena],
      [2]
    ];
    exports.RestoreObjectOutput$ = [
      3,
      n0,
      _ROOe,
      0,
      [_RC, _ROP],
      [[0, { [_hH]: _xarc }], [0, { [_hH]: _xarop }]]
    ];
    exports.RestoreObjectRequest$ = [
      3,
      n0,
      _RORe,
      0,
      [_B, _K, _VI, _RRes, _RP, _CA, _EBO],
      [[0, 1], [0, 1], [0, { [_hQ]: _vI }], [() => exports.RestoreRequest$, { [_hP]: 1, [_xN]: _RRes }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.RestoreRequest$ = [
      3,
      n0,
      _RRes,
      0,
      [_D, _GJP, _Ty, _Ti, _Desc, _SP, _OL],
      [1, () => exports.GlacierJobParameters$, 0, 0, 0, () => exports.SelectParameters$, [() => exports.OutputLocation$, 0]]
    ];
    exports.RestoreStatus$ = [
      3,
      n0,
      _RSe,
      0,
      [_IRIP, _RED],
      [2, 4]
    ];
    exports.RoutingRule$ = [
      3,
      n0,
      _RRo,
      0,
      [_Red, _Co],
      [() => exports.Redirect$, () => exports.Condition$],
      1
    ];
    exports.S3KeyFilter$ = [
      3,
      n0,
      _SKF,
      0,
      [_FRi],
      [[() => FilterRuleList, { [_xF]: 1, [_xN]: _FR }]]
    ];
    exports.S3Location$ = [
      3,
      n0,
      _SL,
      0,
      [_BNu, _P, _En, _CACL, _ACL, _Tag, _UM, _SC],
      [0, 0, [() => exports.Encryption$, 0], 0, [() => Grants, 0], [() => exports.Tagging$, 0], [() => UserMetadata, 0], 0],
      2
    ];
    exports.S3TablesDestination$ = [
      3,
      n0,
      _STD,
      0,
      [_TBA, _TNa],
      [0, 0],
      2
    ];
    exports.S3TablesDestinationResult$ = [
      3,
      n0,
      _STDR,
      0,
      [_TBA, _TNa, _TA, _TN],
      [0, 0, 0, 0],
      4
    ];
    exports.ScanRange$ = [
      3,
      n0,
      _SR,
      0,
      [_St, _End],
      [1, 1]
    ];
    exports.SelectObjectContentOutput$ = [
      3,
      n0,
      _SOCO,
      0,
      [_Payl],
      [[() => exports.SelectObjectContentEventStream$, 16]]
    ];
    exports.SelectObjectContentRequest$ = [
      3,
      n0,
      _SOCR,
      0,
      [_B, _K, _Exp, _ETx, _IS, _OSu, _SSECA, _SSECK, _SSECKMD, _RPe, _SR, _EBO],
      [[0, 1], [0, 1], 0, 0, () => exports.InputSerialization$, () => exports.OutputSerialization$, [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], () => exports.RequestProgress$, () => exports.ScanRange$, [0, { [_hH]: _xaebo }]],
      6
    ];
    exports.SelectParameters$ = [
      3,
      n0,
      _SP,
      0,
      [_IS, _ETx, _Exp, _OSu],
      [() => exports.InputSerialization$, 0, 0, () => exports.OutputSerialization$],
      4
    ];
    exports.ServerSideEncryptionByDefault$ = [
      3,
      n0,
      _SSEBD,
      0,
      [_SSEA, _KMSMKID],
      [0, [() => SSEKMSKeyId, 0]],
      1
    ];
    exports.ServerSideEncryptionConfiguration$ = [
      3,
      n0,
      _SSEC,
      0,
      [_R],
      [[() => ServerSideEncryptionRules, { [_xF]: 1, [_xN]: _Ru }]],
      1
    ];
    exports.ServerSideEncryptionRule$ = [
      3,
      n0,
      _SSER,
      0,
      [_ASSEBD, _BKE, _BET],
      [[() => exports.ServerSideEncryptionByDefault$, 0], 2, [() => exports.BlockedEncryptionTypes$, 0]]
    ];
    exports.SessionCredentials$ = [
      3,
      n0,
      _SCe,
      0,
      [_AKI, _SAK, _ST, _E],
      [[0, { [_xN]: _AKI }], [() => SessionCredentialValue, { [_xN]: _SAK }], [() => SessionCredentialValue, { [_xN]: _ST }], [4, { [_xN]: _E }]],
      4
    ];
    exports.SimplePrefix$ = [
      3,
      n0,
      _SPi,
      { [_xN]: _SPi },
      [],
      []
    ];
    exports.SourceSelectionCriteria$ = [
      3,
      n0,
      _SSC,
      0,
      [_SKEO, _RM],
      [() => exports.SseKmsEncryptedObjects$, () => exports.ReplicaModifications$]
    ];
    exports.SSEKMS$ = [
      3,
      n0,
      _SSEKMS,
      { [_xN]: _SK },
      [_KI],
      [[() => SSEKMSKeyId, 0]],
      1
    ];
    exports.SseKmsEncryptedObjects$ = [
      3,
      n0,
      _SKEO,
      0,
      [_S],
      [0],
      1
    ];
    exports.SSEKMSEncryption$ = [
      3,
      n0,
      _SSEKMSE,
      { [_xN]: _SK },
      [_KMSKA, _BKE],
      [[() => NonEmptyKmsKeyArnString, 0], 2],
      1
    ];
    exports.SSES3$ = [
      3,
      n0,
      _SSES,
      { [_xN]: _SS },
      [],
      []
    ];
    exports.Stats$ = [
      3,
      n0,
      _Sta,
      0,
      [_BS, _BP, _BRy],
      [1, 1, 1]
    ];
    exports.StatsEvent$ = [
      3,
      n0,
      _SE,
      0,
      [_Det],
      [[() => exports.Stats$, { [_eP]: 1 }]]
    ];
    exports.StorageClassAnalysis$ = [
      3,
      n0,
      _SCA,
      0,
      [_DE],
      [() => exports.StorageClassAnalysisDataExport$]
    ];
    exports.StorageClassAnalysisDataExport$ = [
      3,
      n0,
      _SCADE,
      0,
      [_OSV, _Des],
      [0, () => exports.AnalyticsExportDestination$],
      2
    ];
    exports.Tag$ = [
      3,
      n0,
      _Ta,
      0,
      [_K, _V],
      [0, 0],
      2
    ];
    exports.Tagging$ = [
      3,
      n0,
      _Tag,
      0,
      [_TS],
      [[() => TagSet, 0]],
      1
    ];
    exports.TargetGrant$ = [
      3,
      n0,
      _TGa,
      0,
      [_Gra, _Pe],
      [[() => exports.Grantee$, { [_xNm]: [_x, _hi] }], 0]
    ];
    exports.TargetObjectKeyFormat$ = [
      3,
      n0,
      _TOKF,
      0,
      [_SPi, _PP],
      [[() => exports.SimplePrefix$, { [_xN]: _SPi }], [() => exports.PartitionedPrefix$, { [_xN]: _PP }]]
    ];
    exports.Tiering$ = [
      3,
      n0,
      _Tier,
      0,
      [_D, _AT],
      [1, 0],
      2
    ];
    exports.TopicConfiguration$ = [
      3,
      n0,
      _TCop,
      0,
      [_TAo, _Ev, _I, _F],
      [[0, { [_xN]: _Top }], [64 | 0, { [_xF]: 1, [_xN]: _Eve }], 0, [() => exports.NotificationConfigurationFilter$, 0]],
      2
    ];
    exports.Transition$ = [
      3,
      n0,
      _Tra,
      0,
      [_Da, _D, _SC],
      [5, 1, 0]
    ];
    exports.UpdateBucketMetadataInventoryTableConfigurationRequest$ = [
      3,
      n0,
      _UBMITCR,
      0,
      [_B, _ITCn, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.InventoryTableConfigurationUpdates$, { [_hP]: 1, [_xN]: _ITCn }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.UpdateBucketMetadataJournalTableConfigurationRequest$ = [
      3,
      n0,
      _UBMJTCR,
      0,
      [_B, _JTC, _CMDo, _CA, _EBO],
      [[0, 1], [() => exports.JournalTableConfigurationUpdates$, { [_hP]: 1, [_xN]: _JTC }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xaebo }]],
      2
    ];
    exports.UpdateObjectEncryptionRequest$ = [
      3,
      n0,
      _UOER,
      0,
      [_B, _K, _OE, _VI, _RP, _EBO, _CMDo, _CA],
      [[0, 1], [0, 1], [() => exports.ObjectEncryption$, 16], [0, { [_hQ]: _vI }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }]],
      3
    ];
    exports.UpdateObjectEncryptionResponse$ = [
      3,
      n0,
      _UOERp,
      0,
      [_RC],
      [[0, { [_hH]: _xarc }]]
    ];
    exports.UploadPartCopyOutput$ = [
      3,
      n0,
      _UPCO,
      0,
      [_CSVI, _CPR, _SSE, _SSECA, _SSECKMD, _SSEKMSKI, _BKE, _RC],
      [[0, { [_hH]: _xacsvi }], [() => exports.CopyPartResult$, 16], [0, { [_hH]: _xasse }], [0, { [_hH]: _xasseca }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xarc }]]
    ];
    exports.UploadPartCopyRequest$ = [
      3,
      n0,
      _UPCR,
      0,
      [_B, _CS, _K, _PN, _UI, _CSIM, _CSIMS, _CSINM, _CSIUS, _CSRo, _SSECA, _SSECK, _SSECKMD, _CSSSECA, _CSSSECK, _CSSSECKMD, _RP, _EBO, _ESBO],
      [[0, 1], [0, { [_hH]: _xacs___ }], [0, 1], [1, { [_hQ]: _pN }], [0, { [_hQ]: _uI }], [0, { [_hH]: _xacsim }], [4, { [_hH]: _xacsims }], [0, { [_hH]: _xacsinm }], [4, { [_hH]: _xacsius }], [0, { [_hH]: _xacsr }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], [0, { [_hH]: _xacssseca }], [() => CopySourceSSECustomerKey, { [_hH]: _xacssseck }], [0, { [_hH]: _xacssseckM }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }], [0, { [_hH]: _xasebo }]],
      5
    ];
    exports.UploadPartOutput$ = [
      3,
      n0,
      _UPO,
      0,
      [_SSE, _ETa, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _SSECA, _SSECKMD, _SSEKMSKI, _BKE, _RC],
      [[0, { [_hH]: _xasse }], [0, { [_hH]: _ETa }], [0, { [_hH]: _xacc }], [0, { [_hH]: _xacc_ }], [0, { [_hH]: _xacc__ }], [0, { [_hH]: _xacs }], [0, { [_hH]: _xacs_ }], [0, { [_hH]: _xacs__ }], [0, { [_hH]: _xacm }], [0, { [_hH]: _xacx }], [0, { [_hH]: _xacx_ }], [0, { [_hH]: _xacx__ }], [0, { [_hH]: _xasseca }], [0, { [_hH]: _xasseckM }], [() => SSEKMSKeyId, { [_hH]: _xasseakki }], [2, { [_hH]: _xassebke }], [0, { [_hH]: _xarc }]]
    ];
    exports.UploadPartRequest$ = [
      3,
      n0,
      _UPR,
      0,
      [_B, _K, _PN, _UI, _Bo, _CLo, _CMDo, _CA, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _SSECA, _SSECK, _SSECKMD, _RP, _EBO],
      [[0, 1], [0, 1], [1, { [_hQ]: _pN }], [0, { [_hQ]: _uI }], [() => StreamingBlob, 16], [1, { [_hH]: _CL__ }], [0, { [_hH]: _CM }], [0, { [_hH]: _xasca }], [0, { [_hH]: _xacc }], [0, { [_hH]: _xacc_ }], [0, { [_hH]: _xacc__ }], [0, { [_hH]: _xacs }], [0, { [_hH]: _xacs_ }], [0, { [_hH]: _xacs__ }], [0, { [_hH]: _xacm }], [0, { [_hH]: _xacx }], [0, { [_hH]: _xacx_ }], [0, { [_hH]: _xacx__ }], [0, { [_hH]: _xasseca }], [() => SSECustomerKey, { [_hH]: _xasseck }], [0, { [_hH]: _xasseckM }], [0, { [_hH]: _xarp }], [0, { [_hH]: _xaebo }]],
      4
    ];
    exports.VersioningConfiguration$ = [
      3,
      n0,
      _VC,
      0,
      [_MFAD, _S],
      [[0, { [_xN]: _MDf }], 0]
    ];
    exports.WebsiteConfiguration$ = [
      3,
      n0,
      _WC,
      0,
      [_EDr, _IDn, _RART, _RR],
      [() => exports.ErrorDocument$, () => exports.IndexDocument$, () => exports.RedirectAllRequestsTo$, [() => RoutingRules, 0]]
    ];
    exports.WriteGetObjectResponseRequest$ = [
      3,
      n0,
      _WGORR,
      0,
      [_RReq, _RTe, _Bo, _SCt, _ECr, _EM, _AR, _CC, _CDo, _CEo, _CL, _CLo, _CR, _CTo, _CCRC, _CCRCC, _CCRCNVME, _CSHA, _CSHAh, _CSHAhe, _CMD, _CXXHASH, _CXXHASHh, _CXXHASHhe, _DM, _ETa, _Ex, _E, _LM, _MM, _M, _OLM, _OLLHS, _OLRUD, _PC, _RS, _RC, _Re, _SSE, _SSECA, _SSEKMSKI, _SSECKMD, _SC, _TC, _VI, _BKE],
      [[0, { [_hL]: 1, [_hH]: _xarr }], [0, { [_hH]: _xart }], [() => StreamingBlob, 16], [1, { [_hH]: _xafs }], [0, { [_hH]: _xafec }], [0, { [_hH]: _xafem }], [0, { [_hH]: _xafhar }], [0, { [_hH]: _xafhCC }], [0, { [_hH]: _xafhCD }], [0, { [_hH]: _xafhCE }], [0, { [_hH]: _xafhCL }], [1, { [_hH]: _CL__ }], [0, { [_hH]: _xafhCR }], [0, { [_hH]: _xafhCT }], [0, { [_hH]: _xafhxacc }], [0, { [_hH]: _xafhxacc_ }], [0, { [_hH]: _xafhxacc__ }], [0, { [_hH]: _xafhxacs }], [0, { [_hH]: _xafhxacs_ }], [0, { [_hH]: _xafhxacs__ }], [0, { [_hH]: _xafhxacm }], [0, { [_hH]: _xafhxacx }], [0, { [_hH]: _xafhxacx_ }], [0, { [_hH]: _xafhxacx__ }], [2, { [_hH]: _xafhxadm }], [0, { [_hH]: _xafhE }], [4, { [_hH]: _xafhE_ }], [0, { [_hH]: _xafhxae }], [4, { [_hH]: _xafhLM }], [1, { [_hH]: _xafhxamm }], [128 | 0, { [_hPH]: _xam }], [0, { [_hH]: _xafhxaolm }], [0, { [_hH]: _xafhxaollh }], [5, { [_hH]: _xafhxaolrud }], [1, { [_hH]: _xafhxampc }], [0, { [_hH]: _xafhxars }], [0, { [_hH]: _xafhxarc }], [0, { [_hH]: _xafhxar }], [0, { [_hH]: _xafhxasse }], [0, { [_hH]: _xafhxasseca }], [() => SSEKMSKeyId, { [_hH]: _xafhxasseakki }], [0, { [_hH]: _xafhxasseckM }], [0, { [_hH]: _xafhxasc }], [1, { [_hH]: _xafhxatc }], [0, { [_hH]: _xafhxavi }], [2, { [_hH]: _xafhxassebke }]],
      2
    ];
    var __Unit = "unit";
    var AllowedHeaders = 64 | 0;
    var AllowedMethods = 64 | 0;
    var AllowedOrigins = 64 | 0;
    var AnalyticsConfigurationList = [
      1,
      n0,
      _ACLn,
      0,
      [
        () => exports.AnalyticsConfiguration$,
        0
      ]
    ];
    var Buckets = [
      1,
      n0,
      _Bu,
      0,
      [
        () => exports.Bucket$,
        { [_xN]: _B }
      ]
    ];
    var ChecksumAlgorithmList = 64 | 0;
    var CommonPrefixList = [
      1,
      n0,
      _CPL,
      0,
      () => exports.CommonPrefix$
    ];
    var CompletedPartList = [
      1,
      n0,
      _CPLo,
      0,
      () => exports.CompletedPart$
    ];
    var CORSRules = [
      1,
      n0,
      _CORSR,
      0,
      [
        () => exports.CORSRule$,
        0
      ]
    ];
    var DeletedObjects = [
      1,
      n0,
      _DOe,
      0,
      () => exports.DeletedObject$
    ];
    var DeleteMarkers = [
      1,
      n0,
      _DMe,
      0,
      () => exports.DeleteMarkerEntry$
    ];
    var EncryptionTypeList = [
      1,
      n0,
      _ETL,
      0,
      [
        0,
        { [_xN]: _ET }
      ]
    ];
    var Errors = [
      1,
      n0,
      _Er,
      0,
      () => exports._Error$
    ];
    var EventList = 64 | 0;
    var ExposeHeaders = 64 | 0;
    var FilterRuleList = [
      1,
      n0,
      _FRL,
      0,
      () => exports.FilterRule$
    ];
    var Grants = [
      1,
      n0,
      _G,
      0,
      [
        () => exports.Grant$,
        { [_xN]: _Gr }
      ]
    ];
    var IntelligentTieringConfigurationList = [
      1,
      n0,
      _ITCL,
      0,
      [
        () => exports.IntelligentTieringConfiguration$,
        0
      ]
    ];
    var InventoryConfigurationList = [
      1,
      n0,
      _ICL,
      0,
      [
        () => exports.InventoryConfiguration$,
        0
      ]
    ];
    var InventoryOptionalFields = [
      1,
      n0,
      _IOF,
      0,
      [
        0,
        { [_xN]: _Fi }
      ]
    ];
    var LambdaFunctionConfigurationList = [
      1,
      n0,
      _LFCL,
      0,
      [
        () => exports.LambdaFunctionConfiguration$,
        0
      ]
    ];
    var LifecycleRules = [
      1,
      n0,
      _LRi,
      0,
      [
        () => exports.LifecycleRule$,
        0
      ]
    ];
    var MetricsConfigurationList = [
      1,
      n0,
      _MCL,
      0,
      [
        () => exports.MetricsConfiguration$,
        0
      ]
    ];
    var MultipartUploadList = [
      1,
      n0,
      _MUL,
      0,
      () => exports.MultipartUpload$
    ];
    var NoncurrentVersionTransitionList = [
      1,
      n0,
      _NVTL,
      0,
      () => exports.NoncurrentVersionTransition$
    ];
    var ObjectAttributesList = 64 | 0;
    var ObjectIdentifierList = [
      1,
      n0,
      _OIL,
      0,
      () => exports.ObjectIdentifier$
    ];
    var ObjectList = [
      1,
      n0,
      _OLb,
      0,
      [
        () => exports._Object$,
        0
      ]
    ];
    var ObjectVersionList = [
      1,
      n0,
      _OVL,
      0,
      [
        () => exports.ObjectVersion$,
        0
      ]
    ];
    var OptionalObjectAttributesList = 64 | 0;
    var OwnershipControlsRules = [
      1,
      n0,
      _OCRw,
      0,
      () => exports.OwnershipControlsRule$
    ];
    var Parts = [
      1,
      n0,
      _Pa,
      0,
      () => exports.Part$
    ];
    var PartsList = [
      1,
      n0,
      _PL,
      0,
      () => exports.ObjectPart$
    ];
    var QueueConfigurationList = [
      1,
      n0,
      _QCL,
      0,
      [
        () => exports.QueueConfiguration$,
        0
      ]
    ];
    var ReplicationRules = [
      1,
      n0,
      _RRep,
      0,
      [
        () => exports.ReplicationRule$,
        0
      ]
    ];
    var RoutingRules = [
      1,
      n0,
      _RR,
      0,
      [
        () => exports.RoutingRule$,
        { [_xN]: _RRo }
      ]
    ];
    var ServerSideEncryptionRules = [
      1,
      n0,
      _SSERe,
      0,
      [
        () => exports.ServerSideEncryptionRule$,
        0
      ]
    ];
    var TagSet = [
      1,
      n0,
      _TS,
      0,
      [
        () => exports.Tag$,
        { [_xN]: _Ta }
      ]
    ];
    var TargetGrants = [
      1,
      n0,
      _TG,
      0,
      [
        () => exports.TargetGrant$,
        { [_xN]: _Gr }
      ]
    ];
    var TieringList = [
      1,
      n0,
      _TL,
      0,
      () => exports.Tiering$
    ];
    var TopicConfigurationList = [
      1,
      n0,
      _TCL,
      0,
      [
        () => exports.TopicConfiguration$,
        0
      ]
    ];
    var TransitionList = [
      1,
      n0,
      _TLr,
      0,
      () => exports.Transition$
    ];
    var UserMetadata = [
      1,
      n0,
      _UM,
      0,
      [
        () => exports.MetadataEntry$,
        { [_xN]: _ME }
      ]
    ];
    var Metadata = 128 | 0;
    exports.AnalyticsFilter$ = [
      4,
      n0,
      _AF,
      0,
      [_P, _Ta, _An],
      [0, () => exports.Tag$, [() => exports.AnalyticsAndOperator$, 0]]
    ];
    exports.MetricsFilter$ = [
      4,
      n0,
      _MF,
      0,
      [_P, _Ta, _APAc, _An],
      [0, () => exports.Tag$, 0, [() => exports.MetricsAndOperator$, 0]]
    ];
    exports.ObjectEncryption$ = [
      4,
      n0,
      _OE,
      0,
      [_SSEKMS],
      [[() => exports.SSEKMSEncryption$, { [_xN]: _SK }]]
    ];
    exports.SelectObjectContentEventStream$ = [
      4,
      n0,
      _SOCES,
      { [_st]: 1 },
      [_Rec, _Sta, _Pr, _Cont, _End],
      [[() => exports.RecordsEvent$, 0], [() => exports.StatsEvent$, 0], [() => exports.ProgressEvent$, 0], () => exports.ContinuationEvent$, () => exports.EndEvent$]
    ];
    exports.AbortMultipartUpload$ = [
      9,
      n0,
      _AMU,
      { [_h]: ["DELETE", "/{Key+}?x-id=AbortMultipartUpload", 204] },
      () => exports.AbortMultipartUploadRequest$,
      () => exports.AbortMultipartUploadOutput$
    ];
    exports.CompleteMultipartUpload$ = [
      9,
      n0,
      _CMUo,
      { [_h]: ["POST", "/{Key+}", 200] },
      () => exports.CompleteMultipartUploadRequest$,
      () => exports.CompleteMultipartUploadOutput$
    ];
    exports.CopyObject$ = [
      9,
      n0,
      _CO,
      { [_h]: ["PUT", "/{Key+}?x-id=CopyObject", 200] },
      () => exports.CopyObjectRequest$,
      () => exports.CopyObjectOutput$
    ];
    exports.CreateBucket$ = [
      9,
      n0,
      _CB,
      { [_h]: ["PUT", "/", 200] },
      () => exports.CreateBucketRequest$,
      () => exports.CreateBucketOutput$
    ];
    exports.CreateBucketMetadataConfiguration$ = [
      9,
      n0,
      _CBMC,
      { [_hC]: "-", [_h]: ["POST", "/?metadataConfiguration", 200] },
      () => exports.CreateBucketMetadataConfigurationRequest$,
      () => __Unit
    ];
    exports.CreateBucketMetadataTableConfiguration$ = [
      9,
      n0,
      _CBMTC,
      { [_hC]: "-", [_h]: ["POST", "/?metadataTable", 200] },
      () => exports.CreateBucketMetadataTableConfigurationRequest$,
      () => __Unit
    ];
    exports.CreateMultipartUpload$ = [
      9,
      n0,
      _CMUr,
      { [_h]: ["POST", "/{Key+}?uploads", 200] },
      () => exports.CreateMultipartUploadRequest$,
      () => exports.CreateMultipartUploadOutput$
    ];
    exports.CreateSession$ = [
      9,
      n0,
      _CSr,
      { [_h]: ["GET", "/?session", 200] },
      () => exports.CreateSessionRequest$,
      () => exports.CreateSessionOutput$
    ];
    exports.DeleteBucket$ = [
      9,
      n0,
      _DB,
      { [_h]: ["DELETE", "/", 204] },
      () => exports.DeleteBucketRequest$,
      () => __Unit
    ];
    exports.DeleteBucketAnalyticsConfiguration$ = [
      9,
      n0,
      _DBAC,
      { [_h]: ["DELETE", "/?analytics", 204] },
      () => exports.DeleteBucketAnalyticsConfigurationRequest$,
      () => __Unit
    ];
    exports.DeleteBucketCors$ = [
      9,
      n0,
      _DBC,
      { [_h]: ["DELETE", "/?cors", 204] },
      () => exports.DeleteBucketCorsRequest$,
      () => __Unit
    ];
    exports.DeleteBucketEncryption$ = [
      9,
      n0,
      _DBE,
      { [_h]: ["DELETE", "/?encryption", 204] },
      () => exports.DeleteBucketEncryptionRequest$,
      () => __Unit
    ];
    exports.DeleteBucketIntelligentTieringConfiguration$ = [
      9,
      n0,
      _DBITC,
      { [_h]: ["DELETE", "/?intelligent-tiering", 204] },
      () => exports.DeleteBucketIntelligentTieringConfigurationRequest$,
      () => __Unit
    ];
    exports.DeleteBucketInventoryConfiguration$ = [
      9,
      n0,
      _DBIC,
      { [_h]: ["DELETE", "/?inventory", 204] },
      () => exports.DeleteBucketInventoryConfigurationRequest$,
      () => __Unit
    ];
    exports.DeleteBucketLifecycle$ = [
      9,
      n0,
      _DBL,
      { [_h]: ["DELETE", "/?lifecycle", 204] },
      () => exports.DeleteBucketLifecycleRequest$,
      () => __Unit
    ];
    exports.DeleteBucketMetadataConfiguration$ = [
      9,
      n0,
      _DBMC,
      { [_h]: ["DELETE", "/?metadataConfiguration", 204] },
      () => exports.DeleteBucketMetadataConfigurationRequest$,
      () => __Unit
    ];
    exports.DeleteBucketMetadataTableConfiguration$ = [
      9,
      n0,
      _DBMTC,
      { [_h]: ["DELETE", "/?metadataTable", 204] },
      () => exports.DeleteBucketMetadataTableConfigurationRequest$,
      () => __Unit
    ];
    exports.DeleteBucketMetricsConfiguration$ = [
      9,
      n0,
      _DBMCe,
      { [_h]: ["DELETE", "/?metrics", 204] },
      () => exports.DeleteBucketMetricsConfigurationRequest$,
      () => __Unit
    ];
    exports.DeleteBucketOwnershipControls$ = [
      9,
      n0,
      _DBOC,
      { [_h]: ["DELETE", "/?ownershipControls", 204] },
      () => exports.DeleteBucketOwnershipControlsRequest$,
      () => __Unit
    ];
    exports.DeleteBucketPolicy$ = [
      9,
      n0,
      _DBP,
      { [_h]: ["DELETE", "/?policy", 204] },
      () => exports.DeleteBucketPolicyRequest$,
      () => __Unit
    ];
    exports.DeleteBucketReplication$ = [
      9,
      n0,
      _DBRe,
      { [_h]: ["DELETE", "/?replication", 204] },
      () => exports.DeleteBucketReplicationRequest$,
      () => __Unit
    ];
    exports.DeleteBucketTagging$ = [
      9,
      n0,
      _DBT,
      { [_h]: ["DELETE", "/?tagging", 204] },
      () => exports.DeleteBucketTaggingRequest$,
      () => __Unit
    ];
    exports.DeleteBucketWebsite$ = [
      9,
      n0,
      _DBW,
      { [_h]: ["DELETE", "/?website", 204] },
      () => exports.DeleteBucketWebsiteRequest$,
      () => __Unit
    ];
    exports.DeleteObject$ = [
      9,
      n0,
      _DOel,
      { [_h]: ["DELETE", "/{Key+}?x-id=DeleteObject", 204] },
      () => exports.DeleteObjectRequest$,
      () => exports.DeleteObjectOutput$
    ];
    exports.DeleteObjects$ = [
      9,
      n0,
      _DOele,
      { [_hC]: "-", [_h]: ["POST", "/?delete", 200] },
      () => exports.DeleteObjectsRequest$,
      () => exports.DeleteObjectsOutput$
    ];
    exports.DeleteObjectTagging$ = [
      9,
      n0,
      _DOT,
      { [_h]: ["DELETE", "/{Key+}?tagging", 204] },
      () => exports.DeleteObjectTaggingRequest$,
      () => exports.DeleteObjectTaggingOutput$
    ];
    exports.DeletePublicAccessBlock$ = [
      9,
      n0,
      _DPAB,
      { [_h]: ["DELETE", "/?publicAccessBlock", 204] },
      () => exports.DeletePublicAccessBlockRequest$,
      () => __Unit
    ];
    exports.GetBucketAbac$ = [
      9,
      n0,
      _GBA,
      { [_h]: ["GET", "/?abac", 200] },
      () => exports.GetBucketAbacRequest$,
      () => exports.GetBucketAbacOutput$
    ];
    exports.GetBucketAccelerateConfiguration$ = [
      9,
      n0,
      _GBAC,
      { [_h]: ["GET", "/?accelerate", 200] },
      () => exports.GetBucketAccelerateConfigurationRequest$,
      () => exports.GetBucketAccelerateConfigurationOutput$
    ];
    exports.GetBucketAcl$ = [
      9,
      n0,
      _GBAe,
      { [_h]: ["GET", "/?acl", 200] },
      () => exports.GetBucketAclRequest$,
      () => exports.GetBucketAclOutput$
    ];
    exports.GetBucketAnalyticsConfiguration$ = [
      9,
      n0,
      _GBACe,
      { [_h]: ["GET", "/?analytics&x-id=GetBucketAnalyticsConfiguration", 200] },
      () => exports.GetBucketAnalyticsConfigurationRequest$,
      () => exports.GetBucketAnalyticsConfigurationOutput$
    ];
    exports.GetBucketCors$ = [
      9,
      n0,
      _GBC,
      { [_h]: ["GET", "/?cors", 200] },
      () => exports.GetBucketCorsRequest$,
      () => exports.GetBucketCorsOutput$
    ];
    exports.GetBucketEncryption$ = [
      9,
      n0,
      _GBE,
      { [_h]: ["GET", "/?encryption", 200] },
      () => exports.GetBucketEncryptionRequest$,
      () => exports.GetBucketEncryptionOutput$
    ];
    exports.GetBucketIntelligentTieringConfiguration$ = [
      9,
      n0,
      _GBITC,
      { [_h]: ["GET", "/?intelligent-tiering&x-id=GetBucketIntelligentTieringConfiguration", 200] },
      () => exports.GetBucketIntelligentTieringConfigurationRequest$,
      () => exports.GetBucketIntelligentTieringConfigurationOutput$
    ];
    exports.GetBucketInventoryConfiguration$ = [
      9,
      n0,
      _GBIC,
      { [_h]: ["GET", "/?inventory&x-id=GetBucketInventoryConfiguration", 200] },
      () => exports.GetBucketInventoryConfigurationRequest$,
      () => exports.GetBucketInventoryConfigurationOutput$
    ];
    exports.GetBucketLifecycleConfiguration$ = [
      9,
      n0,
      _GBLC,
      { [_h]: ["GET", "/?lifecycle", 200] },
      () => exports.GetBucketLifecycleConfigurationRequest$,
      () => exports.GetBucketLifecycleConfigurationOutput$
    ];
    exports.GetBucketLocation$ = [
      9,
      n0,
      _GBL,
      { [_h]: ["GET", "/?location", 200] },
      () => exports.GetBucketLocationRequest$,
      () => exports.GetBucketLocationOutput$
    ];
    exports.GetBucketLogging$ = [
      9,
      n0,
      _GBLe,
      { [_h]: ["GET", "/?logging", 200] },
      () => exports.GetBucketLoggingRequest$,
      () => exports.GetBucketLoggingOutput$
    ];
    exports.GetBucketMetadataConfiguration$ = [
      9,
      n0,
      _GBMC,
      { [_h]: ["GET", "/?metadataConfiguration", 200] },
      () => exports.GetBucketMetadataConfigurationRequest$,
      () => exports.GetBucketMetadataConfigurationOutput$
    ];
    exports.GetBucketMetadataTableConfiguration$ = [
      9,
      n0,
      _GBMTC,
      { [_h]: ["GET", "/?metadataTable", 200] },
      () => exports.GetBucketMetadataTableConfigurationRequest$,
      () => exports.GetBucketMetadataTableConfigurationOutput$
    ];
    exports.GetBucketMetricsConfiguration$ = [
      9,
      n0,
      _GBMCe,
      { [_h]: ["GET", "/?metrics&x-id=GetBucketMetricsConfiguration", 200] },
      () => exports.GetBucketMetricsConfigurationRequest$,
      () => exports.GetBucketMetricsConfigurationOutput$
    ];
    exports.GetBucketNotificationConfiguration$ = [
      9,
      n0,
      _GBNC,
      { [_h]: ["GET", "/?notification", 200] },
      () => exports.GetBucketNotificationConfigurationRequest$,
      () => exports.NotificationConfiguration$
    ];
    exports.GetBucketOwnershipControls$ = [
      9,
      n0,
      _GBOC,
      { [_h]: ["GET", "/?ownershipControls", 200] },
      () => exports.GetBucketOwnershipControlsRequest$,
      () => exports.GetBucketOwnershipControlsOutput$
    ];
    exports.GetBucketPolicy$ = [
      9,
      n0,
      _GBP,
      { [_h]: ["GET", "/?policy", 200] },
      () => exports.GetBucketPolicyRequest$,
      () => exports.GetBucketPolicyOutput$
    ];
    exports.GetBucketPolicyStatus$ = [
      9,
      n0,
      _GBPS,
      { [_h]: ["GET", "/?policyStatus", 200] },
      () => exports.GetBucketPolicyStatusRequest$,
      () => exports.GetBucketPolicyStatusOutput$
    ];
    exports.GetBucketReplication$ = [
      9,
      n0,
      _GBR,
      { [_h]: ["GET", "/?replication", 200] },
      () => exports.GetBucketReplicationRequest$,
      () => exports.GetBucketReplicationOutput$
    ];
    exports.GetBucketRequestPayment$ = [
      9,
      n0,
      _GBRP,
      { [_h]: ["GET", "/?requestPayment", 200] },
      () => exports.GetBucketRequestPaymentRequest$,
      () => exports.GetBucketRequestPaymentOutput$
    ];
    exports.GetBucketTagging$ = [
      9,
      n0,
      _GBT,
      { [_h]: ["GET", "/?tagging", 200] },
      () => exports.GetBucketTaggingRequest$,
      () => exports.GetBucketTaggingOutput$
    ];
    exports.GetBucketVersioning$ = [
      9,
      n0,
      _GBV,
      { [_h]: ["GET", "/?versioning", 200] },
      () => exports.GetBucketVersioningRequest$,
      () => exports.GetBucketVersioningOutput$
    ];
    exports.GetBucketWebsite$ = [
      9,
      n0,
      _GBW,
      { [_h]: ["GET", "/?website", 200] },
      () => exports.GetBucketWebsiteRequest$,
      () => exports.GetBucketWebsiteOutput$
    ];
    exports.GetObject$ = [
      9,
      n0,
      _GO,
      { [_hC]: "-", [_h]: ["GET", "/{Key+}?x-id=GetObject", 200] },
      () => exports.GetObjectRequest$,
      () => exports.GetObjectOutput$
    ];
    exports.GetObjectAcl$ = [
      9,
      n0,
      _GOA,
      { [_h]: ["GET", "/{Key+}?acl", 200] },
      () => exports.GetObjectAclRequest$,
      () => exports.GetObjectAclOutput$
    ];
    exports.GetObjectAttributes$ = [
      9,
      n0,
      _GOAe,
      { [_h]: ["GET", "/{Key+}?attributes", 200] },
      () => exports.GetObjectAttributesRequest$,
      () => exports.GetObjectAttributesOutput$
    ];
    exports.GetObjectLegalHold$ = [
      9,
      n0,
      _GOLH,
      { [_h]: ["GET", "/{Key+}?legal-hold", 200] },
      () => exports.GetObjectLegalHoldRequest$,
      () => exports.GetObjectLegalHoldOutput$
    ];
    exports.GetObjectLockConfiguration$ = [
      9,
      n0,
      _GOLC,
      { [_h]: ["GET", "/?object-lock", 200] },
      () => exports.GetObjectLockConfigurationRequest$,
      () => exports.GetObjectLockConfigurationOutput$
    ];
    exports.GetObjectRetention$ = [
      9,
      n0,
      _GORe,
      { [_h]: ["GET", "/{Key+}?retention", 200] },
      () => exports.GetObjectRetentionRequest$,
      () => exports.GetObjectRetentionOutput$
    ];
    exports.GetObjectTagging$ = [
      9,
      n0,
      _GOT,
      { [_h]: ["GET", "/{Key+}?tagging", 200] },
      () => exports.GetObjectTaggingRequest$,
      () => exports.GetObjectTaggingOutput$
    ];
    exports.GetObjectTorrent$ = [
      9,
      n0,
      _GOTe,
      { [_h]: ["GET", "/{Key+}?torrent", 200] },
      () => exports.GetObjectTorrentRequest$,
      () => exports.GetObjectTorrentOutput$
    ];
    exports.GetPublicAccessBlock$ = [
      9,
      n0,
      _GPAB,
      { [_h]: ["GET", "/?publicAccessBlock", 200] },
      () => exports.GetPublicAccessBlockRequest$,
      () => exports.GetPublicAccessBlockOutput$
    ];
    exports.HeadBucket$ = [
      9,
      n0,
      _HB,
      { [_h]: ["HEAD", "/", 200] },
      () => exports.HeadBucketRequest$,
      () => exports.HeadBucketOutput$
    ];
    exports.HeadObject$ = [
      9,
      n0,
      _HO,
      { [_h]: ["HEAD", "/{Key+}", 200] },
      () => exports.HeadObjectRequest$,
      () => exports.HeadObjectOutput$
    ];
    exports.ListBucketAnalyticsConfigurations$ = [
      9,
      n0,
      _LBAC,
      { [_h]: ["GET", "/?analytics&x-id=ListBucketAnalyticsConfigurations", 200] },
      () => exports.ListBucketAnalyticsConfigurationsRequest$,
      () => exports.ListBucketAnalyticsConfigurationsOutput$
    ];
    exports.ListBucketIntelligentTieringConfigurations$ = [
      9,
      n0,
      _LBITC,
      { [_h]: ["GET", "/?intelligent-tiering&x-id=ListBucketIntelligentTieringConfigurations", 200] },
      () => exports.ListBucketIntelligentTieringConfigurationsRequest$,
      () => exports.ListBucketIntelligentTieringConfigurationsOutput$
    ];
    exports.ListBucketInventoryConfigurations$ = [
      9,
      n0,
      _LBIC,
      { [_h]: ["GET", "/?inventory&x-id=ListBucketInventoryConfigurations", 200] },
      () => exports.ListBucketInventoryConfigurationsRequest$,
      () => exports.ListBucketInventoryConfigurationsOutput$
    ];
    exports.ListBucketMetricsConfigurations$ = [
      9,
      n0,
      _LBMC,
      { [_h]: ["GET", "/?metrics&x-id=ListBucketMetricsConfigurations", 200] },
      () => exports.ListBucketMetricsConfigurationsRequest$,
      () => exports.ListBucketMetricsConfigurationsOutput$
    ];
    exports.ListBuckets$ = [
      9,
      n0,
      _LB,
      { [_h]: ["GET", "/?x-id=ListBuckets", 200] },
      () => exports.ListBucketsRequest$,
      () => exports.ListBucketsOutput$
    ];
    exports.ListDirectoryBuckets$ = [
      9,
      n0,
      _LDB,
      { [_h]: ["GET", "/?x-id=ListDirectoryBuckets", 200] },
      () => exports.ListDirectoryBucketsRequest$,
      () => exports.ListDirectoryBucketsOutput$
    ];
    exports.ListMultipartUploads$ = [
      9,
      n0,
      _LMU,
      { [_h]: ["GET", "/?uploads", 200] },
      () => exports.ListMultipartUploadsRequest$,
      () => exports.ListMultipartUploadsOutput$
    ];
    exports.ListObjects$ = [
      9,
      n0,
      _LO,
      { [_h]: ["GET", "/", 200] },
      () => exports.ListObjectsRequest$,
      () => exports.ListObjectsOutput$
    ];
    exports.ListObjectsV2$ = [
      9,
      n0,
      _LOV,
      { [_h]: ["GET", "/?list-type=2", 200] },
      () => exports.ListObjectsV2Request$,
      () => exports.ListObjectsV2Output$
    ];
    exports.ListObjectVersions$ = [
      9,
      n0,
      _LOVi,
      { [_h]: ["GET", "/?versions", 200] },
      () => exports.ListObjectVersionsRequest$,
      () => exports.ListObjectVersionsOutput$
    ];
    exports.ListParts$ = [
      9,
      n0,
      _LP,
      { [_h]: ["GET", "/{Key+}?x-id=ListParts", 200] },
      () => exports.ListPartsRequest$,
      () => exports.ListPartsOutput$
    ];
    exports.PutBucketAbac$ = [
      9,
      n0,
      _PBA,
      { [_hC]: "-", [_h]: ["PUT", "/?abac", 200] },
      () => exports.PutBucketAbacRequest$,
      () => __Unit
    ];
    exports.PutBucketAccelerateConfiguration$ = [
      9,
      n0,
      _PBAC,
      { [_hC]: "-", [_h]: ["PUT", "/?accelerate", 200] },
      () => exports.PutBucketAccelerateConfigurationRequest$,
      () => __Unit
    ];
    exports.PutBucketAcl$ = [
      9,
      n0,
      _PBAu,
      { [_hC]: "-", [_h]: ["PUT", "/?acl", 200] },
      () => exports.PutBucketAclRequest$,
      () => __Unit
    ];
    exports.PutBucketAnalyticsConfiguration$ = [
      9,
      n0,
      _PBACu,
      { [_h]: ["PUT", "/?analytics", 200] },
      () => exports.PutBucketAnalyticsConfigurationRequest$,
      () => __Unit
    ];
    exports.PutBucketCors$ = [
      9,
      n0,
      _PBC,
      { [_hC]: "-", [_h]: ["PUT", "/?cors", 200] },
      () => exports.PutBucketCorsRequest$,
      () => __Unit
    ];
    exports.PutBucketEncryption$ = [
      9,
      n0,
      _PBE,
      { [_hC]: "-", [_h]: ["PUT", "/?encryption", 200] },
      () => exports.PutBucketEncryptionRequest$,
      () => __Unit
    ];
    exports.PutBucketIntelligentTieringConfiguration$ = [
      9,
      n0,
      _PBITC,
      { [_h]: ["PUT", "/?intelligent-tiering", 200] },
      () => exports.PutBucketIntelligentTieringConfigurationRequest$,
      () => __Unit
    ];
    exports.PutBucketInventoryConfiguration$ = [
      9,
      n0,
      _PBIC,
      { [_h]: ["PUT", "/?inventory", 200] },
      () => exports.PutBucketInventoryConfigurationRequest$,
      () => __Unit
    ];
    exports.PutBucketLifecycleConfiguration$ = [
      9,
      n0,
      _PBLC,
      { [_hC]: "-", [_h]: ["PUT", "/?lifecycle", 200] },
      () => exports.PutBucketLifecycleConfigurationRequest$,
      () => exports.PutBucketLifecycleConfigurationOutput$
    ];
    exports.PutBucketLogging$ = [
      9,
      n0,
      _PBL,
      { [_hC]: "-", [_h]: ["PUT", "/?logging", 200] },
      () => exports.PutBucketLoggingRequest$,
      () => __Unit
    ];
    exports.PutBucketMetricsConfiguration$ = [
      9,
      n0,
      _PBMC,
      { [_h]: ["PUT", "/?metrics", 200] },
      () => exports.PutBucketMetricsConfigurationRequest$,
      () => __Unit
    ];
    exports.PutBucketNotificationConfiguration$ = [
      9,
      n0,
      _PBNC,
      { [_h]: ["PUT", "/?notification", 200] },
      () => exports.PutBucketNotificationConfigurationRequest$,
      () => __Unit
    ];
    exports.PutBucketOwnershipControls$ = [
      9,
      n0,
      _PBOC,
      { [_hC]: "-", [_h]: ["PUT", "/?ownershipControls", 200] },
      () => exports.PutBucketOwnershipControlsRequest$,
      () => __Unit
    ];
    exports.PutBucketPolicy$ = [
      9,
      n0,
      _PBP,
      { [_hC]: "-", [_h]: ["PUT", "/?policy", 200] },
      () => exports.PutBucketPolicyRequest$,
      () => __Unit
    ];
    exports.PutBucketReplication$ = [
      9,
      n0,
      _PBR,
      { [_hC]: "-", [_h]: ["PUT", "/?replication", 200] },
      () => exports.PutBucketReplicationRequest$,
      () => __Unit
    ];
    exports.PutBucketRequestPayment$ = [
      9,
      n0,
      _PBRP,
      { [_hC]: "-", [_h]: ["PUT", "/?requestPayment", 200] },
      () => exports.PutBucketRequestPaymentRequest$,
      () => __Unit
    ];
    exports.PutBucketTagging$ = [
      9,
      n0,
      _PBT,
      { [_hC]: "-", [_h]: ["PUT", "/?tagging", 200] },
      () => exports.PutBucketTaggingRequest$,
      () => __Unit
    ];
    exports.PutBucketVersioning$ = [
      9,
      n0,
      _PBV,
      { [_hC]: "-", [_h]: ["PUT", "/?versioning", 200] },
      () => exports.PutBucketVersioningRequest$,
      () => __Unit
    ];
    exports.PutBucketWebsite$ = [
      9,
      n0,
      _PBW,
      { [_hC]: "-", [_h]: ["PUT", "/?website", 200] },
      () => exports.PutBucketWebsiteRequest$,
      () => __Unit
    ];
    exports.PutObject$ = [
      9,
      n0,
      _PO,
      { [_hC]: "-", [_h]: ["PUT", "/{Key+}?x-id=PutObject", 200] },
      () => exports.PutObjectRequest$,
      () => exports.PutObjectOutput$
    ];
    exports.PutObjectAcl$ = [
      9,
      n0,
      _POA,
      { [_hC]: "-", [_h]: ["PUT", "/{Key+}?acl", 200] },
      () => exports.PutObjectAclRequest$,
      () => exports.PutObjectAclOutput$
    ];
    exports.PutObjectLegalHold$ = [
      9,
      n0,
      _POLH,
      { [_hC]: "-", [_h]: ["PUT", "/{Key+}?legal-hold", 200] },
      () => exports.PutObjectLegalHoldRequest$,
      () => exports.PutObjectLegalHoldOutput$
    ];
    exports.PutObjectLockConfiguration$ = [
      9,
      n0,
      _POLC,
      { [_hC]: "-", [_h]: ["PUT", "/?object-lock", 200] },
      () => exports.PutObjectLockConfigurationRequest$,
      () => exports.PutObjectLockConfigurationOutput$
    ];
    exports.PutObjectRetention$ = [
      9,
      n0,
      _PORu,
      { [_hC]: "-", [_h]: ["PUT", "/{Key+}?retention", 200] },
      () => exports.PutObjectRetentionRequest$,
      () => exports.PutObjectRetentionOutput$
    ];
    exports.PutObjectTagging$ = [
      9,
      n0,
      _POT,
      { [_hC]: "-", [_h]: ["PUT", "/{Key+}?tagging", 200] },
      () => exports.PutObjectTaggingRequest$,
      () => exports.PutObjectTaggingOutput$
    ];
    exports.PutPublicAccessBlock$ = [
      9,
      n0,
      _PPAB,
      { [_hC]: "-", [_h]: ["PUT", "/?publicAccessBlock", 200] },
      () => exports.PutPublicAccessBlockRequest$,
      () => __Unit
    ];
    exports.RenameObject$ = [
      9,
      n0,
      _RO,
      { [_h]: ["PUT", "/{Key+}?renameObject", 200] },
      () => exports.RenameObjectRequest$,
      () => exports.RenameObjectOutput$
    ];
    exports.RestoreObject$ = [
      9,
      n0,
      _ROe,
      { [_hC]: "-", [_h]: ["POST", "/{Key+}?restore", 200] },
      () => exports.RestoreObjectRequest$,
      () => exports.RestoreObjectOutput$
    ];
    exports.SelectObjectContent$ = [
      9,
      n0,
      _SOC,
      { [_h]: ["POST", "/{Key+}?select&select-type=2", 200] },
      () => exports.SelectObjectContentRequest$,
      () => exports.SelectObjectContentOutput$
    ];
    exports.UpdateBucketMetadataInventoryTableConfiguration$ = [
      9,
      n0,
      _UBMITC,
      { [_hC]: "-", [_h]: ["PUT", "/?metadataInventoryTable", 200] },
      () => exports.UpdateBucketMetadataInventoryTableConfigurationRequest$,
      () => __Unit
    ];
    exports.UpdateBucketMetadataJournalTableConfiguration$ = [
      9,
      n0,
      _UBMJTC,
      { [_hC]: "-", [_h]: ["PUT", "/?metadataJournalTable", 200] },
      () => exports.UpdateBucketMetadataJournalTableConfigurationRequest$,
      () => __Unit
    ];
    exports.UpdateObjectEncryption$ = [
      9,
      n0,
      _UOE,
      { [_hC]: "-", [_h]: ["PUT", "/{Key+}?encryption", 200] },
      () => exports.UpdateObjectEncryptionRequest$,
      () => exports.UpdateObjectEncryptionResponse$
    ];
    exports.UploadPart$ = [
      9,
      n0,
      _UP,
      { [_hC]: "-", [_h]: ["PUT", "/{Key+}?x-id=UploadPart", 200] },
      () => exports.UploadPartRequest$,
      () => exports.UploadPartOutput$
    ];
    exports.UploadPartCopy$ = [
      9,
      n0,
      _UPC,
      { [_h]: ["PUT", "/{Key+}?x-id=UploadPartCopy", 200] },
      () => exports.UploadPartCopyRequest$,
      () => exports.UploadPartCopyOutput$
    ];
    exports.WriteGetObjectResponse$ = [
      9,
      n0,
      _WGOR,
      { [_en]: ["{RequestRoute}."], [_h]: ["POST", "/WriteGetObjectResponse", 200] },
      () => exports.WriteGetObjectResponseRequest$,
      () => __Unit
    ];
  }
});

// node_modules/@aws-sdk/client-s3/package.json
var require_package = __commonJS({
  "node_modules/@aws-sdk/client-s3/package.json"(exports, module) {
    module.exports = {
      name: "@aws-sdk/client-s3",
      description: "AWS SDK for JavaScript S3 Client for Node.js, Browser and React Native",
      version: "3.1036.0",
      scripts: {
        build: "concurrently 'yarn:build:types' 'yarn:build:es' && yarn build:cjs",
        "build:cjs": "node ../../scripts/compilation/inline client-s3",
        "build:es": "tsc -p tsconfig.es.json",
        "build:include:deps": 'yarn g:turbo run build -F="$npm_package_name"',
        "build:types": "tsc -p tsconfig.types.json",
        "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
        clean: "premove dist-cjs dist-es dist-types tsconfig.cjs.tsbuildinfo tsconfig.es.tsbuildinfo tsconfig.types.tsbuildinfo",
        "extract:docs": "api-extractor run --local",
        "generate:client": "node ../../scripts/generate-clients/single-service --solo s3",
        test: "yarn g:vitest run",
        "test:browser": "node ./test/browser-build/esbuild && yarn g:vitest run -c vitest.config.browser.mts",
        "test:browser:watch": "node ./test/browser-build/esbuild && yarn g:vitest watch -c vitest.config.browser.mts",
        "test:e2e": "yarn g:vitest run -c vitest.config.e2e.mts && yarn test:browser",
        "test:e2e:watch": "yarn g:vitest watch -c vitest.config.e2e.mts",
        "test:index": "tsc --noEmit ./test/index-types.ts && node ./test/index-objects.spec.mjs",
        "test:integration": "yarn g:vitest run -c vitest.config.integ.mts",
        "test:integration:watch": "yarn g:vitest watch -c vitest.config.integ.mts",
        "test:watch": "yarn g:vitest watch"
      },
      main: "./dist-cjs/index.js",
      types: "./dist-types/index.d.ts",
      module: "./dist-es/index.js",
      sideEffects: false,
      dependencies: {
        "@aws-crypto/sha1-browser": "5.2.0",
        "@aws-crypto/sha256-browser": "5.2.0",
        "@aws-crypto/sha256-js": "5.2.0",
        "@aws-sdk/core": "^3.974.5",
        "@aws-sdk/credential-provider-node": "^3.972.36",
        "@aws-sdk/middleware-bucket-endpoint": "^3.972.10",
        "@aws-sdk/middleware-expect-continue": "^3.972.10",
        "@aws-sdk/middleware-flexible-checksums": "^3.974.13",
        "@aws-sdk/middleware-host-header": "^3.972.10",
        "@aws-sdk/middleware-location-constraint": "^3.972.10",
        "@aws-sdk/middleware-logger": "^3.972.10",
        "@aws-sdk/middleware-recursion-detection": "^3.972.11",
        "@aws-sdk/middleware-sdk-s3": "^3.972.34",
        "@aws-sdk/middleware-ssec": "^3.972.10",
        "@aws-sdk/middleware-user-agent": "^3.972.35",
        "@aws-sdk/region-config-resolver": "^3.972.13",
        "@aws-sdk/signature-v4-multi-region": "^3.996.22",
        "@aws-sdk/types": "^3.973.8",
        "@aws-sdk/util-endpoints": "^3.996.8",
        "@aws-sdk/util-user-agent-browser": "^3.972.10",
        "@aws-sdk/util-user-agent-node": "^3.973.21",
        "@smithy/config-resolver": "^4.4.17",
        "@smithy/core": "^3.23.17",
        "@smithy/eventstream-serde-browser": "^4.2.14",
        "@smithy/eventstream-serde-config-resolver": "^4.3.14",
        "@smithy/eventstream-serde-node": "^4.2.14",
        "@smithy/fetch-http-handler": "^5.3.17",
        "@smithy/hash-blob-browser": "^4.2.15",
        "@smithy/hash-node": "^4.2.14",
        "@smithy/hash-stream-node": "^4.2.14",
        "@smithy/invalid-dependency": "^4.2.14",
        "@smithy/md5-js": "^4.2.14",
        "@smithy/middleware-content-length": "^4.2.14",
        "@smithy/middleware-endpoint": "^4.4.32",
        "@smithy/middleware-retry": "^4.5.5",
        "@smithy/middleware-serde": "^4.2.20",
        "@smithy/middleware-stack": "^4.2.14",
        "@smithy/node-config-provider": "^4.3.14",
        "@smithy/node-http-handler": "^4.6.1",
        "@smithy/protocol-http": "^5.3.14",
        "@smithy/smithy-client": "^4.12.13",
        "@smithy/types": "^4.14.1",
        "@smithy/url-parser": "^4.2.14",
        "@smithy/util-base64": "^4.3.2",
        "@smithy/util-body-length-browser": "^4.2.2",
        "@smithy/util-body-length-node": "^4.2.3",
        "@smithy/util-defaults-mode-browser": "^4.3.49",
        "@smithy/util-defaults-mode-node": "^4.2.54",
        "@smithy/util-endpoints": "^3.4.2",
        "@smithy/util-middleware": "^4.2.14",
        "@smithy/util-retry": "^4.3.4",
        "@smithy/util-stream": "^4.5.25",
        "@smithy/util-utf8": "^4.2.2",
        "@smithy/util-waiter": "^4.2.16",
        tslib: "^2.6.2"
      },
      devDependencies: {
        "@aws-sdk/signature-v4-crt": "3.1036.0",
        "@smithy/snapshot-testing": "^2.0.8",
        "@tsconfig/node20": "20.1.8",
        "@types/node": "^20.14.8",
        concurrently: "7.0.0",
        "downlevel-dts": "0.10.1",
        premove: "4.0.0",
        typescript: "~5.8.3",
        vitest: "^4.0.17"
      },
      engines: {
        node: ">=20.0.0"
      },
      typesVersions: {
        "<4.5": {
          "dist-types/*": [
            "dist-types/ts3.4/*"
          ]
        }
      },
      files: [
        "dist-*/**"
      ],
      author: {
        name: "AWS SDK for JavaScript Team",
        url: "https://aws.amazon.com/javascript/"
      },
      license: "Apache-2.0",
      browser: {
        "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
      },
      "react-native": {
        "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
      },
      homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-s3",
      repository: {
        type: "git",
        url: "https://github.com/aws/aws-sdk-js-v3.git",
        directory: "clients/client-s3"
      }
    };
  }
});

// node_modules/@aws-sdk/credential-provider-node/dist-cjs/index.js
var require_dist_cjs43 = __commonJS({
  "node_modules/@aws-sdk/credential-provider-node/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var credentialProviderEnv = require_dist_cjs30();
    var propertyProvider = require_dist_cjs24();
    var sharedIniFileLoader = require_dist_cjs25();
    var ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
    var remoteProvider = /* @__PURE__ */ __name(async (init) => {
      const { ENV_CMDS_FULL_URI, ENV_CMDS_RELATIVE_URI, fromContainerMetadata, fromInstanceMetadata } = await import("./dist-cjs-HMVR4K7Y.mjs");
      if (process.env[ENV_CMDS_RELATIVE_URI] || process.env[ENV_CMDS_FULL_URI]) {
        init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromHttp/fromContainerMetadata");
        const { fromHttp } = await import("./dist-cjs-V2YDHTFN.mjs");
        return propertyProvider.chain(fromHttp(init), fromContainerMetadata(init));
      }
      if (process.env[ENV_IMDS_DISABLED] && process.env[ENV_IMDS_DISABLED] !== "false") {
        return async () => {
          throw new propertyProvider.CredentialsProviderError("EC2 Instance Metadata Service access disabled", { logger: init.logger });
        };
      }
      init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromInstanceMetadata");
      return fromInstanceMetadata(init);
    }, "remoteProvider");
    function memoizeChain(providers, treatAsExpired) {
      const chain = internalCreateChain(providers);
      let activeLock;
      let passiveLock;
      let credentials;
      const provider = /* @__PURE__ */ __name(async (options) => {
        if (options?.forceRefresh) {
          return await chain(options);
        }
        if (credentials?.expiration) {
          if (credentials?.expiration?.getTime() < Date.now()) {
            credentials = void 0;
          }
        }
        if (activeLock) {
          await activeLock;
        } else if (!credentials || treatAsExpired?.(credentials)) {
          if (credentials) {
            if (!passiveLock) {
              passiveLock = chain(options).then((c) => {
                credentials = c;
              }).finally(() => {
                passiveLock = void 0;
              });
            }
          } else {
            activeLock = chain(options).then((c) => {
              credentials = c;
            }).finally(() => {
              activeLock = void 0;
            });
            return provider(options);
          }
        }
        return credentials;
      }, "provider");
      return provider;
    }
    __name(memoizeChain, "memoizeChain");
    var internalCreateChain = /* @__PURE__ */ __name((providers) => async (awsIdentityProperties) => {
      let lastProviderError;
      for (const provider of providers) {
        try {
          return await provider(awsIdentityProperties);
        } catch (err) {
          lastProviderError = err;
          if (err?.tryNextLink) {
            continue;
          }
          throw err;
        }
      }
      throw lastProviderError;
    }, "internalCreateChain");
    var multipleCredentialSourceWarningEmitted = false;
    var defaultProvider = /* @__PURE__ */ __name((init = {}) => memoizeChain([
      async () => {
        const profile = init.profile ?? process.env[sharedIniFileLoader.ENV_PROFILE];
        if (profile) {
          const envStaticCredentialsAreSet = process.env[credentialProviderEnv.ENV_KEY] && process.env[credentialProviderEnv.ENV_SECRET];
          if (envStaticCredentialsAreSet) {
            if (!multipleCredentialSourceWarningEmitted) {
              const warnFn = init.logger?.warn && init.logger?.constructor?.name !== "NoOpLogger" ? init.logger.warn.bind(init.logger) : console.warn;
              warnFn(`@aws-sdk/credential-provider-node - defaultProvider::fromEnv WARNING:
    Multiple credential sources detected: 
    Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
    This SDK will proceed with the AWS_PROFILE value.
    
    However, a future version may change this behavior to prefer the ENV static credentials.
    Please ensure that your environment only sets either the AWS_PROFILE or the
    AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY pair.
`);
              multipleCredentialSourceWarningEmitted = true;
            }
          }
          throw new propertyProvider.CredentialsProviderError("AWS_PROFILE is set, skipping fromEnv provider.", {
            logger: init.logger,
            tryNextLink: true
          });
        }
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromEnv");
        return credentialProviderEnv.fromEnv(init)();
      },
      async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromSSO");
        const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
        if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
          throw new propertyProvider.CredentialsProviderError("Skipping SSO provider in default chain (inputs do not include SSO fields).", { logger: init.logger });
        }
        const { fromSSO } = await import("./dist-cjs-3EWUSYY4.mjs");
        return fromSSO(init)(awsIdentityProperties);
      },
      async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromIni");
        const { fromIni } = await import("./dist-cjs-IKURTPNL.mjs");
        return fromIni(init)(awsIdentityProperties);
      },
      async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromProcess");
        const { fromProcess } = await import("./dist-cjs-VRBWMVPU.mjs");
        return fromProcess(init)(awsIdentityProperties);
      },
      async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromTokenFile");
        const { fromTokenFile } = await import("./dist-cjs-GPJDWDAL.mjs");
        return fromTokenFile(init)(awsIdentityProperties);
      },
      async () => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::remoteProvider");
        return (await remoteProvider(init))();
      },
      async () => {
        throw new propertyProvider.CredentialsProviderError("Could not load credentials from any providers", {
          tryNextLink: false,
          logger: init.logger
        });
      }
    ], credentialsTreatedAsExpired), "defaultProvider");
    var credentialsWillNeedRefresh = /* @__PURE__ */ __name((credentials) => credentials?.expiration !== void 0, "credentialsWillNeedRefresh");
    var credentialsTreatedAsExpired = /* @__PURE__ */ __name((credentials) => credentials?.expiration !== void 0 && credentials.expiration.getTime() - Date.now() < 3e5, "credentialsTreatedAsExpired");
    exports.credentialsTreatedAsExpired = credentialsTreatedAsExpired;
    exports.credentialsWillNeedRefresh = credentialsWillNeedRefresh;
    exports.defaultProvider = defaultProvider;
  }
});

// node_modules/@aws-sdk/middleware-bucket-endpoint/dist-cjs/index.js
var require_dist_cjs44 = __commonJS({
  "node_modules/@aws-sdk/middleware-bucket-endpoint/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var utilConfigProvider = require_dist_cjs17();
    var utilArnParser = require_dist_cjs16();
    var protocolHttp = require_dist_cjs();
    var NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME = "AWS_S3_DISABLE_MULTIREGION_ACCESS_POINTS";
    var NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME = "s3_disable_multiregion_access_points";
    var NODE_DISABLE_MULTIREGION_ACCESS_POINT_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => utilConfigProvider.booleanSelector(env, NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME, utilConfigProvider.SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => utilConfigProvider.booleanSelector(profile, NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME, utilConfigProvider.SelectorType.CONFIG), "configFileSelector"),
      default: false
    };
    var NODE_USE_ARN_REGION_ENV_NAME = "AWS_S3_USE_ARN_REGION";
    var NODE_USE_ARN_REGION_INI_NAME = "s3_use_arn_region";
    var NODE_USE_ARN_REGION_CONFIG_OPTIONS = {
      environmentVariableSelector: /* @__PURE__ */ __name((env) => utilConfigProvider.booleanSelector(env, NODE_USE_ARN_REGION_ENV_NAME, utilConfigProvider.SelectorType.ENV), "environmentVariableSelector"),
      configFileSelector: /* @__PURE__ */ __name((profile) => utilConfigProvider.booleanSelector(profile, NODE_USE_ARN_REGION_INI_NAME, utilConfigProvider.SelectorType.CONFIG), "configFileSelector"),
      default: void 0
    };
    var DOMAIN_PATTERN = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/;
    var IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
    var DOTS_PATTERN = /\.\./;
    var DOT_PATTERN = /\./;
    var S3_HOSTNAME_PATTERN = /^(.+\.)?s3(-fips)?(\.dualstack)?[.-]([a-z0-9-]+)\./;
    var S3_US_EAST_1_ALTNAME_PATTERN = /^s3(-external-1)?\.amazonaws\.com$/;
    var AWS_PARTITION_SUFFIX = "amazonaws.com";
    var isBucketNameOptions = /* @__PURE__ */ __name((options) => typeof options.bucketName === "string", "isBucketNameOptions");
    var isDnsCompatibleBucketName = /* @__PURE__ */ __name((bucketName) => DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName), "isDnsCompatibleBucketName");
    var getRegionalSuffix = /* @__PURE__ */ __name((hostname) => {
      const parts = hostname.match(S3_HOSTNAME_PATTERN);
      return [parts[4], hostname.replace(new RegExp(`^${parts[0]}`), "")];
    }, "getRegionalSuffix");
    var getSuffix = /* @__PURE__ */ __name((hostname) => S3_US_EAST_1_ALTNAME_PATTERN.test(hostname) ? ["us-east-1", AWS_PARTITION_SUFFIX] : getRegionalSuffix(hostname), "getSuffix");
    var getSuffixForArnEndpoint = /* @__PURE__ */ __name((hostname) => S3_US_EAST_1_ALTNAME_PATTERN.test(hostname) ? [hostname.replace(`.${AWS_PARTITION_SUFFIX}`, ""), AWS_PARTITION_SUFFIX] : getRegionalSuffix(hostname), "getSuffixForArnEndpoint");
    var validateArnEndpointOptions = /* @__PURE__ */ __name((options) => {
      if (options.pathStyleEndpoint) {
        throw new Error("Path-style S3 endpoint is not supported when bucket is an ARN");
      }
      if (options.accelerateEndpoint) {
        throw new Error("Accelerate endpoint is not supported when bucket is an ARN");
      }
      if (!options.tlsCompatible) {
        throw new Error("HTTPS is required when bucket is an ARN");
      }
    }, "validateArnEndpointOptions");
    var validateService = /* @__PURE__ */ __name((service) => {
      if (service !== "s3" && service !== "s3-outposts" && service !== "s3-object-lambda") {
        throw new Error("Expect 's3' or 's3-outposts' or 's3-object-lambda' in ARN service component");
      }
    }, "validateService");
    var validateS3Service = /* @__PURE__ */ __name((service) => {
      if (service !== "s3") {
        throw new Error("Expect 's3' in Accesspoint ARN service component");
      }
    }, "validateS3Service");
    var validateOutpostService = /* @__PURE__ */ __name((service) => {
      if (service !== "s3-outposts") {
        throw new Error("Expect 's3-posts' in Outpost ARN service component");
      }
    }, "validateOutpostService");
    var validatePartition = /* @__PURE__ */ __name((partition, options) => {
      if (partition !== options.clientPartition) {
        throw new Error(`Partition in ARN is incompatible, got "${partition}" but expected "${options.clientPartition}"`);
      }
    }, "validatePartition");
    var validateRegion = /* @__PURE__ */ __name((region, options) => {
    }, "validateRegion");
    var validateRegionalClient = /* @__PURE__ */ __name((region) => {
      if (["s3-external-1", "aws-global"].includes(region)) {
        throw new Error(`Client region ${region} is not regional`);
      }
    }, "validateRegionalClient");
    var validateAccountId = /* @__PURE__ */ __name((accountId2) => {
      if (!/[0-9]{12}/.exec(accountId2)) {
        throw new Error("Access point ARN accountID does not match regex '[0-9]{12}'");
      }
    }, "validateAccountId");
    var validateDNSHostLabel = /* @__PURE__ */ __name((label, options = { tlsCompatible: true }) => {
      if (label.length >= 64 || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(label) || /(\d+\.){3}\d+/.test(label) || /[.-]{2}/.test(label) || options?.tlsCompatible && DOT_PATTERN.test(label)) {
        throw new Error(`Invalid DNS label ${label}`);
      }
    }, "validateDNSHostLabel");
    var validateCustomEndpoint = /* @__PURE__ */ __name((options) => {
      if (options.isCustomEndpoint) {
        if (options.dualstackEndpoint)
          throw new Error("Dualstack endpoint is not supported with custom endpoint");
        if (options.accelerateEndpoint)
          throw new Error("Accelerate endpoint is not supported with custom endpoint");
      }
    }, "validateCustomEndpoint");
    var getArnResources = /* @__PURE__ */ __name((resource) => {
      const delimiter = resource.includes(":") ? ":" : "/";
      const [resourceType, ...rest] = resource.split(delimiter);
      if (resourceType === "accesspoint") {
        if (rest.length !== 1 || rest[0] === "") {
          throw new Error(`Access Point ARN should have one resource accesspoint${delimiter}{accesspointname}`);
        }
        return { accesspointName: rest[0] };
      } else if (resourceType === "outpost") {
        if (!rest[0] || rest[1] !== "accesspoint" || !rest[2] || rest.length !== 3) {
          throw new Error(`Outpost ARN should have resource outpost${delimiter}{outpostId}${delimiter}accesspoint${delimiter}{accesspointName}`);
        }
        const [outpostId, _, accesspointName] = rest;
        return { outpostId, accesspointName };
      } else {
        throw new Error(`ARN resource should begin with 'accesspoint${delimiter}' or 'outpost${delimiter}'`);
      }
    }, "getArnResources");
    var validateNoDualstack = /* @__PURE__ */ __name((dualstackEndpoint) => {
    }, "validateNoDualstack");
    var validateNoFIPS = /* @__PURE__ */ __name((useFipsEndpoint) => {
      if (useFipsEndpoint)
        throw new Error(`FIPS region is not supported with Outpost.`);
    }, "validateNoFIPS");
    var validateMrapAlias = /* @__PURE__ */ __name((name) => {
      try {
        name.split(".").forEach((label) => {
          validateDNSHostLabel(label);
        });
      } catch (e) {
        throw new Error(`"${name}" is not a DNS compatible name.`);
      }
    }, "validateMrapAlias");
    var bucketHostname = /* @__PURE__ */ __name((options) => {
      validateCustomEndpoint(options);
      return isBucketNameOptions(options) ? getEndpointFromBucketName(options) : getEndpointFromArn(options);
    }, "bucketHostname");
    var getEndpointFromBucketName = /* @__PURE__ */ __name(({ accelerateEndpoint = false, clientRegion: region, baseHostname, bucketName, dualstackEndpoint = false, fipsEndpoint = false, pathStyleEndpoint = false, tlsCompatible = true, isCustomEndpoint = false }) => {
      const [clientRegion, hostnameSuffix] = isCustomEndpoint ? [region, baseHostname] : getSuffix(baseHostname);
      if (pathStyleEndpoint || !isDnsCompatibleBucketName(bucketName) || tlsCompatible && DOT_PATTERN.test(bucketName)) {
        return {
          bucketEndpoint: false,
          hostname: dualstackEndpoint ? `s3.dualstack.${clientRegion}.${hostnameSuffix}` : baseHostname
        };
      }
      if (accelerateEndpoint) {
        baseHostname = `s3-accelerate${dualstackEndpoint ? ".dualstack" : ""}.${hostnameSuffix}`;
      } else if (dualstackEndpoint) {
        baseHostname = `s3.dualstack.${clientRegion}.${hostnameSuffix}`;
      }
      return {
        bucketEndpoint: true,
        hostname: `${bucketName}.${baseHostname}`
      };
    }, "getEndpointFromBucketName");
    var getEndpointFromArn = /* @__PURE__ */ __name((options) => {
      const { isCustomEndpoint, baseHostname, clientRegion } = options;
      const hostnameSuffix = isCustomEndpoint ? baseHostname : getSuffixForArnEndpoint(baseHostname)[1];
      const { pathStyleEndpoint, accelerateEndpoint = false, fipsEndpoint = false, tlsCompatible = true, bucketName, clientPartition = "aws" } = options;
      validateArnEndpointOptions({ pathStyleEndpoint, accelerateEndpoint, tlsCompatible });
      const { service, partition, accountId: accountId2, region, resource } = bucketName;
      validateService(service);
      validatePartition(partition, { clientPartition });
      validateAccountId(accountId2);
      const { accesspointName, outpostId } = getArnResources(resource);
      if (service === "s3-object-lambda") {
        return getEndpointFromObjectLambdaArn({ ...options, tlsCompatible, bucketName, accesspointName, hostnameSuffix });
      }
      if (region === "") {
        return getEndpointFromMRAPArn({ ...options, mrapAlias: accesspointName, hostnameSuffix });
      }
      if (outpostId) {
        return getEndpointFromOutpostArn({ ...options, clientRegion, outpostId, accesspointName, hostnameSuffix });
      }
      return getEndpointFromAccessPointArn({ ...options, clientRegion, accesspointName, hostnameSuffix });
    }, "getEndpointFromArn");
    var getEndpointFromObjectLambdaArn = /* @__PURE__ */ __name(({ dualstackEndpoint = false, fipsEndpoint = false, tlsCompatible = true, useArnRegion, clientRegion, clientSigningRegion = clientRegion, accesspointName, bucketName, hostnameSuffix }) => {
      const { accountId: accountId2, region, service } = bucketName;
      validateRegionalClient(clientRegion);
      const DNSHostLabel = `${accesspointName}-${accountId2}`;
      validateDNSHostLabel(DNSHostLabel, { tlsCompatible });
      const endpointRegion = useArnRegion ? region : clientRegion;
      const signingRegion = useArnRegion ? region : clientSigningRegion;
      return {
        bucketEndpoint: true,
        hostname: `${DNSHostLabel}.${service}${fipsEndpoint ? "-fips" : ""}.${endpointRegion}.${hostnameSuffix}`,
        signingRegion,
        signingService: service
      };
    }, "getEndpointFromObjectLambdaArn");
    var getEndpointFromMRAPArn = /* @__PURE__ */ __name(({ disableMultiregionAccessPoints, dualstackEndpoint = false, isCustomEndpoint, mrapAlias, hostnameSuffix }) => {
      if (disableMultiregionAccessPoints === true) {
        throw new Error("SDK is attempting to use a MRAP ARN. Please enable to feature.");
      }
      validateMrapAlias(mrapAlias);
      return {
        bucketEndpoint: true,
        hostname: `${mrapAlias}${isCustomEndpoint ? "" : `.accesspoint.s3-global`}.${hostnameSuffix}`,
        signingRegion: "*"
      };
    }, "getEndpointFromMRAPArn");
    var getEndpointFromOutpostArn = /* @__PURE__ */ __name(({ useArnRegion, clientRegion, clientSigningRegion = clientRegion, bucketName, outpostId, dualstackEndpoint = false, fipsEndpoint = false, tlsCompatible = true, accesspointName, isCustomEndpoint, hostnameSuffix }) => {
      validateRegionalClient(clientRegion);
      const DNSHostLabel = `${accesspointName}-${bucketName.accountId}`;
      validateDNSHostLabel(DNSHostLabel, { tlsCompatible });
      const endpointRegion = useArnRegion ? bucketName.region : clientRegion;
      const signingRegion = useArnRegion ? bucketName.region : clientSigningRegion;
      validateOutpostService(bucketName.service);
      validateDNSHostLabel(outpostId, { tlsCompatible });
      validateNoFIPS(fipsEndpoint);
      const hostnamePrefix = `${DNSHostLabel}.${outpostId}`;
      return {
        bucketEndpoint: true,
        hostname: `${hostnamePrefix}${isCustomEndpoint ? "" : `.s3-outposts.${endpointRegion}`}.${hostnameSuffix}`,
        signingRegion,
        signingService: "s3-outposts"
      };
    }, "getEndpointFromOutpostArn");
    var getEndpointFromAccessPointArn = /* @__PURE__ */ __name(({ useArnRegion, clientRegion, clientSigningRegion = clientRegion, bucketName, dualstackEndpoint = false, fipsEndpoint = false, tlsCompatible = true, accesspointName, isCustomEndpoint, hostnameSuffix }) => {
      validateRegionalClient(clientRegion);
      const hostnamePrefix = `${accesspointName}-${bucketName.accountId}`;
      validateDNSHostLabel(hostnamePrefix, { tlsCompatible });
      const endpointRegion = useArnRegion ? bucketName.region : clientRegion;
      const signingRegion = useArnRegion ? bucketName.region : clientSigningRegion;
      validateS3Service(bucketName.service);
      return {
        bucketEndpoint: true,
        hostname: `${hostnamePrefix}${isCustomEndpoint ? "" : `.s3-accesspoint${fipsEndpoint ? "-fips" : ""}${dualstackEndpoint ? ".dualstack" : ""}.${endpointRegion}`}.${hostnameSuffix}`,
        signingRegion
      };
    }, "getEndpointFromAccessPointArn");
    var bucketEndpointMiddleware = /* @__PURE__ */ __name((options) => (next, context) => async (args) => {
      const { Bucket: bucketName } = args.input;
      let replaceBucketInPath = options.bucketEndpoint;
      const request = args.request;
      if (protocolHttp.HttpRequest.isInstance(request)) {
        if (options.bucketEndpoint) {
          request.hostname = bucketName;
        } else if (utilArnParser.validate(bucketName)) {
          const bucketArn = utilArnParser.parse(bucketName);
          const clientRegion = await options.region();
          const useDualstackEndpoint = await options.useDualstackEndpoint();
          const useFipsEndpoint = await options.useFipsEndpoint();
          const { partition, signingRegion = clientRegion } = await options.regionInfoProvider(clientRegion, { useDualstackEndpoint, useFipsEndpoint }) || {};
          const useArnRegion = await options.useArnRegion();
          const { hostname, bucketEndpoint, signingRegion: modifiedSigningRegion, signingService } = bucketHostname({
            bucketName: bucketArn,
            baseHostname: request.hostname,
            accelerateEndpoint: options.useAccelerateEndpoint,
            dualstackEndpoint: useDualstackEndpoint,
            fipsEndpoint: useFipsEndpoint,
            pathStyleEndpoint: options.forcePathStyle,
            tlsCompatible: request.protocol === "https:",
            useArnRegion,
            clientPartition: partition,
            clientSigningRegion: signingRegion,
            clientRegion,
            isCustomEndpoint: options.isCustomEndpoint,
            disableMultiregionAccessPoints: await options.disableMultiregionAccessPoints()
          });
          if (modifiedSigningRegion && modifiedSigningRegion !== signingRegion) {
            context["signing_region"] = modifiedSigningRegion;
          }
          if (signingService && signingService !== "s3") {
            context["signing_service"] = signingService;
          }
          request.hostname = hostname;
          replaceBucketInPath = bucketEndpoint;
        } else {
          const clientRegion = await options.region();
          const dualstackEndpoint = await options.useDualstackEndpoint();
          const fipsEndpoint = await options.useFipsEndpoint();
          const { hostname, bucketEndpoint } = bucketHostname({
            bucketName,
            clientRegion,
            baseHostname: request.hostname,
            accelerateEndpoint: options.useAccelerateEndpoint,
            dualstackEndpoint,
            fipsEndpoint,
            pathStyleEndpoint: options.forcePathStyle,
            tlsCompatible: request.protocol === "https:",
            isCustomEndpoint: options.isCustomEndpoint
          });
          request.hostname = hostname;
          replaceBucketInPath = bucketEndpoint;
        }
        if (replaceBucketInPath) {
          request.path = request.path.replace(/^(\/)?[^\/]+/, "");
          if (request.path === "") {
            request.path = "/";
          }
        }
      }
      return next({ ...args, request });
    }, "bucketEndpointMiddleware");
    var bucketEndpointMiddlewareOptions = {
      tags: ["BUCKET_ENDPOINT"],
      name: "bucketEndpointMiddleware",
      relation: "before",
      toMiddleware: "hostHeaderMiddleware",
      override: true
    };
    var getBucketEndpointPlugin = /* @__PURE__ */ __name((options) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.addRelativeTo(bucketEndpointMiddleware(options), bucketEndpointMiddlewareOptions);
      }, "applyToStack")
    }), "getBucketEndpointPlugin");
    function resolveBucketEndpointConfig(input) {
      const { bucketEndpoint = false, forcePathStyle = false, useAccelerateEndpoint = false, useArnRegion, disableMultiregionAccessPoints = false } = input;
      return Object.assign(input, {
        bucketEndpoint,
        forcePathStyle,
        useAccelerateEndpoint,
        useArnRegion: typeof useArnRegion === "function" ? useArnRegion : () => Promise.resolve(useArnRegion),
        disableMultiregionAccessPoints: typeof disableMultiregionAccessPoints === "function" ? disableMultiregionAccessPoints : () => Promise.resolve(disableMultiregionAccessPoints)
      });
    }
    __name(resolveBucketEndpointConfig, "resolveBucketEndpointConfig");
    exports.NODE_DISABLE_MULTIREGION_ACCESS_POINT_CONFIG_OPTIONS = NODE_DISABLE_MULTIREGION_ACCESS_POINT_CONFIG_OPTIONS;
    exports.NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME = NODE_DISABLE_MULTIREGION_ACCESS_POINT_ENV_NAME;
    exports.NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME = NODE_DISABLE_MULTIREGION_ACCESS_POINT_INI_NAME;
    exports.NODE_USE_ARN_REGION_CONFIG_OPTIONS = NODE_USE_ARN_REGION_CONFIG_OPTIONS;
    exports.NODE_USE_ARN_REGION_ENV_NAME = NODE_USE_ARN_REGION_ENV_NAME;
    exports.NODE_USE_ARN_REGION_INI_NAME = NODE_USE_ARN_REGION_INI_NAME;
    exports.bucketEndpointMiddleware = bucketEndpointMiddleware;
    exports.bucketEndpointMiddlewareOptions = bucketEndpointMiddlewareOptions;
    exports.bucketHostname = bucketHostname;
    exports.getArnResources = getArnResources;
    exports.getBucketEndpointPlugin = getBucketEndpointPlugin;
    exports.getSuffixForArnEndpoint = getSuffixForArnEndpoint;
    exports.resolveBucketEndpointConfig = resolveBucketEndpointConfig;
    exports.validateAccountId = validateAccountId;
    exports.validateDNSHostLabel = validateDNSHostLabel;
    exports.validateNoDualstack = validateNoDualstack;
    exports.validateNoFIPS = validateNoFIPS;
    exports.validateOutpostService = validateOutpostService;
    exports.validatePartition = validatePartition;
    exports.validateRegion = validateRegion;
  }
});

// node_modules/@smithy/eventstream-codec/dist-cjs/index.js
var require_dist_cjs45 = __commonJS({
  "node_modules/@smithy/eventstream-codec/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var crc32 = require_main3();
    var utilHexEncoding = require_dist_cjs8();
    var Int64 = class _Int64 {
      static {
        __name(this, "Int64");
      }
      bytes;
      constructor(bytes) {
        this.bytes = bytes;
        if (bytes.byteLength !== 8) {
          throw new Error("Int64 buffers must be exactly 8 bytes");
        }
      }
      static fromNumber(number) {
        if (number > 9223372036854776e3 || number < -9223372036854776e3) {
          throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
        }
        const bytes = new Uint8Array(8);
        for (let i = 7, remaining = Math.abs(Math.round(number)); i > -1 && remaining > 0; i--, remaining /= 256) {
          bytes[i] = remaining;
        }
        if (number < 0) {
          negate(bytes);
        }
        return new _Int64(bytes);
      }
      valueOf() {
        const bytes = this.bytes.slice(0);
        const negative = bytes[0] & 128;
        if (negative) {
          negate(bytes);
        }
        return parseInt(utilHexEncoding.toHex(bytes), 16) * (negative ? -1 : 1);
      }
      toString() {
        return String(this.valueOf());
      }
    };
    function negate(bytes) {
      for (let i = 0; i < 8; i++) {
        bytes[i] ^= 255;
      }
      for (let i = 7; i > -1; i--) {
        bytes[i]++;
        if (bytes[i] !== 0)
          break;
      }
    }
    __name(negate, "negate");
    var HeaderMarshaller = class {
      static {
        __name(this, "HeaderMarshaller");
      }
      toUtf8;
      fromUtf8;
      constructor(toUtf8, fromUtf8) {
        this.toUtf8 = toUtf8;
        this.fromUtf8 = fromUtf8;
      }
      format(headers) {
        const chunks = [];
        for (const headerName of Object.keys(headers)) {
          const bytes = this.fromUtf8(headerName);
          chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
        }
        const out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
        let position = 0;
        for (const chunk of chunks) {
          out.set(chunk, position);
          position += chunk.byteLength;
        }
        return out;
      }
      formatHeaderValue(header) {
        switch (header.type) {
          case "boolean":
            return Uint8Array.from([header.value ? 0 : 1]);
          case "byte":
            return Uint8Array.from([2, header.value]);
          case "short":
            const shortView = new DataView(new ArrayBuffer(3));
            shortView.setUint8(0, 3);
            shortView.setInt16(1, header.value, false);
            return new Uint8Array(shortView.buffer);
          case "integer":
            const intView = new DataView(new ArrayBuffer(5));
            intView.setUint8(0, 4);
            intView.setInt32(1, header.value, false);
            return new Uint8Array(intView.buffer);
          case "long":
            const longBytes = new Uint8Array(9);
            longBytes[0] = 5;
            longBytes.set(header.value.bytes, 1);
            return longBytes;
          case "binary":
            const binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
            binView.setUint8(0, 6);
            binView.setUint16(1, header.value.byteLength, false);
            const binBytes = new Uint8Array(binView.buffer);
            binBytes.set(header.value, 3);
            return binBytes;
          case "string":
            const utf8Bytes = this.fromUtf8(header.value);
            const strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
            strView.setUint8(0, 7);
            strView.setUint16(1, utf8Bytes.byteLength, false);
            const strBytes = new Uint8Array(strView.buffer);
            strBytes.set(utf8Bytes, 3);
            return strBytes;
          case "timestamp":
            const tsBytes = new Uint8Array(9);
            tsBytes[0] = 8;
            tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
            return tsBytes;
          case "uuid":
            if (!UUID_PATTERN.test(header.value)) {
              throw new Error(`Invalid UUID received: ${header.value}`);
            }
            const uuidBytes = new Uint8Array(17);
            uuidBytes[0] = 9;
            uuidBytes.set(utilHexEncoding.fromHex(header.value.replace(/\-/g, "")), 1);
            return uuidBytes;
        }
      }
      parse(headers) {
        const out = {};
        let position = 0;
        while (position < headers.byteLength) {
          const nameLength = headers.getUint8(position++);
          const name = this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, nameLength));
          position += nameLength;
          switch (headers.getUint8(position++)) {
            case 0:
              out[name] = {
                type: BOOLEAN_TAG,
                value: true
              };
              break;
            case 1:
              out[name] = {
                type: BOOLEAN_TAG,
                value: false
              };
              break;
            case 2:
              out[name] = {
                type: BYTE_TAG,
                value: headers.getInt8(position++)
              };
              break;
            case 3:
              out[name] = {
                type: SHORT_TAG,
                value: headers.getInt16(position, false)
              };
              position += 2;
              break;
            case 4:
              out[name] = {
                type: INT_TAG,
                value: headers.getInt32(position, false)
              };
              position += 4;
              break;
            case 5:
              out[name] = {
                type: LONG_TAG,
                value: new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8))
              };
              position += 8;
              break;
            case 6:
              const binaryLength = headers.getUint16(position, false);
              position += 2;
              out[name] = {
                type: BINARY_TAG,
                value: new Uint8Array(headers.buffer, headers.byteOffset + position, binaryLength)
              };
              position += binaryLength;
              break;
            case 7:
              const stringLength = headers.getUint16(position, false);
              position += 2;
              out[name] = {
                type: STRING_TAG,
                value: this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, stringLength))
              };
              position += stringLength;
              break;
            case 8:
              out[name] = {
                type: TIMESTAMP_TAG,
                value: new Date(new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8)).valueOf())
              };
              position += 8;
              break;
            case 9:
              const uuidBytes = new Uint8Array(headers.buffer, headers.byteOffset + position, 16);
              position += 16;
              out[name] = {
                type: UUID_TAG,
                value: `${utilHexEncoding.toHex(uuidBytes.subarray(0, 4))}-${utilHexEncoding.toHex(uuidBytes.subarray(4, 6))}-${utilHexEncoding.toHex(uuidBytes.subarray(6, 8))}-${utilHexEncoding.toHex(uuidBytes.subarray(8, 10))}-${utilHexEncoding.toHex(uuidBytes.subarray(10))}`
              };
              break;
            default:
              throw new Error(`Unrecognized header type tag`);
          }
        }
        return out;
      }
    };
    var HEADER_VALUE_TYPE;
    (function(HEADER_VALUE_TYPE2) {
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["boolTrue"] = 0] = "boolTrue";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["boolFalse"] = 1] = "boolFalse";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["byte"] = 2] = "byte";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["short"] = 3] = "short";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["integer"] = 4] = "integer";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["long"] = 5] = "long";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["byteArray"] = 6] = "byteArray";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["string"] = 7] = "string";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["timestamp"] = 8] = "timestamp";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["uuid"] = 9] = "uuid";
    })(HEADER_VALUE_TYPE || (HEADER_VALUE_TYPE = {}));
    var BOOLEAN_TAG = "boolean";
    var BYTE_TAG = "byte";
    var SHORT_TAG = "short";
    var INT_TAG = "integer";
    var LONG_TAG = "long";
    var BINARY_TAG = "binary";
    var STRING_TAG = "string";
    var TIMESTAMP_TAG = "timestamp";
    var UUID_TAG = "uuid";
    var UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    var PRELUDE_MEMBER_LENGTH = 4;
    var PRELUDE_LENGTH = PRELUDE_MEMBER_LENGTH * 2;
    var CHECKSUM_LENGTH = 4;
    var MINIMUM_MESSAGE_LENGTH = PRELUDE_LENGTH + CHECKSUM_LENGTH * 2;
    function splitMessage({ byteLength, byteOffset, buffer }) {
      if (byteLength < MINIMUM_MESSAGE_LENGTH) {
        throw new Error("Provided message too short to accommodate event stream message overhead");
      }
      const view = new DataView(buffer, byteOffset, byteLength);
      const messageLength = view.getUint32(0, false);
      if (byteLength !== messageLength) {
        throw new Error("Reported message length does not match received message length");
      }
      const headerLength = view.getUint32(PRELUDE_MEMBER_LENGTH, false);
      const expectedPreludeChecksum = view.getUint32(PRELUDE_LENGTH, false);
      const expectedMessageChecksum = view.getUint32(byteLength - CHECKSUM_LENGTH, false);
      const checksummer = new crc32.Crc32().update(new Uint8Array(buffer, byteOffset, PRELUDE_LENGTH));
      if (expectedPreludeChecksum !== checksummer.digest()) {
        throw new Error(`The prelude checksum specified in the message (${expectedPreludeChecksum}) does not match the calculated CRC32 checksum (${checksummer.digest()})`);
      }
      checksummer.update(new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH, byteLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH)));
      if (expectedMessageChecksum !== checksummer.digest()) {
        throw new Error(`The message checksum (${checksummer.digest()}) did not match the expected value of ${expectedMessageChecksum}`);
      }
      return {
        headers: new DataView(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH, headerLength),
        body: new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH + headerLength, messageLength - headerLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH + CHECKSUM_LENGTH))
      };
    }
    __name(splitMessage, "splitMessage");
    var EventStreamCodec = class {
      static {
        __name(this, "EventStreamCodec");
      }
      headerMarshaller;
      messageBuffer;
      isEndOfStream;
      constructor(toUtf8, fromUtf8) {
        this.headerMarshaller = new HeaderMarshaller(toUtf8, fromUtf8);
        this.messageBuffer = [];
        this.isEndOfStream = false;
      }
      feed(message) {
        this.messageBuffer.push(this.decode(message));
      }
      endOfStream() {
        this.isEndOfStream = true;
      }
      getMessage() {
        const message = this.messageBuffer.pop();
        const isEndOfStream = this.isEndOfStream;
        return {
          getMessage() {
            return message;
          },
          isEndOfStream() {
            return isEndOfStream;
          }
        };
      }
      getAvailableMessages() {
        const messages = this.messageBuffer;
        this.messageBuffer = [];
        const isEndOfStream = this.isEndOfStream;
        return {
          getMessages() {
            return messages;
          },
          isEndOfStream() {
            return isEndOfStream;
          }
        };
      }
      encode({ headers: rawHeaders, body }) {
        const headers = this.headerMarshaller.format(rawHeaders);
        const length = headers.byteLength + body.byteLength + 16;
        const out = new Uint8Array(length);
        const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
        const checksum = new crc32.Crc32();
        view.setUint32(0, length, false);
        view.setUint32(4, headers.byteLength, false);
        view.setUint32(8, checksum.update(out.subarray(0, 8)).digest(), false);
        out.set(headers, 12);
        out.set(body, headers.byteLength + 12);
        view.setUint32(length - 4, checksum.update(out.subarray(8, length - 4)).digest(), false);
        return out;
      }
      decode(message) {
        const { headers, body } = splitMessage(message);
        return { headers: this.headerMarshaller.parse(headers), body };
      }
      formatHeaders(rawHeaders) {
        return this.headerMarshaller.format(rawHeaders);
      }
    };
    var MessageDecoderStream = class {
      static {
        __name(this, "MessageDecoderStream");
      }
      options;
      constructor(options) {
        this.options = options;
      }
      [Symbol.asyncIterator]() {
        return this.asyncIterator();
      }
      async *asyncIterator() {
        for await (const bytes of this.options.inputStream) {
          const decoded = this.options.decoder.decode(bytes);
          yield decoded;
        }
      }
    };
    var MessageEncoderStream = class {
      static {
        __name(this, "MessageEncoderStream");
      }
      options;
      constructor(options) {
        this.options = options;
      }
      [Symbol.asyncIterator]() {
        return this.asyncIterator();
      }
      async *asyncIterator() {
        for await (const msg of this.options.messageStream) {
          const encoded = this.options.encoder.encode(msg);
          yield encoded;
        }
        if (this.options.includeEndFrame) {
          yield new Uint8Array(0);
        }
      }
    };
    var SmithyMessageDecoderStream = class {
      static {
        __name(this, "SmithyMessageDecoderStream");
      }
      options;
      constructor(options) {
        this.options = options;
      }
      [Symbol.asyncIterator]() {
        return this.asyncIterator();
      }
      async *asyncIterator() {
        for await (const message of this.options.messageStream) {
          const deserialized = await this.options.deserializer(message);
          if (deserialized === void 0)
            continue;
          yield deserialized;
        }
      }
    };
    var SmithyMessageEncoderStream = class {
      static {
        __name(this, "SmithyMessageEncoderStream");
      }
      options;
      constructor(options) {
        this.options = options;
      }
      [Symbol.asyncIterator]() {
        return this.asyncIterator();
      }
      async *asyncIterator() {
        for await (const chunk of this.options.inputStream) {
          const payloadBuf = this.options.serializer(chunk);
          yield payloadBuf;
        }
      }
    };
    exports.EventStreamCodec = EventStreamCodec;
    exports.HeaderMarshaller = HeaderMarshaller;
    exports.Int64 = Int64;
    exports.MessageDecoderStream = MessageDecoderStream;
    exports.MessageEncoderStream = MessageEncoderStream;
    exports.SmithyMessageDecoderStream = SmithyMessageDecoderStream;
    exports.SmithyMessageEncoderStream = SmithyMessageEncoderStream;
  }
});

// node_modules/@smithy/eventstream-serde-universal/dist-cjs/index.js
var require_dist_cjs46 = __commonJS({
  "node_modules/@smithy/eventstream-serde-universal/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var eventstreamCodec = require_dist_cjs45();
    function getChunkedStream(source) {
      let currentMessageTotalLength = 0;
      let currentMessagePendingLength = 0;
      let currentMessage = null;
      let messageLengthBuffer = null;
      const allocateMessage = /* @__PURE__ */ __name((size) => {
        if (typeof size !== "number") {
          throw new Error("Attempted to allocate an event message where size was not a number: " + size);
        }
        currentMessageTotalLength = size;
        currentMessagePendingLength = 4;
        currentMessage = new Uint8Array(size);
        const currentMessageView = new DataView(currentMessage.buffer);
        currentMessageView.setUint32(0, size, false);
      }, "allocateMessage");
      const iterator = /* @__PURE__ */ __name(async function* () {
        const sourceIterator = source[Symbol.asyncIterator]();
        while (true) {
          const { value, done } = await sourceIterator.next();
          if (done) {
            if (!currentMessageTotalLength) {
              return;
            } else if (currentMessageTotalLength === currentMessagePendingLength) {
              yield currentMessage;
            } else {
              throw new Error("Truncated event message received.");
            }
            return;
          }
          const chunkLength = value.length;
          let currentOffset = 0;
          while (currentOffset < chunkLength) {
            if (!currentMessage) {
              const bytesRemaining = chunkLength - currentOffset;
              if (!messageLengthBuffer) {
                messageLengthBuffer = new Uint8Array(4);
              }
              const numBytesForTotal = Math.min(4 - currentMessagePendingLength, bytesRemaining);
              messageLengthBuffer.set(value.slice(currentOffset, currentOffset + numBytesForTotal), currentMessagePendingLength);
              currentMessagePendingLength += numBytesForTotal;
              currentOffset += numBytesForTotal;
              if (currentMessagePendingLength < 4) {
                break;
              }
              allocateMessage(new DataView(messageLengthBuffer.buffer).getUint32(0, false));
              messageLengthBuffer = null;
            }
            const numBytesToWrite = Math.min(currentMessageTotalLength - currentMessagePendingLength, chunkLength - currentOffset);
            currentMessage.set(value.slice(currentOffset, currentOffset + numBytesToWrite), currentMessagePendingLength);
            currentMessagePendingLength += numBytesToWrite;
            currentOffset += numBytesToWrite;
            if (currentMessageTotalLength && currentMessageTotalLength === currentMessagePendingLength) {
              yield currentMessage;
              currentMessage = null;
              currentMessageTotalLength = 0;
              currentMessagePendingLength = 0;
            }
          }
        }
      }, "iterator");
      return {
        [Symbol.asyncIterator]: iterator
      };
    }
    __name(getChunkedStream, "getChunkedStream");
    function getMessageUnmarshaller(deserializer, toUtf8) {
      return async function(message) {
        const { value: messageType } = message.headers[":message-type"];
        if (messageType === "error") {
          const unmodeledError = new Error(message.headers[":error-message"].value || "UnknownError");
          unmodeledError.name = message.headers[":error-code"].value;
          throw unmodeledError;
        } else if (messageType === "exception") {
          const code = message.headers[":exception-type"].value;
          const exception = { [code]: message };
          const deserializedException = await deserializer(exception);
          if (deserializedException.$unknown) {
            const error = new Error(toUtf8(message.body));
            error.name = code;
            throw error;
          }
          throw deserializedException[code];
        } else if (messageType === "event") {
          const event = {
            [message.headers[":event-type"].value]: message
          };
          const deserialized = await deserializer(event);
          if (deserialized.$unknown)
            return;
          return deserialized;
        } else {
          throw Error(`Unrecognizable event type: ${message.headers[":event-type"].value}`);
        }
      };
    }
    __name(getMessageUnmarshaller, "getMessageUnmarshaller");
    var EventStreamMarshaller = class {
      static {
        __name(this, "EventStreamMarshaller");
      }
      eventStreamCodec;
      utfEncoder;
      constructor({ utf8Encoder, utf8Decoder }) {
        this.eventStreamCodec = new eventstreamCodec.EventStreamCodec(utf8Encoder, utf8Decoder);
        this.utfEncoder = utf8Encoder;
      }
      deserialize(body, deserializer) {
        const inputStream = getChunkedStream(body);
        return new eventstreamCodec.SmithyMessageDecoderStream({
          messageStream: new eventstreamCodec.MessageDecoderStream({ inputStream, decoder: this.eventStreamCodec }),
          deserializer: getMessageUnmarshaller(deserializer, this.utfEncoder)
        });
      }
      serialize(inputStream, serializer) {
        return new eventstreamCodec.MessageEncoderStream({
          messageStream: new eventstreamCodec.SmithyMessageEncoderStream({ inputStream, serializer }),
          encoder: this.eventStreamCodec,
          includeEndFrame: true
        });
      }
    };
    var eventStreamSerdeProvider = /* @__PURE__ */ __name((options) => new EventStreamMarshaller(options), "eventStreamSerdeProvider");
    exports.EventStreamMarshaller = EventStreamMarshaller;
    exports.eventStreamSerdeProvider = eventStreamSerdeProvider;
  }
});

// node_modules/@smithy/eventstream-serde-node/dist-cjs/index.js
var require_dist_cjs47 = __commonJS({
  "node_modules/@smithy/eventstream-serde-node/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var eventstreamSerdeUniversal = require_dist_cjs46();
    var stream = __require("stream");
    async function* readabletoIterable(readStream) {
      let streamEnded = false;
      let generationEnded = false;
      const records = new Array();
      readStream.on("error", (err) => {
        if (!streamEnded) {
          streamEnded = true;
        }
        if (err) {
          throw err;
        }
      });
      readStream.on("data", (data) => {
        records.push(data);
      });
      readStream.on("end", () => {
        streamEnded = true;
      });
      while (!generationEnded) {
        const value = await new Promise((resolve) => setTimeout(() => resolve(records.shift()), 0));
        if (value) {
          yield value;
        }
        generationEnded = streamEnded && records.length === 0;
      }
    }
    __name(readabletoIterable, "readabletoIterable");
    var EventStreamMarshaller = class {
      static {
        __name(this, "EventStreamMarshaller");
      }
      universalMarshaller;
      constructor({ utf8Encoder, utf8Decoder }) {
        this.universalMarshaller = new eventstreamSerdeUniversal.EventStreamMarshaller({
          utf8Decoder,
          utf8Encoder
        });
      }
      deserialize(body, deserializer) {
        const bodyIterable = typeof body[Symbol.asyncIterator] === "function" ? body : readabletoIterable(body);
        return this.universalMarshaller.deserialize(bodyIterable, deserializer);
      }
      serialize(input, serializer) {
        return stream.Readable.from(this.universalMarshaller.serialize(input, serializer));
      }
    };
    var eventStreamSerdeProvider = /* @__PURE__ */ __name((options) => new EventStreamMarshaller(options), "eventStreamSerdeProvider");
    exports.EventStreamMarshaller = EventStreamMarshaller;
    exports.eventStreamSerdeProvider = eventStreamSerdeProvider;
  }
});

// node_modules/@smithy/hash-stream-node/dist-cjs/index.js
var require_dist_cjs48 = __commonJS({
  "node_modules/@smithy/hash-stream-node/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var fs = __require("fs");
    var utilUtf8 = require_dist_cjs4();
    var stream = __require("stream");
    var HashCalculator = class extends stream.Writable {
      static {
        __name(this, "HashCalculator");
      }
      hash;
      constructor(hash, options) {
        super(options);
        this.hash = hash;
      }
      _write(chunk, encoding, callback) {
        try {
          this.hash.update(utilUtf8.toUint8Array(chunk));
        } catch (err) {
          return callback(err);
        }
        callback();
      }
    };
    var fileStreamHasher = /* @__PURE__ */ __name((hashCtor, fileStream) => new Promise((resolve, reject) => {
      if (!isReadStream(fileStream)) {
        reject(new Error("Unable to calculate hash for non-file streams."));
        return;
      }
      const fileStreamTee = fs.createReadStream(fileStream.path, {
        start: fileStream.start,
        end: fileStream.end
      });
      const hash = new hashCtor();
      const hashCalculator = new HashCalculator(hash);
      fileStreamTee.pipe(hashCalculator);
      fileStreamTee.on("error", (err) => {
        hashCalculator.end();
        reject(err);
      });
      hashCalculator.on("error", reject);
      hashCalculator.on("finish", function() {
        hash.digest().then(resolve).catch(reject);
      });
    }), "fileStreamHasher");
    var isReadStream = /* @__PURE__ */ __name((stream2) => typeof stream2.path === "string", "isReadStream");
    var readableStreamHasher = /* @__PURE__ */ __name((hashCtor, readableStream) => {
      if (readableStream.readableFlowing !== null) {
        throw new Error("Unable to calculate hash for flowing readable stream");
      }
      const hash = new hashCtor();
      const hashCalculator = new HashCalculator(hash);
      readableStream.pipe(hashCalculator);
      return new Promise((resolve, reject) => {
        readableStream.on("error", (err) => {
          hashCalculator.end();
          reject(err);
        });
        hashCalculator.on("error", reject);
        hashCalculator.on("finish", () => {
          hash.digest().then(resolve).catch(reject);
        });
      });
    }, "readableStreamHasher");
    exports.fileStreamHasher = fileStreamHasher;
    exports.readableStreamHasher = readableStreamHasher;
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/runtimeConfig.shared.js
var require_runtimeConfig_shared = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/runtimeConfig.shared.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRuntimeConfig = void 0;
    var httpAuthSchemes_1 = (init_httpAuthSchemes(), __toCommonJS(httpAuthSchemes_exports));
    var middleware_sdk_s3_1 = require_dist_cjs18();
    var signature_v4_multi_region_1 = require_dist_cjs29();
    var smithy_client_1 = require_dist_cjs15();
    var url_parser_1 = require_dist_cjs14();
    var util_base64_1 = require_dist_cjs5();
    var util_stream_1 = require_dist_cjs9();
    var util_utf8_1 = require_dist_cjs4();
    var httpAuthSchemeProvider_1 = require_httpAuthSchemeProvider();
    var endpointResolver_1 = require_endpointResolver();
    var schemas_0_1 = require_schemas_0();
    var getRuntimeConfig = /* @__PURE__ */ __name((config) => {
      return {
        apiVersion: "2006-03-01",
        base64Decoder: config?.base64Decoder ?? util_base64_1.fromBase64,
        base64Encoder: config?.base64Encoder ?? util_base64_1.toBase64,
        disableHostPrefix: config?.disableHostPrefix ?? false,
        endpointProvider: config?.endpointProvider ?? endpointResolver_1.defaultEndpointResolver,
        extensions: config?.extensions ?? [],
        getAwsChunkedEncodingStream: config?.getAwsChunkedEncodingStream ?? util_stream_1.getAwsChunkedEncodingStream,
        httpAuthSchemeProvider: config?.httpAuthSchemeProvider ?? httpAuthSchemeProvider_1.defaultS3HttpAuthSchemeProvider,
        httpAuthSchemes: config?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4"), "identityProvider"),
            signer: new httpAuthSchemes_1.AwsSdkSigV4Signer()
          },
          {
            schemeId: "aws.auth#sigv4a",
            identityProvider: /* @__PURE__ */ __name((ipc) => ipc.getIdentityProvider("aws.auth#sigv4a"), "identityProvider"),
            signer: new httpAuthSchemes_1.AwsSdkSigV4ASigner()
          }
        ],
        logger: config?.logger ?? new smithy_client_1.NoOpLogger(),
        protocol: config?.protocol ?? middleware_sdk_s3_1.S3RestXmlProtocol,
        protocolSettings: config?.protocolSettings ?? {
          defaultNamespace: "com.amazonaws.s3",
          errorTypeRegistries: schemas_0_1.errorTypeRegistries,
          xmlNamespace: "http://s3.amazonaws.com/doc/2006-03-01/",
          version: "2006-03-01",
          serviceTarget: "AmazonS3"
        },
        sdkStreamMixin: config?.sdkStreamMixin ?? util_stream_1.sdkStreamMixin,
        serviceId: config?.serviceId ?? "S3",
        signerConstructor: config?.signerConstructor ?? signature_v4_multi_region_1.SignatureV4MultiRegion,
        signingEscapePath: config?.signingEscapePath ?? false,
        urlParser: config?.urlParser ?? url_parser_1.parseUrl,
        useArnRegion: config?.useArnRegion ?? void 0,
        utf8Decoder: config?.utf8Decoder ?? util_utf8_1.fromUtf8,
        utf8Encoder: config?.utf8Encoder ?? util_utf8_1.toUtf8
      };
    }, "getRuntimeConfig");
    exports.getRuntimeConfig = getRuntimeConfig;
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/runtimeConfig.js
var require_runtimeConfig = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/runtimeConfig.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRuntimeConfig = void 0;
    var tslib_1 = (init_tslib_es6(), __toCommonJS(tslib_es6_exports));
    var package_json_1 = tslib_1.__importDefault(require_package());
    var client_1 = (init_client(), __toCommonJS(client_exports));
    var httpAuthSchemes_1 = (init_httpAuthSchemes(), __toCommonJS(httpAuthSchemes_exports));
    var credential_provider_node_1 = require_dist_cjs43();
    var middleware_bucket_endpoint_1 = require_dist_cjs44();
    var middleware_flexible_checksums_1 = require_dist_cjs41();
    var middleware_sdk_s3_1 = require_dist_cjs18();
    var util_user_agent_node_1 = require_dist_cjs31();
    var config_resolver_1 = require_dist_cjs22();
    var eventstream_serde_node_1 = require_dist_cjs47();
    var hash_node_1 = require_dist_cjs32();
    var hash_stream_node_1 = require_dist_cjs48();
    var middleware_retry_1 = require_dist_cjs28();
    var node_config_provider_1 = require_dist_cjs26();
    var node_http_handler_1 = require_dist_cjs7();
    var smithy_client_1 = require_dist_cjs15();
    var util_body_length_node_1 = require_dist_cjs33();
    var util_defaults_mode_node_1 = require_dist_cjs34();
    var util_retry_1 = require_dist_cjs2();
    var runtimeConfig_shared_1 = require_runtimeConfig_shared();
    var getRuntimeConfig = /* @__PURE__ */ __name((config) => {
      (0, smithy_client_1.emitWarningIfUnsupportedVersion)(process.version);
      const defaultsMode = (0, util_defaults_mode_node_1.resolveDefaultsModeConfig)(config);
      const defaultConfigProvider = /* @__PURE__ */ __name(() => defaultsMode().then(smithy_client_1.loadConfigsForDefaultMode), "defaultConfigProvider");
      const clientSharedValues = (0, runtimeConfig_shared_1.getRuntimeConfig)(config);
      (0, client_1.emitWarningIfUnsupportedVersion)(process.version);
      const loaderConfig = {
        profile: config?.profile,
        logger: clientSharedValues.logger
      };
      return {
        ...clientSharedValues,
        ...config,
        runtime: "node",
        defaultsMode,
        authSchemePreference: config?.authSchemePreference ?? (0, node_config_provider_1.loadConfig)(httpAuthSchemes_1.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, loaderConfig),
        bodyLengthChecker: config?.bodyLengthChecker ?? util_body_length_node_1.calculateBodyLength,
        credentialDefaultProvider: config?.credentialDefaultProvider ?? credential_provider_node_1.defaultProvider,
        defaultUserAgentProvider: config?.defaultUserAgentProvider ?? (0, util_user_agent_node_1.createDefaultUserAgentProvider)({ serviceId: clientSharedValues.serviceId, clientVersion: package_json_1.default.version }),
        disableS3ExpressSessionAuth: config?.disableS3ExpressSessionAuth ?? (0, node_config_provider_1.loadConfig)(middleware_sdk_s3_1.NODE_DISABLE_S3_EXPRESS_SESSION_AUTH_OPTIONS, loaderConfig),
        eventStreamSerdeProvider: config?.eventStreamSerdeProvider ?? eventstream_serde_node_1.eventStreamSerdeProvider,
        maxAttempts: config?.maxAttempts ?? (0, node_config_provider_1.loadConfig)(middleware_retry_1.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, config),
        md5: config?.md5 ?? hash_node_1.Hash.bind(null, "md5"),
        region: config?.region ?? (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_REGION_CONFIG_OPTIONS, { ...config_resolver_1.NODE_REGION_CONFIG_FILE_OPTIONS, ...loaderConfig }),
        requestChecksumCalculation: config?.requestChecksumCalculation ?? (0, node_config_provider_1.loadConfig)(middleware_flexible_checksums_1.NODE_REQUEST_CHECKSUM_CALCULATION_CONFIG_OPTIONS, loaderConfig),
        requestHandler: node_http_handler_1.NodeHttpHandler.create(config?.requestHandler ?? defaultConfigProvider),
        responseChecksumValidation: config?.responseChecksumValidation ?? (0, node_config_provider_1.loadConfig)(middleware_flexible_checksums_1.NODE_RESPONSE_CHECKSUM_VALIDATION_CONFIG_OPTIONS, loaderConfig),
        retryMode: config?.retryMode ?? (0, node_config_provider_1.loadConfig)({
          ...middleware_retry_1.NODE_RETRY_MODE_CONFIG_OPTIONS,
          default: /* @__PURE__ */ __name(async () => (await defaultConfigProvider()).retryMode || util_retry_1.DEFAULT_RETRY_MODE, "default")
        }, config),
        sha1: config?.sha1 ?? hash_node_1.Hash.bind(null, "sha1"),
        sha256: config?.sha256 ?? hash_node_1.Hash.bind(null, "sha256"),
        sigv4aSigningRegionSet: config?.sigv4aSigningRegionSet ?? (0, node_config_provider_1.loadConfig)(httpAuthSchemes_1.NODE_SIGV4A_CONFIG_OPTIONS, loaderConfig),
        streamCollector: config?.streamCollector ?? node_http_handler_1.streamCollector,
        streamHasher: config?.streamHasher ?? hash_stream_node_1.readableStreamHasher,
        useArnRegion: config?.useArnRegion ?? (0, node_config_provider_1.loadConfig)(middleware_bucket_endpoint_1.NODE_USE_ARN_REGION_CONFIG_OPTIONS, loaderConfig),
        useDualstackEndpoint: config?.useDualstackEndpoint ?? (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        useFipsEndpoint: config?.useFipsEndpoint ?? (0, node_config_provider_1.loadConfig)(config_resolver_1.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, loaderConfig),
        userAgentAppId: config?.userAgentAppId ?? (0, node_config_provider_1.loadConfig)(util_user_agent_node_1.NODE_APP_ID_CONFIG_OPTIONS, loaderConfig)
      };
    }, "getRuntimeConfig");
    exports.getRuntimeConfig = getRuntimeConfig;
  }
});

// node_modules/@aws-sdk/middleware-ssec/dist-cjs/index.js
var require_dist_cjs49 = __commonJS({
  "node_modules/@aws-sdk/middleware-ssec/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    function ssecMiddleware(options) {
      return (next) => async (args) => {
        const input = { ...args.input };
        const properties = [
          {
            target: "SSECustomerKey",
            hash: "SSECustomerKeyMD5"
          },
          {
            target: "CopySourceSSECustomerKey",
            hash: "CopySourceSSECustomerKeyMD5"
          }
        ];
        for (const prop of properties) {
          const value = input[prop.target];
          if (value) {
            let valueForHash;
            if (typeof value === "string") {
              if (isValidBase64EncodedSSECustomerKey(value, options)) {
                valueForHash = options.base64Decoder(value);
              } else {
                valueForHash = options.utf8Decoder(value);
                input[prop.target] = options.base64Encoder(valueForHash);
              }
            } else {
              valueForHash = ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : new Uint8Array(value);
              input[prop.target] = options.base64Encoder(valueForHash);
            }
            const hash = new options.md5();
            hash.update(valueForHash);
            input[prop.hash] = options.base64Encoder(await hash.digest());
          }
        }
        return next({
          ...args,
          input
        });
      };
    }
    __name(ssecMiddleware, "ssecMiddleware");
    var ssecMiddlewareOptions = {
      name: "ssecMiddleware",
      step: "initialize",
      tags: ["SSE"],
      override: true
    };
    var getSsecPlugin = /* @__PURE__ */ __name((config) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(ssecMiddleware(config), ssecMiddlewareOptions);
      }, "applyToStack")
    }), "getSsecPlugin");
    function isValidBase64EncodedSSECustomerKey(str, options) {
      const base64Regex = /^(?:[A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
      if (!base64Regex.test(str))
        return false;
      try {
        const decodedBytes = options.base64Decoder(str);
        return decodedBytes.length === 32;
      } catch {
        return false;
      }
    }
    __name(isValidBase64EncodedSSECustomerKey, "isValidBase64EncodedSSECustomerKey");
    exports.getSsecPlugin = getSsecPlugin;
    exports.isValidBase64EncodedSSECustomerKey = isValidBase64EncodedSSECustomerKey;
    exports.ssecMiddleware = ssecMiddleware;
    exports.ssecMiddlewareOptions = ssecMiddlewareOptions;
  }
});

// node_modules/@aws-sdk/middleware-location-constraint/dist-cjs/index.js
var require_dist_cjs50 = __commonJS({
  "node_modules/@aws-sdk/middleware-location-constraint/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    function locationConstraintMiddleware(options) {
      return (next) => async (args) => {
        const { CreateBucketConfiguration } = args.input;
        const region = await options.region();
        if (!CreateBucketConfiguration?.LocationConstraint && !CreateBucketConfiguration?.Location) {
          if (region !== "us-east-1") {
            args.input.CreateBucketConfiguration = args.input.CreateBucketConfiguration ?? {};
            args.input.CreateBucketConfiguration.LocationConstraint = region;
          }
        }
        return next(args);
      };
    }
    __name(locationConstraintMiddleware, "locationConstraintMiddleware");
    var locationConstraintMiddlewareOptions = {
      step: "initialize",
      tags: ["LOCATION_CONSTRAINT", "CREATE_BUCKET_CONFIGURATION"],
      name: "locationConstraintMiddleware",
      override: true
    };
    var getLocationConstraintPlugin = /* @__PURE__ */ __name((config) => ({
      applyToStack: /* @__PURE__ */ __name((clientStack) => {
        clientStack.add(locationConstraintMiddleware(config), locationConstraintMiddlewareOptions);
      }, "applyToStack")
    }), "getLocationConstraintPlugin");
    exports.getLocationConstraintPlugin = getLocationConstraintPlugin;
    exports.locationConstraintMiddleware = locationConstraintMiddleware;
    exports.locationConstraintMiddlewareOptions = locationConstraintMiddlewareOptions;
  }
});

// node_modules/@smithy/util-waiter/dist-cjs/index.js
var require_dist_cjs51 = __commonJS({
  "node_modules/@smithy/util-waiter/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var getCircularReplacer = /* @__PURE__ */ __name(() => {
      const seen = /* @__PURE__ */ new WeakSet();
      return (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
        return value;
      };
    }, "getCircularReplacer");
    var sleep = /* @__PURE__ */ __name((seconds) => {
      return new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
    }, "sleep");
    var waiterServiceDefaults = {
      minDelay: 2,
      maxDelay: 120
    };
    exports.WaiterState = void 0;
    (function(WaiterState) {
      WaiterState["ABORTED"] = "ABORTED";
      WaiterState["FAILURE"] = "FAILURE";
      WaiterState["SUCCESS"] = "SUCCESS";
      WaiterState["RETRY"] = "RETRY";
      WaiterState["TIMEOUT"] = "TIMEOUT";
    })(exports.WaiterState || (exports.WaiterState = {}));
    var checkExceptions = /* @__PURE__ */ __name((result) => {
      if (result.state === exports.WaiterState.ABORTED) {
        const abortError = new Error(`${JSON.stringify({
          ...result,
          reason: "Request was aborted"
        }, getCircularReplacer())}`);
        abortError.name = "AbortError";
        throw abortError;
      } else if (result.state === exports.WaiterState.TIMEOUT) {
        const timeoutError = new Error(`${JSON.stringify({
          ...result,
          reason: "Waiter has timed out"
        }, getCircularReplacer())}`);
        timeoutError.name = "TimeoutError";
        throw timeoutError;
      } else if (result.state !== exports.WaiterState.SUCCESS) {
        throw new Error(`${JSON.stringify(result, getCircularReplacer())}`);
      }
      return result;
    }, "checkExceptions");
    var exponentialBackoffWithJitter = /* @__PURE__ */ __name((minDelay, maxDelay, attemptCeiling, attempt) => {
      if (attempt > attemptCeiling)
        return maxDelay;
      const delay = minDelay * 2 ** (attempt - 1);
      return randomInRange(minDelay, delay);
    }, "exponentialBackoffWithJitter");
    var randomInRange = /* @__PURE__ */ __name((min, max) => min + Math.random() * (max - min), "randomInRange");
    var runPolling = /* @__PURE__ */ __name(async ({ minDelay, maxDelay, maxWaitTime, abortController, client, abortSignal }, input, acceptorChecks) => {
      const observedResponses = {};
      const { state, reason } = await acceptorChecks(client, input);
      if (reason) {
        const message = createMessageFromResponse(reason);
        observedResponses[message] |= 0;
        observedResponses[message] += 1;
      }
      if (state !== exports.WaiterState.RETRY) {
        return { state, reason, observedResponses };
      }
      let currentAttempt = 1;
      const waitUntil = Date.now() + maxWaitTime * 1e3;
      const attemptCeiling = Math.log(maxDelay / minDelay) / Math.log(2) + 1;
      while (true) {
        if (abortController?.signal?.aborted || abortSignal?.aborted) {
          const message = "AbortController signal aborted.";
          observedResponses[message] |= 0;
          observedResponses[message] += 1;
          return { state: exports.WaiterState.ABORTED, observedResponses };
        }
        const delay = exponentialBackoffWithJitter(minDelay, maxDelay, attemptCeiling, currentAttempt);
        if (Date.now() + delay * 1e3 > waitUntil) {
          return { state: exports.WaiterState.TIMEOUT, observedResponses };
        }
        await sleep(delay);
        const { state: state2, reason: reason2 } = await acceptorChecks(client, input);
        if (reason2) {
          const message = createMessageFromResponse(reason2);
          observedResponses[message] |= 0;
          observedResponses[message] += 1;
        }
        if (state2 !== exports.WaiterState.RETRY) {
          return { state: state2, reason: reason2, observedResponses };
        }
        currentAttempt += 1;
      }
    }, "runPolling");
    var createMessageFromResponse = /* @__PURE__ */ __name((reason) => {
      if (reason?.$responseBodyText) {
        return `Deserialization error for body: ${reason.$responseBodyText}`;
      }
      if (reason?.$metadata?.httpStatusCode) {
        if (reason.$response || reason.message) {
          return `${reason.$response?.statusCode ?? reason.$metadata.httpStatusCode ?? "Unknown"}: ${reason.message}`;
        }
        return `${reason.$metadata.httpStatusCode}: OK`;
      }
      return String(reason?.message ?? JSON.stringify(reason, getCircularReplacer()) ?? "Unknown");
    }, "createMessageFromResponse");
    var validateWaiterOptions = /* @__PURE__ */ __name((options) => {
      if (options.maxWaitTime <= 0) {
        throw new Error(`WaiterConfiguration.maxWaitTime must be greater than 0`);
      } else if (options.minDelay <= 0) {
        throw new Error(`WaiterConfiguration.minDelay must be greater than 0`);
      } else if (options.maxDelay <= 0) {
        throw new Error(`WaiterConfiguration.maxDelay must be greater than 0`);
      } else if (options.maxWaitTime <= options.minDelay) {
        throw new Error(`WaiterConfiguration.maxWaitTime [${options.maxWaitTime}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`);
      } else if (options.maxDelay < options.minDelay) {
        throw new Error(`WaiterConfiguration.maxDelay [${options.maxDelay}] must be greater than WaiterConfiguration.minDelay [${options.minDelay}] for this waiter`);
      }
    }, "validateWaiterOptions");
    var abortTimeout = /* @__PURE__ */ __name((abortSignal) => {
      let onAbort;
      const promise = new Promise((resolve) => {
        onAbort = /* @__PURE__ */ __name(() => resolve({ state: exports.WaiterState.ABORTED }), "onAbort");
        if (typeof abortSignal.addEventListener === "function") {
          abortSignal.addEventListener("abort", onAbort);
        } else {
          abortSignal.onabort = onAbort;
        }
      });
      return {
        clearListener() {
          if (typeof abortSignal.removeEventListener === "function") {
            abortSignal.removeEventListener("abort", onAbort);
          }
        },
        aborted: promise
      };
    }, "abortTimeout");
    var createWaiter = /* @__PURE__ */ __name(async (options, input, acceptorChecks) => {
      const params = {
        ...waiterServiceDefaults,
        ...options
      };
      validateWaiterOptions(params);
      const exitConditions = [runPolling(params, input, acceptorChecks)];
      const finalize = [];
      if (options.abortSignal) {
        const { aborted, clearListener } = abortTimeout(options.abortSignal);
        finalize.push(clearListener);
        exitConditions.push(aborted);
      }
      if (options.abortController?.signal) {
        const { aborted, clearListener } = abortTimeout(options.abortController.signal);
        finalize.push(clearListener);
        exitConditions.push(aborted);
      }
      return Promise.race(exitConditions).then((result) => {
        for (const fn of finalize) {
          fn();
        }
        return result;
      });
    }, "createWaiter");
    exports.checkExceptions = checkExceptions;
    exports.createWaiter = createWaiter;
    exports.waiterServiceDefaults = waiterServiceDefaults;
  }
});

// node_modules/@aws-sdk/client-s3/dist-cjs/index.js
var require_dist_cjs52 = __commonJS({
  "node_modules/@aws-sdk/client-s3/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var middlewareExpectContinue = require_dist_cjs36();
    var middlewareFlexibleChecksums = require_dist_cjs41();
    var middlewareHostHeader = require_dist_cjs11();
    var middlewareLogger = require_dist_cjs12();
    var middlewareRecursionDetection = require_dist_cjs13();
    var middlewareSdkS3 = require_dist_cjs18();
    var middlewareUserAgent = require_dist_cjs21();
    var configResolver = require_dist_cjs22();
    var core = (init_dist_es(), __toCommonJS(dist_es_exports));
    var schema = (init_schema(), __toCommonJS(schema_exports));
    var eventstreamSerdeConfigResolver = require_dist_cjs42();
    var middlewareContentLength = require_dist_cjs23();
    var middlewareEndpoint = require_dist_cjs27();
    var middlewareRetry = require_dist_cjs28();
    var smithyClient = require_dist_cjs15();
    var httpAuthSchemeProvider = require_httpAuthSchemeProvider();
    var schemas_0 = require_schemas_0();
    var runtimeConfig = require_runtimeConfig();
    var regionConfigResolver = require_dist_cjs35();
    var protocolHttp = require_dist_cjs();
    var middlewareSsec = require_dist_cjs49();
    var middlewareLocationConstraint = require_dist_cjs50();
    var utilWaiter = require_dist_cjs51();
    var errors = require_errors();
    var S3ServiceException = require_S3ServiceException();
    var resolveClientEndpointParameters = /* @__PURE__ */ __name((options) => {
      return Object.assign(options, {
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        forcePathStyle: options.forcePathStyle ?? false,
        useAccelerateEndpoint: options.useAccelerateEndpoint ?? false,
        useGlobalEndpoint: options.useGlobalEndpoint ?? false,
        disableMultiregionAccessPoints: options.disableMultiregionAccessPoints ?? false,
        defaultSigningName: "s3",
        clientContextParams: options.clientContextParams ?? {}
      });
    }, "resolveClientEndpointParameters");
    var commonParams = {
      ForcePathStyle: { type: "clientContextParams", name: "forcePathStyle" },
      UseArnRegion: { type: "clientContextParams", name: "useArnRegion" },
      DisableMultiRegionAccessPoints: { type: "clientContextParams", name: "disableMultiregionAccessPoints" },
      Accelerate: { type: "clientContextParams", name: "useAccelerateEndpoint" },
      DisableS3ExpressSessionAuth: { type: "clientContextParams", name: "disableS3ExpressSessionAuth" },
      UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
    var CreateSessionCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      DisableS3ExpressSessionAuth: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "CreateSession", {}).n("S3Client", "CreateSessionCommand").sc(schemas_0.CreateSession$).build() {
      static {
        __name(this, "CreateSessionCommand");
      }
    };
    var getHttpAuthExtensionConfiguration = /* @__PURE__ */ __name((runtimeConfig2) => {
      const _httpAuthSchemes = runtimeConfig2.httpAuthSchemes;
      let _httpAuthSchemeProvider = runtimeConfig2.httpAuthSchemeProvider;
      let _credentials = runtimeConfig2.credentials;
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
        setHttpAuthSchemeProvider(httpAuthSchemeProvider2) {
          _httpAuthSchemeProvider = httpAuthSchemeProvider2;
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
    var resolveHttpAuthRuntimeConfig = /* @__PURE__ */ __name((config) => {
      return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials()
      };
    }, "resolveHttpAuthRuntimeConfig");
    var resolveRuntimeExtensions = /* @__PURE__ */ __name((runtimeConfig2, extensions) => {
      const extensionConfiguration = Object.assign(regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig2), smithyClient.getDefaultExtensionConfiguration(runtimeConfig2), protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig2), getHttpAuthExtensionConfiguration(runtimeConfig2));
      extensions.forEach((extension) => extension.configure(extensionConfiguration));
      return Object.assign(runtimeConfig2, regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration), smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration), protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
    }, "resolveRuntimeExtensions");
    var S3Client2 = class extends smithyClient.Client {
      static {
        __name(this, "S3Client");
      }
      config;
      constructor(...[configuration]) {
        const _config_0 = runtimeConfig.getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = middlewareUserAgent.resolveUserAgentConfig(_config_1);
        const _config_3 = middlewareFlexibleChecksums.resolveFlexibleChecksumsConfig(_config_2);
        const _config_4 = middlewareRetry.resolveRetryConfig(_config_3);
        const _config_5 = configResolver.resolveRegionConfig(_config_4);
        const _config_6 = middlewareHostHeader.resolveHostHeaderConfig(_config_5);
        const _config_7 = middlewareEndpoint.resolveEndpointConfig(_config_6);
        const _config_8 = eventstreamSerdeConfigResolver.resolveEventStreamSerdeConfig(_config_7);
        const _config_9 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_8);
        const _config_10 = middlewareSdkS3.resolveS3Config(_config_9, { session: [() => this, CreateSessionCommand] });
        const _config_11 = resolveRuntimeExtensions(_config_10, configuration?.extensions || []);
        this.config = _config_11;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultS3HttpAuthSchemeParametersProvider,
          identityProviderConfigProvider: /* @__PURE__ */ __name(async (config) => new core.DefaultIdentityProviderConfig({
            "aws.auth#sigv4": config.credentials,
            "aws.auth#sigv4a": config.credentials
          }), "identityProviderConfigProvider")
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
        this.middlewareStack.use(middlewareSdkS3.getValidateBucketNamePlugin(this.config));
        this.middlewareStack.use(middlewareExpectContinue.getAddExpectContinuePlugin(this.config));
        this.middlewareStack.use(middlewareSdkS3.getRegionRedirectMiddlewarePlugin(this.config));
        this.middlewareStack.use(middlewareSdkS3.getS3ExpressPlugin(this.config));
        this.middlewareStack.use(middlewareSdkS3.getS3ExpressHttpSigningPlugin(this.config));
      }
      destroy() {
        super.destroy();
      }
    };
    var AbortMultipartUploadCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "AbortMultipartUpload", {}).n("S3Client", "AbortMultipartUploadCommand").sc(schemas_0.AbortMultipartUpload$).build() {
      static {
        __name(this, "AbortMultipartUploadCommand");
      }
    };
    var CompleteMultipartUploadCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "CompleteMultipartUpload", {}).n("S3Client", "CompleteMultipartUploadCommand").sc(schemas_0.CompleteMultipartUpload$).build() {
      static {
        __name(this, "CompleteMultipartUploadCommand");
      }
    };
    var CopyObjectCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      DisableS3ExpressSessionAuth: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" },
      CopySource: { type: "contextParams", name: "CopySource" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "CopyObject", {}).n("S3Client", "CopyObjectCommand").sc(schemas_0.CopyObject$).build() {
      static {
        __name(this, "CopyObjectCommand");
      }
    };
    var CreateBucketCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      DisableAccessPoints: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareLocationConstraint.getLocationConstraintPlugin(config)
      ];
    }).s("AmazonS3", "CreateBucket", {}).n("S3Client", "CreateBucketCommand").sc(schemas_0.CreateBucket$).build() {
      static {
        __name(this, "CreateBucketCommand");
      }
    };
    var CreateBucketMetadataConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "CreateBucketMetadataConfiguration", {}).n("S3Client", "CreateBucketMetadataConfigurationCommand").sc(schemas_0.CreateBucketMetadataConfiguration$).build() {
      static {
        __name(this, "CreateBucketMetadataConfigurationCommand");
      }
    };
    var CreateBucketMetadataTableConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "CreateBucketMetadataTableConfiguration", {}).n("S3Client", "CreateBucketMetadataTableConfigurationCommand").sc(schemas_0.CreateBucketMetadataTableConfiguration$).build() {
      static {
        __name(this, "CreateBucketMetadataTableConfigurationCommand");
      }
    };
    var CreateMultipartUploadCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "CreateMultipartUpload", {}).n("S3Client", "CreateMultipartUploadCommand").sc(schemas_0.CreateMultipartUpload$).build() {
      static {
        __name(this, "CreateMultipartUploadCommand");
      }
    };
    var DeleteBucketAnalyticsConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketAnalyticsConfiguration", {}).n("S3Client", "DeleteBucketAnalyticsConfigurationCommand").sc(schemas_0.DeleteBucketAnalyticsConfiguration$).build() {
      static {
        __name(this, "DeleteBucketAnalyticsConfigurationCommand");
      }
    };
    var DeleteBucketCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucket", {}).n("S3Client", "DeleteBucketCommand").sc(schemas_0.DeleteBucket$).build() {
      static {
        __name(this, "DeleteBucketCommand");
      }
    };
    var DeleteBucketCorsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketCors", {}).n("S3Client", "DeleteBucketCorsCommand").sc(schemas_0.DeleteBucketCors$).build() {
      static {
        __name(this, "DeleteBucketCorsCommand");
      }
    };
    var DeleteBucketEncryptionCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketEncryption", {}).n("S3Client", "DeleteBucketEncryptionCommand").sc(schemas_0.DeleteBucketEncryption$).build() {
      static {
        __name(this, "DeleteBucketEncryptionCommand");
      }
    };
    var DeleteBucketIntelligentTieringConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketIntelligentTieringConfiguration", {}).n("S3Client", "DeleteBucketIntelligentTieringConfigurationCommand").sc(schemas_0.DeleteBucketIntelligentTieringConfiguration$).build() {
      static {
        __name(this, "DeleteBucketIntelligentTieringConfigurationCommand");
      }
    };
    var DeleteBucketInventoryConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketInventoryConfiguration", {}).n("S3Client", "DeleteBucketInventoryConfigurationCommand").sc(schemas_0.DeleteBucketInventoryConfiguration$).build() {
      static {
        __name(this, "DeleteBucketInventoryConfigurationCommand");
      }
    };
    var DeleteBucketLifecycleCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketLifecycle", {}).n("S3Client", "DeleteBucketLifecycleCommand").sc(schemas_0.DeleteBucketLifecycle$).build() {
      static {
        __name(this, "DeleteBucketLifecycleCommand");
      }
    };
    var DeleteBucketMetadataConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketMetadataConfiguration", {}).n("S3Client", "DeleteBucketMetadataConfigurationCommand").sc(schemas_0.DeleteBucketMetadataConfiguration$).build() {
      static {
        __name(this, "DeleteBucketMetadataConfigurationCommand");
      }
    };
    var DeleteBucketMetadataTableConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketMetadataTableConfiguration", {}).n("S3Client", "DeleteBucketMetadataTableConfigurationCommand").sc(schemas_0.DeleteBucketMetadataTableConfiguration$).build() {
      static {
        __name(this, "DeleteBucketMetadataTableConfigurationCommand");
      }
    };
    var DeleteBucketMetricsConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketMetricsConfiguration", {}).n("S3Client", "DeleteBucketMetricsConfigurationCommand").sc(schemas_0.DeleteBucketMetricsConfiguration$).build() {
      static {
        __name(this, "DeleteBucketMetricsConfigurationCommand");
      }
    };
    var DeleteBucketOwnershipControlsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketOwnershipControls", {}).n("S3Client", "DeleteBucketOwnershipControlsCommand").sc(schemas_0.DeleteBucketOwnershipControls$).build() {
      static {
        __name(this, "DeleteBucketOwnershipControlsCommand");
      }
    };
    var DeleteBucketPolicyCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketPolicy", {}).n("S3Client", "DeleteBucketPolicyCommand").sc(schemas_0.DeleteBucketPolicy$).build() {
      static {
        __name(this, "DeleteBucketPolicyCommand");
      }
    };
    var DeleteBucketReplicationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketReplication", {}).n("S3Client", "DeleteBucketReplicationCommand").sc(schemas_0.DeleteBucketReplication$).build() {
      static {
        __name(this, "DeleteBucketReplicationCommand");
      }
    };
    var DeleteBucketTaggingCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketTagging", {}).n("S3Client", "DeleteBucketTaggingCommand").sc(schemas_0.DeleteBucketTagging$).build() {
      static {
        __name(this, "DeleteBucketTaggingCommand");
      }
    };
    var DeleteBucketWebsiteCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeleteBucketWebsite", {}).n("S3Client", "DeleteBucketWebsiteCommand").sc(schemas_0.DeleteBucketWebsite$).build() {
      static {
        __name(this, "DeleteBucketWebsiteCommand");
      }
    };
    var DeleteObjectCommand2 = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "DeleteObject", {}).n("S3Client", "DeleteObjectCommand").sc(schemas_0.DeleteObject$).build() {
      static {
        __name(this, "DeleteObjectCommand");
      }
    };
    var DeleteObjectsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "DeleteObjects", {}).n("S3Client", "DeleteObjectsCommand").sc(schemas_0.DeleteObjects$).build() {
      static {
        __name(this, "DeleteObjectsCommand");
      }
    };
    var DeleteObjectTaggingCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "DeleteObjectTagging", {}).n("S3Client", "DeleteObjectTaggingCommand").sc(schemas_0.DeleteObjectTagging$).build() {
      static {
        __name(this, "DeleteObjectTaggingCommand");
      }
    };
    var DeletePublicAccessBlockCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "DeletePublicAccessBlock", {}).n("S3Client", "DeletePublicAccessBlockCommand").sc(schemas_0.DeletePublicAccessBlock$).build() {
      static {
        __name(this, "DeletePublicAccessBlockCommand");
      }
    };
    var GetBucketAbacCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketAbac", {}).n("S3Client", "GetBucketAbacCommand").sc(schemas_0.GetBucketAbac$).build() {
      static {
        __name(this, "GetBucketAbacCommand");
      }
    };
    var GetBucketAccelerateConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketAccelerateConfiguration", {}).n("S3Client", "GetBucketAccelerateConfigurationCommand").sc(schemas_0.GetBucketAccelerateConfiguration$).build() {
      static {
        __name(this, "GetBucketAccelerateConfigurationCommand");
      }
    };
    var GetBucketAclCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketAcl", {}).n("S3Client", "GetBucketAclCommand").sc(schemas_0.GetBucketAcl$).build() {
      static {
        __name(this, "GetBucketAclCommand");
      }
    };
    var GetBucketAnalyticsConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketAnalyticsConfiguration", {}).n("S3Client", "GetBucketAnalyticsConfigurationCommand").sc(schemas_0.GetBucketAnalyticsConfiguration$).build() {
      static {
        __name(this, "GetBucketAnalyticsConfigurationCommand");
      }
    };
    var GetBucketCorsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketCors", {}).n("S3Client", "GetBucketCorsCommand").sc(schemas_0.GetBucketCors$).build() {
      static {
        __name(this, "GetBucketCorsCommand");
      }
    };
    var GetBucketEncryptionCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketEncryption", {}).n("S3Client", "GetBucketEncryptionCommand").sc(schemas_0.GetBucketEncryption$).build() {
      static {
        __name(this, "GetBucketEncryptionCommand");
      }
    };
    var GetBucketIntelligentTieringConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketIntelligentTieringConfiguration", {}).n("S3Client", "GetBucketIntelligentTieringConfigurationCommand").sc(schemas_0.GetBucketIntelligentTieringConfiguration$).build() {
      static {
        __name(this, "GetBucketIntelligentTieringConfigurationCommand");
      }
    };
    var GetBucketInventoryConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketInventoryConfiguration", {}).n("S3Client", "GetBucketInventoryConfigurationCommand").sc(schemas_0.GetBucketInventoryConfiguration$).build() {
      static {
        __name(this, "GetBucketInventoryConfigurationCommand");
      }
    };
    var GetBucketLifecycleConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketLifecycleConfiguration", {}).n("S3Client", "GetBucketLifecycleConfigurationCommand").sc(schemas_0.GetBucketLifecycleConfiguration$).build() {
      static {
        __name(this, "GetBucketLifecycleConfigurationCommand");
      }
    };
    var GetBucketLocationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketLocation", {}).n("S3Client", "GetBucketLocationCommand").sc(schemas_0.GetBucketLocation$).build() {
      static {
        __name(this, "GetBucketLocationCommand");
      }
    };
    var GetBucketLoggingCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketLogging", {}).n("S3Client", "GetBucketLoggingCommand").sc(schemas_0.GetBucketLogging$).build() {
      static {
        __name(this, "GetBucketLoggingCommand");
      }
    };
    var GetBucketMetadataConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketMetadataConfiguration", {}).n("S3Client", "GetBucketMetadataConfigurationCommand").sc(schemas_0.GetBucketMetadataConfiguration$).build() {
      static {
        __name(this, "GetBucketMetadataConfigurationCommand");
      }
    };
    var GetBucketMetadataTableConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketMetadataTableConfiguration", {}).n("S3Client", "GetBucketMetadataTableConfigurationCommand").sc(schemas_0.GetBucketMetadataTableConfiguration$).build() {
      static {
        __name(this, "GetBucketMetadataTableConfigurationCommand");
      }
    };
    var GetBucketMetricsConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketMetricsConfiguration", {}).n("S3Client", "GetBucketMetricsConfigurationCommand").sc(schemas_0.GetBucketMetricsConfiguration$).build() {
      static {
        __name(this, "GetBucketMetricsConfigurationCommand");
      }
    };
    var GetBucketNotificationConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketNotificationConfiguration", {}).n("S3Client", "GetBucketNotificationConfigurationCommand").sc(schemas_0.GetBucketNotificationConfiguration$).build() {
      static {
        __name(this, "GetBucketNotificationConfigurationCommand");
      }
    };
    var GetBucketOwnershipControlsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketOwnershipControls", {}).n("S3Client", "GetBucketOwnershipControlsCommand").sc(schemas_0.GetBucketOwnershipControls$).build() {
      static {
        __name(this, "GetBucketOwnershipControlsCommand");
      }
    };
    var GetBucketPolicyCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "GetBucketPolicy", {}).n("S3Client", "GetBucketPolicyCommand").sc(schemas_0.GetBucketPolicy$).build() {
      static {
        __name(this, "GetBucketPolicyCommand");
      }
    };
    var GetBucketPolicyStatusCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketPolicyStatus", {}).n("S3Client", "GetBucketPolicyStatusCommand").sc(schemas_0.GetBucketPolicyStatus$).build() {
      static {
        __name(this, "GetBucketPolicyStatusCommand");
      }
    };
    var GetBucketReplicationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketReplication", {}).n("S3Client", "GetBucketReplicationCommand").sc(schemas_0.GetBucketReplication$).build() {
      static {
        __name(this, "GetBucketReplicationCommand");
      }
    };
    var GetBucketRequestPaymentCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketRequestPayment", {}).n("S3Client", "GetBucketRequestPaymentCommand").sc(schemas_0.GetBucketRequestPayment$).build() {
      static {
        __name(this, "GetBucketRequestPaymentCommand");
      }
    };
    var GetBucketTaggingCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketTagging", {}).n("S3Client", "GetBucketTaggingCommand").sc(schemas_0.GetBucketTagging$).build() {
      static {
        __name(this, "GetBucketTaggingCommand");
      }
    };
    var GetBucketVersioningCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketVersioning", {}).n("S3Client", "GetBucketVersioningCommand").sc(schemas_0.GetBucketVersioning$).build() {
      static {
        __name(this, "GetBucketVersioningCommand");
      }
    };
    var GetBucketWebsiteCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetBucketWebsite", {}).n("S3Client", "GetBucketWebsiteCommand").sc(schemas_0.GetBucketWebsite$).build() {
      static {
        __name(this, "GetBucketWebsiteCommand");
      }
    };
    var GetObjectAclCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetObjectAcl", {}).n("S3Client", "GetObjectAclCommand").sc(schemas_0.GetObjectAcl$).build() {
      static {
        __name(this, "GetObjectAclCommand");
      }
    };
    var GetObjectAttributesCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "GetObjectAttributes", {}).n("S3Client", "GetObjectAttributesCommand").sc(schemas_0.GetObjectAttributes$).build() {
      static {
        __name(this, "GetObjectAttributesCommand");
      }
    };
    var GetObjectCommand2 = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestChecksumRequired: false,
          requestValidationModeMember: "ChecksumMode",
          "responseAlgorithms": ["CRC64NVME", "CRC32", "CRC32C", "SHA256", "SHA1", "SHA512", "MD5", "XXHASH64", "XXHASH3", "XXHASH128"]
        }),
        middlewareSsec.getSsecPlugin(config),
        middlewareSdkS3.getS3ExpiresMiddlewarePlugin(config)
      ];
    }).s("AmazonS3", "GetObject", {}).n("S3Client", "GetObjectCommand").sc(schemas_0.GetObject$).build() {
      static {
        __name(this, "GetObjectCommand");
      }
    };
    var GetObjectLegalHoldCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetObjectLegalHold", {}).n("S3Client", "GetObjectLegalHoldCommand").sc(schemas_0.GetObjectLegalHold$).build() {
      static {
        __name(this, "GetObjectLegalHoldCommand");
      }
    };
    var GetObjectLockConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetObjectLockConfiguration", {}).n("S3Client", "GetObjectLockConfigurationCommand").sc(schemas_0.GetObjectLockConfiguration$).build() {
      static {
        __name(this, "GetObjectLockConfigurationCommand");
      }
    };
    var GetObjectRetentionCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetObjectRetention", {}).n("S3Client", "GetObjectRetentionCommand").sc(schemas_0.GetObjectRetention$).build() {
      static {
        __name(this, "GetObjectRetentionCommand");
      }
    };
    var GetObjectTaggingCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetObjectTagging", {}).n("S3Client", "GetObjectTaggingCommand").sc(schemas_0.GetObjectTagging$).build() {
      static {
        __name(this, "GetObjectTaggingCommand");
      }
    };
    var GetObjectTorrentCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "GetObjectTorrent", {}).n("S3Client", "GetObjectTorrentCommand").sc(schemas_0.GetObjectTorrent$).build() {
      static {
        __name(this, "GetObjectTorrentCommand");
      }
    };
    var GetPublicAccessBlockCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "GetPublicAccessBlock", {}).n("S3Client", "GetPublicAccessBlockCommand").sc(schemas_0.GetPublicAccessBlock$).build() {
      static {
        __name(this, "GetPublicAccessBlockCommand");
      }
    };
    var HeadBucketCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "HeadBucket", {}).n("S3Client", "HeadBucketCommand").sc(schemas_0.HeadBucket$).build() {
      static {
        __name(this, "HeadBucketCommand");
      }
    };
    var HeadObjectCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config),
        middlewareSdkS3.getS3ExpiresMiddlewarePlugin(config)
      ];
    }).s("AmazonS3", "HeadObject", {}).n("S3Client", "HeadObjectCommand").sc(schemas_0.HeadObject$).build() {
      static {
        __name(this, "HeadObjectCommand");
      }
    };
    var ListBucketAnalyticsConfigurationsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListBucketAnalyticsConfigurations", {}).n("S3Client", "ListBucketAnalyticsConfigurationsCommand").sc(schemas_0.ListBucketAnalyticsConfigurations$).build() {
      static {
        __name(this, "ListBucketAnalyticsConfigurationsCommand");
      }
    };
    var ListBucketIntelligentTieringConfigurationsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListBucketIntelligentTieringConfigurations", {}).n("S3Client", "ListBucketIntelligentTieringConfigurationsCommand").sc(schemas_0.ListBucketIntelligentTieringConfigurations$).build() {
      static {
        __name(this, "ListBucketIntelligentTieringConfigurationsCommand");
      }
    };
    var ListBucketInventoryConfigurationsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListBucketInventoryConfigurations", {}).n("S3Client", "ListBucketInventoryConfigurationsCommand").sc(schemas_0.ListBucketInventoryConfigurations$).build() {
      static {
        __name(this, "ListBucketInventoryConfigurationsCommand");
      }
    };
    var ListBucketMetricsConfigurationsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListBucketMetricsConfigurations", {}).n("S3Client", "ListBucketMetricsConfigurationsCommand").sc(schemas_0.ListBucketMetricsConfigurations$).build() {
      static {
        __name(this, "ListBucketMetricsConfigurationsCommand");
      }
    };
    var ListBucketsCommand = class extends smithyClient.Command.classBuilder().ep(commonParams).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListBuckets", {}).n("S3Client", "ListBucketsCommand").sc(schemas_0.ListBuckets$).build() {
      static {
        __name(this, "ListBucketsCommand");
      }
    };
    var ListDirectoryBucketsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListDirectoryBuckets", {}).n("S3Client", "ListDirectoryBucketsCommand").sc(schemas_0.ListDirectoryBuckets$).build() {
      static {
        __name(this, "ListDirectoryBucketsCommand");
      }
    };
    var ListMultipartUploadsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Prefix: { type: "contextParams", name: "Prefix" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListMultipartUploads", {}).n("S3Client", "ListMultipartUploadsCommand").sc(schemas_0.ListMultipartUploads$).build() {
      static {
        __name(this, "ListMultipartUploadsCommand");
      }
    };
    var ListObjectsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Prefix: { type: "contextParams", name: "Prefix" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListObjects", {}).n("S3Client", "ListObjectsCommand").sc(schemas_0.ListObjects$).build() {
      static {
        __name(this, "ListObjectsCommand");
      }
    };
    var ListObjectsV2Command = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Prefix: { type: "contextParams", name: "Prefix" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListObjectsV2", {}).n("S3Client", "ListObjectsV2Command").sc(schemas_0.ListObjectsV2$).build() {
      static {
        __name(this, "ListObjectsV2Command");
      }
    };
    var ListObjectVersionsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Prefix: { type: "contextParams", name: "Prefix" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "ListObjectVersions", {}).n("S3Client", "ListObjectVersionsCommand").sc(schemas_0.ListObjectVersions$).build() {
      static {
        __name(this, "ListObjectVersionsCommand");
      }
    };
    var ListPartsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "ListParts", {}).n("S3Client", "ListPartsCommand").sc(schemas_0.ListParts$).build() {
      static {
        __name(this, "ListPartsCommand");
      }
    };
    var PutBucketAbacCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: false
        })
      ];
    }).s("AmazonS3", "PutBucketAbac", {}).n("S3Client", "PutBucketAbacCommand").sc(schemas_0.PutBucketAbac$).build() {
      static {
        __name(this, "PutBucketAbacCommand");
      }
    };
    var PutBucketAccelerateConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: false
        })
      ];
    }).s("AmazonS3", "PutBucketAccelerateConfiguration", {}).n("S3Client", "PutBucketAccelerateConfigurationCommand").sc(schemas_0.PutBucketAccelerateConfiguration$).build() {
      static {
        __name(this, "PutBucketAccelerateConfigurationCommand");
      }
    };
    var PutBucketAclCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketAcl", {}).n("S3Client", "PutBucketAclCommand").sc(schemas_0.PutBucketAcl$).build() {
      static {
        __name(this, "PutBucketAclCommand");
      }
    };
    var PutBucketAnalyticsConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "PutBucketAnalyticsConfiguration", {}).n("S3Client", "PutBucketAnalyticsConfigurationCommand").sc(schemas_0.PutBucketAnalyticsConfiguration$).build() {
      static {
        __name(this, "PutBucketAnalyticsConfigurationCommand");
      }
    };
    var PutBucketCorsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketCors", {}).n("S3Client", "PutBucketCorsCommand").sc(schemas_0.PutBucketCors$).build() {
      static {
        __name(this, "PutBucketCorsCommand");
      }
    };
    var PutBucketEncryptionCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketEncryption", {}).n("S3Client", "PutBucketEncryptionCommand").sc(schemas_0.PutBucketEncryption$).build() {
      static {
        __name(this, "PutBucketEncryptionCommand");
      }
    };
    var PutBucketIntelligentTieringConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "PutBucketIntelligentTieringConfiguration", {}).n("S3Client", "PutBucketIntelligentTieringConfigurationCommand").sc(schemas_0.PutBucketIntelligentTieringConfiguration$).build() {
      static {
        __name(this, "PutBucketIntelligentTieringConfigurationCommand");
      }
    };
    var PutBucketInventoryConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "PutBucketInventoryConfiguration", {}).n("S3Client", "PutBucketInventoryConfigurationCommand").sc(schemas_0.PutBucketInventoryConfiguration$).build() {
      static {
        __name(this, "PutBucketInventoryConfigurationCommand");
      }
    };
    var PutBucketLifecycleConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "PutBucketLifecycleConfiguration", {}).n("S3Client", "PutBucketLifecycleConfigurationCommand").sc(schemas_0.PutBucketLifecycleConfiguration$).build() {
      static {
        __name(this, "PutBucketLifecycleConfigurationCommand");
      }
    };
    var PutBucketLoggingCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketLogging", {}).n("S3Client", "PutBucketLoggingCommand").sc(schemas_0.PutBucketLogging$).build() {
      static {
        __name(this, "PutBucketLoggingCommand");
      }
    };
    var PutBucketMetricsConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "PutBucketMetricsConfiguration", {}).n("S3Client", "PutBucketMetricsConfigurationCommand").sc(schemas_0.PutBucketMetricsConfiguration$).build() {
      static {
        __name(this, "PutBucketMetricsConfigurationCommand");
      }
    };
    var PutBucketNotificationConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "PutBucketNotificationConfiguration", {}).n("S3Client", "PutBucketNotificationConfigurationCommand").sc(schemas_0.PutBucketNotificationConfiguration$).build() {
      static {
        __name(this, "PutBucketNotificationConfigurationCommand");
      }
    };
    var PutBucketOwnershipControlsCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketOwnershipControls", {}).n("S3Client", "PutBucketOwnershipControlsCommand").sc(schemas_0.PutBucketOwnershipControls$).build() {
      static {
        __name(this, "PutBucketOwnershipControlsCommand");
      }
    };
    var PutBucketPolicyCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketPolicy", {}).n("S3Client", "PutBucketPolicyCommand").sc(schemas_0.PutBucketPolicy$).build() {
      static {
        __name(this, "PutBucketPolicyCommand");
      }
    };
    var PutBucketReplicationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketReplication", {}).n("S3Client", "PutBucketReplicationCommand").sc(schemas_0.PutBucketReplication$).build() {
      static {
        __name(this, "PutBucketReplicationCommand");
      }
    };
    var PutBucketRequestPaymentCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketRequestPayment", {}).n("S3Client", "PutBucketRequestPaymentCommand").sc(schemas_0.PutBucketRequestPayment$).build() {
      static {
        __name(this, "PutBucketRequestPaymentCommand");
      }
    };
    var PutBucketTaggingCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketTagging", {}).n("S3Client", "PutBucketTaggingCommand").sc(schemas_0.PutBucketTagging$).build() {
      static {
        __name(this, "PutBucketTaggingCommand");
      }
    };
    var PutBucketVersioningCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketVersioning", {}).n("S3Client", "PutBucketVersioningCommand").sc(schemas_0.PutBucketVersioning$).build() {
      static {
        __name(this, "PutBucketVersioningCommand");
      }
    };
    var PutBucketWebsiteCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutBucketWebsite", {}).n("S3Client", "PutBucketWebsiteCommand").sc(schemas_0.PutBucketWebsite$).build() {
      static {
        __name(this, "PutBucketWebsiteCommand");
      }
    };
    var PutObjectAclCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "PutObjectAcl", {}).n("S3Client", "PutObjectAclCommand").sc(schemas_0.PutObjectAcl$).build() {
      static {
        __name(this, "PutObjectAclCommand");
      }
    };
    var PutObjectCommand2 = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: false
        }),
        middlewareSdkS3.getCheckContentLengthHeaderPlugin(config),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "PutObject", {}).n("S3Client", "PutObjectCommand").sc(schemas_0.PutObject$).build() {
      static {
        __name(this, "PutObjectCommand");
      }
    };
    var PutObjectLegalHoldCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "PutObjectLegalHold", {}).n("S3Client", "PutObjectLegalHoldCommand").sc(schemas_0.PutObjectLegalHold$).build() {
      static {
        __name(this, "PutObjectLegalHoldCommand");
      }
    };
    var PutObjectLockConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "PutObjectLockConfiguration", {}).n("S3Client", "PutObjectLockConfigurationCommand").sc(schemas_0.PutObjectLockConfiguration$).build() {
      static {
        __name(this, "PutObjectLockConfigurationCommand");
      }
    };
    var PutObjectRetentionCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "PutObjectRetention", {}).n("S3Client", "PutObjectRetentionCommand").sc(schemas_0.PutObjectRetention$).build() {
      static {
        __name(this, "PutObjectRetentionCommand");
      }
    };
    var PutObjectTaggingCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "PutObjectTagging", {}).n("S3Client", "PutObjectTaggingCommand").sc(schemas_0.PutObjectTagging$).build() {
      static {
        __name(this, "PutObjectTaggingCommand");
      }
    };
    var PutPublicAccessBlockCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "PutPublicAccessBlock", {}).n("S3Client", "PutPublicAccessBlockCommand").sc(schemas_0.PutPublicAccessBlock$).build() {
      static {
        __name(this, "PutPublicAccessBlockCommand");
      }
    };
    var RenameObjectCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "RenameObject", {}).n("S3Client", "RenameObjectCommand").sc(schemas_0.RenameObject$).build() {
      static {
        __name(this, "RenameObjectCommand");
      }
    };
    var RestoreObjectCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: false
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "RestoreObject", {}).n("S3Client", "RestoreObjectCommand").sc(schemas_0.RestoreObject$).build() {
      static {
        __name(this, "RestoreObjectCommand");
      }
    };
    var SelectObjectContentCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "SelectObjectContent", {
      eventStream: {
        output: true
      }
    }).n("S3Client", "SelectObjectContentCommand").sc(schemas_0.SelectObjectContent$).build() {
      static {
        __name(this, "SelectObjectContentCommand");
      }
    };
    var UpdateBucketMetadataInventoryTableConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "UpdateBucketMetadataInventoryTableConfiguration", {}).n("S3Client", "UpdateBucketMetadataInventoryTableConfigurationCommand").sc(schemas_0.UpdateBucketMetadataInventoryTableConfiguration$).build() {
      static {
        __name(this, "UpdateBucketMetadataInventoryTableConfigurationCommand");
      }
    };
    var UpdateBucketMetadataJournalTableConfigurationCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseS3ExpressControlEndpoint: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        })
      ];
    }).s("AmazonS3", "UpdateBucketMetadataJournalTableConfiguration", {}).n("S3Client", "UpdateBucketMetadataJournalTableConfigurationCommand").sc(schemas_0.UpdateBucketMetadataJournalTableConfiguration$).build() {
      static {
        __name(this, "UpdateBucketMetadataJournalTableConfigurationCommand");
      }
    };
    var UpdateObjectEncryptionCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: true
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config)
      ];
    }).s("AmazonS3", "UpdateObjectEncryption", {}).n("S3Client", "UpdateObjectEncryptionCommand").sc(schemas_0.UpdateObjectEncryption$).build() {
      static {
        __name(this, "UpdateObjectEncryptionCommand");
      }
    };
    var UploadPartCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      Bucket: { type: "contextParams", name: "Bucket" },
      Key: { type: "contextParams", name: "Key" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareFlexibleChecksums.getFlexibleChecksumsPlugin(config, {
          requestAlgorithmMember: { "httpHeader": "x-amz-sdk-checksum-algorithm", "name": "ChecksumAlgorithm" },
          requestChecksumRequired: false
        }),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "UploadPart", {}).n("S3Client", "UploadPartCommand").sc(schemas_0.UploadPart$).build() {
      static {
        __name(this, "UploadPartCommand");
      }
    };
    var UploadPartCopyCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      DisableS3ExpressSessionAuth: { type: "staticContextParams", value: true },
      Bucket: { type: "contextParams", name: "Bucket" }
    }).m(function(Command, cs, config, o) {
      return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareSdkS3.getThrow200ExceptionsPlugin(config),
        middlewareSsec.getSsecPlugin(config)
      ];
    }).s("AmazonS3", "UploadPartCopy", {}).n("S3Client", "UploadPartCopyCommand").sc(schemas_0.UploadPartCopy$).build() {
      static {
        __name(this, "UploadPartCopyCommand");
      }
    };
    var WriteGetObjectResponseCommand = class extends smithyClient.Command.classBuilder().ep({
      ...commonParams,
      UseObjectLambdaEndpoint: { type: "staticContextParams", value: true }
    }).m(function(Command, cs, config, o) {
      return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
    }).s("AmazonS3", "WriteGetObjectResponse", {}).n("S3Client", "WriteGetObjectResponseCommand").sc(schemas_0.WriteGetObjectResponse$).build() {
      static {
        __name(this, "WriteGetObjectResponseCommand");
      }
    };
    var paginateListBuckets = core.createPaginator(S3Client2, ListBucketsCommand, "ContinuationToken", "ContinuationToken", "MaxBuckets");
    var paginateListDirectoryBuckets = core.createPaginator(S3Client2, ListDirectoryBucketsCommand, "ContinuationToken", "ContinuationToken", "MaxDirectoryBuckets");
    var paginateListObjectsV2 = core.createPaginator(S3Client2, ListObjectsV2Command, "ContinuationToken", "NextContinuationToken", "MaxKeys");
    var paginateListParts = core.createPaginator(S3Client2, ListPartsCommand, "PartNumberMarker", "NextPartNumberMarker", "MaxParts");
    var checkState$3 = /* @__PURE__ */ __name(async (client, input) => {
      let reason;
      try {
        let result = await client.send(new HeadBucketCommand(input));
        reason = result;
        return { state: utilWaiter.WaiterState.SUCCESS, reason };
      } catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NotFound") {
          return { state: utilWaiter.WaiterState.RETRY, reason };
        }
      }
      return { state: utilWaiter.WaiterState.RETRY, reason };
    }, "checkState$3");
    var waitForBucketExists = /* @__PURE__ */ __name(async (params, input) => {
      const serviceDefaults = { minDelay: 5, maxDelay: 120 };
      return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$3);
    }, "waitForBucketExists");
    var waitUntilBucketExists = /* @__PURE__ */ __name(async (params, input) => {
      const serviceDefaults = { minDelay: 5, maxDelay: 120 };
      const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$3);
      return utilWaiter.checkExceptions(result);
    }, "waitUntilBucketExists");
    var checkState$2 = /* @__PURE__ */ __name(async (client, input) => {
      let reason;
      try {
        let result = await client.send(new HeadBucketCommand(input));
        reason = result;
      } catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NotFound") {
          return { state: utilWaiter.WaiterState.SUCCESS, reason };
        }
      }
      return { state: utilWaiter.WaiterState.RETRY, reason };
    }, "checkState$2");
    var waitForBucketNotExists = /* @__PURE__ */ __name(async (params, input) => {
      const serviceDefaults = { minDelay: 5, maxDelay: 120 };
      return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$2);
    }, "waitForBucketNotExists");
    var waitUntilBucketNotExists = /* @__PURE__ */ __name(async (params, input) => {
      const serviceDefaults = { minDelay: 5, maxDelay: 120 };
      const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$2);
      return utilWaiter.checkExceptions(result);
    }, "waitUntilBucketNotExists");
    var checkState$1 = /* @__PURE__ */ __name(async (client, input) => {
      let reason;
      try {
        let result = await client.send(new HeadObjectCommand(input));
        reason = result;
        return { state: utilWaiter.WaiterState.SUCCESS, reason };
      } catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NotFound") {
          return { state: utilWaiter.WaiterState.RETRY, reason };
        }
      }
      return { state: utilWaiter.WaiterState.RETRY, reason };
    }, "checkState$1");
    var waitForObjectExists = /* @__PURE__ */ __name(async (params, input) => {
      const serviceDefaults = { minDelay: 5, maxDelay: 120 };
      return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$1);
    }, "waitForObjectExists");
    var waitUntilObjectExists = /* @__PURE__ */ __name(async (params, input) => {
      const serviceDefaults = { minDelay: 5, maxDelay: 120 };
      const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$1);
      return utilWaiter.checkExceptions(result);
    }, "waitUntilObjectExists");
    var checkState = /* @__PURE__ */ __name(async (client, input) => {
      let reason;
      try {
        let result = await client.send(new HeadObjectCommand(input));
        reason = result;
      } catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NotFound") {
          return { state: utilWaiter.WaiterState.SUCCESS, reason };
        }
      }
      return { state: utilWaiter.WaiterState.RETRY, reason };
    }, "checkState");
    var waitForObjectNotExists = /* @__PURE__ */ __name(async (params, input) => {
      const serviceDefaults = { minDelay: 5, maxDelay: 120 };
      return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    }, "waitForObjectNotExists");
    var waitUntilObjectNotExists = /* @__PURE__ */ __name(async (params, input) => {
      const serviceDefaults = { minDelay: 5, maxDelay: 120 };
      const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState);
      return utilWaiter.checkExceptions(result);
    }, "waitUntilObjectNotExists");
    var commands = {
      AbortMultipartUploadCommand,
      CompleteMultipartUploadCommand,
      CopyObjectCommand,
      CreateBucketCommand,
      CreateBucketMetadataConfigurationCommand,
      CreateBucketMetadataTableConfigurationCommand,
      CreateMultipartUploadCommand,
      CreateSessionCommand,
      DeleteBucketCommand,
      DeleteBucketAnalyticsConfigurationCommand,
      DeleteBucketCorsCommand,
      DeleteBucketEncryptionCommand,
      DeleteBucketIntelligentTieringConfigurationCommand,
      DeleteBucketInventoryConfigurationCommand,
      DeleteBucketLifecycleCommand,
      DeleteBucketMetadataConfigurationCommand,
      DeleteBucketMetadataTableConfigurationCommand,
      DeleteBucketMetricsConfigurationCommand,
      DeleteBucketOwnershipControlsCommand,
      DeleteBucketPolicyCommand,
      DeleteBucketReplicationCommand,
      DeleteBucketTaggingCommand,
      DeleteBucketWebsiteCommand,
      DeleteObjectCommand: DeleteObjectCommand2,
      DeleteObjectsCommand,
      DeleteObjectTaggingCommand,
      DeletePublicAccessBlockCommand,
      GetBucketAbacCommand,
      GetBucketAccelerateConfigurationCommand,
      GetBucketAclCommand,
      GetBucketAnalyticsConfigurationCommand,
      GetBucketCorsCommand,
      GetBucketEncryptionCommand,
      GetBucketIntelligentTieringConfigurationCommand,
      GetBucketInventoryConfigurationCommand,
      GetBucketLifecycleConfigurationCommand,
      GetBucketLocationCommand,
      GetBucketLoggingCommand,
      GetBucketMetadataConfigurationCommand,
      GetBucketMetadataTableConfigurationCommand,
      GetBucketMetricsConfigurationCommand,
      GetBucketNotificationConfigurationCommand,
      GetBucketOwnershipControlsCommand,
      GetBucketPolicyCommand,
      GetBucketPolicyStatusCommand,
      GetBucketReplicationCommand,
      GetBucketRequestPaymentCommand,
      GetBucketTaggingCommand,
      GetBucketVersioningCommand,
      GetBucketWebsiteCommand,
      GetObjectCommand: GetObjectCommand2,
      GetObjectAclCommand,
      GetObjectAttributesCommand,
      GetObjectLegalHoldCommand,
      GetObjectLockConfigurationCommand,
      GetObjectRetentionCommand,
      GetObjectTaggingCommand,
      GetObjectTorrentCommand,
      GetPublicAccessBlockCommand,
      HeadBucketCommand,
      HeadObjectCommand,
      ListBucketAnalyticsConfigurationsCommand,
      ListBucketIntelligentTieringConfigurationsCommand,
      ListBucketInventoryConfigurationsCommand,
      ListBucketMetricsConfigurationsCommand,
      ListBucketsCommand,
      ListDirectoryBucketsCommand,
      ListMultipartUploadsCommand,
      ListObjectsCommand,
      ListObjectsV2Command,
      ListObjectVersionsCommand,
      ListPartsCommand,
      PutBucketAbacCommand,
      PutBucketAccelerateConfigurationCommand,
      PutBucketAclCommand,
      PutBucketAnalyticsConfigurationCommand,
      PutBucketCorsCommand,
      PutBucketEncryptionCommand,
      PutBucketIntelligentTieringConfigurationCommand,
      PutBucketInventoryConfigurationCommand,
      PutBucketLifecycleConfigurationCommand,
      PutBucketLoggingCommand,
      PutBucketMetricsConfigurationCommand,
      PutBucketNotificationConfigurationCommand,
      PutBucketOwnershipControlsCommand,
      PutBucketPolicyCommand,
      PutBucketReplicationCommand,
      PutBucketRequestPaymentCommand,
      PutBucketTaggingCommand,
      PutBucketVersioningCommand,
      PutBucketWebsiteCommand,
      PutObjectCommand: PutObjectCommand2,
      PutObjectAclCommand,
      PutObjectLegalHoldCommand,
      PutObjectLockConfigurationCommand,
      PutObjectRetentionCommand,
      PutObjectTaggingCommand,
      PutPublicAccessBlockCommand,
      RenameObjectCommand,
      RestoreObjectCommand,
      SelectObjectContentCommand,
      UpdateBucketMetadataInventoryTableConfigurationCommand,
      UpdateBucketMetadataJournalTableConfigurationCommand,
      UpdateObjectEncryptionCommand,
      UploadPartCommand,
      UploadPartCopyCommand,
      WriteGetObjectResponseCommand
    };
    var paginators = {
      paginateListBuckets,
      paginateListDirectoryBuckets,
      paginateListObjectsV2,
      paginateListParts
    };
    var waiters = {
      waitUntilBucketExists,
      waitUntilBucketNotExists,
      waitUntilObjectExists,
      waitUntilObjectNotExists
    };
    var S3 = class extends S3Client2 {
      static {
        __name(this, "S3");
      }
    };
    smithyClient.createAggregatedClient(commands, S3, { paginators, waiters });
    var BucketAbacStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var RequestCharged = {
      requester: "requester"
    };
    var RequestPayer = {
      requester: "requester"
    };
    var BucketAccelerateStatus = {
      Enabled: "Enabled",
      Suspended: "Suspended"
    };
    var Type = {
      AmazonCustomerByEmail: "AmazonCustomerByEmail",
      CanonicalUser: "CanonicalUser",
      Group: "Group"
    };
    var Permission = {
      FULL_CONTROL: "FULL_CONTROL",
      READ: "READ",
      READ_ACP: "READ_ACP",
      WRITE: "WRITE",
      WRITE_ACP: "WRITE_ACP"
    };
    var OwnerOverride = {
      Destination: "Destination"
    };
    var ChecksumType = {
      COMPOSITE: "COMPOSITE",
      FULL_OBJECT: "FULL_OBJECT"
    };
    var ServerSideEncryption = {
      AES256: "AES256",
      aws_fsx: "aws:fsx",
      aws_kms: "aws:kms",
      aws_kms_dsse: "aws:kms:dsse"
    };
    var ObjectCannedACL = {
      authenticated_read: "authenticated-read",
      aws_exec_read: "aws-exec-read",
      bucket_owner_full_control: "bucket-owner-full-control",
      bucket_owner_read: "bucket-owner-read",
      private: "private",
      public_read: "public-read",
      public_read_write: "public-read-write"
    };
    var ChecksumAlgorithm = {
      CRC32: "CRC32",
      CRC32C: "CRC32C",
      CRC64NVME: "CRC64NVME",
      MD5: "MD5",
      SHA1: "SHA1",
      SHA256: "SHA256",
      SHA512: "SHA512",
      XXHASH128: "XXHASH128",
      XXHASH3: "XXHASH3",
      XXHASH64: "XXHASH64"
    };
    var MetadataDirective = {
      COPY: "COPY",
      REPLACE: "REPLACE"
    };
    var ObjectLockLegalHoldStatus = {
      OFF: "OFF",
      ON: "ON"
    };
    var ObjectLockMode = {
      COMPLIANCE: "COMPLIANCE",
      GOVERNANCE: "GOVERNANCE"
    };
    var StorageClass = {
      DEEP_ARCHIVE: "DEEP_ARCHIVE",
      EXPRESS_ONEZONE: "EXPRESS_ONEZONE",
      FSX_ONTAP: "FSX_ONTAP",
      FSX_OPENZFS: "FSX_OPENZFS",
      GLACIER: "GLACIER",
      GLACIER_IR: "GLACIER_IR",
      INTELLIGENT_TIERING: "INTELLIGENT_TIERING",
      ONEZONE_IA: "ONEZONE_IA",
      OUTPOSTS: "OUTPOSTS",
      REDUCED_REDUNDANCY: "REDUCED_REDUNDANCY",
      SNOW: "SNOW",
      STANDARD: "STANDARD",
      STANDARD_IA: "STANDARD_IA"
    };
    var TaggingDirective = {
      COPY: "COPY",
      REPLACE: "REPLACE"
    };
    var BucketCannedACL = {
      authenticated_read: "authenticated-read",
      private: "private",
      public_read: "public-read",
      public_read_write: "public-read-write"
    };
    var BucketNamespace = {
      ACCOUNT_REGIONAL: "account-regional",
      GLOBAL: "global"
    };
    var DataRedundancy = {
      SingleAvailabilityZone: "SingleAvailabilityZone",
      SingleLocalZone: "SingleLocalZone"
    };
    var BucketType = {
      Directory: "Directory"
    };
    var LocationType = {
      AvailabilityZone: "AvailabilityZone",
      LocalZone: "LocalZone"
    };
    var BucketLocationConstraint = {
      EU: "EU",
      af_south_1: "af-south-1",
      ap_east_1: "ap-east-1",
      ap_east_2: "ap-east-2",
      ap_northeast_1: "ap-northeast-1",
      ap_northeast_2: "ap-northeast-2",
      ap_northeast_3: "ap-northeast-3",
      ap_south_1: "ap-south-1",
      ap_south_2: "ap-south-2",
      ap_southeast_1: "ap-southeast-1",
      ap_southeast_2: "ap-southeast-2",
      ap_southeast_3: "ap-southeast-3",
      ap_southeast_4: "ap-southeast-4",
      ap_southeast_5: "ap-southeast-5",
      ap_southeast_6: "ap-southeast-6",
      ap_southeast_7: "ap-southeast-7",
      ca_central_1: "ca-central-1",
      ca_west_1: "ca-west-1",
      cn_north_1: "cn-north-1",
      cn_northwest_1: "cn-northwest-1",
      eu_central_1: "eu-central-1",
      eu_central_2: "eu-central-2",
      eu_north_1: "eu-north-1",
      eu_south_1: "eu-south-1",
      eu_south_2: "eu-south-2",
      eu_west_1: "eu-west-1",
      eu_west_2: "eu-west-2",
      eu_west_3: "eu-west-3",
      il_central_1: "il-central-1",
      me_central_1: "me-central-1",
      me_south_1: "me-south-1",
      mx_central_1: "mx-central-1",
      sa_east_1: "sa-east-1",
      us_east_2: "us-east-2",
      us_gov_east_1: "us-gov-east-1",
      us_gov_west_1: "us-gov-west-1",
      us_west_1: "us-west-1",
      us_west_2: "us-west-2"
    };
    var ObjectOwnership = {
      BucketOwnerEnforced: "BucketOwnerEnforced",
      BucketOwnerPreferred: "BucketOwnerPreferred",
      ObjectWriter: "ObjectWriter"
    };
    var InventoryConfigurationState = {
      DISABLED: "DISABLED",
      ENABLED: "ENABLED"
    };
    var TableSseAlgorithm = {
      AES256: "AES256",
      aws_kms: "aws:kms"
    };
    var ExpirationState = {
      DISABLED: "DISABLED",
      ENABLED: "ENABLED"
    };
    var SessionMode = {
      ReadOnly: "ReadOnly",
      ReadWrite: "ReadWrite"
    };
    var AnalyticsS3ExportFileFormat = {
      CSV: "CSV"
    };
    var StorageClassAnalysisSchemaVersion = {
      V_1: "V_1"
    };
    var EncryptionType = {
      NONE: "NONE",
      SSE_C: "SSE-C"
    };
    var IntelligentTieringStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var IntelligentTieringAccessTier = {
      ARCHIVE_ACCESS: "ARCHIVE_ACCESS",
      DEEP_ARCHIVE_ACCESS: "DEEP_ARCHIVE_ACCESS"
    };
    var InventoryFormat = {
      CSV: "CSV",
      ORC: "ORC",
      Parquet: "Parquet"
    };
    var InventoryIncludedObjectVersions = {
      All: "All",
      Current: "Current"
    };
    var InventoryOptionalField = {
      BucketKeyStatus: "BucketKeyStatus",
      ChecksumAlgorithm: "ChecksumAlgorithm",
      ETag: "ETag",
      EncryptionStatus: "EncryptionStatus",
      IntelligentTieringAccessTier: "IntelligentTieringAccessTier",
      IsMultipartUploaded: "IsMultipartUploaded",
      LastModifiedDate: "LastModifiedDate",
      LifecycleExpirationDate: "LifecycleExpirationDate",
      ObjectAccessControlList: "ObjectAccessControlList",
      ObjectLockLegalHoldStatus: "ObjectLockLegalHoldStatus",
      ObjectLockMode: "ObjectLockMode",
      ObjectLockRetainUntilDate: "ObjectLockRetainUntilDate",
      ObjectOwner: "ObjectOwner",
      ReplicationStatus: "ReplicationStatus",
      Size: "Size",
      StorageClass: "StorageClass"
    };
    var InventoryFrequency = {
      Daily: "Daily",
      Weekly: "Weekly"
    };
    var TransitionStorageClass = {
      DEEP_ARCHIVE: "DEEP_ARCHIVE",
      GLACIER: "GLACIER",
      GLACIER_IR: "GLACIER_IR",
      INTELLIGENT_TIERING: "INTELLIGENT_TIERING",
      ONEZONE_IA: "ONEZONE_IA",
      STANDARD_IA: "STANDARD_IA"
    };
    var ExpirationStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var TransitionDefaultMinimumObjectSize = {
      all_storage_classes_128K: "all_storage_classes_128K",
      varies_by_storage_class: "varies_by_storage_class"
    };
    var BucketLogsPermission = {
      FULL_CONTROL: "FULL_CONTROL",
      READ: "READ",
      WRITE: "WRITE"
    };
    var PartitionDateSource = {
      DeliveryTime: "DeliveryTime",
      EventTime: "EventTime"
    };
    var S3TablesBucketType = {
      aws: "aws",
      customer: "customer"
    };
    var Event = {
      s3_IntelligentTiering: "s3:IntelligentTiering",
      s3_LifecycleExpiration_: "s3:LifecycleExpiration:*",
      s3_LifecycleExpiration_Delete: "s3:LifecycleExpiration:Delete",
      s3_LifecycleExpiration_DeleteMarkerCreated: "s3:LifecycleExpiration:DeleteMarkerCreated",
      s3_LifecycleTransition: "s3:LifecycleTransition",
      s3_ObjectAcl_Put: "s3:ObjectAcl:Put",
      s3_ObjectCreated_: "s3:ObjectCreated:*",
      s3_ObjectCreated_CompleteMultipartUpload: "s3:ObjectCreated:CompleteMultipartUpload",
      s3_ObjectCreated_Copy: "s3:ObjectCreated:Copy",
      s3_ObjectCreated_Post: "s3:ObjectCreated:Post",
      s3_ObjectCreated_Put: "s3:ObjectCreated:Put",
      s3_ObjectRemoved_: "s3:ObjectRemoved:*",
      s3_ObjectRemoved_Delete: "s3:ObjectRemoved:Delete",
      s3_ObjectRemoved_DeleteMarkerCreated: "s3:ObjectRemoved:DeleteMarkerCreated",
      s3_ObjectRestore_: "s3:ObjectRestore:*",
      s3_ObjectRestore_Completed: "s3:ObjectRestore:Completed",
      s3_ObjectRestore_Delete: "s3:ObjectRestore:Delete",
      s3_ObjectRestore_Post: "s3:ObjectRestore:Post",
      s3_ObjectTagging_: "s3:ObjectTagging:*",
      s3_ObjectTagging_Delete: "s3:ObjectTagging:Delete",
      s3_ObjectTagging_Put: "s3:ObjectTagging:Put",
      s3_ReducedRedundancyLostObject: "s3:ReducedRedundancyLostObject",
      s3_Replication_: "s3:Replication:*",
      s3_Replication_OperationFailedReplication: "s3:Replication:OperationFailedReplication",
      s3_Replication_OperationMissedThreshold: "s3:Replication:OperationMissedThreshold",
      s3_Replication_OperationNotTracked: "s3:Replication:OperationNotTracked",
      s3_Replication_OperationReplicatedAfterThreshold: "s3:Replication:OperationReplicatedAfterThreshold"
    };
    var FilterRuleName = {
      prefix: "prefix",
      suffix: "suffix"
    };
    var DeleteMarkerReplicationStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var MetricsStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var ReplicationTimeStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var ExistingObjectReplicationStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var ReplicaModificationsStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var SseKmsEncryptedObjectsStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var ReplicationRuleStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var Payer = {
      BucketOwner: "BucketOwner",
      Requester: "Requester"
    };
    var MFADeleteStatus = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var BucketVersioningStatus = {
      Enabled: "Enabled",
      Suspended: "Suspended"
    };
    var Protocol = {
      http: "http",
      https: "https"
    };
    var ReplicationStatus = {
      COMPLETE: "COMPLETE",
      COMPLETED: "COMPLETED",
      FAILED: "FAILED",
      PENDING: "PENDING",
      REPLICA: "REPLICA"
    };
    var ChecksumMode = {
      ENABLED: "ENABLED"
    };
    var ObjectAttributes = {
      CHECKSUM: "Checksum",
      ETAG: "ETag",
      OBJECT_PARTS: "ObjectParts",
      OBJECT_SIZE: "ObjectSize",
      STORAGE_CLASS: "StorageClass"
    };
    var ObjectLockEnabled = {
      Enabled: "Enabled"
    };
    var ObjectLockRetentionMode = {
      COMPLIANCE: "COMPLIANCE",
      GOVERNANCE: "GOVERNANCE"
    };
    var ArchiveStatus = {
      ARCHIVE_ACCESS: "ARCHIVE_ACCESS",
      DEEP_ARCHIVE_ACCESS: "DEEP_ARCHIVE_ACCESS"
    };
    var EncodingType = {
      url: "url"
    };
    var ObjectStorageClass = {
      DEEP_ARCHIVE: "DEEP_ARCHIVE",
      EXPRESS_ONEZONE: "EXPRESS_ONEZONE",
      FSX_ONTAP: "FSX_ONTAP",
      FSX_OPENZFS: "FSX_OPENZFS",
      GLACIER: "GLACIER",
      GLACIER_IR: "GLACIER_IR",
      INTELLIGENT_TIERING: "INTELLIGENT_TIERING",
      ONEZONE_IA: "ONEZONE_IA",
      OUTPOSTS: "OUTPOSTS",
      REDUCED_REDUNDANCY: "REDUCED_REDUNDANCY",
      SNOW: "SNOW",
      STANDARD: "STANDARD",
      STANDARD_IA: "STANDARD_IA"
    };
    var OptionalObjectAttributes = {
      RESTORE_STATUS: "RestoreStatus"
    };
    var ObjectVersionStorageClass = {
      STANDARD: "STANDARD"
    };
    var MFADelete = {
      Disabled: "Disabled",
      Enabled: "Enabled"
    };
    var Tier = {
      Bulk: "Bulk",
      Expedited: "Expedited",
      Standard: "Standard"
    };
    var ExpressionType = {
      SQL: "SQL"
    };
    var CompressionType = {
      BZIP2: "BZIP2",
      GZIP: "GZIP",
      NONE: "NONE"
    };
    var FileHeaderInfo = {
      IGNORE: "IGNORE",
      NONE: "NONE",
      USE: "USE"
    };
    var JSONType = {
      DOCUMENT: "DOCUMENT",
      LINES: "LINES"
    };
    var QuoteFields = {
      ALWAYS: "ALWAYS",
      ASNEEDED: "ASNEEDED"
    };
    var RestoreRequestType = {
      SELECT: "SELECT"
    };
    exports.$Command = smithyClient.Command;
    exports.__Client = smithyClient.Client;
    exports.S3ServiceException = S3ServiceException.S3ServiceException;
    exports.AbortMultipartUploadCommand = AbortMultipartUploadCommand;
    exports.AnalyticsS3ExportFileFormat = AnalyticsS3ExportFileFormat;
    exports.ArchiveStatus = ArchiveStatus;
    exports.BucketAbacStatus = BucketAbacStatus;
    exports.BucketAccelerateStatus = BucketAccelerateStatus;
    exports.BucketCannedACL = BucketCannedACL;
    exports.BucketLocationConstraint = BucketLocationConstraint;
    exports.BucketLogsPermission = BucketLogsPermission;
    exports.BucketNamespace = BucketNamespace;
    exports.BucketType = BucketType;
    exports.BucketVersioningStatus = BucketVersioningStatus;
    exports.ChecksumAlgorithm = ChecksumAlgorithm;
    exports.ChecksumMode = ChecksumMode;
    exports.ChecksumType = ChecksumType;
    exports.CompleteMultipartUploadCommand = CompleteMultipartUploadCommand;
    exports.CompressionType = CompressionType;
    exports.CopyObjectCommand = CopyObjectCommand;
    exports.CreateBucketCommand = CreateBucketCommand;
    exports.CreateBucketMetadataConfigurationCommand = CreateBucketMetadataConfigurationCommand;
    exports.CreateBucketMetadataTableConfigurationCommand = CreateBucketMetadataTableConfigurationCommand;
    exports.CreateMultipartUploadCommand = CreateMultipartUploadCommand;
    exports.CreateSessionCommand = CreateSessionCommand;
    exports.DataRedundancy = DataRedundancy;
    exports.DeleteBucketAnalyticsConfigurationCommand = DeleteBucketAnalyticsConfigurationCommand;
    exports.DeleteBucketCommand = DeleteBucketCommand;
    exports.DeleteBucketCorsCommand = DeleteBucketCorsCommand;
    exports.DeleteBucketEncryptionCommand = DeleteBucketEncryptionCommand;
    exports.DeleteBucketIntelligentTieringConfigurationCommand = DeleteBucketIntelligentTieringConfigurationCommand;
    exports.DeleteBucketInventoryConfigurationCommand = DeleteBucketInventoryConfigurationCommand;
    exports.DeleteBucketLifecycleCommand = DeleteBucketLifecycleCommand;
    exports.DeleteBucketMetadataConfigurationCommand = DeleteBucketMetadataConfigurationCommand;
    exports.DeleteBucketMetadataTableConfigurationCommand = DeleteBucketMetadataTableConfigurationCommand;
    exports.DeleteBucketMetricsConfigurationCommand = DeleteBucketMetricsConfigurationCommand;
    exports.DeleteBucketOwnershipControlsCommand = DeleteBucketOwnershipControlsCommand;
    exports.DeleteBucketPolicyCommand = DeleteBucketPolicyCommand;
    exports.DeleteBucketReplicationCommand = DeleteBucketReplicationCommand;
    exports.DeleteBucketTaggingCommand = DeleteBucketTaggingCommand;
    exports.DeleteBucketWebsiteCommand = DeleteBucketWebsiteCommand;
    exports.DeleteMarkerReplicationStatus = DeleteMarkerReplicationStatus;
    exports.DeleteObjectCommand = DeleteObjectCommand2;
    exports.DeleteObjectTaggingCommand = DeleteObjectTaggingCommand;
    exports.DeleteObjectsCommand = DeleteObjectsCommand;
    exports.DeletePublicAccessBlockCommand = DeletePublicAccessBlockCommand;
    exports.EncodingType = EncodingType;
    exports.EncryptionType = EncryptionType;
    exports.Event = Event;
    exports.ExistingObjectReplicationStatus = ExistingObjectReplicationStatus;
    exports.ExpirationState = ExpirationState;
    exports.ExpirationStatus = ExpirationStatus;
    exports.ExpressionType = ExpressionType;
    exports.FileHeaderInfo = FileHeaderInfo;
    exports.FilterRuleName = FilterRuleName;
    exports.GetBucketAbacCommand = GetBucketAbacCommand;
    exports.GetBucketAccelerateConfigurationCommand = GetBucketAccelerateConfigurationCommand;
    exports.GetBucketAclCommand = GetBucketAclCommand;
    exports.GetBucketAnalyticsConfigurationCommand = GetBucketAnalyticsConfigurationCommand;
    exports.GetBucketCorsCommand = GetBucketCorsCommand;
    exports.GetBucketEncryptionCommand = GetBucketEncryptionCommand;
    exports.GetBucketIntelligentTieringConfigurationCommand = GetBucketIntelligentTieringConfigurationCommand;
    exports.GetBucketInventoryConfigurationCommand = GetBucketInventoryConfigurationCommand;
    exports.GetBucketLifecycleConfigurationCommand = GetBucketLifecycleConfigurationCommand;
    exports.GetBucketLocationCommand = GetBucketLocationCommand;
    exports.GetBucketLoggingCommand = GetBucketLoggingCommand;
    exports.GetBucketMetadataConfigurationCommand = GetBucketMetadataConfigurationCommand;
    exports.GetBucketMetadataTableConfigurationCommand = GetBucketMetadataTableConfigurationCommand;
    exports.GetBucketMetricsConfigurationCommand = GetBucketMetricsConfigurationCommand;
    exports.GetBucketNotificationConfigurationCommand = GetBucketNotificationConfigurationCommand;
    exports.GetBucketOwnershipControlsCommand = GetBucketOwnershipControlsCommand;
    exports.GetBucketPolicyCommand = GetBucketPolicyCommand;
    exports.GetBucketPolicyStatusCommand = GetBucketPolicyStatusCommand;
    exports.GetBucketReplicationCommand = GetBucketReplicationCommand;
    exports.GetBucketRequestPaymentCommand = GetBucketRequestPaymentCommand;
    exports.GetBucketTaggingCommand = GetBucketTaggingCommand;
    exports.GetBucketVersioningCommand = GetBucketVersioningCommand;
    exports.GetBucketWebsiteCommand = GetBucketWebsiteCommand;
    exports.GetObjectAclCommand = GetObjectAclCommand;
    exports.GetObjectAttributesCommand = GetObjectAttributesCommand;
    exports.GetObjectCommand = GetObjectCommand2;
    exports.GetObjectLegalHoldCommand = GetObjectLegalHoldCommand;
    exports.GetObjectLockConfigurationCommand = GetObjectLockConfigurationCommand;
    exports.GetObjectRetentionCommand = GetObjectRetentionCommand;
    exports.GetObjectTaggingCommand = GetObjectTaggingCommand;
    exports.GetObjectTorrentCommand = GetObjectTorrentCommand;
    exports.GetPublicAccessBlockCommand = GetPublicAccessBlockCommand;
    exports.HeadBucketCommand = HeadBucketCommand;
    exports.HeadObjectCommand = HeadObjectCommand;
    exports.IntelligentTieringAccessTier = IntelligentTieringAccessTier;
    exports.IntelligentTieringStatus = IntelligentTieringStatus;
    exports.InventoryConfigurationState = InventoryConfigurationState;
    exports.InventoryFormat = InventoryFormat;
    exports.InventoryFrequency = InventoryFrequency;
    exports.InventoryIncludedObjectVersions = InventoryIncludedObjectVersions;
    exports.InventoryOptionalField = InventoryOptionalField;
    exports.JSONType = JSONType;
    exports.ListBucketAnalyticsConfigurationsCommand = ListBucketAnalyticsConfigurationsCommand;
    exports.ListBucketIntelligentTieringConfigurationsCommand = ListBucketIntelligentTieringConfigurationsCommand;
    exports.ListBucketInventoryConfigurationsCommand = ListBucketInventoryConfigurationsCommand;
    exports.ListBucketMetricsConfigurationsCommand = ListBucketMetricsConfigurationsCommand;
    exports.ListBucketsCommand = ListBucketsCommand;
    exports.ListDirectoryBucketsCommand = ListDirectoryBucketsCommand;
    exports.ListMultipartUploadsCommand = ListMultipartUploadsCommand;
    exports.ListObjectVersionsCommand = ListObjectVersionsCommand;
    exports.ListObjectsCommand = ListObjectsCommand;
    exports.ListObjectsV2Command = ListObjectsV2Command;
    exports.ListPartsCommand = ListPartsCommand;
    exports.LocationType = LocationType;
    exports.MFADelete = MFADelete;
    exports.MFADeleteStatus = MFADeleteStatus;
    exports.MetadataDirective = MetadataDirective;
    exports.MetricsStatus = MetricsStatus;
    exports.ObjectAttributes = ObjectAttributes;
    exports.ObjectCannedACL = ObjectCannedACL;
    exports.ObjectLockEnabled = ObjectLockEnabled;
    exports.ObjectLockLegalHoldStatus = ObjectLockLegalHoldStatus;
    exports.ObjectLockMode = ObjectLockMode;
    exports.ObjectLockRetentionMode = ObjectLockRetentionMode;
    exports.ObjectOwnership = ObjectOwnership;
    exports.ObjectStorageClass = ObjectStorageClass;
    exports.ObjectVersionStorageClass = ObjectVersionStorageClass;
    exports.OptionalObjectAttributes = OptionalObjectAttributes;
    exports.OwnerOverride = OwnerOverride;
    exports.PartitionDateSource = PartitionDateSource;
    exports.Payer = Payer;
    exports.Permission = Permission;
    exports.Protocol = Protocol;
    exports.PutBucketAbacCommand = PutBucketAbacCommand;
    exports.PutBucketAccelerateConfigurationCommand = PutBucketAccelerateConfigurationCommand;
    exports.PutBucketAclCommand = PutBucketAclCommand;
    exports.PutBucketAnalyticsConfigurationCommand = PutBucketAnalyticsConfigurationCommand;
    exports.PutBucketCorsCommand = PutBucketCorsCommand;
    exports.PutBucketEncryptionCommand = PutBucketEncryptionCommand;
    exports.PutBucketIntelligentTieringConfigurationCommand = PutBucketIntelligentTieringConfigurationCommand;
    exports.PutBucketInventoryConfigurationCommand = PutBucketInventoryConfigurationCommand;
    exports.PutBucketLifecycleConfigurationCommand = PutBucketLifecycleConfigurationCommand;
    exports.PutBucketLoggingCommand = PutBucketLoggingCommand;
    exports.PutBucketMetricsConfigurationCommand = PutBucketMetricsConfigurationCommand;
    exports.PutBucketNotificationConfigurationCommand = PutBucketNotificationConfigurationCommand;
    exports.PutBucketOwnershipControlsCommand = PutBucketOwnershipControlsCommand;
    exports.PutBucketPolicyCommand = PutBucketPolicyCommand;
    exports.PutBucketReplicationCommand = PutBucketReplicationCommand;
    exports.PutBucketRequestPaymentCommand = PutBucketRequestPaymentCommand;
    exports.PutBucketTaggingCommand = PutBucketTaggingCommand;
    exports.PutBucketVersioningCommand = PutBucketVersioningCommand;
    exports.PutBucketWebsiteCommand = PutBucketWebsiteCommand;
    exports.PutObjectAclCommand = PutObjectAclCommand;
    exports.PutObjectCommand = PutObjectCommand2;
    exports.PutObjectLegalHoldCommand = PutObjectLegalHoldCommand;
    exports.PutObjectLockConfigurationCommand = PutObjectLockConfigurationCommand;
    exports.PutObjectRetentionCommand = PutObjectRetentionCommand;
    exports.PutObjectTaggingCommand = PutObjectTaggingCommand;
    exports.PutPublicAccessBlockCommand = PutPublicAccessBlockCommand;
    exports.QuoteFields = QuoteFields;
    exports.RenameObjectCommand = RenameObjectCommand;
    exports.ReplicaModificationsStatus = ReplicaModificationsStatus;
    exports.ReplicationRuleStatus = ReplicationRuleStatus;
    exports.ReplicationStatus = ReplicationStatus;
    exports.ReplicationTimeStatus = ReplicationTimeStatus;
    exports.RequestCharged = RequestCharged;
    exports.RequestPayer = RequestPayer;
    exports.RestoreObjectCommand = RestoreObjectCommand;
    exports.RestoreRequestType = RestoreRequestType;
    exports.S3 = S3;
    exports.S3Client = S3Client2;
    exports.S3TablesBucketType = S3TablesBucketType;
    exports.SelectObjectContentCommand = SelectObjectContentCommand;
    exports.ServerSideEncryption = ServerSideEncryption;
    exports.SessionMode = SessionMode;
    exports.SseKmsEncryptedObjectsStatus = SseKmsEncryptedObjectsStatus;
    exports.StorageClass = StorageClass;
    exports.StorageClassAnalysisSchemaVersion = StorageClassAnalysisSchemaVersion;
    exports.TableSseAlgorithm = TableSseAlgorithm;
    exports.TaggingDirective = TaggingDirective;
    exports.Tier = Tier;
    exports.TransitionDefaultMinimumObjectSize = TransitionDefaultMinimumObjectSize;
    exports.TransitionStorageClass = TransitionStorageClass;
    exports.Type = Type;
    exports.UpdateBucketMetadataInventoryTableConfigurationCommand = UpdateBucketMetadataInventoryTableConfigurationCommand;
    exports.UpdateBucketMetadataJournalTableConfigurationCommand = UpdateBucketMetadataJournalTableConfigurationCommand;
    exports.UpdateObjectEncryptionCommand = UpdateObjectEncryptionCommand;
    exports.UploadPartCommand = UploadPartCommand;
    exports.UploadPartCopyCommand = UploadPartCopyCommand;
    exports.WriteGetObjectResponseCommand = WriteGetObjectResponseCommand;
    exports.paginateListBuckets = paginateListBuckets;
    exports.paginateListDirectoryBuckets = paginateListDirectoryBuckets;
    exports.paginateListObjectsV2 = paginateListObjectsV2;
    exports.paginateListParts = paginateListParts;
    exports.waitForBucketExists = waitForBucketExists;
    exports.waitForBucketNotExists = waitForBucketNotExists;
    exports.waitForObjectExists = waitForObjectExists;
    exports.waitForObjectNotExists = waitForObjectNotExists;
    exports.waitUntilBucketExists = waitUntilBucketExists;
    exports.waitUntilBucketNotExists = waitUntilBucketNotExists;
    exports.waitUntilObjectExists = waitUntilObjectExists;
    exports.waitUntilObjectNotExists = waitUntilObjectNotExists;
    Object.prototype.hasOwnProperty.call(schemas_0, "__proto__") && !Object.prototype.hasOwnProperty.call(exports, "__proto__") && Object.defineProperty(exports, "__proto__", {
      enumerable: true,
      value: schemas_0["__proto__"]
    });
    Object.keys(schemas_0).forEach(function(k) {
      if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = schemas_0[k];
    });
    Object.prototype.hasOwnProperty.call(errors, "__proto__") && !Object.prototype.hasOwnProperty.call(exports, "__proto__") && Object.defineProperty(exports, "__proto__", {
      enumerable: true,
      value: errors["__proto__"]
    });
    Object.keys(errors).forEach(function(k) {
      if (k !== "default" && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = errors[k];
    });
  }
});

// node_modules/@aws-sdk/util-format-url/dist-cjs/index.js
var require_dist_cjs53 = __commonJS({
  "node_modules/@aws-sdk/util-format-url/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var querystringBuilder = require_dist_cjs6();
    function formatUrl(request) {
      const { port, query } = request;
      let { protocol, path, hostname } = request;
      if (protocol && protocol.slice(-1) !== ":") {
        protocol += ":";
      }
      if (port) {
        hostname += `:${port}`;
      }
      if (path && path.charAt(0) !== "/") {
        path = `/${path}`;
      }
      let queryString = query ? querystringBuilder.buildQueryString(query) : "";
      if (queryString && queryString[0] !== "?") {
        queryString = `?${queryString}`;
      }
      let auth = "";
      if (request.username != null || request.password != null) {
        const username = request.username ?? "";
        const password = request.password ?? "";
        auth = `${username}:${password}@`;
      }
      let fragment = "";
      if (request.fragment) {
        fragment = `#${request.fragment}`;
      }
      return `${protocol}//${auth}${hostname}${path}${queryString}${fragment}`;
    }
    __name(formatUrl, "formatUrl");
    exports.formatUrl = formatUrl;
  }
});

// node_modules/@aws-sdk/s3-request-presigner/dist-cjs/index.js
var require_dist_cjs54 = __commonJS({
  "node_modules/@aws-sdk/s3-request-presigner/dist-cjs/index.js"(exports) {
    "use strict";
    init_esm();
    var utilFormatUrl = require_dist_cjs53();
    var middlewareEndpoint = require_dist_cjs27();
    var protocolHttp = require_dist_cjs();
    var signatureV4MultiRegion = require_dist_cjs29();
    var UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
    var SHA256_HEADER = "X-Amz-Content-Sha256";
    var S3RequestPresigner = class {
      static {
        __name(this, "S3RequestPresigner");
      }
      signer;
      constructor(options) {
        const resolvedOptions = {
          service: options.signingName || options.service || "s3",
          uriEscapePath: options.uriEscapePath || false,
          applyChecksum: options.applyChecksum || false,
          ...options
        };
        this.signer = new signatureV4MultiRegion.SignatureV4MultiRegion(resolvedOptions);
      }
      presign(requestToSign, { unsignableHeaders = /* @__PURE__ */ new Set(), hoistableHeaders = /* @__PURE__ */ new Set(), unhoistableHeaders = /* @__PURE__ */ new Set(), ...options } = {}) {
        this.prepareRequest(requestToSign, {
          unsignableHeaders,
          unhoistableHeaders,
          hoistableHeaders
        });
        return this.signer.presign(requestToSign, {
          expiresIn: 900,
          unsignableHeaders,
          unhoistableHeaders,
          ...options
        });
      }
      presignWithCredentials(requestToSign, credentials, { unsignableHeaders = /* @__PURE__ */ new Set(), hoistableHeaders = /* @__PURE__ */ new Set(), unhoistableHeaders = /* @__PURE__ */ new Set(), ...options } = {}) {
        this.prepareRequest(requestToSign, {
          unsignableHeaders,
          unhoistableHeaders,
          hoistableHeaders
        });
        return this.signer.presignWithCredentials(requestToSign, credentials, {
          expiresIn: 900,
          unsignableHeaders,
          unhoistableHeaders,
          ...options
        });
      }
      prepareRequest(requestToSign, { unsignableHeaders = /* @__PURE__ */ new Set(), unhoistableHeaders = /* @__PURE__ */ new Set(), hoistableHeaders = /* @__PURE__ */ new Set() } = {}) {
        unsignableHeaders.add("content-type");
        Object.keys(requestToSign.headers).map((header) => header.toLowerCase()).filter((header) => header.startsWith("x-amz-server-side-encryption")).forEach((header) => {
          if (!hoistableHeaders.has(header)) {
            unhoistableHeaders.add(header);
          }
        });
        requestToSign.headers[SHA256_HEADER] = UNSIGNED_PAYLOAD;
        const currentHostHeader = requestToSign.headers.host;
        const port = requestToSign.port;
        const expectedHostHeader = `${requestToSign.hostname}${requestToSign.port != null ? ":" + port : ""}`;
        if (!currentHostHeader || currentHostHeader === requestToSign.hostname && requestToSign.port != null) {
          requestToSign.headers.host = expectedHostHeader;
        }
      }
    };
    var getSignedUrl2 = /* @__PURE__ */ __name(async (client, command, options = {}) => {
      let s3Presigner;
      let region;
      if (typeof client.config.endpointProvider === "function") {
        const endpointV2 = await middlewareEndpoint.getEndpointFromInstructions(command.input, command.constructor, client.config);
        const authScheme = endpointV2.properties?.authSchemes?.[0];
        if (authScheme?.name === "sigv4a") {
          region = authScheme?.signingRegionSet?.join(",");
        } else {
          region = authScheme?.signingRegion;
        }
        s3Presigner = new S3RequestPresigner({
          ...client.config,
          signingName: authScheme?.signingName,
          region: /* @__PURE__ */ __name(async () => region, "region")
        });
      } else {
        s3Presigner = new S3RequestPresigner(client.config);
      }
      const presignInterceptMiddleware = /* @__PURE__ */ __name((next, context) => async (args) => {
        const { request } = args;
        if (!protocolHttp.HttpRequest.isInstance(request)) {
          throw new Error("Request to be presigned is not an valid HTTP request.");
        }
        delete request.headers["amz-sdk-invocation-id"];
        delete request.headers["amz-sdk-request"];
        delete request.headers["x-amz-user-agent"];
        let presigned2;
        const presignerOptions = {
          ...options,
          signingRegion: options.signingRegion ?? context["signing_region"] ?? region,
          signingService: options.signingService ?? context["signing_service"]
        };
        if (context.s3ExpressIdentity) {
          presigned2 = await s3Presigner.presignWithCredentials(request, context.s3ExpressIdentity, presignerOptions);
        } else {
          presigned2 = await s3Presigner.presign(request, presignerOptions);
        }
        return {
          response: {},
          output: {
            $metadata: { httpStatusCode: 200 },
            presigned: presigned2
          }
        };
      }, "presignInterceptMiddleware");
      const middlewareName = "presignInterceptMiddleware";
      const clientStack = client.middlewareStack.clone();
      clientStack.addRelativeTo(presignInterceptMiddleware, {
        name: middlewareName,
        relation: "before",
        toMiddleware: "awsAuthMiddleware",
        override: true
      });
      const handler = command.resolveMiddleware(clientStack, client.config, {});
      const { output } = await handler({ input: command.input });
      const { presigned } = output;
      return utilFormatUrl.formatUrl(presigned);
    }, "getSignedUrl");
    exports.S3RequestPresigner = S3RequestPresigner;
    exports.getSignedUrl = getSignedUrl2;
  }
});

// src/lib/r2.ts
init_esm();
var import_client_s3 = __toESM(require_dist_cjs52());
var import_s3_request_presigner = __toESM(require_dist_cjs54());
var accountId = process.env.R2_ACCOUNT_ID;
var bucket = process.env.R2_BUCKET;
var r2 = new import_client_s3.S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
async function presignGet(key, expiresIn = 3600) {
  return (0, import_s3_request_presigner.getSignedUrl)(r2, new import_client_s3.GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}
__name(presignGet, "presignGet");
async function putObject(key, body, contentType) {
  await r2.send(new import_client_s3.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  }));
}
__name(putObject, "putObject");
async function deleteObject(key) {
  await r2.send(new import_client_s3.DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
__name(deleteObject, "deleteObject");

export {
  presignGet,
  putObject,
  deleteObject
};
//# sourceMappingURL=chunk-2G47M4IK.mjs.map
