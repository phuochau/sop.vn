import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import * as readline from "node:readline/promises";
import { r2, R2_BUCKET } from "../src/lib/r2";

if (
  !process.env.R2_ACCOUNT_ID ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY ||
  !process.env.R2_BUCKET
) {
  console.error(
    "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.",
  );
  process.exit(1);
}

const prefix = process.argv[2];
if (!prefix) {
  console.error("Usage: npm run delete:r2-folder -- <path/>");
  console.error("Example: npm run delete:r2-folder -- uploads/abc123/");
  process.exit(1);
}

const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;

async function listAllKeys(pathPrefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: pathPrefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

async function confirm(rl: readline.Interface, message: string): Promise<boolean> {
  const answer = await rl.question(`${message} (yes/no): `);
  return answer.trim().toLowerCase() === "yes";
}

async function main() {
  const allKeys = await listAllKeys(normalizedPrefix);

  if (allKeys.length === 0) {
    console.log(`No files found under "${normalizedPrefix}". Nothing to delete.`);
    return;
  }

  console.log(`\nBucket: ${R2_BUCKET}`);
  console.log(`Path: ${normalizedPrefix}`);
  console.log(`Total files found: ${allKeys.length}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const firstConfirm = await confirm(
    rl,
    `Are you sure you want to delete ${allKeys.length} files under "${normalizedPrefix}"?`,
  );
  if (!firstConfirm) {
    console.log("Aborted.");
    rl.close();
    return;
  }

  const secondConfirm = await confirm(
    rl,
    `This action is IRREVERSIBLE. Type "yes" again to confirm deletion of ${allKeys.length} files`,
  );
  rl.close();
  if (!secondConfirm) {
    console.log("Aborted.");
    return;
  }

  const BATCH_SIZE = 1000;
  let totalDeleted = 0;

  for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
    const batch = allKeys.slice(i, i + BATCH_SIZE);
    const response = await r2.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if (response.Errors && response.Errors.length > 0) {
      for (const err of response.Errors) {
        console.error(`  Failed: ${err.Key} — ${err.Code}: ${err.Message}`);
      }
    }
    const deletedCount = batch.length - (response.Errors?.length ?? 0);
    totalDeleted += deletedCount;
    console.log(`Deleted ${deletedCount} files (total: ${totalDeleted})`);
  }

  console.log(`\nDone. Deleted ${totalDeleted} files from "${normalizedPrefix}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
