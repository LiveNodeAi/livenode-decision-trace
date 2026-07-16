# Decision Trace Safety Hardening Design

## Goal

Strengthen provenance, high-impact decision safeguards, request-body resource limits, and build/test coherence without changing the model, 28-second timeout, bounded output contract, or deployment.

## Design

Grounded items form a strict discriminated union: supplied facts use `inference: false` with non-empty evidence; AI inferences use `inference: true` with `evidence: null`. UI and Markdown always label inference, and KX Data includes only supplied context facts.

The provider-facing JSON Schema is deliberately separate from that canonical local invariant. It represents a grounded item as one object with `text`, nullable `evidence`, and boolean `inference`, using a type array rather than `oneOf`/`anyOf`; the unchanged local discriminated union and memo-grounding pass reject invalid provenance combinations after generation. Both schemas retain the same collection bounds.

After structural parsing, grounding is repaired conservatively and deterministically rather than retried. A supplied item remains `inference: false` only when its non-empty normalized evidence is an exact normalized memo substring; every other provenance combination is downgraded to `inference: true` with `evidence: null`, without changing its text or any option content. Links are kept only when both their non-empty label and source excerpt occur in the memo; invalid links are dropped while the relationship remains AI synthesis. The canonical local schema validates the sanitized result. `ANALYSIS_COULD_NOT_GROUND` is therefore reserved for a response that remains structurally/canonically unusable after this repair, not for a correctable excerpt mismatch.

A pure, conservative bilingual keyword detector identifies explicit core medical, legal, and financial terms in the submitted memo. The server computes `highImpact`; the model cannot set it. A true flag adds a concise notice in the result UI and both Markdown formats that qualified human review is needed and the output is not professional advice.

The API rejects declared bodies over 50,000 bytes with `REQUEST_TOO_LARGE`/413. It also reads the body stream with a cumulative byte limit before decoding and parsing JSON, covering absent or dishonest Content-Length headers.

Next.js pins Turbopack root to this project directory. The E2E fixture uses coherent Japanese language/content and Japanese export assertions.

## Verification

Strict TDD covers schema invariants, deterministic detection, route response/limits, UI notice, Markdown filtering/notices, config, and Japanese E2E behavior. Final gates are full Vitest, Next build, Playwright, diff check, and credential-value scan. No deployment or live API call is in scope.
