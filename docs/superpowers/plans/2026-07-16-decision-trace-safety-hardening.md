# Decision Trace Safety Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce provenance, deterministic high-impact notices, bounded request reading, and coherent build/E2E configuration.

**Architecture:** Pure schema/detector/formatter functions establish deterministic boundaries. The API computes high-impact status and returns it beside the validated trace; the client consumes that boolean for UI and exports. A streaming byte reader rejects oversized bodies before JSON parsing.

**Tech Stack:** TypeScript, Zod, Next.js App Router, React, Vitest, Testing Library, Playwright

## Global Constraints

- Keep `gpt-5.6-luna`, reasoning effort `none`, the 28-second timeout, and bounded trace cardinalities unchanged.
- Use conservative auditable Japanese and English high-impact keywords.
- Do not deploy or call the live API.
- Never log or persist memo, model output, or credential values.

---

### Task 1: Provenance contract and exports

**Files:** `lib/decision-trace-schema.ts`, `lib/markdown.ts`, `components/result-panel.tsx`, `tests/decision-trace-schema.test.ts`, `tests/markdown.test.ts`, `tests/decision-trace-app.test.tsx`

**Interfaces:** Produces a grounded-item discriminated union and deterministic inference/fact presentation.

- [ ] Add failing tests for both invalid evidence/inference combinations and inferred context exclusion from KX Data.
- [ ] Run targeted tests and confirm failures are caused by missing invariants/filtering.
- [ ] Implement the union, explicit UI labels, and KX supplied-fact filtering.
- [ ] Run targeted tests to GREEN.

### Task 2: High-impact safeguard

**Files:** create `lib/high-impact.ts`, modify route/app/result/Markdown files and their tests.

**Interfaces:** Produces `isHighImpactMemo(memo: string): boolean`, route `{ trace, highImpact }`, and formatter option `highImpact`.

- [ ] Add failing detector tests for conservative core JA/EN terms and ordinary-decision negatives.
- [ ] Add failing route, UI, and both-export notice tests.
- [ ] Implement the pure detector, server flag, bilingual notice, and qualified-review wording.
- [ ] Run targeted tests to GREEN.

### Task 3: Request byte cap

**Files:** `app/api/analyze/route.ts`, `tests/api-analyze.test.ts`, `components/decision-trace-app.tsx`

**Interfaces:** Produces `REQUEST_TOO_LARGE` with HTTP 413 and a 50,000-byte pre-parse cap.

- [ ] Add failing tests for oversized Content-Length, absent header oversized stream, dishonest header, and existing validation.
- [ ] Implement header preflight plus cumulative stream reader, UTF-8 decode, and JSON parse.
- [ ] Run route tests to GREEN.

### Task 4: Build and E2E coherence

**Files:** `next.config.ts`, `e2e/decision-trace.spec.ts`, README and current plan/runtime docs.

**Interfaces:** Pins Turbopack root and makes fixture/output language consistently Japanese.

- [ ] Update config and E2E fixture/assertions without changing coverage.
- [ ] Document provenance, safeguards, and body cap.
- [ ] Run full tests, build, Playwright, diff check, and secret-value scan.
- [ ] Commit the verified branch changes.
