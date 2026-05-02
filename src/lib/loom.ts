const ID_RE = /^[a-f0-9]{16,64}$/;
const ALLOWED_PATHS = new Set(["share", "embed", "recording"]);

export function parseLoomUrl(input: string): { videoId: string } | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "loom.com" && host !== "www.loom.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [section, id] = parts;
  if (!ALLOWED_PATHS.has(section)) return null;
  const lower = id.toLowerCase();
  if (!ID_RE.test(lower)) return null;
  return { videoId: lower };
}

export const LOOM_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type ResolveError =
  | "invalid_url"
  | "not_found"
  | "private_or_restricted"
  | "transcode_unavailable"
  | "http_error"
  | "timeout";

export type ResolveResult =
  | { ok: true; mp4Url: string }
  | { ok: false; error: ResolveError; httpStatus?: number };

export async function resolveLoomMp4(videoId: string): Promise<ResolveResult> {
  const endpoint = `https://www.loom.com/api/campaigns/sessions/${videoId}/transcoded-url`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": LOOM_USER_AGENT,
        "Origin": "https://www.loom.com",
        "Referer": `https://www.loom.com/share/${videoId}`,
      },
      body: "",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "http_error" };
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, error: "private_or_restricted", httpStatus: res.status };
  }
  if (res.status === 404) {
    return { ok: false, error: "not_found", httpStatus: res.status };
  }
  if (res.status >= 400) {
    return { ok: false, error: "http_error", httpStatus: res.status };
  }

  const text = await res.text();
  if (!text.trim()) return { ok: false, error: "transcode_unavailable" };
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: "transcode_unavailable" }; }
  const url = (parsed as { url?: unknown })?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    return { ok: false, error: "transcode_unavailable" };
  }
  return { ok: true, mp4Url: url };
}

export type ResolveHlsResult =
  | { ok: true; hlsUrl: string }
  | { ok: false; error: ResolveError; httpStatus?: number };

export async function resolveLoomHls(videoId: string): Promise<ResolveHlsResult> {
  const endpoint = `https://www.loom.com/api/campaigns/sessions/${videoId}/raw-url`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": LOOM_USER_AGENT,
        "Origin": "https://www.loom.com",
        "Referer": `https://www.loom.com/share/${videoId}`,
      },
      body: "",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    if (name === "AbortError" || name === "TimeoutError") return { ok: false, error: "timeout" };
    return { ok: false, error: "http_error" };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, error: "private_or_restricted", httpStatus: res.status };
  if (res.status === 404) return { ok: false, error: "not_found", httpStatus: res.status };
  if (res.status >= 400) return { ok: false, error: "http_error", httpStatus: res.status };

  const text = await res.text();
  if (!text.trim()) return { ok: false, error: "transcode_unavailable" };
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: "transcode_unavailable" }; }
  const url = (parsed as { url?: unknown })?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) return { ok: false, error: "transcode_unavailable" };
  return { ok: true, hlsUrl: url };
}

import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { r2, R2_BUCKET, deleteObject } from "@/lib/r2";
import { config } from "@/config";

export type StreamError = "size_exceeded" | "stalled" | "stream_error";

export type StreamResult =
  | { ok: true; bytes: number }
  | { ok: false; error: StreamError };

const STALL_MS = 60_000;

export async function streamLoomToR2(args: {
  mp4Url: string;
  r2Key: string;
}): Promise<StreamResult> {
  const cap = config.limits.maxVideoSizeMB * 1024 * 1024;

  let res: Response;
  try {
    res = await fetch(args.mp4Url, { signal: AbortSignal.timeout(30_000) });
  } catch {
    return { ok: false, error: "stream_error" };
  }
  if (!res.ok || !res.body) return { ok: false, error: "stream_error" };

  const cl = res.headers.get("content-length");
  if (cl && Number(cl) > cap) return { ok: false, error: "size_exceeded" };

  let bytes = 0;
  let lastChunkAt = Date.now();
  let stallTimer: NodeJS.Timeout | null = null;
  let outcome: StreamError | null = null;

  const monitored = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      stallTimer = setInterval(() => {
        if (Date.now() - lastChunkAt > STALL_MS) {
          outcome = "stalled";
          controller.error(new Error("stall"));
        }
      }, 5_000);
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          bytes += value.byteLength;
          lastChunkAt = Date.now();
          if (bytes > cap) {
            outcome = "size_exceeded";
            controller.error(new Error("cap"));
            return;
          }
          controller.enqueue(value);
        }
        controller.close();
      } catch (e) {
        if (!outcome) outcome = "stream_error";
        controller.error(e);
      } finally {
        if (stallTimer) clearInterval(stallTimer);
      }
    },
  });

  // The DOM ReadableStream we built is structurally compatible with the
  // node:stream/web ReadableStream that Readable.fromWeb expects. The cast
  // bridges the two type domains without a runtime conversion.
  const nodeBody = Readable.fromWeb(monitored as unknown as NodeReadableStream<Uint8Array>);

  try {
    const upload = new Upload({
      client: r2,
      params: {
        Bucket: R2_BUCKET,
        Key: args.r2Key,
        Body: nodeBody,
        ContentType: "video/mp4",
      },
    });
    await upload.done();
  } catch {
    try { await deleteObject(args.r2Key); } catch { /* swallow */ }
    return { ok: false, error: outcome ?? "stream_error" };
  }

  return { ok: true, bytes };
}

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";

/**
 * Resolve relative URLs in an HLS playlist while preserving the parent's
 * signed query string. Loom's HLS uses CloudFront signed URLs where the
 * Policy/Signature/Key-Pair-Id live in the query string and authorize the
 * entire `resource/*` prefix — but ffmpeg's HLS demuxer resolves children
 * relatively and drops the query, leading to 403s. We materialize the
 * playlists locally so ffmpeg only ever opens local files.
 */
function rewriteWithSigning(parentUrl: string, line: string): string {
  if (line.startsWith("http://") || line.startsWith("https://")) return line;
  const [base, query] = parentUrl.split("?");
  const dir = base.slice(0, base.lastIndexOf("/") + 1);
  return `${dir}${line}${query ? "?" + query : ""}`;
}

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return r.text();
}

async function fetchToFile(url: string, dest: string): Promise<number> {
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!r.ok || !r.body) throw new Error(`fetch ${url}: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.promises.writeFile(dest, buf);
  return buf.byteLength;
}

export async function muxLoomHlsToR2(args: {
  hlsUrl: string;
  r2Key: string;
}): Promise<StreamResult> {
  const cap = config.limits.maxVideoSizeMB * 1024 * 1024;
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "loom-hls-"));
  const out = path.join(tmpDir, "video.mp4");
  try {
    // 1. Fetch master playlist
    const masterText = await fetchText(args.hlsUrl);
    const masterLines = masterText.split(/\r?\n/);

    // 2. Find first non-tag line — that's the child media playlist
    const childRel = masterLines.find(l => l && !l.startsWith("#"));
    if (!childRel) return { ok: false, error: "stream_error" };

    const childUrl = rewriteWithSigning(args.hlsUrl, childRel);
    const childText = await fetchText(childUrl);
    const childLines = childText.split(/\r?\n/);

    // 3. Fetch every segment .ts file. Track total size for cap.
    const segDir = path.join(tmpDir, "seg");
    await fs.promises.mkdir(segDir);
    let totalBytes = 0;
    const localSegments: string[] = [];
    for (let i = 0; i < childLines.length; i++) {
      const line = childLines[i];
      if (!line || line.startsWith("#")) continue;
      const segUrl = rewriteWithSigning(childUrl, line);
      const localName = `seg-${localSegments.length}.ts`;
      const localPath = path.join(segDir, localName);
      const sz = await fetchToFile(segUrl, localPath);
      totalBytes += sz;
      if (totalBytes > cap) return { ok: false, error: "size_exceeded" };
      localSegments.push(localName);
    }

    // 4. Write a local rewritten child playlist whose segments are local files
    const localChild = childLines.map(l => {
      if (!l || l.startsWith("#")) return l;
      const local = localSegments.shift();
      return local ?? l;
    }).join("\n");
    const localChildPath = path.join(segDir, "child.m3u8");
    await fs.promises.writeFile(localChildPath, localChild);

    // 5. ffmpeg-mux into a single MP4 using -c copy
    await new Promise<void>((resolve, reject) => {
      ffmpeg(localChildPath)
        .outputOptions([
          "-allowed_extensions", "ALL",
          "-c", "copy",
          "-bsf:a", "aac_adtstoasc",
          "-movflags", "+faststart",
        ])
        .save(out)
        .on("end", () => resolve())
        .on("error", reject);
    });

    const stat = await fs.promises.stat(out);
    if (stat.size > cap) return { ok: false, error: "size_exceeded" };

    const stream = fs.createReadStream(out);
    const upload = new Upload({
      client: r2,
      params: { Bucket: R2_BUCKET, Key: args.r2Key, Body: stream, ContentType: "video/mp4" },
    });
    await upload.done();

    return { ok: true, bytes: stat.size };
  } catch {
    try { await deleteObject(args.r2Key); } catch { /* swallow */ }
    return { ok: false, error: "stream_error" };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
