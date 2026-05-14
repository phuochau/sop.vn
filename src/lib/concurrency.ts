/**
 * Run `fn` over `items` with at most `limit` calls in flight. Results returned
 * in input order. First rejection propagates; subsequent completions are awaited
 * but their results discarded.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return out;
}
