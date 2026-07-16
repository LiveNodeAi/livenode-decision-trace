# Production verification

Verified on 2026-07-16 (Asia/Tokyo).

Public URL: <https://livenode-decision-trace.takahiro-nochi.workers.dev>

Cloudflare Worker version: `690479a4-b919-46b2-b357-fe7468b8f4a0`

No submitted memo text or model output is stored in this document or the screenshots.

## Deployment

- OpenNext production build: PASS
- Worker upload and `workers.dev` route: PASS
- Server-side `OPENAI_API_KEY` secret: retained in the Worker secret store; never printed or committed
- Non-secret `OPENAI_MODEL`: `gpt-5`
- Model request: `reasoning: { effort: "minimal" }`
- Per-attempt abort signal: fresh 28-second timeout

## TDD evidence

The regression test was written before the implementation change. RED showed two independent failures: the request lacked `reasoning: { effort: "minimal" }`, and both attempt timeouts were 18,000 ms instead of 28,000 ms. After the minimal implementation change, the targeted analyzer suite passed 9/9.

For the final latency fix, RED showed 12 expected failures: the request lacked a concise cardinality contract and the schema accepted every tested array overflow. GREEN bounds the trace to 3 context items, 3 assumptions, 4 criteria, 3 options, 2 benefits/costs/risks per option, 3 recommendation reasons, 2 change conditions, 4 next actions, and 3 links. The same limits are stated in the model instructions. Targeted tests passed 25/25 and the full suite passed 51/51.

## Production AI flow

| Input | HTTP | Duration | Six sections | Language |
| --- | ---: | ---: | ---: | --- |
| Product sample, run 1 | 200 | 19,235 ms | Yes | Japanese |
| Product sample, run 2 | 200 | 21,060 ms | Yes | Japanese |
| Product sample, run 3 | 200 | 23,574 ms | Yes | Japanese |
| Public-policy sample | 200 | 24,294 ms | Yes | Japanese |
| Operations sample | 200 | 23,808 ms | Yes | Japanese |

Status: **PASS**. The product sample succeeded three consecutive times and both comparison samples succeeded once. All five bounded probes returned complete six-section traces below the 28-second application limit. No additional live requests were made in this verification round.

## Privacy and response exposure

- All inspected success and error responses had no API-key-shaped value, provider error detail, stack trace, or submitted memo exposure.
- The checked-in source and generated client assets are scanned separately during final verification for the local secret value.
- Browser network checks were performed without storing response bodies or memo content in artifacts.

## Responsive result and Markdown copy

| Viewport | HTTP | Duration | Six cards | Overflow | Decision Trace headings | KX Note headings |
| --- | ---: | ---: | ---: | --- | --- | --- |
| 1440 × 1000 | 200 | 17,725 ms | 6 | No | PASS | PASS |
| 375 × 812 | 200 | 23,206 ms | 6 | No | PASS | PASS |

The Decision Trace copy contained Situation, Assumptions, Decision criteria, Options, Recommendation, and Next actions in Japanese. The KX Note copy contained Claim, Evidence, Data, Constraints, and Links in Japanese. Clipboard content was checked in memory and was not saved.

Non-sensitive input-state screenshots:

- [Desktop](screenshots/desktop.png)
- [375px](screenshots/mobile-375.png)

## Rate-limit protection

- Deployed binding: `DECISION_TRACE_RATE_LIMITER (10 requests/60s)` — PASS
- Route behavior when the binding denies a request: automated test verifies `429 { "error": "RATE_LIMITED" }` — PASS
- Production binding behavior is treated as approximate abuse protection, not deterministic exact request accounting. A specific 11th-request 429 is not an acceptance requirement.

## Automated checks

- `npm test`: PASS, 51/51
- `npm run build`: PASS
- `npx playwright test`: PASS, 2/2
- `git diff --check`: PASS

## Acceptance summary

The deployed app now produces complete traces for all required sample checks below 28 seconds and both Markdown formats remain covered on desktop and 375px, without observed secret or provider-detail exposure. Production acceptance is **PASS**.
