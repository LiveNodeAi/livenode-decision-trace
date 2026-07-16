# Production verification

Verified on 2026-07-16 (Asia/Tokyo).

Public URL: <https://livenode-decision-trace.takahiro-nochi.workers.dev>

Cloudflare Worker version: `5585df73-15e8-41c4-b386-2f28b3bbca9f`

No submitted memo text or model output is stored in this document or the screenshots.

## Deployment

- OpenNext production build: PASS
- Worker upload and `workers.dev` route: PASS
- Server-side `OPENAI_API_KEY` secret: configured through Wrangler standard input
- Non-secret `OPENAI_MODEL`: `gpt-5`

## Workers preview

The local Worker preview built and started successfully on port 8787. The OpenAI key and model binding were present and hidden by Wrangler. A minimal `gpt-5` provider probe succeeded in 1,572 ms, confirming the project key has model access.

The three full Decision Trace samples each reached the application's 18-second provider timeout and returned the public `ANALYSIS_TIMEOUT` response. Preview logs contained only request method, route, status, and duration; no memo or model output appeared.

## Production AI flow

| Input | HTTP | Duration | Six sections |
| --- | ---: | ---: | ---: |
| Product sample | 504 | 18,160 ms | 0 |
| Public-policy sample | 504 | 18,035 ms | 0 |
| Operations sample | 504 | 18,042 ms | 0 |
| Japanese free-form check | 504 | 18,307 ms | 0 |
| English free-form check | 504 | 18,034 ms | 0 |

Status: **BLOCKED**. The key and model are accessible, but the strict full-schema generation does not complete before the required 18-second application timeout. Consequently, a successful result under 30 seconds and live production copy verification are not established.

## Privacy and response exposure

- All five production error responses contained only the documented public error code.
- No API-key-shaped value, provider name, provider error body, stack trace, or submitted memo was present in the inspected responses.
- The checked-in source and generated client assets are scanned separately during final verification for the local secret value.

## Responsive layout

| Viewport | Horizontal overflow | Result |
| --- | --- | --- |
| 1440 × 1000 | No | PASS |
| 375 × 812 | No | PASS |

Non-sensitive screenshots:

- [Desktop input state](screenshots/desktop.png)
- [375px input state](screenshots/mobile-375.png)

The input state is verified at both widths. A production result-state screenshot is unavailable because the live model requests timed out.

## Markdown copies

- Automated browser verification confirms Decision Trace Markdown contains all six headings.
- Automated browser verification confirms KX Note Markdown contains Claim, Evidence, Data, Constraints, and Links.
- Live production copy verification: **BLOCKED** by the full-schema timeout above.

## Rate limit

Eleven valid requests were sent in one 18.65-second window. All eleven returned 504, and an immediate follow-up also returned 504 after 18.19 seconds. No request returned 429.

Status: **FAIL** for the acceptance requirement that the 11th request within 60 seconds receive HTTP 429. The Cloudflare rate-limit binding is deployed and visible as `10 requests/60s`, but it did not reject this burst in the observed production run.

## Acceptance summary

The Worker is public, responsive, secret-safe in inspected error paths, and layout-safe at desktop and 375px. Submission copy and input-state screenshots are ready. Production acceptance is not complete because full Decision Trace generation times out and the deployed rate limit did not produce the required 429 response.
