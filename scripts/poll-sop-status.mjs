import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const SOP_ID = process.env.SOP_ID;
const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
const db = c.db();

const start = Date.now();
const TIMEOUT_MS = 9 * 60 * 1000;

while (Date.now() - start < TIMEOUT_MS) {
  const sop = await db.collection("sops").findOne(
    { _id: new ObjectId(SOP_ID) },
    { projection: { status: 1, errorCode: 1 } },
  );
  if (!sop) { console.log("NOT FOUND"); break; }
  console.log(`[${Math.round((Date.now()-start)/1000)}s] status=${sop.status} errorCode=${sop.errorCode}`);
  if (sop.status === "ready" || sop.status === "failed") break;
  await new Promise(r => setTimeout(r, 15000));
}

await c.close();
