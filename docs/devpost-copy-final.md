# Tagline

AI gives answers. Decision Trace preserves why—turning meeting transcripts into evidence-backed decisions and next actions.

# Inspiration

I spend half of each month embedded in a rural town hall serving 7,500 residents, helping run bicycle-tourism programs alongside local government staff. Decisions are made in meetings every day—but months later, it can be difficult to reconstruct why one option was chosen and another rejected. Minutes preserve conclusions; the judgment behind them fades. I built Decision Trace to preserve that judgment.

AI can give us a recommendation in seconds, but the useful part of a real decision is often what disappears: what we knew, what we assumed, what alternatives we considered, and what evidence would make us change our mind. LiveNode is built around a simple principle: preserve the decision process, not only the output. Decision Trace turns that principle into a small, public tool anyone can understand in one interaction.

## Core philosophy

Most AI memory systems preserve facts, summaries, and final answers. LiveNode starts from a different belief: the durable part of a person is their judgment process—the claims they considered, the evidence they trusted, the constraints they accepted, the alternatives they rejected, and the connections that shaped the decision. Capturing that process creates an intermediate layer between a general-purpose LLM and the person using it. Instead of asking the model only for the statistical center of its training, this layer can help future AI interactions lean toward that person's own reasoning and values. The result is memory for a future self: a record that explains not only what happened, but why. Because the record is portable Markdown, it can also support continuity across projects and AI tools without depending on one chat history or model provider.

LiveNode transforms not only a person's knowledge but also the path of their judgment into a form AI can reference, serving as an intermediate layer that mediates FUSION between human and AI. Rather than giving AI access to the person themselves, it provides a structure through which AI can access the judgment framework that person has reviewed and chosen to preserve.

# What it does

Paste a one-hour meeting transcript. Decision Trace finds up to five decisions buried inside, you approve them, and moments later you have a ZIP of Markdown files—each showing the situation, assumptions, criteria, rejected options, recommendation, and next actions.

A user can paste either a focused Japanese or English idea memo, or a meeting transcript of up to 30,000 characters. An idea memo returns one six-part trace: Situation, Assumptions, Decision criteria, Options and trade-offs, Recommendation, and Next actions. In meeting mode, the application detects up to five grounded decision topics, lets the user review, rename, select, or exclude them, and generates the selected traces with no more than two analyses running in parallel.

Every analytical item inside a Decision Trace is labeled as either a verbatim excerpt from the source text or an explicit AI inference. The server verifies that each evidence excerpt actually occurs in the supplied source—the model is never trusted to declare its own grounding.

An idea result can be copied in two forms. Decision Trace Markdown is designed for a person to review and act on. KX Note Markdown maps the result into five stable fields—Claim, Evidence, Data, Constraints, and Links—so another AI can retrieve and reuse the reasoning later without inventing connections. A meeting result can be downloaded as one Markdown ZIP containing the meeting summary, action list, manifest, and per-topic Decision Trace and KX Note files. If one topic fails, completed topics remain available and only the failed topic needs to be retried.

# How we built it

We use a two-model pipeline: `gpt-5.4-nano` cheaply detects decision-bearing topics in untrusted transcript segments, then `gpt-5.6-luna` generates each trace through the OpenAI Responses API with strict structured outputs and reasoning effort `none`. Neither model is trusted directly: the server resolves segment IDs back to source ranges, validates strict Zod schemas, and verifies every evidence excerpt against the supplied text.

We built a one-page Next.js and TypeScript application and deployed it to Cloudflare Workers through OpenNext. The Worker validates input and applies IP-based rate limits. Markdown generation is deterministic and runs only from the validated result.

The application is deliberately stateless: there is no account, database, or memo analytics. The browser sends the memo only to a same-origin endpoint, the server sends it to OpenAI for processing, and public error codes prevent provider details or secrets from leaking to the client. Vitest covers the schema, validation, route behavior, and Markdown output; Playwright covers complete browser flows and responsive layout.

# Challenges

The hardest design problem was grounding. A polished recommendation is not trustworthy if the model silently turns assumptions into facts. We therefore made grounding part of the data model: each item carries either a short evidence excerpt or an explicit inference flag. We also separated the six-part human interface from the five-part KX persistence format instead of forcing one structure to do both jobs.

The other challenge was making a real AI demo safe to leave public. We kept secrets in the Worker environment, normalized errors, constrained input size, added rate limiting, avoided raw HTML rendering, and designed production verification around checking responses, bundles, logs, and copied output without retaining submitted memo text.

# Accomplishments

- **Grounding as a data-model feature:** every analytical item carries either a verbatim evidence excerpt verified against the source or an explicit AI-inference flag—not a disclaimer, but a schema.
- **Human review built into the flow:** transcripts never go straight to bulk generation; users review and edit detected topics first, and failed topics retry independently without discarding successful ones.
- **One validated result, two formats:** a human-readable six-part Decision Trace and an AI-reusable five-part KX Note are generated deterministically from the same schema.
- **Reliability demonstrated in code:** automated unit, route, browser, and responsive-layout tests cover success and failure paths without spending API credits in CI.

# What we learned

Structured output is most valuable when the structure reflects a real human review process, not merely a convenient JSON shape. Confidence alone is weak; confidence plus evidence, reversibility, and explicit change conditions is much more actionable. We also learned that a durable AI memory format should not replace the interface a human needs now—the transformation between the two is the product boundary.

# What's next

Next: one-click saving of reviewed traces into personal knowledge stores such as Obsidian or Notion, and comparing new decisions against earlier traces. The web demo is the capture layer; the developer's human-reviewed local KX workflow is the refinement layer; and a future distributable Skill will carry the same workflow into other AI environments. Direct Obsidian or Notion saving and cross-AI installation are not implemented in this web demo.

# Links

- Live demo: https://livenode-decision-trace.takahiro-nochi.workers.dev/?lang=en
- Source code: https://github.com/LiveNodeAi/livenode-decision-trace
