import { test } from "node:test";
import assert from "node:assert";
import { z } from "zod";
import { llmJson, llmJsonVision } from "./openrouter";

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function llmContent(payload: unknown): unknown {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

test("llmJson passes temperature through to fetch body", async () => {
  const captured: { body: string | null } = { body: null };
  const fakeFetch: typeof fetch = async (_url, init) => {
    captured.body = String(init?.body ?? "");
    return okResponse(llmContent({ x: 1 }));
  };
  await llmJson({
    model: "m",
    system: "s",
    user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n",
    maxRetries: 0,
    temperature: 0.0,
    fetcher: fakeFetch,
  });
  assert.ok(captured.body);
  const parsed = JSON.parse(captured.body!);
  assert.equal(parsed.temperature, 0.0);
});

test("llmJson defaults temperature to 0.2 when not provided", async () => {
  const captured: { body: string | null } = { body: null };
  const fakeFetch: typeof fetch = async (_url, init) => {
    captured.body = String(init?.body ?? "");
    return okResponse(llmContent({ x: 1 }));
  };
  await llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 0,
    fetcher: fakeFetch,
  });
  const parsed = JSON.parse(captured.body!);
  assert.equal(parsed.temperature, 0.2);
});

test("llmJson does NOT retry on 400 status", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    return new Response("bad request", { status: 400 });
  };
  await assert.rejects(() => llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 3,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  }));
  assert.equal(calls, 1, "should not retry on 400");
});

test("llmJson DOES retry on 503 status up to maxRetries+1 times", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    return new Response("unavailable", { status: 503 });
  };
  await assert.rejects(() => llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 2,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  }));
  assert.equal(calls, 3, "should call 3 times for maxRetries=2");
});

test("llmJson retries on 429 status", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    if (calls < 2) return new Response("rate limited", { status: 429 });
    return okResponse(llmContent({ x: 1 }));
  };
  const out = await llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 2,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  });
  assert.equal(out.x, 1);
  assert.equal(calls, 2);
});

test("llmJson retries on network errors (thrown)", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    if (calls < 2) throw new Error("ECONNRESET");
    return okResponse(llmContent({ x: 1 }));
  };
  const out = await llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 2,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  });
  assert.equal(out.x, 1);
});

test("llmJsonVision sleeps between retries with growing upper bound", async () => {
  const timestamps: number[] = [];
  const fakeFetch: typeof fetch = async () => {
    timestamps.push(Date.now());
    return new Response("nope", { status: 503 });
  };
  // base 100ms → attempt 0→1 sleep <=100, attempt 1→2 sleep <=200, attempt 2→3 sleep <=400.
  // Hard upper bound on total elapsed = 700ms.
  await assert.rejects(() => llmJsonVision({
    model: "m", system: "s", userText: "u",
    imagePaths: [],
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 3,
    retryDelayMs: 100,
    fetcher: fakeFetch,
  }));
  assert.equal(timestamps.length, 4);
  const totalElapsed = timestamps[3] - timestamps[0];
  assert.ok(totalElapsed <= 700 + 200, `elapsed ${totalElapsed} should be within budget`);
});

test("llmJson retries on 408 (request timeout)", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    if (calls < 2) return new Response("timeout", { status: 408 });
    return okResponse(llmContent({ x: 1 }));
  };
  const out = await llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 2,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  });
  assert.equal(out.x, 1);
  assert.equal(calls, 2);
});

test("llmJsonVision defaults maxRetries to 3 when not specified", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    return new Response("nope", { status: 503 });
  };
  await assert.rejects(() => llmJsonVision({
    model: "m", system: "s", userText: "u",
    imagePaths: [],
    schema: z.object({ x: z.number() }),
    schemaName: "n",
    retryDelayMs: 1,
    fetcher: fakeFetch,
  }));
  assert.equal(calls, 4, "default maxRetries=3 → 4 total attempts");
});
