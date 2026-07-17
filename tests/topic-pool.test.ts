import { describe, expect, it, vi } from "vitest";

import type { DetectedTopic } from "@/lib/transcript-contract";
import { runTopicPool } from "@/lib/topic-pool";

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

  it("retries only the failed topic when called with that item", async () => {
    let first = true;
    const worker = vi.fn(async (item: DetectedTopic) => {
      if (item.id === "topic-2" && first) { first = false; throw Object.assign(new Error(), { retryable: true }); }
      return item.id;
    });
    const items = [topic(1), topic(2), topic(3)];
    const initial = await runTopicPool(items, worker);
    const retry = await runTopicPool([items[1]], worker);

    expect(initial[1].state).toBe("retryable-error");
    expect(retry[0]).toMatchObject({ state: "complete", value: "topic-2" });
    expect(worker.mock.calls.map(([item]) => item.id)).toEqual(["topic-1", "topic-2", "topic-3", "topic-2"]);
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

  it("deduplicates the same in-flight topic across double-click calls", async () => {
    let release!: () => void;
    const worker = vi.fn(async () => { await new Promise<void>((resolve) => { release = resolve; }); return "done"; });
    const first = runTopicPool([topic(1)], worker);
    const second = runTopicPool([topic(1)], worker);
    await vi.waitFor(() => expect(worker).toHaveBeenCalledTimes(1));
    release();

    expect(await first).toEqual(await second);
    expect(worker).toHaveBeenCalledTimes(1);
  });

  it("marks non-retryable failures fatal and rejects invalid concurrency", async () => {
    expect((await runTopicPool([topic(1)], async () => { throw new Error("bad request"); }))[0].state).toBe("fatal-error");
    await expect(runTopicPool([topic(1)], async () => "ok", 0 as 2)).rejects.toThrow(RangeError);
  });
});
