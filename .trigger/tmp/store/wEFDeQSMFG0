import {
  require_fluent_ffmpeg
} from "./chunk-DHWRD2SK.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/trigger/lib/probe.ts
init_esm();
var import_fluent_ffmpeg = __toESM(require_fluent_ffmpeg());
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
async function probeDuration(signedUrl) {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "probe-"));
  const file = path.join(tmp, "src.mp4");
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(file, buf);
    return await new Promise((resolve, reject) => {
      import_fluent_ffmpeg.default.ffprobe(file, (err, data) => {
        if (err) return reject(err);
        resolve(Number(data.format.duration ?? 0));
      });
    });
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}
__name(probeDuration, "probeDuration");

export {
  probeDuration
};
//# sourceMappingURL=chunk-RKMXS35V.mjs.map
