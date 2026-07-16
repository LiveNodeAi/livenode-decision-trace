# Production verification

Verified on 2026-07-16 (Asia/Tokyo).

Public URL: <https://livenode-decision-trace.takahiro-nochi.workers.dev>

Cloudflare Worker version: `5a90dada-388c-469f-830e-0b7b9eee225a`

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

## Production AI flow

| Input | HTTP | Duration | Six sections | Language |
| --- | ---: | ---: | ---: | --- |
| Product sample, first request after deployment | 504 | 18,422 ms | No | — |
| Product sample, explicit retry | 504 | 28,488 ms | No | — |
| Public-policy sample | 200 | 15,446 ms | Yes | Japanese |
| Operations sample | 200 | 23,858 ms | Yes | Japanese |
| Japanese free-form check | 200 | 20,759 ms | Yes | Japanese |
| English free-form check | 200 | 15,210 ms | Yes | English |

Status: **BLOCKED**. Four of five required input types produced complete six-section traces under 30 seconds, but the product sample did not complete successfully and one attempt exceeded the 28-second application limit. The failed calls remain visible here rather than being replaced by only successful measurements.

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

- `npm test`: PASS, 40/40
- `npm run build`: PASS
- `npx playwright test`: PASS, 2/2
- `git diff --check`: PASS

## Acceptance summary

The deployed app now produces complete traces and both Markdown formats on desktop and 375px for the verified successful requests, without observed secret or provider-detail exposure. Production acceptance remains **BLOCKED** only because the product sample failed twice and one attempt reached 28.488 seconds, exceeding the approved 28-second limit.
