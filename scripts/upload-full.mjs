// Uploads a local video straight to R2 + Mongo and leaves the SOP ready for the
// process-sop-screenshots trigger task. Bypasses the Next API (which belongs to
// a separate project). Run: node --env-file=.env scripts/upload-full.mjs <path> <lang>
import fs from "node:fs";
import path from "node:path";
import { MongoClient, ObjectId } from "mongodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const SAMPLE = process.argv[2] ?? "samples/hubspot_crm.mp4";
const LANG = process.argv[3] ?? "vi";

const filePath = path.resolve(SAMPLE);
const buf = fs.readFileSync(filePath);
const _id = new ObjectId();
const key = `sops/${_id.toHexString()}/source.mp4`;
const now = new Date();

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

console.log(`Uploading ${SAMPLE} (${buf.length} bytes) → R2 ${key}`);
await r2.send(new PutObjectCommand({
  Bucket: process.env.R2_BUCKET, Key: key, Body: buf, ContentType: "video/mp4",
}));
console.log("R2 upload done");

const shareToken = Array.from({ length: 16 }, () =>
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)],
).join("");

const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
await c.db().collection("sops").insertOne({
  _id,
  title: "", category: "",
  status: "transcribing",
  mode: "screenshots",
  defaultLanguage: LANG,
  errorCode: null,
  videoR2Key: key,
  videoExpiresAt: new Date(now.getTime() + 30 * 86400_000),
  transcript: null, language: null,
  segments: [], segmentsClean: null, domainSummary: null,
  steps: [],
  shareToken,
  createdAt: now, updatedAt: now,
});
await c.close();

console.log("sopId =", _id.toHexString());
