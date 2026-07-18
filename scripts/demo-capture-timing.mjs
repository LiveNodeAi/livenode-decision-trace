const PRODUCTION_CAPTURE_MAX_MS = 100_000;

export function remainingSceneDuration(durationMs, sceneStartedAt, now = Date.now()) {
  return Math.max(0, durationMs - (now - sceneStartedAt));
}

export function assertWithinProductionCaptureDeadline(captureStartedAt, now = Date.now()) {
  if (now - captureStartedAt > PRODUCTION_CAPTURE_MAX_MS) {
    throw new Error("Production capture exceeded 100 seconds");
  }
}

export function remainingProductionCaptureDuration(captureStartedAt, now = Date.now()) {
  assertWithinProductionCaptureDeadline(captureStartedAt, now);
  return PRODUCTION_CAPTURE_MAX_MS - (now - captureStartedAt);
}
