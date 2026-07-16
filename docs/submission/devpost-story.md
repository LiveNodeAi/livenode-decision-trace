# Inspiration

AI can give us a recommendation in seconds, but the useful part of a real decision is often what disappears: what we knew, what we assumed, what alternatives we considered, and what evidence would make us change our mind. LiveNode is built around a simple principle: reproduce the decision process, not only the output. Decision Trace turns that principle into a small, public tool anyone can understand in one interaction.

# What it does

A user pastes a Japanese or English decision memo, or chooses one of three built-in examples. The application returns six readable sections: Situation, Assumptions, Decision criteria, Options and trade-offs, Recommendation, and Next actions. Every analytical point is labeled as evidence from the input or AI inference.

The same result can then be copied in two forms. Decision Trace Markdown is designed for a person to review and act on. KX Note Markdown maps the result into five stable fields—Claim, Evidence, Data, Constraints, and Links—so another AI can retrieve and reuse the reasoning later without inventing connections.

# How we built it

We built a one-page Next.js and TypeScript application and deployed it to Cloudflare Workers through OpenNext. The Worker validates the memo, applies an IP-based rate limit, and calls the OpenAI Responses API with a strict structured-output schema. Zod validates the returned object before it reaches the interface. Markdown generation is deterministic and runs from the validated result.

The application is deliberately stateless: there is no account, database, or memo analytics. The browser sends the memo only to a same-origin endpoint, the server sends it to OpenAI for processing, and public error codes prevent provider details or secrets from leaking to the client. Vitest covers the schema, validation, route behavior, and Markdown output; Playwright covers the complete browser flow and responsive layout.

# Challenges

The hardest design problem was grounding. A polished recommendation is not trustworthy if the model silently turns assumptions into facts. We therefore made grounding part of the data model: each item carries either a short evidence excerpt or an explicit inference flag. We also separated the six-part human interface from the five-part KX persistence format instead of forcing one structure to do both jobs.

The other challenge was making a real AI demo safe to leave public. We kept secrets in the Worker environment, normalized errors, constrained input size, added rate limiting, avoided raw HTML rendering, and designed production verification around checking responses, bundles, logs, and copied output without retaining submitted memo text.

# Accomplishments

- A first-time visitor can choose a sample, see a complete trace, and copy it without instructions.
- Japanese and English use the same validated schema while preserving language-appropriate labels.
- Supplied evidence and AI inference are visible at the point of each claim.
- One result becomes both a human-readable Decision Trace and an AI-reusable KX Note.
- The deployed application has no user database and does not intentionally log or persist submitted memos.
- Automated tests cover success, malformed output, timeout, provider failure, secrets, copy formats, and mobile layout.

# What we learned

Structured output is most valuable when the structure reflects a real human review process, not merely a convenient JSON shape. Confidence alone is weak; confidence plus evidence, reversibility, and explicit change conditions is much more actionable. We also learned that a durable AI memory format should not replace the interface a human needs now—the transformation between the two is the product boundary.

# What's next

The next step is to let a user edit individual trace items before export while keeping provenance intact. After that, Decision Trace could connect to a personal knowledge store, compare a new decision with earlier decisions, and surface which assumptions changed. A team version could collect independent traces before discussion, making disagreements about facts and criteria visible without turning the product into an opaque multi-agent debate.
