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
export type TopicPoolConcurrency = 1 | 2;

export type TopicPoolController<T> = {
  run(items: DetectedTopic[]): Promise<SettledTopic<T>[]>;
  retry(topic: DetectedTopic): Promise<SettledTopic<T>>;
};

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

function normalizeConcurrency(value: number): TopicPoolConcurrency {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }
  return value === 1 ? 1 : 2;
}

function runOnce<T>(
  topic: DetectedTopic,
  worker: TopicWorker<T>,
  inFlight: Map<string, Promise<SettledTopic<T>>>,
): Promise<SettledTopic<T>> {
  const existing = inFlight.get(topic.id);
  if (existing) return existing;

  const promise = Promise.resolve()
    .then(() => worker(topic))
    .then<SettledTopic<T>>((value) => ({ topic, state: "complete", value }))
    .catch((error: unknown): SettledTopic<T> => ({
      topic,
      state: isRetryable(error) ? "retryable-error" : "fatal-error",
      error,
    }))
    .finally(() => {
      if (inFlight.get(topic.id) === promise) inFlight.delete(topic.id);
    });
  inFlight.set(topic.id, promise);
  return promise;
}

export function createTopicPool<T>(
  worker: TopicWorker<T>,
  options: { concurrency?: TopicPoolConcurrency } = {},
): TopicPoolController<T> {
  const concurrency = normalizeConcurrency(options.concurrency ?? 2);
  const inFlight = new Map<string, Promise<SettledTopic<T>>>();

  async function run(items: DetectedTopic[]): Promise<SettledTopic<T>[]> {
    const results = new Array<SettledTopic<T>>(items.length);
    let nextIndex = 0;
    async function consume(): Promise<void> {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await runOnce(items[index], worker, inFlight);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => consume()));
    return results;
  }

  return {
    run,
    retry: (topic) => runOnce(topic, worker, inFlight),
  };
}

export async function runTopicPool<T>(
  items: DetectedTopic[],
  worker: TopicWorker<T>,
  concurrency: TopicPoolConcurrency = 2,
): Promise<SettledTopic<T>[]> {
  return createTopicPool(worker, {
    concurrency: normalizeConcurrency(concurrency),
  }).run(items);
}
