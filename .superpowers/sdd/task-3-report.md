# Task 3 report

Task: テーマ別Decision Trace分析APIを厳格TDDで実装。

Diff:
- `lib/analyze-topic.ts`: hash/range再検証、限定前後文脈、編集タイトル隔離、テーマ根拠判定、結果メタデータ。
- `app/api/topics/analyze/route.ts`: 140KB制限、rate limit、安全な公開エラー、OpenAI client adapter。
- `lib/analyze-decision.ts`: XML風データ境界の指示と`max_output_tokens: 2500`。
- `tests/api-topics-analyze.test.ts`: hash、1文字rangeずれ、7件目、タイトル注入、限定文脈、根拠なし、routeの回帰テスト。

Decision: 編集タイトルは自由修正可能なので文字一致を根拠条件にせず、検証済み範囲由来のTraceにサニタイズ後の実引用が1件以上残ることをテーマ根拠条件とした。タイトルはXMLエスケープしたuntrusted dataとして渡す。

Risk: `TOPIC_NOT_GROUNDED`はサニタイズ後の実引用有無による保守的判定。すべてを推論として返すモデル出力は拒否される。

Verification:
- `npx vitest run tests/api-topics-analyze.test.ts tests/analyze-decision.test.ts`: 30 passed
- `npm test`: 130 passed
- `npm run build`: success; `/api/topics/analyze`を動的routeとして生成
- 実OpenAI/API呼び出し: なし

## Important review fixes

- canonical Traceの根拠照合先を、編集タイトルや限定前後文脈を除いた検証済み`range.excerpt`群だけに限定した。NFKC＋空白collapseは既存サニタイズを再利用。
- `editedTitle`、`before`、`verified_excerpt`、`after`をすべてXMLエスケープし、閉じタグや偽instructionsをデータ境界内に保持した。
- タイトルのみ／beforeのみ／afterのみのevidence拒否、NFKC＋空白collapse一致、全フィールドXML注入の回帰テストを追加。
- fix後の最終検証: 対象・関連テスト35件PASS、全141件PASS、build PASS、diff-check PASS。
