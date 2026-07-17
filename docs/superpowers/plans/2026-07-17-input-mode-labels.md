# 入力モードの初期表示・名称変更 実装計画

> **エージェント作業者向け必須サブスキル：** `superpowers:subagent-driven-development`（推奨）または`superpowers:executing-plans`を使い、チェック項目を順番に実行する。

**目標：** 会議・文字起こしを左側の初期モードにし、二つの入力用途を短い日本語名称で明確にする。

**構成：** `DecisionTraceApp`の初期stateと切替順を変更し、各入力パネルの見出し・説明文を仕様どおり更新する。API、入力上限、結果表示は変更しない。

**技術：** React 19、TypeScript 6、Vitest、Testing Library、Playwright。

## 全体制約

- 初期・左側は`会議・文字起こし`、右側は`アイデアメモ`。
- 会議入力は30,000文字、アイデアメモは12,000文字の既存上限を維持する。
- API呼び出し、分析契約、ZIP出力を変更しない。

---

### Task 1：入力モードの表示と初期状態

**ファイル：**
- 変更：`components/decision-trace-app.tsx`
- 変更：`components/transcript-input-panel.tsx`
- 変更：`components/input-panel.tsx`
- テスト：`tests/decision-trace-app.test.tsx`
- テスト：`e2e/multitopic-transcript.spec.ts`

**インターフェース：**
- 入力：既存の`mode: "single" | "transcript"`
- 出力：初期値`"transcript"`、表示順`会議・文字起こし`→`アイデアメモ`

- [ ] **Step 1：失敗するUIテストを書く**

初期表示で`会議・文字起こし`が押下状態、30,000文字案内が存在し、ボタン順が会議→アイデアであることを検証する。アイデアへ切り替えた後は12,000文字案内を検証する。

- [ ] **Step 2：REDを確認する**

実行：`npx vitest run tests/decision-trace-app.test.tsx`

期待：現行の初期単一メモ・旧名称・旧順序によりFAIL。

- [ ] **Step 3：最小実装する**

`mode`初期値を`"transcript"`へ変更し、切替ボタンの順序と文言、二つの入力パネルの見出し・説明だけを仕様どおり変更する。

- [ ] **Step 4：対象・全体・実ブラウザを検証する**

実行：

```bash
npx vitest run tests/decision-trace-app.test.tsx
npm test
npm run build
npx playwright test
```

期待：全コマンドPASS。PC幅と375px幅で会議モードが初期表示され、切替後も既存生成フローが動く。

- [ ] **Step 5：コミットしてデプロイする**

```bash
git add components/decision-trace-app.tsx components/transcript-input-panel.tsx components/input-panel.tsx tests/decision-trace-app.test.tsx e2e/multitopic-transcript.spec.ts
git commit -m "feat: make transcript flow the primary mode"
npm run deploy
```

公開ページでHTTP 200、`会議・文字起こし`の初期表示、30,000文字案内を確認する。OpenAI APIは呼び出さない。

