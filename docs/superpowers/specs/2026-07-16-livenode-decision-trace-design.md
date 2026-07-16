# LiveNode Decision Trace — Design

## Goal

Build a public OpenAI Build Week demo that turns an unstructured decision memo into a traceable, human-readable decision structure. A judge must be able to choose a sample, generate a result, understand the recommendation, and copy it as Markdown within 30 seconds without instructions.

The product demonstrates the LiveNode principle that useful AI should preserve the process behind a decision, not only produce an answer.

## Scope

### Included

- One-page public web application
- Free-form text input
- Three one-click sample inputs
- OpenAI-powered structured analysis
- Six-section Decision Trace
- Evidence excerpts grounded in the submitted text
- Markdown copy/export in both human-facing Decision Trace and AI-reusable KX Note formats
- Japanese and English input
- Responsive desktop and mobile layouts
- Stateless processing with no database or account

### Excluded

- File or PDF uploads
- User accounts and cloud history
- Team collaboration
- Multi-agent debate
- Knowledge-base retrieval or personal AI-Brain access
- Editing individual trace cards after generation

## Core User Flow

1. The user lands on the page and understands the promise from the headline and short explanation.
2. The user pastes a decision memo or inserts one of three samples.
3. The user selects **Generate Decision Trace**.
4. The server validates the input and requests a schema-constrained analysis from OpenAI.
5. Six cards appear in order, with the recommendation and confidence summary shown first.
6. The user copies the result as either Decision Trace Markdown or KX Note Markdown, or resets the experience.

The three samples cover a business/product decision, a public-sector policy decision, and an everyday operational decision. Each sample includes genuine trade-offs rather than an obvious answer.

## Decision Trace Schema

The model must return a single validated object with these sections:

1. **Situation** — the decision to make and relevant context
2. **Assumptions** — explicit and hidden assumptions that affect the choice
3. **Decision criteria** — the values, constraints, and success measures that should govern the decision
4. **Options and trade-offs** — viable options with benefits, costs, risks, and reversibility
5. **Recommendation** — the recommended option, reasoning, confidence level, and conditions that could change it
6. **Next actions** — concrete, ordered steps that reduce uncertainty or move the decision forward

Each analytical claim may include short evidence excerpts from the input. The model must distinguish supplied facts from inference and must not invent unavailable facts.

## Relationship to the KX Pipeline

The six on-screen sections are a human-facing view for understanding and acting on a decision. The KX pipeline's canonical five sections — Claim, Evidence, Data, Constraints, and Links — are a persistence format for later AI retrieval and reuse.

The product keeps these layers distinct and provides a deterministic transformation:

```text
Decision Trace (six human-facing sections)
        ↓ transform
KX Note (five AI-reusable sections)
```

The KX Note mapping is:

| KX Note section | Decision Trace content |
|---|---|
| Claim | Recommendation and confidence |
| Evidence | Recommendation reasoning, decision criteria, and grounded excerpts |
| Data | Situation, supplied facts, and considered options |
| Constraints | Assumptions, trade-offs, risks, and conditions that would change the conclusion |
| Links | Related people, projects, and decision themes explicitly present in the input; the model must not invent connections |

Next actions are appended as an operational supplement after the canonical five sections rather than changing the KX Note schema. This preserves compatibility with the existing KX pipeline while retaining immediate usefulness.

## Interface Design

The interface is a single page with three states: input, generating, and result.

### Input state

- Product title and one-sentence explanation
- Large memo field with a useful example placeholder
- Three clearly labeled sample buttons
- Character count and concise validation guidance
- Primary generation button

### Generating state

- Preserve and visibly retain the submitted memo
- Show a short progress sequence tied to the trace stages
- Prevent duplicate submissions while the request is active

### Result state

- Recommendation summary and confidence at the top
- Six sequential cards with clear visual hierarchy
- Evidence labels that distinguish input text from AI inference
- **Copy Decision Trace**, **Copy KX Note**, and **Start over** actions

The visual direction uses a restrained cosmic/constellation motif associated with LiveNode, while keeping the content surface bright, legible, and immediately scannable. Decorative effects must not compete with the trace.

## Architecture

- **Application:** Next.js with TypeScript
- **Styling:** Tailwind CSS
- **AI integration:** OpenAI Responses API with schema-constrained structured output
- **Schema boundary:** provider-compatible structural JSON Schema without grounded-item unions, followed by strict local provenance and memo-grounding validation
- **Hosting:** Cloudflare Pages and Workers-compatible runtime
- **Persistence:** none; browser state is cleared on reset or page close
- **Secrets:** OpenAI credentials remain in server-side environment variables
- **Model:** configurable through an environment variable and set to an eligible model recommended in the current OpenAI Build Week resources

The browser sends only the memo text and locale to a same-origin server endpoint. The endpoint validates length, calls OpenAI, validates the response schema, and returns the Decision Trace. The browser converts the validated object to both Markdown formats locally.

## Validation and Error Handling

- Reject empty or extremely short input before an API call and explain what information is missing.
- If no decision can be identified, return a helpful prompt asking the user to state the decision in one sentence.
- Preserve the memo when network or API requests fail and provide a retry action.
- Retry once on a malformed model response; after that, return a plain-language failure without exposing technical details.
- Apply request-size and rate limits appropriate to a public demo.
- For medical, legal, financial, or other high-impact decisions, label the result as decision support and recommend qualified human review rather than presenting it as authoritative advice.

## Privacy and Security

- Do not add a database, analytics payload containing memo text, or server-side application logging of submitted content.
- Do not expose API keys or provider error bodies to the client.
- Do not render model output as raw HTML.
- Treat all submitted text as untrusted data and keep it separate from system instructions.
- Explain near the input that content is sent to OpenAI for processing and is not saved by this application.

## Testing

### Automated

- Schema tests for a complete valid trace and rejected malformed traces
- Unit tests for input validation and both Markdown conversions
- Route tests for success, provider failure, timeout, and malformed provider response
- Security check confirming no secret is present in the client bundle

### Manual production verification

- Run all three samples through the deployed URL
- Test short, long, Japanese, and English input
- Confirm the full flow works on desktop and mobile widths
- Confirm failed requests retain input and retry correctly
- Confirm Decision Trace copy produces all six sections
- Confirm KX Note copy produces Claim, Evidence, Data, Constraints, and Links without invented connections
- Measure the sample-to-result flow and keep it within the 30-second success target under normal conditions

## Submission Assets

The implementation must support creation of:

- A public demo URL
- A public source repository or reviewable code link
- A 60–90 second demo video showing sample selection, generation, evidence, and KX Note transformation
- A 3:2 project thumbnail and two or three screenshots
- A Devpost project story covering inspiration, implementation, lessons, and challenges

## Acceptance Criteria

- A first-time visitor can complete the core flow without instructions.
- Every successful result contains all six schema sections.
- Recommendations are visibly grounded in supplied text and distinguish inference.
- The same result can be copied as both a human-facing Decision Trace and an AI-reusable KX Note.
- Submitted memo text is not persisted by the application.
- API secrets never reach the browser.
- The deployed production flow is manually verified on desktop and mobile.
- Required Devpost links and media can be produced from the finished application.
