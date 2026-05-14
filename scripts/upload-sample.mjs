import fs from "node:fs";
import path from "node:path";

const SAMPLE = process.argv[2] ?? "samples/trimmed-hubspot_crm.mp4";
const LANG = process.argv[3] ?? "en";
const MODE = "screenshots";
const BASE = process.env.APP_URL ?? "http://localhost:3000";

const filePath = path.resolve(SAMPLE);
const stat = fs.statSync(filePath);
const filename = path.basename(filePath);

console.log(`Uploading ${filename} (${stat.size} bytes) → ${BASE} mode=${MODE} lang=${LANG}`);

// 1. init
const initRes = await fetch(`${BASE}/api/upload/init`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filename, sizeBytes: stat.size, mimeType: "video/mp4" }),
});
if (!initRes.ok) { console.error("init failed:", initRes.status, await initRes.text()); process.exit(1); }
const { sopId, uploadUrl } = await initRes.json();
console.log("sopId =", sopId);

// 2. PUT to R2 presigned URL
const buf = fs.readFileSync(filePath);
const putRes = await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "video/mp4" },
  body: buf,
});
if (!putRes.ok) { console.error("PUT failed:", putRes.status, await putRes.text()); process.exit(1); }
console.log("video uploaded to R2");

// 3. commit
const commitRes = await fetch(`${BASE}/api/upload/commit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sopId, defaultLanguage: LANG, mode: MODE }),
});
if (!commitRes.ok) { console.error("commit failed:", commitRes.status, await commitRes.text()); process.exit(1); }
console.log("committed; trigger task fired");
console.log(`\nView: ${BASE}/sop/${sopId}`);
console.log(`Inspect: SOP_ID=${sopId} node --experimental-vm-modules ./scripts/inspect-sop.mjs`);
