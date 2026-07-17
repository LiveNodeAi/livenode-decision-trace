# Task 6 Report — 会議サマリー・アクション一覧・Markdown ZIP

## Status

純関数・manifest・決定論的ZIP生成を実装。Task 5の`components/multi-trace-results.tsx`が未作成のため、UIダウンロード接続は未実施。

## Diff

- `lib/meeting-export.ts`: `MeetingExportInput`、サマリー、アクション、metadata-only manifest、Markdown ZIP生成。
- `tests/meeting-export.test.ts`: 決定論、部分成功、全失敗拒否、安全なファイル名、重複、Unicode、manifest非全文を検証。
- `package.json` / `package-lock.json`: `jszip`を追加。

## Decisions

- Task 1の`DetectedTopic`と`SourceRange`を入力契約に再利用した。
- 成功テーマは入力順を維持し、サマリーには推奨・推奨理由・change conditions・next actionsだけを転記する。追加解釈やAI呼び出しは行わない。
- 失敗テーマはサマリーとアクション一覧へerror code付きで明示し、テーマ別Markdownファイルは作らない。
- manifestにはテーマID、順番、タイトル、状態、start/end、対応ファイル名、error codeだけを保存し、excerptやTrace本文は含めない。
- ZIP内日時を固定し、圧縮設定とJSON整形を固定してbyte-identical出力にした。
- ファイル名はNFKC、制御/予約/パス文字除去、コードポイント単位短縮、重複連番で安全化した。日本語の原題と本文はMarkdown内に保持する。

## Strict TDD Evidence

- RED: `npx vitest run tests/meeting-export.test.ts` → `@/lib/meeting-export`未作成でFAIL。
- GREEN: 同対象テスト → 4/4 PASS。
- 対象＋既存UI: `npx vitest run tests/meeting-export.test.ts tests/decision-trace-app.test.tsx` → 21/21 PASS。
- 全体: `npm test` → 130/130 PASS。
- 初回buildはJSZipの`Uint8Array<ArrayBufferLike>`とDOM `BlobPart`の型境界でFAIL。通常の`ArrayBuffer`へコピーする最小修正後、`npm run build`はPASS。
- `git diff --check`: PASS。

## Risks / Follow-up

- `components/multi-trace-results.tsx`が存在しないため、ZIPダウンロードUI接続はTask 5完成後の作業。
- `npm install jszip`時点のauditはmoderate 2件。今回`npm audit fix --force`は実行していない。
