# Inspiration

I spend half of each month embedded in a rural town hall serving 7,500 residents, helping run bicycle-tourism programs alongside local government staff. Decisions are made in meetings every day—but months later, it can be difficult to reconstruct why one option was chosen and another rejected. Minutes preserve conclusions; the judgment behind them fades. I built Decision Trace to preserve that judgment.

AI can give us a recommendation in seconds, but the useful part of a real decision is often what disappears: what we knew, what we assumed, what alternatives we considered, and what evidence would make us change our mind. LiveNode is built around a simple principle: preserve the decision process, not only the output. Decision Trace turns that principle into a small, public tool anyone can understand in one interaction.

**「Inspiration」日本語訳：** 私は毎月の半分を、人口7,500人の地方の役場の現場で過ごし、自治体職員と一緒に自転車観光事業を運営しています。会議では毎日のように判断が行われます。しかし数か月後には、なぜある案を選び、別の案を退けたのかを再現することが難しくなります。議事録には結論が残りますが、その判断は薄れていく。Decision Traceは、その判断を残すために作りました。

AIは数秒で推奨を出せます。しかし実際の判断で役立つ部分ほど、しばしば消えてしまいます。何を知っていたか、何を前提にしたか、どの選択肢を検討したか、どんな根拠があれば考えを変えるのか。LiveNodeの中心原則は、出力だけでなく判断プロセスを残すことです。Decision Traceは、その原則を誰でも一度の操作で理解できる小さな公開ツールにします。

**One-line description:** AI gives answers. Decision Trace preserves why—turning meeting transcripts into evidence-backed decisions and next actions.

**一文説明の日本語訳：** AIは答えを出す。Decision Traceは「なぜ」を残し、議事録を根拠付きの判断と次の行動に変える。

## Core philosophy

Most AI memory systems preserve facts, summaries, and final answers. LiveNode starts from a different belief: the durable part of a person is their judgment process—the claims they considered, the evidence they trusted, the constraints they accepted, the alternatives they rejected, and the connections that shaped the decision. Capturing that process creates an intermediate layer between a general-purpose LLM and the person using it. Instead of asking the model only for the statistical center of its training, this layer can help future AI interactions lean toward that person's own reasoning and values. The result is memory for a future self: a record that explains not only what happened, but why. Because the record is portable Markdown, it can also support continuity across projects and AI tools without depending on one chat history or model provider.

LiveNode transforms not only a person's knowledge but also the path of their judgment into a form AI can reference, serving as an intermediate layer that mediates FUSION between human and AI. Rather than giving AI access to the person themselves, it provides a structure through which AI can access the judgment framework that person has reviewed and chosen to preserve.

## 日本語訳（上記英文の正本対応）

一般的なAIメモリーが残すのは、事実、要約、最終回答です。LiveNodeは、人にとって長く残すべきものは判断プロセスだと考えます。何を主張として考え、どの根拠を信じ、どんな制約を受け入れ、どの選択肢を退け、何との接続から判断したのか。その記録は、汎用LLMと利用者本人の間に置かれる中間レイヤーになります。モデルの学習データが生む統計的な中心だけに頼るのではなく、未来のAI作業を本人の経験・価値観・判断軸へ寄せるための材料になります。これは未来の自分のための記憶です。何が起きたかだけでなく、なぜそう考えたのかを残します。持ち運べるMarkdownにすることで、一つのチャット履歴やモデル提供者に依存せず、プロジェクトやAIをまたぐ継続性も支えます。

LiveNodeは、人間の知識だけでなく判断の経緯をAIが参照できる形へ変換し、人間とAIの融合（FUSION）を仲介する中間層です。AIが人間そのものへアクセスするのではなく、その人が確認して残すことを選んだ判断軸へアクセスするための構造を提供します。

# What it does

Paste a one-hour meeting transcript. Decision Trace finds up to five decisions buried inside, you approve them, and moments later you have a ZIP of Markdown files—each showing the situation, assumptions, criteria, rejected options, recommendation, and next actions.

A user can paste either a focused Japanese or English idea memo, or a meeting transcript of up to 30,000 characters. An idea memo returns one six-part trace: Situation, Assumptions, Decision criteria, Options and trade-offs, Recommendation, and Next actions. In meeting mode, the application detects up to five grounded decision topics, lets the user review, rename, select, or exclude them, and generates the selected traces with no more than two analyses running in parallel. Every analytical point is labeled as evidence from the input or AI inference.

Every analytical item inside a Decision Trace is labeled as either a verbatim excerpt from the source text or an explicit AI inference. The server verifies that each evidence excerpt actually occurs in the supplied source—the model is never trusted to declare its own grounding.

An idea result can be copied in two forms. Decision Trace Markdown is designed for a person to review and act on. KX Note Markdown maps the result into five stable fields—Claim, Evidence, Data, Constraints, and Links—so another AI can retrieve and reuse the reasoning later without inventing connections. A meeting result can be downloaded as one Markdown ZIP containing the meeting summary, action list, manifest, and per-topic Decision Trace and KX Note files. If one topic fails, completed topics remain available and only the failed topic needs to be retried.

## 「What it does」日本語訳

1時間分の会議文字起こしを貼り付けると、Decision Traceが埋もれている判断を最大5件検出します。利用者が確認すると、状況、前提、判断基準、却下した選択肢、推奨、次の行動を記録したMarkdown一式をZIPで取得できます。

利用者は、日本語・英語のアイデアメモ、または最大30,000文字の会議文字起こしを貼り付けます。アイデアメモでは、状況、前提、判断基準、選択肢とトレードオフ、推奨、次のアクションからなる1つのDecision Traceを生成します。会議モードでは、根拠のある判断テーマを最大5つ検出し、利用者が確認、タイトル修正、選択、除外してから、同時に最大2テーマずつ生成します。各分析項目には、入力からの根拠かAIによる推論かを表示します。

Decision Trace内の各分析項目は、入力文からの原文抜粋か、AIによる推論かを必ず表示します。サーバーは根拠抜粋が実際に元の入力に存在することを検証し、モデル自身の「根拠があります」という申告は信用しません。

アイデアメモは、人が確認するDecision Trace Markdownと、別のAIが判断過程を再利用するためのKX Note Markdownとしてコピーできます。会議では、会議サマリー、アクション一覧、マニフェスト、各テーマのDecision TraceとKX Noteを1つのMarkdown ZIPにまとめます。1テーマが失敗しても完成済みの結果は残り、失敗したテーマだけを再試行できます。

# How we built it

We use a two-model pipeline: `gpt-5.4-nano` cheaply detects decision-bearing topics in untrusted transcript segments, then `gpt-5.6-luna` generates each trace through the OpenAI Responses API with strict structured outputs and reasoning effort `none`. Neither model is trusted directly: the server resolves segment IDs back to source ranges, validates strict Zod schemas, and verifies every evidence excerpt against the supplied text.

We built a one-page Next.js and TypeScript application and deployed it to Cloudflare Workers through OpenNext. The Worker validates input and applies IP-based rate limits. Markdown generation is deterministic and runs only from the validated result.

The application is deliberately stateless: there is no account, database, or memo analytics. The browser sends the memo only to a same-origin endpoint, the server sends it to OpenAI for processing, and public error codes prevent provider details or secrets from leaking to the client. Vitest covers the schema, validation, route behavior, and Markdown output; Playwright covers the complete browser flow and responsive layout.

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

## 「What's next」日本語訳

次は、確認済みTraceをObsidianやNotionなどの個人知識基盤へワンクリックで保存し、新しい判断を過去のTraceと比較できるようにすることです。Webデモは取り込み層、開発者が実運用する人間確認付きローカルKXは精錬層、将来の配布Skillは他のAI環境へ同じ流れを届ける層です。Obsidian・Notionへの直接保存と複数AIへの導入は、このWebデモではまだ実装していません。
