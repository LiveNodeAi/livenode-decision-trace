import { describe, expect, it, vi } from "vitest";

import type { DetectedTopic } from "@/lib/transcript-contract";
import { createTopicPool, runTopicPool } from "@/lib/topic-pool";

function topic(index: number): DetectedTopic {
  return { id: `topic-${index}` as DetectedTopic["id"], title: `Topic ${index}`, summary: "Summary", ranges: [{ start: 0, end: 1, excerpt: "a" }] };
}

describe("runTopicPool", () => {
  it("runs no more than two workers and preserves input order", async () => {
    let active = 0;
    let maximum = 0;
    const releases: Array<() => void> = [];
    const worker = vi.fn(async (item: DetectedTopic) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return item.title;
    });
    const promise = runTopicPool([topic(1), topic(2), topic(3), topic(4), topic(5)], worker);

    await vi.waitFor(() => expect(worker).toHaveBeenCalledTimes(2));
    releases.splice(0).forEach((release) => release());
    await vi.waitFor(() => expect(worker).toHaveBeenCalledTimes(4));
    releases.splice(0).forEach((release) => release());
    await vi.waitFor(() => expect(worker).toHaveBeenCalledTimes(5));
    releases.splice(0).forEach((release) => release());

    const results = await promise;
    expect(maximum).toBe(2);
    expect(results.map(({ topic: item }) => item.id)).toEqual(["topic-1", "topic-2", "topic-3", "topic-4", "topic-5"]);
    expect(results.every(({ state }) => state === "complete")).toBe(true);
  });

  it("keeps four successes when one topic times out", async () => {
    const worker = async (item: DetectedTopic) => {
      if (item.id === "topic-3") throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
      return item.id;
    };
    const results = await runTopicPool([topic(1), topic(2), topic(3), topic(4), topic(5)], worker);

    expect(results.filter(({ state }) => state === "complete")).toHaveLength(4);
    expect(results[2]).toMatchObject({ topic: { id: "topic-3" }, state: "retryable-error" });
  });

  it("retries only the failed topic through the same controller", async () => {
    let first = true;
    const worker = vi.fn(async (item: DetectedTopic) => {
      if (item.id === "topic-2" && first) { first = false; throw Object.assign(new Error(), { retryable: true }); }
      return item.id;
    });
    const items = [topic(1), topic(2), topic(3)];
    const controller = createTopicPool(worker);
    const initial = await controller.run(items);
    const retry = await controller.retry(items[1]);

    expect(initial[1].state).toBe("retryable-error");
    expect(retry).toMatchObject({ state: "complete", value: "topic-2" });
    expect(worker.mock.calls.map(([item]) => item.id)).toEqual(["topic-1", "topic-2", "topic-3", "topic-2"]);
  });

  it("keeps multiple rapid retries within the controller's two-worker limit", async () => {
    let active = 0;
    let maximum = 0;
    const releases: Array<() => void> = [];
    const controller = createTopicPool(async (item) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return item.id;
    });
    const retries = [1, 2, 3, 4, 5].map((index) => controller.retry(topic(index)));
    await vi.waitFor(() => expect(releases).toHaveLength(2));
    releases.splice(0).forEach((release) => release());
    await vi.waitFor(() => expect(releases).toHaveLength(2));
    releases.splice(0).forEach((release) => release());
    await vi.waitFor(() => expect(releases).toHaveLength(1));
    releases.splice(0).forEach((release) => release());
    await Promise.all(retries);
    expect(maximum).toBe(2);
  });

  it("cancels one topic without aborting completed or other in-flight work", async () => {
    const controller = createTopicPool(async (item, signal) => {
      if (item.id === "topic-1") return item.id;
      await new Promise<void>((resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")));
        if (item.id === "topic-3") resolve();
      });
      return item.id;
    });
    const pending = controller.run([topic(1), topic(2), topic(3)]);
    await vi.waitFor(() => expect(controller.cancel("topic-2")).toBe(true));
    const results = await pending;
    expect(results.map(({ state }) => state)).toEqual(["complete", "retryable-error", "complete"]);
  });

  it("cancels a queued third topic before its worker starts and keeps completed results", async () => {
    const releases = new Map<string, () => void>();
    const started: string[] = [];
    const controller = createTopicPool(async (item) => {
      started.push(item.id);
      await new Promise<void>((resolve) => releases.set(item.id, resolve));
      return item.id;
    });
    const pending = controller.run([topic(1), topic(2), topic(3)]);
    await vi.waitFor(() => expect(started).toEqual(["topic-1", "topic-2"]));
    expect(controller.cancel("topic-3")).toBe(true);
    releases.get("topic-1")!();
    releases.get("topic-2")!();
    const results = await pending;
    expect(started).toEqual(["topic-1", "topic-2"]);
    expect(results.map(({ state }) => state)).toEqual(["complete", "complete", "retryable-error"]);
  });

  it("classifies cancellation as retryable without changing completed results", async () => {
    const worker = async (item: DetectedTopic) => {
      if (item.id === "topic-2") throw Object.assign(new Error("cancelled"), { name: "AbortError" });
      return item.id;
    };
    const results = await runTopicPool([topic(1), topic(2), topic(3)], worker);
    expect(results.map(({ state }) => state)).toEqual(["complete", "retryable-error", "complete"]);
    expect(results[0]).toMatchObject({ value: "topic-1" });
  });

  it("a stable controller deduplicates inline callers for the same in-flight topic", async () => {
    let release!: () => void;
    const worker = vi.fn(async () => { await new Promise<void>((resolve) => { release = resolve; }); return "done"; });
    const controller = createTopicPool(worker);
    const click = () => controller.run([topic(1)]);
    const first = click();
    const second = click();
    await vi.waitFor(() => expect(worker).toHaveBeenCalledTimes(1));
    release();

    expect(await first).toEqual(await second);
    expect(worker).toHaveBeenCalledTimes(1);
  });

  it("clamps unsafe JavaScript concurrency above two", async () => {
    let active = 0;
    let maximum = 0;
    const worker = async (item: DetectedTopic) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return item.id;
    };

    await runTopicPool([topic(1), topic(2), topic(3), topic(4), topic(5)], worker, 3 as 2);
    expect(maximum).toBe(2);
  });

  it("marks non-retryable failures fatal and rejects invalid concurrency", async () => {
    expect((await runTopicPool([topic(1)], async () => { throw new Error("bad request"); }))[0].state).toBe("fatal-error");
    await expect(runTopicPool([topic(1)], async () => "ok", 0 as 2)).rejects.toThrow(RangeError);
  });
});
