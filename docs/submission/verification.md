# Production verification

Verified on 2026-07-16 (Asia/Tokyo).

Public URL: <https://livenode-decision-trace.takahiro-nochi.workers.dev>

Cloudflare Worker version: `a0d748ce-b031-47eb-896c-68647a812d97`

No submitted memo text or model output is stored in this document or the screenshots.

## Evidence scope

The current production Worker `a0d748ce-b031-47eb-896c-68647a812d97` was deployed from commit `c45b0c37fe3f92f6fdbf5c852851299f7f691760`. Structurally valid grounding mismatches are repaired deterministically: invalid supplied evidence is downgraded to explicit inference and ungrounded links are dropped before canonical validation. All five assigned current-version checks passed. The two UI checks used separate locally mock-validated harnesses with startup hydration assertions, request counters, structured errors, `finally` cleanup, and captured process exit codes.

## Deterministic-grounding acceptance

| Input | HTTP | Duration | Six sections | Language | Exposure |
| --- | ---: | ---: | ---: | --- | --- |
| Product canary | 200 | 8,028 ms | Yes | Japanese | Safe |
| Japanese free-form | 200 | 7,681 ms | Yes | Japanese | Safe |
| Benign English free-form | 200 | 4,379 ms | Yes | English | Safe |
| Desktop public-policy | 200 | 8,450 ms | Yes | Japanese | Safe |
| Mobile operations | 200 | 8,359 ms | Yes | Japanese | Safe |

Each check was run exactly once with no harness retry or fallback. Desktop and mobile each observed one API request, rendered six cards, produced distinct non-empty Decision Trace and KX Note exports with every required heading, had no horizontal overflow, exposed no memo/key/stack content, completed below 28 seconds, and exited with code 0. The earlier combined-harness observability gap is superseded by these separately captured current-version results.

## Provider-schema compatibility canary

- Product sample: HTTP 422, `ANALYSIS_COULD_NOT_GROUND`, 15,901 ms, no trace, exposure-safe.
- The canary was the only generation against this Worker. No retry or fallback was made.
- Japanese free-form, benign English free-form, desktop public-policy, and mobile operations checks were not run because the canary gate failed.
- Status: **BLOCKED**.

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
| Product sample | 200 | 10,330 ms | Yes | Japanese |
| Japanese free-form | 200 | 7,789 ms | Yes | Japanese |
| English free-form | 502 | 685 ms | No | — |
| Desktop 1440 UI — Public-policy sample (`public-policy`) | Not run | — | — | — |
| Mobile 375 UI — Operations sample (`operations`) | Not run | — | — | — |

Status: **BLOCKED**. The assigned sequence stopped immediately when the English free-form probe returned HTTP 502, as required. The desktop and mobile probes were not run. The acceptance harness made no retries and used no fallback model. The public error boundary intentionally withholds provider and internal diagnostic detail, so the exact internal rejection cause is not asserted here.

## Privacy and response exposure

- Both inspected success responses had the expected trace shape and no API-key-shaped value, provider error detail, stack trace, or submitted memo exposure.
- The English failure returned only the public error boundary; the harness did not log its response body, submitted memo, or any model output.
- The checked-in source and generated client assets are scanned separately during final verification for the local secret value.
- Browser network checks were performed without storing response bodies or memo content in artifacts.

## Responsive result and Markdown copy — current Worker version

| Viewport | HTTP | Duration | Six cards | Overflow | Decision Trace headings | KX Note headings |
| --- | ---: | ---: | ---: | --- | --- | --- |
| 1440 × 1000 — Public-policy sample (`public-policy`) | Not run | — | — | — | — | — |
| 375 × 812 — Operations sample (`operations`) | Not run | — | — | — | — | — |

No current-version live UI generation was run after the API failure. The high-impact bilingual notice was instead verified without another OpenAI request: both notice paths are present in the deployed static chunk, and the existing mocked UI regression test verifies that the notice is visible while both Markdown exports remain available. This is static/local evidence, not a substitute for the stopped live UI acceptance.

Non-sensitive input-state screenshots:

- [Desktop](screenshots/desktop.png)
- [375px](screenshots/mobile-375.png)

## Rate-limit protection

- Deployed binding: `DECISION_TRACE_RATE_LIMITER (10 requests/60s)` — PASS
- Route behavior when the binding denies a request: automated test verifies `429 { "error": "RATE_LIMITED" }` — PASS
- Production binding behavior is treated as approximate abuse protection, not deterministic exact request accounting. A specific 11th-request 429 is not an acceptance requirement.

## Current local automated checks

- `npm test`: PASS, 67/67
- `npm run build`: PASS
- `npx playwright test`: PASS, 2/2
- `git diff --check`: PASS

## Acceptance summary

The current Worker passed its assigned production acceptance. Submission readiness still depends on the non-runtime artifacts listed below; older production evidence is not used to qualify this deployment.

Submission artifacts still pending:

- 3:2 project thumbnail
- recorded 60–90 second demo video and a public video URL
- public source repository link
- production diagnosis/fix followed by redeployment and a fresh exact-five acceptance
