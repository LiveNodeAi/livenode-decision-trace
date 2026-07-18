import { describe, expect, it } from "vitest";

import {
  assertWithinProductionCaptureDeadline,
  remainingSceneDuration,
} from "../scripts/demo-capture-timing.mjs";

describe("demo capture timing", () => {
  it("waits only for the unused portion of a scene budget", () => {
    expect(remainingSceneDuration(9_000, 1_000, 3_250)).toBe(6_750);
    expect(remainingSceneDuration(9_000, 1_000, 12_000)).toBe(0);
  });

  it("rejects production capture after its 100-second deadline", () => {
    expect(() => assertWithinProductionCaptureDeadline(10_000, 110_000)).not.toThrow();
    expect(() => assertWithinProductionCaptureDeadline(10_000, 110_001)).toThrow("100 seconds");
  });
});
