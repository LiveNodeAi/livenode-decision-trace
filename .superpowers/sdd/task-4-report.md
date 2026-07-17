# Task 4 report: bounded topic pool

## Implemented

- Added generic `runTopicPool<T>` over `DetectedTopic` with a default concurrency limit of two.
- Preserved input order independently of worker completion order.
- Converted per-topic worker rejection into `retryable-error` or `fatal-error` without discarding successful siblings.
- Classified timeout, rate-limit, busy, and user abort failures as retryable.
- Added worker-scoped, topic-ID-keyed in-flight deduplication so concurrent double-click calls share one worker promise.
- Removed in-flight entries after settlement so a failed topic can be retried independently.

## TDD evidence

- RED: `npx vitest run tests/topic-pool.test.ts` failed because `@/lib/topic-pool` did not exist.
- GREEN: `npx vitest run tests/topic-pool.test.ts` passed 6/6.
- Full suite: `npm test` passed 136/136 across 15 files.
- Build: `npm run build` completed successfully.
- Scoped `git diff --check` passed.

## Risks / follow-up

- Deduplication intentionally applies only while a promise is in flight and only when the same worker function identity is reused. UI code should keep its worker callback stable across double-click invocations.
