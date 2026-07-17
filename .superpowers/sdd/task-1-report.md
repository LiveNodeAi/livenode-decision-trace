# Task 1 Report: 原文位置付き区間とテーマ検出

## Status

完了。AIに引用・offsetを生成させる方式を廃止し、サーバー生成の原文区間から`segmentIds`を選ばせ、公開APIの`SourceRange`へ決定論的に復元する方式へ変更した。API実呼び出しとdeployは実施していない。

## Implementation

- `segmentTranscript`を追加
  - `segment-N`の安定ID
  - UTF-16の`start`/`end`と`transcript.slice(start, end)`完全一致の`text`
  - 改行・文末記号直後を優先し、最大800 code unitでfallback
  - fallback時にサロゲートペアの途中を回避
  - 空白・改行を保持し、全原文を欠落・重複なく連続して被覆
- `resolveSegmentIds`を追加
  - 未知ID・テーマ内重複IDを拒否
  - 逆順IDを原文順へsort
  - `start`/`end`/`excerpt`へ決定論的変換
- provider契約を`segmentIds: string[1..6]`へ変更
  - provider入力は`id`と原文`text`のみで、offset生成指示なし
  - topic間でのsegment共有を拒否
  - 復元後に既存`detectedTopicSchema`と`validateSourceRanges`を適用
  - 既存の最大1回再試行、最大5テーマ、model/reasoning/token/privacy設定を維持

## TDD Evidence

1. 区間化テストとsegmentIds契約テストを先に追加
2. `@/lib/transcript-segments`未作成によるREDを確認
3. 最小実装後に対象23件をGREEN化
4. buildで検出したMap key型エラーを修正し、TypeScript buildをGREEN化

## Test Coverage

- 6,595 UTF-16 code unit相当の改行・句点・絵文字・長文・反復入力
- 全segmentのslice完全一致、最大800、連続被覆、空白保持
- fallback境界のサロゲートペア保護
- 同文反復を別segment IDとして識別
- 逆順IDの原文順復元
- 未知ID、テーマ内重複、topic間共有、7区間、6テーマを2試行後に拒否
- provider schemaがsegmentIdsだけを要求し、入力にoffset/start/endを含めないこと
- 公開`TopicDetection`形式と既存API error mappingの互換性

## Verification

- `npx vitest run tests/transcript-segments.test.ts tests/detect-topics.test.ts tests/api-topics-detect.test.ts`: 3 files / 23 tests passed
- `npm test`: 17 files / 158 tests passed
- `npm run build`: passed

## Files

- `lib/transcript-segments.ts`
- `lib/detect-topics.ts`
- `tests/transcript-segments.test.ts`
- `tests/detect-topics.test.ts`

## Concerns

なし。実providerの検証とdeployは指示どおり未実施。
