# Task 1 report — safe demo content and timing contract

## Delivered

- Added a 1,672-character fictional Japanese transcript with exactly two explicit decision themes: the initial pilot format in an `実証地域`, and whether `LINE` is an optional communication entry point.
- Added English and revised Japanese narration that describe the same eight-scene story, including Codex, GPT-5.6, and human review.
- Added the eight-scene JSON timing contract totaling 88,000 ms.
- Added a Vitest contract test for transcript size and required terms, narration references, scene duration range, unique IDs, and non-empty captions/narration.
- Added `demo-output-contract.json`: synthetic English voice at a conservative maximum of 150 words per minute, with burned-in English captions.
- Added per-scene `narrationMaxMs` and `operationMs` fields. Each pair sums to its scene duration; the 88,000 ms composition reserves 37,500 ms for recorded UI operation or silence.
- Strengthened transcript safety checks: exactly two bracketed theme markers, only the four fictional role labels as speakers, and explicit forbidden patterns for URLs, email addresses, telephone numbers, organization markers, representative real-place markers, and common personal-name markers.

## TDD evidence

1. Added `tests/demo-assets.test.ts` before the requested assets existed.
2. Ran `npm test -- tests/demo-assets.test.ts`; it failed with the expected `ENOENT` for `docs/submission/demo-transcript-ja.txt`.
3. Added the assets, then reran the same command successfully.
4. Expanded the contract test for timing, transcript safety, and output metadata; it failed with the expected `ENOENT` for `docs/submission/demo-output-contract.json` before the new contract file was added.

## Verification

- `wc -m docs/submission/demo-transcript-ja.txt` returned `1672`.
- `npm test -- tests/demo-assets.test.ts` passed: 1 test file, 1 test.
- `git diff --check` returned no whitespace errors before commit.
- Exact final command: `npm test -- tests/demo-assets.test.ts`
- Exact final output summary: `Test Files  1 passed (1)` and `Tests  1 passed (1)`; exit code 0.

## Commit

`97a8cb7 docs: add Build Week demo content`

Follow-up timing/safety/output-contract fixes are committed separately after this report update.

## Scope / concerns

- Only the Task 1 content files were committed.
- No runtime application data is consumed by these demo assets.
