# Task 4 report: bounded topic pool

## Implemented

- Added generic `runTopicPool<T>` over `DetectedTopic` with a default concurrency limit of two.
- Preserved input order independently of worker completion order.
- Converted per-topic worker rejection into `retryable-error` or `fatal-error` without discarding successful siblings.
- Classified timeout, rate-limit, busy, and user abort failures as retryable.
- Added an explicit `createTopicPool` controller with topic-ID-keyed in-flight deduplication so concurrent click handlers share one worker promise without relying on function identity.
- Removed in-flight entries after settlement so a failed topic can be retried independently.
- Restricted the public concurrency option to `1 | 2` and clamps unsafe JavaScript values above two at runtime.

## TDD evidence

- RED: `npx vitest run tests/topic-pool.test.ts` failed because `@/lib/topic-pool` did not exist.
- GREEN: `npx vitest run tests/topic-pool.test.ts` passed 6/6.
- Review RED: controller tests failed because `createTopicPool` was missing, and an unsafe concurrency value reached three active workers.
- Review GREEN: `npx vitest run tests/topic-pool.test.ts` passed 7/7.
- Full suite after review fixes: `npm test` passed 142/142 across 15 files.
- Build: `npm run build` completed successfully.
- Scoped `git diff --check` passed.

## Risks / follow-up

- UI code must retain one controller for the lifetime of a topic-generation screen so separate click handlers share its explicit in-flight state.
