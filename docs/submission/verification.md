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

### Current-version free-form checks

These checks also ran against Worker `690479a4-b919-46b2-b357-fe7468b8f4a0`; no older deployment timings are reused.

| Input | HTTP | Duration | Six sections | Response exposure |
| --- | ---: | ---: | --- | --- |
| Japanese free-form | 200 | 16,162 ms | Yes | None observed |
| English free-form | 200 | 16,147 ms | Yes | None observed |

## Privacy and response exposure

- All inspected success and error responses had no API-key-shaped value, provider error detail, stack trace, or submitted memo exposure.
- The checked-in source and generated client assets are scanned separately during final verification for the local secret value.
- Browser network checks were performed without storing response bodies or memo content in artifacts.

## Responsive result and Markdown copy — current Worker version

| Viewport | HTTP | Duration | Six cards | Overflow | Decision Trace headings | KX Note headings |
| --- | ---: | ---: | ---: | --- | --- | --- |
| 1440 × 1000 | Response received; status not captured | Not captured | No result within 45s | Not verifiable | Not verifiable | Not verifiable |
| 375 × 812 | 504 | 28,447 ms | No | Not verifiable | Not verifiable | Not verifiable |

The first desktop harness attempt emitted no API request because it clicked before React hydration. A local intercepted-response check then proved the corrected harness (`networkidle` plus textarea population) observes exactly one request and validates six cards, both distinct non-empty Markdown exports and their headings, overflow, and response exposure. The one authorized live desktop generation received an API response but did not render result cards within the 45-second UI window; the harness exited before recording its status and duration. It was not retried. The one authorized mobile generation returned the public 504 response at 28,447 ms. It was not retried. Neither live UI attempt produced exports or a result layout to inspect.

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

The deployed app passes the three sample API checks and both current-version free-form checks. Current-version live result/copy acceptance remains **BLOCKED**: the single desktop attempt produced no result within 45 seconds, and the single mobile attempt returned 504 at 28,447 ms. No retry or extra live generation was used.
