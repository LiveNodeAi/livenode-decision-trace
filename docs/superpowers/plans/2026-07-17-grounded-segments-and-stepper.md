# 根拠区間検出と進行ステッパー 実装計画

> **エージェント作業者向け必須サブスキル：** `superpowers:subagent-driven-development`を使い、独立タスクを並列実装してレビューする。

**目標：** Circleback等の長文文字起こしを安定して最大5テーマへ分割し、利用者へ入力からZIP保存までの現在地を常時表示する。

**構成：** サーバーが文字起こしを原文位置付き区間へ分割し、AIは区間IDだけを選ぶ。UIは既存stateから4段階の進行状態を決定論的に表示し、API契約や後段分析は維持する。

**技術：** Next.js 16、React 19、TypeScript 6、Zod 4、OpenAI Responses API、GPT-5.4 nano、Vitest、Testing Library、Playwright、Cloudflare Workers。

## 全体制約

- 文字起こしは80〜30,000文字、テーマは最大5件、区間はテーマあたり1〜6件。
- 1区間は最大800 UTF-16 code unit。原文slice完全一致を維持する。
- `TopicDetection`成功レスポンスと後段分析APIは変更しない。
- OpenAIへは非信頼データとして番号付き区間を渡し、引用文やoffsetを生成させない。
- `gpt-5.4-nano`、reasoning none、最大出力2,500、store falseを維持する。
- ステッパーは`1 貼り付け`、`2 テーマを確認`、`3 Trace生成`、`4 ZIP保存`。
- 開発中は実APIを呼ばない。公開後は検出1回、成功時のみ分析2回まで。

---

### Task 1：原文位置付き区間とテーマ検出

**ファイル：**
- 作成：`lib/transcript-segments.ts`
- 変更：`lib/detect-topics.ts`
- テスト：`tests/transcript-segments.test.ts`
- テスト：`tests/detect-topics.test.ts`

**インターフェース：**

```ts
export type TranscriptSegment = { id: `segment-${number}`; start: number; end: number; text: string };
export function segmentTranscript(transcript: string): TranscriptSegment[];
export function resolveSegmentIds(segments: TranscriptSegment[], ids: string[]): SourceRange[] | undefined;
```

- [ ] **Step 1：失敗する区間化テストを書く**

改行、句点、800文字超、絵文字、6,595文字相当、同文反復を含む入力で、全segmentが`slice`完全一致し、空白を除去せず、最大800文字で原文全体を順番に覆うことを検証する。

- [ ] **Step 2：REDを確認する**

実行：`npx vitest run tests/transcript-segments.test.ts`。期待：module未作成でFAIL。

- [ ] **Step 3：区間化を最小実装する**

文末・改行の直後を優先境界とし、見つからない場合だけ800 code unitで切る。サロゲートペアの途中では切らない。空区間は作らない。

- [ ] **Step 4：テーマ検出をsegmentIds契約へ変更する**

provider schemaは各topicに`segmentIds: string[1..6]`だけを要求する。返却IDを全topicで重複不可、存在必須として復元し、原文順にsortして既存`validateSourceRanges`を通す。

- [ ] **Step 5：失敗系を通す**

存在しないID、重複ID、topic間共有、7区間、6テーマを2回後に`MALFORMED_RESPONSE`として拒否する。provider requestに原文offset生成指示がないことを検証する。

- [ ] **Step 6：対象・全体・buildを検証しコミットする**

```bash
npx vitest run tests/transcript-segments.test.ts tests/detect-topics.test.ts tests/api-topics-detect.test.ts
npm test
npm run build
git add lib/transcript-segments.ts lib/detect-topics.ts tests/transcript-segments.test.ts tests/detect-topics.test.ts
git commit -m "fix: ground transcript topics by segment id"
```

---

### Task 2：タイトル下の説明と4段階ステッパー

**ファイル：**
- 作成：`components/flow-stepper.tsx`
- 変更：`components/decision-trace-app.tsx`
- 変更：`app/globals.css`
- テスト：`tests/decision-trace-app.test.tsx`
- テスト：`e2e/multitopic-transcript.spec.ts`

**インターフェース：**

```ts
export type FlowStep = 1 | 2 | 3 | 4;
export function FlowStepper({ current }: { current: FlowStep }): React.ReactElement;
```

- [ ] **Step 1：失敗する進行表示テストを書く**

初期=1、review=2、generating=3、result=4を検証する。現在工程は`aria-current="step"`、完了工程は視覚クラスと読み上げ文言を持つ。

- [ ] **Step 2：REDを確認する**

実行：`npx vitest run tests/decision-trace-app.test.tsx`。期待：ステッパー未存在でFAIL。

- [ ] **Step 3：ステッパーと短い説明を実装する**

タイトル直下に`会議ログを最大5テーマへ分け、判断の経緯と次の行動をMarkdownにします。`を表示し、その下に4工程を置く。既存stateからcurrentを算出し、新しいstateは追加しない。

- [ ] **Step 4：PC・375px表示を実装する**

PCは横並び＋三角区切り、狭幅は2列または縦並びで横スクロールを発生させない。装飾は既存カラー変数を使用する。

- [ ] **Step 5：対象・E2E・buildを検証しコミットする**

```bash
npx vitest run tests/decision-trace-app.test.tsx
npx playwright test e2e/multitopic-transcript.spec.ts
npm run build
git add components/flow-stepper.tsx components/decision-trace-app.tsx app/globals.css tests/decision-trace-app.test.tsx e2e/multitopic-transcript.spec.ts
git commit -m "feat: show transcript decision flow"
```

---

### Task 3：統合・公開受入

**依存：** Task 1、Task 2

- [ ] **Step 1：全ローカルゲートを通す**

```bash
npm test
npm run build
npx playwright test
git diff --check
```

- [ ] **Step 2：独立レビューする**

仕様適合とコード品質を確認し、Critical／Importantをすべて修正して再検証する。

- [ ] **Step 3：再デプロイする**

`npm run deploy`を実行し、Version IDとbindingを確認する。

- [ ] **Step 4：公開画面と最小実APIを確認する**

初期ステップ1、30,000文字案内、HTTP 200を確認する。Circleback風の長文で検出1回、成功時のみ先頭2テーマを各1回分析し、本文・生成内容・secretをログ出力しない。

