# Production verification

Verified on 2026-07-19 (Asia/Tokyo).

Public URL: <https://livenode-decision-trace.takahiro-nochi.workers.dev>

Cloudflare Worker version: `ea399707-e83e-4ef5-9e6c-ccafe30889e3`

Deployed implementation commit: `cac3778`

No submitted memo text or model output is stored in this document or the screenshots.

## Current production acceptance — PASS

Worker `ea399707-e83e-4ef5-9e6c-ccafe30889e3` is the current acceptance target. Topic detection returns server-resolved source ranges from stable transcript segment IDs. A source segment may ground multiple distinct topics when one passage supports both decisions; duplicate source IDs within a single topic remain invalid. Topic analysis accepts only evidence grounded in those verified excerpts; an ungrounded result receives one bounded regeneration attempt before a safe public error is returned.

## Product-scope truth at this acceptance target

The submission describes three separate layers. This is a positioning statement, not evidence that all three layers are deployed:

- **Web demo — capture layer:** the accepted public Worker supports a focused Japanese or English idea memo and a meeting transcript of up to 30,000 characters. Meeting mode detects up to five topics, allows human review and selection, generates at most two topic traces concurrently, and creates a Markdown ZIP in the browser.
- **Local KX — working refinement layer:** the developer operates a separate, human-reviewed Markdown workflow for distilling and reconnecting knowledge. It is not hosted by the accepted public Worker.
- **Distributable Skill — planned delivery layer:** packaging this workflow for other users and AI environments is future work, not a deployed capability of the accepted public Worker.

Multi-topic transcript detection and browser-generated Markdown ZIP export are included in this production version and may be presented as available. Direct automatic saving to Obsidian or Notion is not implemented and must remain described as future Skill work.

### Earlier single-memo regression evidence

The following checks were captured against the earlier accepted single-memo Worker. They remain historical regression evidence, not proof of the current multi-topic production path.

| Input | HTTP | Duration | Six sections | Language | Exposure |
| --- | ---: | ---: | ---: | --- | --- |
| Product canary | 200 | 8,028 ms | Yes | Japanese | Safe |
| Japanese free-form | 200 | 7,681 ms | Yes | Japanese | Safe |
| Benign English free-form | 200 | 4,379 ms | Yes | English | Safe |
| Desktop 1440 public-policy | 200 | 8,450 ms | Yes | Japanese | Safe |
| Mobile 375 operations | 200 | 8,359 ms | Yes | Japanese | Safe |

Each historical check was run exactly once with no harness retry or fallback. Desktop and mobile each observed one API request, rendered six cards, produced distinct non-empty Decision Trace and KX Note exports with every required heading, had no horizontal overflow, exposed no memo/key/stack content, completed below 28 seconds, and exited with code 0.

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

## Current multi-topic acceptance evidence

- Public page: HTTP 200 with meeting mode selected first and the 30,000-character limit visible without invoking OpenAI.
- Bounded production topic detection using the fictional demo transcript: HTTP 200 in 3,337 ms with two grounded topics returned.
- Bounded production topic analysis after the final grounding retry fix: HTTP 200 with `topicMatched: true` and a validated trace.
- End-to-end production capture completed topic detection, two trace generations, and browser-side ZIP export without a fallback or automatic rerun.
- Full 30,000-character, five-topic production cost and latency were not measured in this acceptance run and are not claimed.

## Demo video and export artifacts

- `demo-video-en.mp4`: 88.24 seconds, 1440 × 900, H.264 video and AAC audio, with English narration and burned-in English captions.
- `demo-download.zip`: seven files — meeting summary, two Decision Traces, two KX Notes, action list, and manifest.
- The transcript is fictional and contains exactly two decision themes. No private meeting content is used.

## Current local automated checks

- `npm test`: PASS, 167/167
- `npm run build`: PASS
- `npx playwright test`: PASS, 8/8
- `git diff --check`: PASS

## Historical / superseded evidence

All earlier Worker runs are historical diagnostic evidence only. They do not qualify or contradict the current Worker acceptance.

- `5585df73-15e8-41c4-b386-2f28b3bbca9f`: initial 18-second deployment; blocked by timeouts and incomplete production result verification.
- `5a90dada-388c-469f-830e-0b7b9eee225a`: 28-second follow-up; improved results but product acceptance remained blocked.
- `690479a4-b919-46b2-b357-fe7468b8f4a0`: bounded-output deployment; API checks improved, later UI evidence remained incomplete.
- `713f0889-aad7-47b8-b5fd-eb3c1abfa03c`: GPT-5.6 Luna deployment; passed its then-current acceptance before later safety changes.
- `d9ea7075-8da9-4ac6-8414-729dd8ca8d2d`: safety-hardening deployment; stopped on an English HTTP 502.
- `a7e0b721-70aa-4942-a8ed-7c85574d4d06`: provider-compatible schema canary; stopped on `ANALYSIS_COULD_NOT_GROUND`.
- `a0d748ce-b031-47eb-896c-68647a812d97`: accepted single-memo version before the multi-topic transcript and ZIP flow was deployed.

## Acceptance summary

Current production acceptance: **PASS**.

Submission publication steps still pending:

- public YouTube URL for the recorded demo video
- public visibility or judge access for the source repository

Completed submission image:

- [3:2 project thumbnail](screenshots/thumbnail-3x2.png) — 1200 × 800, generated from a memo-free mocked result

Current demo media:

- [88-second English narrated demo](demo-video-en.mp4) — current multi-topic and ZIP flow
