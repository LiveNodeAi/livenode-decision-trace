# Inspiration

AI can give us a recommendation in seconds, but the useful part of a real decision is often what disappears: what we knew, what we assumed, what alternatives we considered, and what evidence would make us change our mind. LiveNode is built around a simple principle: preserve the decision process, not only the output. Decision Trace turns that principle into a small, public tool anyone can understand in one interaction.

**One-line description:** LiveNode Decision Trace turns a conversation into a reusable memory of how a decision was made—not just what was decided.

## Core philosophy

Most AI memory systems preserve facts, summaries, and final answers. LiveNode starts from a different belief: the durable part of a person is their judgment process—the claims they considered, the evidence they trusted, the constraints they accepted, the alternatives they rejected, and the connections that shaped the decision. Capturing that process creates an intermediate layer between a general-purpose LLM and the person using it. Instead of asking the model only for the statistical center of its training, this layer can help future AI interactions lean toward that person's own reasoning and values. The result is memory for a future self: a record that explains not only what happened, but why. Because the record is portable Markdown, it can also support continuity across projects and AI tools without depending on one chat history or model provider.

## 日本語訳（上記英文の正本対応）

一般的なAIメモリーが残すのは、事実、要約、最終回答です。LiveNodeは、人にとって長く残すべきものは判断プロセスだと考えます。何を主張として考え、どの根拠を信じ、どんな制約を受け入れ、どの選択肢を退け、何との接続から判断したのか。その記録は、汎用LLMと利用者本人の間に置かれる中間レイヤーになります。モデルの学習データが生む統計的な中心だけに頼るのではなく、未来のAI作業を本人の経験・価値観・判断軸へ寄せるための材料になります。これは未来の自分のための記憶です。何が起きたかだけでなく、なぜそう考えたのかを残します。持ち運べるMarkdownにすることで、一つのチャット履歴やモデル提供者に依存せず、プロジェクトやAIをまたぐ継続性も支えます。

# What it does

A user pastes a Japanese or English decision memo, or chooses one of three built-in examples. The application returns six readable sections: Situation, Assumptions, Decision criteria, Options and trade-offs, Recommendation, and Next actions. Every analytical point is labeled as evidence from the input or AI inference.

The same result can then be copied in two forms. Decision Trace Markdown is designed for a person to review and act on. KX Note Markdown maps the result into five stable fields—Claim, Evidence, Data, Constraints, and Links—so another AI can retrieve and reuse the reasoning later without inventing connections.

# How we built it

We built a one-page Next.js and TypeScript application and deployed it to Cloudflare Workers through OpenNext. The Worker validates the memo, applies an IP-based rate limit, and calls `gpt-5.6-luna` through the OpenAI Responses API with reasoning effort `none` and a strict structured-output schema. Zod validates the returned object before it reaches the interface. Markdown generation is deterministic and runs from the validated result.

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

The project has three deliberately separate layers:

- **Web demo — capture layer:** the currently implemented public experience accepts one decision memo and produces a validated Decision Trace plus two copyable Markdown formats.
- **Local KX — working refinement layer:** the developer already uses a human-reviewed Markdown pipeline to capture, distill, and reconnect knowledge. That local workflow is not hosted by this demo.
- **Distributable Skill — planned delivery layer:** packaging the workflow for other people, AI environments, and storage adapters is future work. Automatic installation across AI tools and direct Obsidian or Notion saving are not implemented here.

This phase is implementing the next web-demo step: paste a longer transcript, review up to five detected decision topics, generate selected traces with limited parallelism, and download a browser-generated Markdown ZIP. These multi-topic and ZIP capabilities are in development and are not claimed as currently available. Later work may connect reviewed traces to personal knowledge stores and compare new decisions with earlier ones, but long-term personalization is not yet automatic.

## 「What's next」日本語訳

本プロジェクトは、3つの層を意図的に分けています。

- **Webデモ＝取り込み層：** 現在実装済みの公開体験では、1つの判断メモから検証済みDecision Traceと、コピー可能な2種類のMarkdownを生成します。
- **ローカルKX＝実働する精錬層：** 開発者は、人間が確認しながら知識を取り込み、蒸留し、再接続するMarkdownパイプラインをすでに実運用しています。ただし、このローカル運用はWebデモ内にホストされていません。
- **配布Skill＝将来の提供層：** 他の利用者、AI環境、保存先へワークフローを届けるパッケージ化は今後の予定です。複数AIへの自動導入やObsidian・Notionへの直接保存は、このデモでは実装していません。

現在のフェーズでは、長い文字起こしから最大5つの判断テーマを検出し、人が確認して選択したテーマを制限付きで並列生成し、ブラウザでMarkdown ZIPを作る機能を実装中です。複数テーマとZIPは開発中であり、現時点で利用可能とは説明しません。その後、確認済みTraceを個人の知識基盤へ接続し、過去の判断との比較へ広げる可能性がありますが、長期的な個人化はまだ自動化されていません。
