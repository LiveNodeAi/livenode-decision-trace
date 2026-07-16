# LiveNode Decision Trace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a one-page OpenAI Build Week demo that converts an unstructured decision memo into a grounded six-part Decision Trace and exports the same result as a canonical five-part KX Note.

**Architecture:** A Next.js App Router application renders the entire workflow on one page and calls one same-origin route handler. The server validates input, applies a Cloudflare rate-limit binding, calls the OpenAI Responses API with strict JSON Schema and `store: false`, validates the returned object, and sends it to the browser. Pure client-side formatters produce Decision Trace and KX Note Markdown without persistence.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Zod, official OpenAI JavaScript SDK, Vitest, Testing Library, Playwright, Cloudflare Workers, OpenNext adapter, Wrangler.

## Global Constraints

- The public experience must work without an account or database.
- The app must not persist submitted memo text or include memo text in application analytics or logs.
- OpenAI credentials must remain server-side and must never appear in client bundles or browser responses.
- The OpenAI request must use the Responses API, strict structured output, and `store: false`.
- The model name must come from `OPENAI_MODEL`; current local and production configuration use the Build Week model `gpt-5.6-luna`.
- Input length must be 80–12,000 Unicode characters after trimming.
- Request bodies above 50,000 bytes must return HTTP 413 before JSON parsing, using both Content-Length preflight and a streamed byte cap.
- Non-inference grounded items require non-empty evidence; inference items require null evidence and may not appear as supplied KX Data.
- Explicit core medical, legal, and financial input terms deterministically add a qualified-professional review notice to the UI and both exports.
- The public API must use a Cloudflare rate-limit binding configured for 10 analysis requests per IP per 60 seconds as approximate abuse protection. Cloudflare rate limiting is intentionally eventually consistent and is not deterministic exact request accounting.
- The human-facing result must contain Situation, Assumptions, Decision criteria, Options and trade-offs, Recommendation, and Next actions.
- The KX Note export must contain Claim, Evidence, Data, Constraints, and Links in that order; Next actions follow as a non-canonical operational supplement.
- KX links may only come from people, projects, or decision themes explicitly present in the input.
- The interface must support Japanese and English input, mobile widths from 375px, and desktop widths through 1440px.
- A first-time visitor must be able to choose a sample, generate a trace, and copy a KX Note in under 30 seconds under normal production conditions.
- Follow the approved design in `docs/superpowers/specs/2026-07-16-livenode-decision-trace-design-ja.md`.

---

## Planned File Structure

```text
app/
  api/analyze/route.ts          # same-origin analysis endpoint
  globals.css                   # design tokens and responsive styling
  layout.tsx                    # metadata and document shell
  page.tsx                      # one-page experience entry
components/
  decision-trace-app.tsx        # input/generating/result state machine
  input-panel.tsx               # memo input and samples
  result-panel.tsx              # recommendation summary and six cards
  trace-card.tsx                # one focused result section
lib/
  analyze-decision.ts           # OpenAI call, retry, timeout, parsing
  decision-trace-schema.ts      # canonical Zod and JSON schemas/types
  markdown.ts                   # Decision Trace and KX Note formatters
  samples.ts                    # three bilingual-ready sample memos
  validation.ts                 # input rules and public error codes
  runtime-env.ts                # Cloudflare binding access boundary
tests/
  analyze-decision.test.ts
  api-analyze.test.ts
  decision-trace-app.test.tsx
  markdown.test.ts
  validation.test.ts
e2e/
  decision-trace.spec.ts
open-next.config.ts
wrangler.jsonc
vitest.config.ts
playwright.config.ts
```

Each file owns one responsibility. UI components consume only the exported `DecisionTrace` type and formatter functions; they do not know OpenAI response details.

---

### Task 1: Create the Cloudflare-compatible Next.js baseline and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `open-next.config.ts`
- Create: `wrangler.jsonc`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: `npm run dev`, `npm test`, `npm run build`, `npm run preview`, and `npm run deploy` commands used by every later task.

- [ ] **Step 1: Write the baseline rendering test**

Create `tests/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

it("renders the product name", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { name: /LiveNode Decision Trace/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Create configuration and install dependencies**

Run:

```bash
npm init -y
npm install next@latest react@latest react-dom@latest openai zod
npm install -D typescript @types/node @types/react @types/react-dom tailwindcss @tailwindcss/postcss vitest jsdom @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event @opennextjs/cloudflare@latest wrangler@latest
```

Replace `package.json` scripts with:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
  }
}
```

- [ ] **Step 3: Add the minimum app shell**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveNode Decision Trace",
  description: "Turn a messy decision memo into a traceable decision structure.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
```

Create `app/page.tsx`:

```tsx
export default function Page() {
  return <main><h1>LiveNode Decision Trace</h1></main>;
}
```

Create `app/globals.css`:

```css
@import "tailwindcss";

:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #070a12; color: #f5f7ff; font-family: Arial, sans-serif; }
button, textarea { font: inherit; }
```

Create `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, and `tests/setup.ts` with these complete configurations:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

```js
// postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } };
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "jsdom", setupFiles: ["./tests/setup.ts"] },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add Cloudflare configuration**

Create `open-next.config.ts`:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "livenode-decision-trace",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-07-16",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "ratelimits": [
    {
      "name": "DECISION_TRACE_RATE_LIMITER",
      "namespace_id": "1089731",
      "simple": { "limit": 10, "period": 60 }
    }
  ],
  "vars": { "OPENAI_MODEL": "gpt-5.6-luna" }
}
```

Create `.env.example`:

```dotenv
OPENAI_API_KEY=replace-with-a-server-side-key
OPENAI_MODEL=gpt-5.6-luna
```

- [ ] **Step 5: Run the baseline checks**

Run:

```bash
npm test
npm run build
```

Expected: the page test passes and the Next.js production build completes without TypeScript errors.

- [ ] **Step 6: Commit the baseline**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs app open-next.config.ts wrangler.jsonc vitest.config.ts tests/setup.ts tests/page.test.tsx .env.example .gitignore
git commit -m "chore: scaffold Decision Trace app"
```

---

### Task 2: Define the trace contract, samples, validation, and both Markdown exports

**Files:**
- Create: `lib/decision-trace-schema.ts`
- Create: `lib/validation.ts`
- Create: `lib/samples.ts`
- Create: `lib/markdown.ts`
- Test: `tests/validation.test.ts`
- Test: `tests/markdown.test.ts`

**Interfaces:**
- Produces: `DecisionTrace`, `decisionTraceSchema`, `validateMemo(memo)`, `samples`, `toDecisionTraceMarkdown(trace)`, and `toKxNoteMarkdown(trace)`.
- Consumers: Tasks 3–6.

- [ ] **Step 1: Write failing validation and formatter tests**

Create `tests/validation.test.ts`:

```ts
import { validateMemo } from "@/lib/validation";

it("rejects a memo shorter than 80 trimmed characters", () => {
  expect(validateMemo("short memo")).toEqual({ ok: false, code: "MEMO_TOO_SHORT" });
});

it("accepts a memo between 80 and 12000 characters", () => {
  expect(validateMemo("a".repeat(80))).toEqual({ ok: true, memo: "a".repeat(80) });
});
```

Create `tests/markdown.test.ts` with one complete fixture and assert these exact headings:

```ts
expect(toDecisionTraceMarkdown(trace)).toContain("## Situation");
expect(toDecisionTraceMarkdown(trace)).toContain("## Next actions");
expect(toKxNoteMarkdown(trace)).toMatch(/## Claim[\s\S]*## Evidence[\s\S]*## Data[\s\S]*## Constraints[\s\S]*## Links/);
expect(toKxNoteMarkdown(trace)).toContain("## Operational next actions");
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- tests/validation.test.ts tests/markdown.test.ts
```

Expected: FAIL because the four modules do not exist.

- [ ] **Step 3: Implement the canonical schema**

Create `lib/decision-trace-schema.ts` using Zod. Define exact fields:

```ts
import { z } from "zod";

const groundedItemSchema = z.object({
  text: z.string().min(1),
  evidence: z.string().min(1).nullable(),
  inference: z.boolean(),
});

const optionSchema = z.object({
  name: z.string().min(1),
  benefits: z.array(z.string().min(1)).min(1),
  costs: z.array(z.string().min(1)).min(1),
  risks: z.array(z.string().min(1)),
  reversible: z.boolean(),
});

export const decisionTraceSchema = z.object({
  language: z.enum(["ja", "en"]),
  situation: z.object({ decision: z.string().min(1), context: z.array(groundedItemSchema).min(1) }),
  assumptions: z.array(groundedItemSchema).min(1),
  criteria: z.array(groundedItemSchema).min(1),
  options: z.array(optionSchema).min(2).max(5),
  recommendation: z.object({
    option: z.string().min(1),
    reasoning: z.array(groundedItemSchema).min(1),
    confidence: z.enum(["low", "medium", "high"]),
    changeConditions: z.array(z.string().min(1)),
  }),
  nextActions: z.array(z.object({ order: z.number().int().positive(), action: z.string().min(1) })).min(1).max(7),
  links: z.array(z.object({ label: z.string().min(1), relationship: z.string().min(1), sourceExcerpt: z.string().min(1) })),
});

export type DecisionTrace = z.infer<typeof decisionTraceSchema>;
```

- [ ] **Step 4: Implement validation, three samples, and pure formatters**

`validateMemo` must trim input and return only these unions:

```ts
export type MemoValidation =
  | { ok: true; memo: string }
  | { ok: false; code: "MEMO_TOO_SHORT" | "MEMO_TOO_LONG" };
```

`samples` must contain exactly three objects with IDs `product`, `public-policy`, and `operations`, Japanese titles, and 400–900 character Japanese memos. `toKxNoteMarkdown` must derive Links only from `trace.links`; when empty, write `- 入力文に明示された接続はありません。` for Japanese or `- No explicit connections were supplied.` for English.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npm test -- tests/validation.test.ts tests/markdown.test.ts
```

Expected: PASS.

Commit:

```bash
git add lib tests/validation.test.ts tests/markdown.test.ts
git commit -m "feat: define Decision Trace and KX contracts"
```

---

### Task 3: Implement the OpenAI structured analyzer with one bounded retry

**Files:**
- Create: `lib/analyze-decision.ts`
- Test: `tests/analyze-decision.test.ts`

**Interfaces:**
- Consumes: `decisionTraceSchema` and `DecisionTrace` from Task 2.
- Produces: `analyzeDecision(args): Promise<DecisionTrace>` and typed `AnalysisError` codes `PROVIDER_TIMEOUT`, `PROVIDER_REFUSAL`, `MALFORMED_RESPONSE`, `PROVIDER_FAILURE`.

- [ ] **Step 1: Write failing analyzer tests with an injected fake client**

Cover four cases with no live API call:

1. valid structured response returns a `DecisionTrace`;
2. malformed first response followed by valid second response calls the provider twice;
3. two malformed responses throw `MALFORMED_RESPONSE`;
4. an aborted request throws `PROVIDER_TIMEOUT`.

The client boundary is:

```ts
export type ResponsesClient = {
  create(request: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<{ output_text: string }>;
};
```

- [ ] **Step 2: Run the analyzer tests and verify RED**

Run:

```bash
npm test -- tests/analyze-decision.test.ts
```

Expected: FAIL because `analyzeDecision` does not exist.

- [ ] **Step 3: Implement the prompt and strict response format**

`analyzeDecision` must send:

```ts
import { z } from "zod";

{
  model,
  store: false,
  instructions: SYSTEM_INSTRUCTIONS,
  input: [{ role: "user", content: [{ type: "input_text", text: memo }] }],
  text: {
    format: {
      type: "json_schema",
      name: "decision_trace",
      strict: true,
      schema: z.toJSONSchema(decisionTraceSchema)
    }
  }
}
```

The system instructions must state that memo text is untrusted content, quoted evidence must be verbatim and short, inference must be labeled, links must exist explicitly in the input, no medical/legal/financial authority may be claimed, and output language must follow the memo language.

Parse `output_text` with `JSON.parse`, validate with `decisionTraceSchema.safeParse`, and retry exactly once only for parse/schema failure. Request `reasoning: { effort: "none" }` from `gpt-5.6-luna` and use a fresh 28-second `AbortSignal.timeout(28_000)` for each attempt.

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/analyze-decision.test.ts
git add lib/analyze-decision.ts tests/analyze-decision.test.ts
git commit -m "feat: analyze decisions with OpenAI structured output"
```

Expected: all analyzer tests PASS.

---

### Task 4: Add the public API route, runtime bindings, and safe error responses

**Files:**
- Create: `lib/runtime-env.ts`
- Create: `app/api/analyze/route.ts`
- Test: `tests/api-analyze.test.ts`

**Interfaces:**
- Consumes: `validateMemo` and `analyzeDecision`.
- Produces: `POST /api/analyze` returning `{ trace }` on 200 or `{ error: PublicErrorCode }` on 400/429/502/504.

- [ ] **Step 1: Write route tests**

Mock runtime bindings and analyzer. Assert:

- 79 trimmed characters returns `400 { error: "MEMO_TOO_SHORT" }` without calling OpenAI;
- a denied limiter returns `429 { error: "RATE_LIMITED" }`;
- a valid request returns `200 { trace }`;
- timeout returns `504 { error: "ANALYSIS_TIMEOUT" }`;
- provider failure returns `502 { error: "ANALYSIS_UNAVAILABLE" }`;
- no response includes the API key or provider error body.

- [ ] **Step 2: Implement the runtime boundary**

`lib/runtime-env.ts` exports:

```ts
export type RuntimeEnv = {
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  DECISION_TRACE_RATE_LIMITER: { limit(input: { key: string }): Promise<{ success: boolean }> };
};

export async function getRuntimeEnv(): Promise<RuntimeEnv> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  return (await getCloudflareContext({ async: true })).env as unknown as RuntimeEnv;
}
```

- [ ] **Step 3: Implement `POST` with dependency boundaries**

The route must:

1. parse JSON and require a string `memo`;
2. validate the 80–12,000 character range;
3. obtain the client IP from `cf-connecting-ip`, falling back to `unknown`;
4. call `DECISION_TRACE_RATE_LIMITER.limit({ key: `analyze:${ip}` })`;
5. construct `new OpenAI({ apiKey: env.OPENAI_API_KEY })` server-side;
6. call `analyzeDecision` with `env.OPENAI_MODEL`;
7. return only public error codes and never call `console.log` with memo or model output.

- [ ] **Step 4: Run route tests, the full suite, and commit**

```bash
npm test -- tests/api-analyze.test.ts
npm test
git add app/api/analyze/route.ts lib/runtime-env.ts tests/api-analyze.test.ts
git commit -m "feat: expose protected analysis endpoint"
```

Expected: all tests PASS.

---

### Task 5: Build the one-page input, progress, result, and copy experience

**Files:**
- Create: `components/decision-trace-app.tsx`
- Create: `components/input-panel.tsx`
- Create: `components/result-panel.tsx`
- Create: `components/trace-card.tsx`
- Modify: `app/page.tsx`
- Test: `tests/decision-trace-app.test.tsx`

**Interfaces:**
- Consumes: `samples`, `validateMemo`, `DecisionTrace`, `toDecisionTraceMarkdown`, and `toKxNoteMarkdown`.
- Produces: complete interactive client flow rendered by `app/page.tsx`.

- [ ] **Step 1: Write interaction tests**

Use Testing Library and mocked `fetch` to verify:

- selecting the public-policy sample fills the textarea;
- short input displays localized guidance without calling `fetch`;
- submitting valid input disables the generation button and shows progress;
- a successful response renders six named sections and confidence;
- 429 and 504 responses retain the memo and show retry text;
- Copy Decision Trace and Copy KX Note call `navigator.clipboard.writeText` with the correct formatter output;
- Start over returns to an empty input state.

- [ ] **Step 2: Run the UI test and verify RED**

```bash
npm test -- tests/decision-trace-app.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement the state machine**

Use this explicit state union in `decision-trace-app.tsx`:

```ts
type AppState =
  | { status: "input"; memo: string; error: string | null }
  | { status: "generating"; memo: string }
  | { status: "result"; memo: string; trace: DecisionTrace }
  | { status: "error"; memo: string; error: string };
```

Submit JSON `{ memo }` to `/api/analyze`. Do not put memo text in a URL, storage API, analytics event, or console call. Preserve `memo` on all failure branches.

- [ ] **Step 4: Implement accessible panels and cards**

Requirements:

- textarea has a visible label and `aria-describedby` privacy/help text;
- progress uses `role="status"` and does not fake a percentage;
- errors use `role="alert"`;
- all actions are reachable and visible with keyboard focus;
- evidence is labeled `入力からの根拠` or `Evidence from input`;
- inferred items are labeled `AIによる推論` or `AI inference`;
- the privacy note says the app does not save content and that content is sent to OpenAI for processing.

- [ ] **Step 5: Run tests and commit**

```bash
npm test -- tests/decision-trace-app.test.tsx
npm test
git add app/page.tsx components tests/decision-trace-app.test.tsx
git commit -m "feat: add Decision Trace user experience"
```

Expected: all tests PASS.

---

### Task 6: Apply the LiveNode visual system and verify responsive accessibility

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `components/input-panel.tsx`
- Modify: `components/result-panel.tsx`
- Modify: `components/trace-card.tsx`
- Create: `e2e/decision-trace.spec.ts`
- Create: `playwright.config.ts`

**Interfaces:**
- Consumes: the complete UI from Task 5.
- Produces: polished, responsive, keyboard-usable production interface and browser checks.

- [ ] **Step 1: Add Playwright and write the browser acceptance test**

Run:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

The test must mock `/api/analyze` with a valid fixture, then verify at 1440×900 and 375×812 that sample selection, generation, six cards, both copy actions, and reset are visible and usable.

- [ ] **Step 2: Implement the visual tokens**

Define exact CSS variables in `app/globals.css`:

```css
:root {
  --space: #070a12;
  --surface: rgba(17, 23, 42, 0.86);
  --surface-strong: #141b30;
  --ink: #f7f8ff;
  --muted: #aab3ca;
  --cyan: #63e6e2;
  --violet: #a78bfa;
  --amber: #f6c76e;
  --line: rgba(170, 179, 202, 0.22);
  --danger: #ff8c9b;
  --radius: 20px;
}
```

Use a restrained radial star-field background, maximum content width of 1180px, minimum 16px body text, minimum 44px interactive targets, visible 2px cyan focus rings, and one-column card layout below 760px. Do not add animation that blocks interaction or causes layout shift.

- [ ] **Step 3: Run automated and browser checks**

```bash
npm test
npm run build
npx playwright test
```

Expected: unit/component tests PASS, Next.js build succeeds, and both Playwright viewport projects PASS.

- [ ] **Step 4: Commit visual and accessibility work**

```bash
git add app components e2e playwright.config.ts package.json package-lock.json
git commit -m "feat: polish responsive LiveNode interface"
```

---

### Task 7: Document, preview in the Workers runtime, deploy, and collect submission evidence

**Files:**
- Create: `README.md`
- Create: `docs/submission/devpost-story.md`
- Create: `docs/submission/demo-script-ja.md`
- Modify: `wrangler.jsonc` only if the generated OpenNext config requires a documented compatibility adjustment.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: public Worker URL, reproducible setup instructions, Devpost story draft, and 60–90 second recording script.

- [ ] **Step 1: Write the README and submission drafts**

README must include the problem, six-part Decision Trace, five-part KX Note mapping, architecture, privacy boundary, local setup, required environment variables, test commands, and deployment command. The Devpost story must use the headings Inspiration, What it does, How we built it, Challenges, Accomplishments, What we learned, and What's next. The Japanese demo script must fit 60–90 seconds and show one sample, evidence labels, and KX Note copy.

- [ ] **Step 2: Verify the Cloudflare runtime locally**

Create `.dev.vars` locally with `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.6-luna`; never add it to Git. Run:

```bash
npm run preview
```

In the preview, execute all three samples once. Expected: each produces all six sections and both Markdown formats; the terminal does not print memo or model output.

- [ ] **Step 3: Configure the production secret and deploy**

Run:

```bash
npx wrangler secret put OPENAI_API_KEY
npm run deploy
```

Entering the secret and performing the production deployment are external changes. Obtain user confirmation immediately before each final action if the execution environment requires it.

- [ ] **Step 4: Run production acceptance checks**

Against the returned `workers.dev` URL:

1. run all three samples;
2. run one Japanese and one English free-form memo;
3. measure sample click to result and record the duration;
4. inspect browser network responses for accidental secret/provider-error exposure;
5. verify the 375px and desktop layouts;
6. copy both Markdown formats and confirm all required headings;
7. confirm the deployed rate-limit binding is configured for 10 requests per 60 seconds and that the route maps a limiter denial to HTTP 429; treat the binding as approximate abuse protection rather than requiring a deterministic 11th-request rejection.

Save only non-sensitive screenshots and timing results in `docs/submission/verification.md`; never save submitted memo text.

- [ ] **Step 5: Final verification and commit**

```bash
npm test
npm run build
npx playwright test
git diff --check
git status --short
git add README.md docs/submission
git commit -m "docs: prepare Build Week submission"
```

Expected: all checks PASS; only intentionally untracked local secret files remain; the commit contains no credentials or memo content.

---

## Completion Gate

Implementation is complete only when:

- all Vitest and Playwright tests pass;
- the OpenNext production build succeeds;
- the deployed Worker is tested with all three samples on desktop and mobile;
- both Markdown exports are verified;
- no secret or submitted memo content appears in Git, client bundles, responses, analytics, or application logs;
- the production sample flow is measured under 30 seconds under normal conditions;
- the public demo URL, project story, screenshots, and demo-video script are ready for Devpost.
