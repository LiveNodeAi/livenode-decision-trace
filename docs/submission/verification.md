# Production verification

Verified on 2026-07-16 (Asia/Tokyo).

Public URL: <https://livenode-decision-trace.takahiro-nochi.workers.dev>

Cloudflare Worker version: `a0d748ce-b031-47eb-896c-68647a812d97`

Deployed implementation commit: `c45b0c37fe3f92f6fdbf5c852851299f7f691760`

No submitted memo text or model output is stored in this document or the screenshots.

## Current production acceptance — PASS

Worker `a0d748ce-b031-47eb-896c-68647a812d97` is the sole current acceptance target. Structurally valid grounding mismatches are repaired deterministically: invalid supplied evidence is downgraded to explicit inference and ungrounded links are dropped before canonical validation.

| Input | HTTP | Duration | Six sections | Language | Exposure |
| --- | ---: | ---: | ---: | --- | --- |
| Product canary | 200 | 8,028 ms | Yes | Japanese | Safe |
| Japanese free-form | 200 | 7,681 ms | Yes | Japanese | Safe |
| Benign English free-form | 200 | 4,379 ms | Yes | English | Safe |
| Desktop 1440 public-policy | 200 | 8,450 ms | Yes | Japanese | Safe |
| Mobile 375 operations | 200 | 8,359 ms | Yes | Japanese | Safe |

Each check was run exactly once with no harness retry or fallback. Desktop and mobile each observed one API request, rendered six cards, produced distinct non-empty Decision Trace and KX Note exports with every required heading, had no horizontal overflow, exposed no memo/key/stack content, completed below 28 seconds, and exited with code 0. Before production use, both isolated UI harnesses passed against a local mocked endpoint with hydration and request-count assertions.

## Deployment and privacy boundary

- OpenNext production build, Worker upload, and `workers.dev` route: PASS
- Server-side `OPENAI_API_KEY`: retained in the Worker secret store; never printed or committed
- Non-secret `OPENAI_MODEL`: `gpt-5.6-luna`
- Model request: `reasoning: { effort: "none" }`
- Per-attempt abort signal: fresh 28-second timeout
- Deployed rate-limit binding: `DECISION_TRACE_RATE_LIMITER (10 requests/60s)`
- Automated route behavior when the binding denies a request: `429 { "error": "RATE_LIMITED" }` — PASS
- Production rate limiting is approximate abuse protection, not deterministic exact request accounting

Non-sensitive input-state screenshots:

- [Desktop](screenshots/desktop.png)
- [375px](screenshots/mobile-375.png)

## Current local automated checks

- `npm test`: PASS, 79/79
- `npm run build`: PASS
- `npx playwright test`: PASS, 2/2
- `git diff --check`: PASS
- Secret scan across tracked and generated client assets: PASS, 73 files / 0 matches

## Historical / superseded evidence

All earlier Worker runs are historical diagnostic evidence only. They do not qualify or contradict the current Worker acceptance.

- `5585df73-15e8-41c4-b386-2f28b3bbca9f`: initial 18-second deployment; blocked by timeouts and incomplete production result verification.
- `5a90dada-388c-469f-830e-0b7b9eee225a`: 28-second follow-up; improved results but product acceptance remained blocked.
- `690479a4-b919-46b2-b357-fe7468b8f4a0`: bounded-output deployment; API checks improved, later UI evidence remained incomplete.
- `713f0889-aad7-47b8-b5fd-eb3c1abfa03c`: GPT-5.6 Luna deployment; passed its then-current acceptance before later safety changes.
- `d9ea7075-8da9-4ac6-8414-729dd8ca8d2d`: safety-hardening deployment; stopped on an English HTTP 502.
- `a7e0b721-70aa-4942-a8ed-7c85574d4d06`: provider-compatible schema canary; stopped on `ANALYSIS_COULD_NOT_GROUND`.
- The first combined UI harness against `a0d748ce-b031-47eb-896c-68647a812d97` had an observability gap. It was superseded by the separately captured desktop and mobile PASS results above, without reusing evidence from another Worker.

## Acceptance summary

Current production acceptance: **PASS**.

Submission artifacts still pending:

- recorded 60–90 second demo video and a public video URL
- public source repository link

Completed submission image:

- [3:2 project thumbnail](screenshots/thumbnail-3x2.png) — 1200 × 800, generated from a memo-free mocked result
