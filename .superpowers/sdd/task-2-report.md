# Task 2 report — deterministic rehearsal and production capture

## Delivered

- `b9d360c feat: automate multi-topic demo capture` added strict two-topic fixtures, the dual-mode capture runner, fixed English caption overlay, 1440×900 video, and rehearsal/production package commands.
- Updated scene pacing so every scene starts its timer immediately before its UI operation and waits only for the unused part of its `durationMs` budget. The MOCK composition therefore retains its 88-second scene contract instead of adding operation latency to it.
- Added a production-only 100-second capture deadline. Every scene action and remaining wait is bounded by the shared deadline; capture checks again after closing the context and fails before `saveAs()` if the limit has passed.
- Added deterministic timing helpers and unit coverage for remaining scene duration and the production deadline.

## Grounding source of truth

The reviewed transcript remains unchanged. Fixtures strictly ground on its two existing conclusion excerpts:

1. `実証地域で最初に試す企画は、短い固定コースを基本とし、途中に二択の小さな寄り道を置く形にします。`
2. `LINEは任意の案内入口として使い、必須情報は案内ページにも同時に置きます。`

Removing either conclusion causes fixture construction to throw.

## TDD and review-fix evidence

1. Added `tests/demo-capture-timing.test.ts` before the helper module existed.
2. `npm test -- tests/demo-capture-timing.test.ts` failed as expected because `../scripts/demo-capture-timing.mjs` could not be resolved.
3. Added the smallest timing helpers, updated the runner to use them, and reran the targeted test: 2 tests passed.

## Zero-cost MOCK rehearsal

Commands run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3100
npm run capture:demo:rehearsal
```

- Exit status: 0.
- Target: `http://127.0.0.1:3100/`.
- Only the two local fixture API routes were fulfilled; no OpenAI or production API request was made.
- Completion shown: `2/2件完了`.
- Rehearsal output: `docs/submission/demo-video-en.webm` and `docs/submission/demo-download.zip`.

## Current verification

- `node --check scripts/capture-demo.mjs` passed.
- `node --check scripts/demo-capture-timing.mjs` passed.
- `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 docs/submission/demo-video-en.webm` returned `88.240000` seconds.
- `unzip -l docs/submission/demo-download.zip` listed 7 files: `00-meeting-summary.md`, `99-actions.md`, `manifest.json`, and two each of `Decision-Trace.md` and `KX-Note.md`.
- `npm test` passed: 19 files, 166 tests.
- `git diff --check` passed.

## Commit

`b48a84d fix: cap demo capture timing`

## Scope / concerns

- Production capture was not run; its command would call the deployed API.
- Rehearsal WebM and ZIP are preserved as untracked artifacts and were not included in the code commits.
