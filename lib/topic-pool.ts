import type { DetectedTopic } from "@/lib/transcript-contract";

export type TopicRunState =
  | "queued"
  | "running"
  | "complete"
  | "retryable-error"
  | "fatal-error";

export type SettledTopic<T> =
  | { topic: DetectedTopic; state: "complete"; value: T }
  | { topic: DetectedTopic; state: "retryable-error" | "fatal-error"; error: unknown };

type TopicWorker<T> = (topic: DetectedTopic) => Promise<T>;
const inFlightByWorker = new WeakMap<TopicWorker<unknown>, Map<string, Promise<SettledTopic<unknown>>>>();

function isRetryable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { name?: unknown; code?: unknown; retryable?: unknown };
  return candidate.retryable === true
    || candidate.name === "AbortError"
    || candidate.name === "TimeoutError"
    || candidate.code === "ETIMEDOUT"
    || candidate.code === "PROVIDER_TIMEOUT"
    || candidate.code === "PROVIDER_BUSY"
    || candidate.code === "RATE_LIMITED";
}

function runOnce<T>(topic: DetectedTopic, worker: TopicWorker<T>): Promise<SettledTopic<T>> {
  const key = worker as TopicWorker<unknown>;
  let inFlight = inFlightByWorker.get(key);
  if (!inFlight) {
    inFlight = new Map();
    inFlightByWorker.set(key, inFlight);
  }
  const existing = inFlight.get(topic.id);
  if (existing) return existing as Promise<SettledTopic<T>>;

  const promise = Promise.resolve()
    .then(() => worker(topic))
    .then<SettledTopic<T>>((value) => ({ topic, state: "complete", value }))
    .catch((error: unknown): SettledTopic<T> => ({
      topic,
      state: isRetryable(error) ? "retryable-error" : "fatal-error",
      error,
    }))
    .finally(() => {
      if (inFlight?.get(topic.id) === promise) inFlight.delete(topic.id);
    });
  inFlight.set(topic.id, promise as Promise<SettledTopic<unknown>>);
  return promise;
}

export async function runTopicPool<T>(
  items: DetectedTopic[],
  worker: TopicWorker<T>,
  concurrency: number = 2,
): Promise<SettledTopic<T>[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }
  const results = new Array<SettledTopic<T>>(items.length);
  let nextIndex = 0;

  async function consume(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await runOnce(items[index], worker);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => consume()));
  return results;
}
