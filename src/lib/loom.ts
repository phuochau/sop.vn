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
