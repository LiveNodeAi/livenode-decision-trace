# LiveNode Decision Trace

LiveNode Decision Trace turns an unstructured decision memo into a traceable decision record. Instead of returning only an answer, it preserves the situation, assumptions, criteria, trade-offs, recommendation, and next actions that led to the answer.

The public demo is a stateless Next.js application deployed to Cloudflare Workers. It accepts Japanese or English text, uses the OpenAI Responses API to produce a schema-validated result, and lets the user copy that result in two Markdown formats.

## Where this demo fits

LiveNode treats the decision process itself as memory: the claims considered, evidence trusted, constraints accepted, alternatives rejected, and conditions that could change the conclusion. This record is an intermediate layer between a general-purpose LLM and its user. It does not reproduce a person or guarantee their decisions; it gives future human and AI work a reviewed record that can lean toward that person's experience, values, and judgment instead of relying only on a general model's high-quality statistical average.

The project has three distinct layers:

1. **Public web demo — capture layer (available now):** accepts either a focused idea memo or a meeting transcript. A memo becomes one reviewed six-part Decision Trace. A transcript can be split into up to five reviewed decision topics, analyzed with at most two requests in parallel, and downloaded as a Markdown ZIP.
2. **Local KX — working refinement layer (in active use by the developer):** a human-reviewed Markdown workflow that distills conversations and reconnects durable knowledge over time. This workflow is not hosted inside the public demo.
3. **Distributable Skill — planned delivery layer:** a future package intended to bring the workflow into other AI environments and personal knowledge stores. Cross-AI installation and automatic Obsidian or Notion saving are not implemented in the public demo.

The public demo now includes transcript topic detection for up to five reviewed topics, per-topic generation with at most two analyses in parallel, retry of failed topics without discarding successful ones, and a browser-generated Markdown ZIP. The meeting input accepts up to 30,000 characters. Direct Obsidian or Notion saving remains future Skill work and is not presented as a live web capability.

## How Codex and GPT-5.6 contributed

This project was built during OpenAI Build Week as a collaboration between Takahiro Nochi and Codex. Nochi made the product decisions: preserve judgment rather than only summaries, keep the six-part human Decision Trace separate from the five-part KX persistence format, require human review before multi-topic generation, and treat the web app as a public experience layer rather than claiming that local knowledge-store integrations already exist.

Codex accelerated the implementation by turning those decisions into the Next.js interface, strict data contracts, grounded transcript segmentation, bounded concurrency and retry behavior, deterministic Markdown ZIP export, automated tests, accessibility checks, and Cloudflare deployment. Codex also helped find and repair failures observed in real use, including topic grounding and the all-failed flow advancing to ZIP too early. The dated commit history records the work completed during the submission period.

GPT-5.6 is used at runtime through the OpenAI Responses API to produce the structured Decision Trace for each selected topic and for focused memos. To reduce demo cost, `gpt-5.4-nano` first detects decision-bearing topics in untrusted transcript segments. Neither model's output is trusted directly: the server resolves segment IDs back to source ranges, validates strict schemas, verifies evidence against the supplied text, and exposes AI inference separately from grounded evidence.

### 日本語訳

本プロジェクトはOpenAI Build Week期間中に、野地教弥とCodexの協働で制作しました。野地が決めたのは、要約だけでなく判断過程を残すこと、人向けの6項目Decision Traceと保存用の5項目KX形式を分けること、複数テーマ生成の前に人間の確認を入れること、そしてローカルの知識基盤との連携を実装済みと誤認させず、Webアプリを公開体験層として位置づけることです。

Codexは、それらの判断をNext.jsの画面、厳密なデータ契約、根拠位置を持つ文字起こし分割、同時実行数と再試行の制御、決定的なMarkdown ZIP出力、自動テスト、アクセシビリティ確認、Cloudflareへのデプロイへ変換しました。また、実利用で見つかったテーマ根拠の不一致や、全テーマ失敗時にZIPへ進んでしまう問題の切り分けと修正にも使いました。応募期間中の作業は日付付きのコミット履歴で確認できます。

GPT-5.6はOpenAI Responses API経由で、選択された各テーマとアイデアメモの構造化Decision Traceを生成します。デモの費用を抑えるため、文字起こしから判断テーマを検出する前処理には`gpt-5.4-nano`を使用します。どちらのモデル出力もそのまま信用せず、サーバーが区間IDを原文位置へ戻し、厳密な形式を検証し、根拠が入力文に存在することを確認し、AI推論と入力根拠を分けて表示します。

## The problem

AI recommendations are easy to generate but hard to audit or reuse. The conclusion often survives while the facts, assumptions, rejected options, and conditions that would change it disappear. Decision Trace makes that reasoning visible and converts it into a durable note for later human or AI use.

## Decision Trace: six human-facing sections

1. **Situation** — the decision and relevant context.
2. **Assumptions** — explicit and inferred premises, clearly distinguished.
3. **Decision criteria** — values, constraints, and success measures.
4. **Options and trade-offs** — benefits, costs, risks, and reversibility.
5. **Recommendation** — the preferred option, confidence, evidence, and change conditions.
6. **Next actions** — ordered steps that reduce uncertainty or move the decision forward.

Evidence labels distinguish text grounded in the memo from **AI inference**. The application does not present inferred details as supplied facts.

## KX Note: five AI-reusable sections

The same validated result is deterministically mapped to the KX pipeline's persistence format:

| KX Note section | Decision Trace source |
| --- | --- |
| Claim | Recommendation and confidence |
| Evidence | Recommendation reasoning, criteria, and grounded excerpts |
| Data | Situation, supplied facts, and considered options |
| Constraints | Assumptions, costs, risks, and change conditions |
| Links | Only connections explicitly present in the input |

Ordered next actions are appended as an operational supplement without changing the canonical five-part KX Note structure.

## Architecture

```text
Browser (Next.js UI)
  -> focused memo: POST /api/analyze
  -> transcript: POST /api/topics/detect
     -> human topic review, selection, and title editing
     -> POST /api/topics/analyze (maximum two in parallel)
  -> Cloudflare Worker / OpenNext runtime
  -> OpenAI Responses API (structured output)
  -> Zod validation
  -> grounded six-part Decision Trace JSON
  -> local deterministic Markdown conversion
     -> Decision Trace Markdown
     -> KX Note Markdown
     -> meeting summary, action list, manifest, and Markdown ZIP
```

- Next.js 16, React 19, and TypeScript
- OpenAI Responses API with a strict JSON schema
- Zod validation at the application boundary
- OpenNext for Cloudflare Workers
- Cloudflare rate-limit binding configured for 10 analysis requests per IP per 60 seconds as approximate abuse protection (not deterministic exact accounting)
- Vitest and Testing Library for unit/component/route tests
- Playwright for the browser flow and responsive layout
- No database, account, or application analytics

## Privacy boundary

- A submitted memo is sent from the browser to the same-origin Worker and then to OpenAI for processing.
- The application does not persist memo text and does not include memo text in application logs or analytics.
- Supplied facts require a verbatim evidence excerpt; AI inferences cannot carry or appear as supplied evidence. KX Data includes supplied context only.
- After schema validation, every supplied evidence excerpt, link label, and link source excerpt must occur in the submitted memo after Unicode NFKC normalization and whitespace collapse/trim. Link relationships remain explicitly AI-synthesized. Case, punctuation, and ellipses are not fuzzed; a mismatch uses the existing one malformed-response retry.
- Explicit core medical, legal, or financial terms trigger a deterministic qualified-human-review notice in the UI and both Markdown exports. The notice is computed from the input, not by the model, and the result is not professional advice.
- Request bodies are capped at 50,000 bytes before JSON parsing, including requests with absent or inaccurate `Content-Length` headers.
- The OpenAI API key is read only from the server-side Worker environment and is never returned to the browser.
- Provider error details are converted to small public error codes before a response reaches the client.
- Model output is schema-validated and rendered as text, not raw HTML.
- Do not submit confidential or regulated information to the public demo.

## Local setup

Requirements: Node.js 22 or later, npm, and a Cloudflare account for Worker preview/deployment.

```bash
npm install
cp .env.example .dev.vars
```

Set these variables in `.dev.vars` (the file is ignored by Git):

```dotenv
OPENAI_API_KEY=your-project-api-key
OPENAI_MODEL=gpt-5.6-luna
OPENAI_TOPIC_MODEL=gpt-5.4-nano
```

Run the Next.js development server:

```bash
npm run dev
```

Run the application in the Cloudflare Workers runtime:

```bash
npm run preview
```

## Tests

```bash
npm test
npm run build
npx playwright test
git diff --check
```

## Deployment

Authenticate Wrangler, store the production secret without adding it to source control, and deploy through the checked-in OpenNext script:

```bash
npx wrangler secret put OPENAI_API_KEY
npm run deploy
```

`OPENAI_MODEL` and `OPENAI_TOPIC_MODEL` are non-secret Worker variables configured in `wrangler.jsonc`. The Build Week configuration uses `gpt-5.6-luna` with reasoning effort `none` for Decision Trace generation and `gpt-5.4-nano` for topic detection; strict schemas and server-side validation remain the output boundary. Never commit `.dev.vars`, credentials, submitted memo content, or model responses.

Next.js owns the tracked `next-env.d.ts`. `next dev` (including Playwright) points it at `.next/dev/types`, while `next build` restores the canonical `.next/types` import. Run the production build after Playwright before the final clean-worktree check; do not hand-edit or pin the generated file with a brittle workaround.
