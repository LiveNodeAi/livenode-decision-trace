# Production verification

Verified on 2026-07-16 (Asia/Tokyo).

Public URL: <https://livenode-decision-trace.takahiro-nochi.workers.dev>

Cloudflare Worker version: `713f0889-aad7-47b8-b5fd-eb3c1abfa03c`

No submitted memo text or model output is stored in this document or the screenshots.

## Evidence scope

The live timings and UI evidence below belong to the last deployed Worker `713f0889-aad7-47b8-b5fd-eb3c1abfa03c`, produced by the GPT-5.6 migration/evidence commits through `84e8dbd` and `e7ee5ad`. Current local branch changes beginning with `e496436`, `029d838`, and later commits are **not deployed** and have only local automated evidence. Production redeployment and acceptance remain pending.

## Deployment

- OpenNext production build: PASS
- Worker upload and `workers.dev` route: PASS
- Server-side `OPENAI_API_KEY` secret: retained in the Worker secret store; never printed or committed
- Non-secret `OPENAI_MODEL`: `gpt-5.6-luna`
- Model request: `reasoning: { effort: "none" }`
- Per-attempt abort signal: fresh 28-second timeout

## TDD evidence

The regression test was written before the implementation change. RED showed two independent failures: the request lacked `reasoning: { effort: "minimal" }`, and both attempt timeouts were 18,000 ms instead of 28,000 ms. After the minimal implementation change, the targeted analyzer suite passed 9/9.

For the final latency fix, RED showed 12 expected failures: the request lacked a concise cardinality contract and the schema accepted every tested array overflow. GREEN bounds the trace to 3 context items, 3 assumptions, 4 criteria, 3 options, 2 benefits/costs/risks per option, 3 recommendation reasons, 2 change conditions, 4 next actions, and 3 links. The same limits are stated in the model instructions. Targeted tests passed 25/25 and the full suite passed 51/51.

For the current-model migration, RED showed two expected failures: the request still used reasoning effort `minimal`, and Worker/local defaults still used `gpt-5`. GREEN changes the request to effort `none` and the defaults to `gpt-5.6-luna`, while retaining the 28-second timeout and bounded schema. Targeted tests passed 10/10; the full suite passed 52/52 and the production build passed.

## Production AI flow

| Input | HTTP | Duration | Six sections | Language |
| --- | ---: | ---: | ---: | --- |
| Product sample | 200 | 9,476 ms | Yes | Japanese |
| Japanese free-form | 200 | 6,840 ms | Yes | Japanese |
| English free-form | 200 | 4,813 ms | Yes | English |
| Desktop 1440 UI — Public-policy sample (`public-policy`) | 200 | 7,817 ms | Yes | Japanese |
| Mobile 375 UI — Operations sample (`operations`) | 200 | 8,180 ms | Yes | Japanese |

Status: **PASS**. Exactly five generations were run against Worker `713f0889-aad7-47b8-b5fd-eb3c1abfa03c`; all returned HTTP 200 with six sections below 28 seconds. No older deployment timings are reused and no retries or fallback model probes were made.

## Privacy and response exposure

- All inspected success and error responses had no API-key-shaped value, provider error detail, stack trace, or submitted memo exposure.
- The checked-in source and generated client assets are scanned separately during final verification for the local secret value.
- Browser network checks were performed without storing response bodies or memo content in artifacts.

## Responsive result and Markdown copy — current Worker version

| Viewport | HTTP | Duration | Six cards | Overflow | Decision Trace headings | KX Note headings |
| --- | ---: | ---: | ---: | --- | --- | --- |
| 1440 × 1000 — Public-policy sample (`public-policy`) | 200 | 7,817 ms | 6 | No | PASS | PASS |
| 375 × 812 — Operations sample (`operations`) | 200 | 8,180 ms | 6 | No | PASS | PASS |

Both current-version UI checks observed exactly one API request, rendered six cards, produced distinct non-empty Decision Trace and KX Note exports with every required heading, stayed within the viewport with no horizontal overflow, and exposed no submitted memo, provider detail, stack, or key-shaped field in the response.

Non-sensitive input-state screenshots:

- [Desktop](screenshots/desktop.png)
- [375px](screenshots/mobile-375.png)

## Rate-limit protection

- Deployed binding: `DECISION_TRACE_RATE_LIMITER (10 requests/60s)` — PASS
- Route behavior when the binding denies a request: automated test verifies `429 { "error": "RATE_LIMITED" }` — PASS
- Production binding behavior is treated as approximate abuse protection, not deterministic exact request accounting. A specific 11th-request 429 is not an acceptance requirement.

## Current local automated checks

- `npm test`: PASS, 65/65
- `npm run build`: PASS
- `npx playwright test`: PASS, 2/2
- `git diff --check`: PASS

## Acceptance summary

The last deployed Worker evidence passed its assigned acceptance set. The current local branch is **not submission-ready** until it is redeployed and accepted in production.

Submission artifacts still pending:

- 3:2 project thumbnail
- recorded 60–90 second demo video and a public video URL
- public source repository link
- production redeployment of the current local HEAD and fresh acceptance evidence
