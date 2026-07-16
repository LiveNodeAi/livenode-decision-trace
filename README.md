# LiveNode Decision Trace

LiveNode Decision Trace turns an unstructured decision memo into a traceable decision record. Instead of returning only an answer, it preserves the situation, assumptions, criteria, trade-offs, recommendation, and next actions that led to the answer.

The public demo is a stateless Next.js application deployed to Cloudflare Workers. It accepts Japanese or English text, uses the OpenAI Responses API to produce a schema-validated result, and lets the user copy that result in two Markdown formats.

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
  -> POST /api/analyze (validated memo only)
  -> Cloudflare Worker / OpenNext runtime
  -> OpenAI Responses API (structured output)
  -> Zod validation
  -> six-part Decision Trace JSON
  -> local deterministic Markdown conversion
     -> Decision Trace Markdown
     -> KX Note Markdown
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
OPENAI_MODEL=gpt-5
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

`OPENAI_MODEL` is a non-secret Worker variable configured in `wrangler.jsonc`. Never commit `.dev.vars`, credentials, submitted memo content, or model responses.
