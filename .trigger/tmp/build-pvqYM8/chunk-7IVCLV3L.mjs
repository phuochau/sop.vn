import {
  presignGet,
  putObject
} from "./chunk-2G47M4IK.mjs";
import {
  require_fluent_ffmpeg
} from "./chunk-DHWRD2SK.mjs";
import {
  config
} from "./chunk-REM3KCND.mjs";
import {
  logger
} from "./chunk-5C4WVIZW.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/trigger/stages/clip.ts
init_esm();
var import_fluent_ffmpeg = __toESM(require_fluent_ffmpeg());
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// src/lib/utils.ts
init_esm();

// node_modules/clsx/dist/clsx.mjs
init_esm();

// node_modules/nanoid/index.js
init_esm();
import { webcrypto as crypto } from "node:crypto";
var POOL_SIZE_MULTIPLIER = 128;
var pool;
var poolOffset;
function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    crypto.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    crypto.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}
__name(fillPool, "fillPool");
function random(bytes) {
  fillPool(bytes |= 0);
  return pool.subarray(poolOffset - bytes, poolOffset);
}
__name(random, "random");
function customRandom(alphabet2, defaultSize, getRandom) {
  let safeByteCutoff = 256 - 256 % alphabet2.length;
  if (safeByteCutoff === 256) {
    let mask = alphabet2.length - 1;
    return (size = defaultSize) => {
      if (!size) return "";
      let id = "";
      while (true) {
        let bytes = getRandom(size);
        let i = size;
        while (i--) {
          id += alphabet2[bytes[i] & mask];
          if (id.length >= size) return id;
        }
      }
    };
  }
  let step = Math.ceil(1.6 * 256 * defaultSize / safeByteCutoff);
  return (size = defaultSize) => {
    if (!size) return "";
    let id = "";
    while (true) {
      let bytes = getRandom(step);
      let i = step;
      while (i--) {
        if (bytes[i] < safeByteCutoff) {
          id += alphabet2[bytes[i] % alphabet2.length];
          if (id.length >= size) return id;
        }
      }
    }
  };
}
__name(customRandom, "customRandom");
function customAlphabet(alphabet2, size = 21) {
  return customRandom(alphabet2, size, random);
}
__name(customAlphabet, "customAlphabet");

// src/lib/utils.ts
var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
var newShareToken = customAlphabet(alphabet, config.app.shareTokenLength);
function clipKey(sopId, i) {
  return `sops/${sopId}/step-${i}.mp4`;
}
__name(clipKey, "clipKey");
function posterKey(sopId, i) {
  return `sops/${sopId}/step-${i}.jpg`;
}
__name(posterKey, "posterKey");

// src/trigger/stages/clip.ts
function resolveTimes(rawSegments, extractedSteps, videoDurationSec) {
  const byId = new Map(rawSegments.map((s) => [s.id, s]));
  const resolved = [];
  let prevEnd = 0;
  for (const s of extractedSteps) {
    const a = byId.get(s.startSegmentId);
    const b = byId.get(s.endSegmentId);
    if (!a || !b) continue;
    let start = Math.max(0, Math.min(a.start, videoDurationSec));
    let end = Math.max(0, Math.min(b.end, videoDurationSec));
    if (end <= start) continue;
    if (start < prevEnd) start = prevEnd;
    if (end <= start) continue;
    prevEnd = end;
    resolved.push({ title: s.title, description: s.description, startTime: start, endTime: end });
  }
  return resolved;
}
__name(resolveTimes, "resolveTimes");
async function downloadTo(tmpPath, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(tmpPath, buf);
}
__name(downloadTo, "downloadTo");
function ffprobeDuration(file) {
  return new Promise((resolve, reject) => {
    import_fluent_ffmpeg.default.ffprobe(file, (err, data) => {
      if (err) return reject(err);
      resolve(Number(data.format.duration ?? 0));
    });
  });
}
__name(ffprobeDuration, "ffprobeDuration");
function cutClip(input, out, start, end) {
  return new Promise((resolve, reject) => {
    (0, import_fluent_ffmpeg.default)(input).setStartTime(start).duration(end - start).outputOptions(["-c copy", "-movflags +faststart"]).on("end", () => resolve()).on("error", reject).save(out);
  });
}
__name(cutClip, "cutClip");
function grabFrame(input, out, atSec) {
  return new Promise((resolve, reject) => {
    (0, import_fluent_ffmpeg.default)(input).screenshots({ timestamps: [atSec], filename: path.basename(out), folder: path.dirname(out), size: "640x?" }).on("end", () => resolve()).on("error", reject);
  });
}
__name(grabFrame, "grabFrame");
async function runClip(args) {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-"));
  const srcUrl = await presignGet(args.videoR2Key, 3600);
  const srcPath = path.join(tmp, "src.mp4");
  await downloadTo(srcPath, srcUrl);
  const duration = await ffprobeDuration(srcPath);
  const resolved = resolveTimes(args.rawSegments, args.extractedSteps, duration);
  const steps = [];
  for (let i = 0; i < resolved.length; i++) {
    const r = resolved[i];
    const clipPath = path.join(tmp, `step-${i}.mp4`);
    const posterPath = path.join(tmp, `step-${i}.jpg`);
    try {
      await cutClip(srcPath, clipPath, r.startTime, r.endTime);
      await grabFrame(srcPath, posterPath, r.startTime + (r.endTime - r.startTime) / 2);
    } catch (e) {
      logger.warn("ffmpeg failed for step, skipping", { i, e: String(e) });
      continue;
    }
    const clipBuf = await fs.promises.readFile(clipPath);
    const posterBuf = await fs.promises.readFile(posterPath);
    const ck = clipKey(args.sopId, i);
    const pk = posterKey(args.sopId, i);
    await putObject(ck, clipBuf, "video/mp4");
    await putObject(pk, posterBuf, "image/jpeg");
    steps.push({
      title: r.title,
      description: r.description,
      startTime: r.startTime,
      endTime: r.endTime,
      clipR2Key: ck,
      posterR2Key: pk
    });
  }
  await fs.promises.rm(tmp, { recursive: true, force: true });
  if (steps.length === 0) throw new Error("no clips produced");
  return steps;
}
__name(runClip, "runClip");

export {
  resolveTimes,
  runClip
};
//# sourceMappingURL=chunk-7IVCLV3L.mjs.map
