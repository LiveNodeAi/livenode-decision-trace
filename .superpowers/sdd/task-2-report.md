# Task 2 Report: タイトル下の説明と4段階ステッパー

## Status

完了。会議・文字起こしモードに短い用途説明と、既存stateだけから進行状況を表示する4段階ステッパーを追加した。API実呼び出しとdeployは実施していない。

## Implementation

- `FlowStepper`を追加し、`FlowStep = 1 | 2 | 3 | 4`を公開
- 工程を `貼り付け` → `テーマ確認` → `Trace生成` → `確認・保存` として表示
- `transcriptState.status`から現在工程を算出
  - input / detecting: 1
  - review: 2
  - generating: 3
  - result: 4
- 現在工程へ`aria-current="step"`と「現在」文言を付与
- 完了工程へ`flow-step-complete`クラスと「完了」文言を付与
- 各工程へ明示的なaccessible nameを付与
- 短い説明 `会議ログを最大5テーマへ分け、判断の経緯と次の行動をMarkdownにします。` を表示
- PCは4列＋三角区切り、759px以下は2列として横スクロールを防止
- 既存のcyan/muted/surface/lineカラー変数のみを使用
- アイデアメモモードでは会議用フローを非表示

## TDD Evidence

1. 初期・review・generating・resultの工程、完了クラス、読み上げ文言を先にテスト追加
2. 説明とステッパー未存在によるREDを確認
3. 最小実装後、listitemのaccessible name不足を検出
4. `aria-label`を追加し対象23件をGREEN化

## Verification

- `npx vitest run tests/decision-trace-app.test.tsx`: 23 passed
- `npx playwright test e2e/multitopic-transcript.spec.ts`: 6 passed
  - desktop 1440px: 3 passed
  - mobile 375px: 3 passed
  - APIはPlaywright route mockのみ
- `npm test`: 全テスト passed
- `npm run build`: passed

## Files

- `components/flow-stepper.tsx`
- `components/decision-trace-app.tsx`
- `app/globals.css`
- `tests/decision-trace-app.test.tsx`
- `e2e/multitopic-transcript.spec.ts`

## Concerns

なし。新しいstateや永続化は追加していない。

## Minor Review Follow-up

- ステッパーの8% cyan背景を`color-mix(in srgb, var(--cyan) 8%, transparent)`へ変更
- 完了工程の50% cyan枠を`color-mix(in srgb, var(--cyan) 50%, transparent)`へ変更
- 完了番号の文字色を直値から既存`var(--space)`へ変更
- 新規ステッパーCSSは既存カラー変数だけで構成

## Public Review Follow-up

- 仕様正本に合わせ、Step 4の表示・accessible nameを`確認・保存`から`ZIP保存`へ修正
- unit/E2Eを先に`ZIP保存`期待へ変更し、旧ラベルによるREDを確認してから実装
