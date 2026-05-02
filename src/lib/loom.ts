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
