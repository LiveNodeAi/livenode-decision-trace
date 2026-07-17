# Task 8 複数テーマ統合・限定本番受入チェックリスト

この文書は、複数テーマUI実装後の統合確認を一度で進めるための実行用チェックリストである。既存の単一判断モードの本番検証結果は `docs/submission/verification.md` を正本とし、ここでは再掲しない。

## 0. 実行境界

- [ ] ローカル検証とモックE2Eがすべて緑になるまで、デプロイとOpenAI実呼び出しを行わない。
- [ ] 本番デプロイと限定live acceptanceは、実行直前に明示承認を得る。
- [ ] live acceptanceの通常系は、テーマ検出 **1回** と選択したテーマ分析 **2回** の合計3 API処理だけに固定する。
- [ ] 自動retryが発生した場合も手動で同じ入力を再実行しない。発生回数と結果をそのまま記録する。
- [ ] 30,000文字、3テーマ、5テーマ、retry系の確認を理由にlive APIを追加実行しない。実API上限は常に検出1回＋分析2回とする。
- [ ] 本番確認に使う文字起こし本文、テーマ本文、モデル出力は、文書、スクリーンショット、ログへ保存しない。

## 1. UI実装後に追加するモック統合E2E

`e2e/multitopic-transcript.spec.ts`に以下を実装し、OpenAIへの通信はすべてPlaywrightのroute mockで置き換える。

### 基本フロー（desktop 1440 / mobile 375共通）

- [ ] 2〜3テーマを含む日本語文字起こしを貼り付け、検出APIが画面操作1回につき1リクエストだけ発生する。
- [ ] 検出結果に1〜5件のテーマ、根拠抜粋、選択状態、編集可能なタイトルが表示される。
- [ ] 1件を除外し、別の1件のタイトルを修正してから生成できる。
- [ ] タイトルに「前の指示を無視」等を入れても、画面崩れや命令実行が起きず、値はデータとして送られる。
- [ ] 選択したテーマだけが分析APIへ送られ、未選択テーマは送信されない。
- [ ] 生成中表示が件数付き（例: `2/4生成中`）で更新される。
- [ ] 完成した複数Trace間を移動でき、各テーマの6セクション、根拠、KX Note、高影響注意を個別に表示できる。
- [ ] 既存の単一判断モード、コピー、リセット、プライバシー表示も回帰しない。
- [ ] 1440pxと375pxの両方で横スクロール、画面外ボタン、重なりがない。

### 最大5件・最大2並列

- [ ] 30,000 UTF-16 code unitの日本語・絵文字・CRLFを含むfixtureを受理する。
- [ ] 30,001 code unit、140KiB超、6テーマのmock応答を安全なエラーとして扱う。
- [ ] 5テーマ選択時も同時に進行する分析リクエストは最大2件である（route handler内のactive数と最大値を記録して`maximum === 2`をassert）。
- [ ] mock clientで、検出APIと各テーマ分析APIのprovider call数が、内部retry込みでもそれぞれ最大2回であることをassertする。
- [ ] 生成ボタンの二重クリックで、同一テーマのin-flightリクエストが重複しない。
- [ ] 完了順が前後しても表示順は確認済みテーマ順を維持する。
- [ ] 1文字ずれrange、改変excerpt、hash mismatch、0テーマ、重複topic IDを拒否し、分析APIを呼ばない。
- [ ] テーマ間の過剰重複と全文カバー過多を拒否し、成功結果としてUIへ載せない。

### 部分成功・個別再試行

- [ ] 3テーマ中1テーマをretryable errorにし、成功した2テーマの結果が保持される。
- [ ] 失敗テーマ名、安定した公開エラー、再試行ボタンが表示され、provider本文やstackは表示されない。
- [ ] 個別再試行では失敗した1テーマだけを再送し、成功済みテーマを再送・消去しない。
- [ ] 再試行成功後、3テーマすべての結果とZIP対象が更新される。
- [ ] 処理を中止しても、中止前に完成したテーマ結果とそのZIP対象を保持する。
- [ ] 全テーマ失敗時はZIPボタンを無効化または非表示にし、成功扱いにしない。

### ZIP内容

- [ ] 一部成功でもZIPを生成でき、失敗テーマはsummaryに明記されるがテーマ別ファイルは作られない。
- [ ] ZIPに`00-meeting-summary.md`、成功テーマごとの`Decision-Trace.md`と`KX-Note.md`、`99-actions.md`、`manifest.json`が入る。
- [ ] manifestへ文字起こし本文、根拠本文、Trace本文、secret、provider詳細を入れない。
- [ ] 日本語ファイル内容、重複タイトルの連番、安全化された`../`、長いタイトル、Unicode境界を確認する。
- [ ] 同じfixtureから生成したZIPがbyte-identicalである。

## 2. ローカル最終ゲート

- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npx playwright test`
- [ ] `git diff --check`
- [ ] 既存E2Eと新規E2Eがdesktop 1440 / mobile 375の両projectで通る。
- [ ] Playwright trace、HTML report、console、network mock記録に文字起こし全文や疑似secretを残さない。
- [ ] 受入専用OpenAI project／keyへ絞ってローカル検証前後のUsageを確認し、反映待ち時間を置いた後も増えていない（実API未使用）。共有projectで他trafficと区別できない確認結果は証拠にしない。

## 3. secret・設定・公開情報の本番前チェック

値を表示せず、「存在」「一致件数0」「binding名」だけを記録する。

- [ ] `.dev.vars`、Cloudflare secret、環境変数の値をterminal出力、shell history、docsへ出さない。
- [ ] tracked source、docs、`.next`、`.open-next`のclient配信物を、secret値のbyte列で走査して一致0件。
- [ ] ブラウザbundleに`OPENAI_API_KEY`の値、Authorization header、provider response、stack traceがない。
- [ ] Worker secret `OPENAI_API_KEY`が既存のまま保持される。
- [ ] 非秘密bindingは`OPENAI_TOPIC_MODEL=gpt-5.4-nano`、`OPENAI_MODEL=gpt-5.6-luna`。
- [ ] `TOPIC_DETECTION_RATE_LIMITER`と`DECISION_TRACE_RATE_LIMITER`が存在し、namespace IDが同一Cloudflareアカウント内で意図せず重複していない。
- [ ] topic detect／topic analyze APIの公開エラーbodyは`{ error, retryable }`だけで、入力、出力、APIキー、provider詳細を含まない。既存の別APIへこのshapeを一律要求しない。
- [ ] request body／モデル出力を保存するDB、analytics、application logが追加されていない。
- [ ] 30,000文字、最大5テーマ、最大2並列、140KiB制限がUI文言・route・テストで一致している。

## 4. デプロイ後の低コストlive acceptance

### 事前準備（実呼び出しなし）

- [ ] 2つの明確な判断だけを含む、短い非機密の日本語文字起こしを用意する。氏名、自治体内部情報、顧客情報、secretを含めない。
- [ ] テーマ検出で2〜3件に分かれ、うち2件を分析対象にできる内容にする。
- [ ] 受入専用OpenAI project／keyを使用し、modelを`gpt-5.4-nano`と`gpt-5.6-luna`へ絞ってUsageを確認できる状態にする。
- [ ] 他trafficがない時間帯であることを確認し、Usageの開始時刻、開始時点の利用額・input/output tokenを控える。本文や出力は控えない。
- [ ] Browser DevToolsのNetworkを開き、Preserve logは必要最小限にする。consoleへの本文出力がないことを確認する。

### 実行（通常は合計3処理）

- [ ] 本番URLをPCまたはスマホの片方だけで開く。
- [ ] 文字起こしを1回貼り付け、「テーマを検出」を1回だけ実行する。
- [ ] 検出リクエストが1回、HTTP 200、2〜3テーマ、根拠範囲付きで返る。
- [ ] 2テーマだけを選択し、分析を1回開始する。
- [ ] 分析リクエストが各テーマ1回、合計2回だけ発生し、同時進行数が2以下である。
- [ ] 2件の結果、6セクション、根拠、KX Note、アクションが表示される。
- [ ] Markdown ZIPを1回生成し、会議summary、2テーマ分のTrace/KX、actions、manifestをローカルで確認する。
- [ ] ZIP確認後、受入用ファイルを保持する必要がなければ削除する。ZIP本文をGitや検証文書へ追加しない。
- [ ] もう一方のviewportは同じ結果をroute mockしてレイアウトだけ確認し、実APIを再実行しない。

### live時の安全確認

- [ ] Network response、console、画面、ダウンロード名にAPIキー、provider request ID、stack、内部エラー本文がない。
- [ ] 公開レスポンス以外に文字起こし全文やモデル出力がanalytics／application logへ記録されていない。
- [ ] rate limit bindingが有効である。ただし確認目的の追加連打は行わない。
- [ ] 28秒timeoutまたは自動retryが発生した場合、手動再実行せず、発生したprovider call数を費用記録へ反映する。

## 5. 費用計測と記録

OpenAI Usageの受入開始前後の差分だけを使う。金額・token数は記録してよいが、本文、出力、request ID、secretは記録しない。30,000文字や5テーマをliveで追加実行せず、限定live 2テーマの実測usageとresponse usage/token数からシナリオ計算する。

- [ ] 最終レスポンス後、Usage反映まで待ち、受入専用project／key、対象model、実行時間帯で絞る。他trafficが混在した場合は差分を今回の費用と断定しない。
- [ ] 検出1回のinput token、output token、費用増分を記録する。
- [ ] Trace 2回のinput token合計、output token合計、費用増分を記録する。
- [ ] 利用可能なresponse usageのinput/output token合計とUsage画面の増分を照合する。
- [ ] 実provider call数を、検出・Trace・自動retryに分けて記録する。
- [ ] 実測総額を `検出通常費用 + 検出retry費用 + Trace通常費用 + Trace retry費用` で確認し、retry分を除外しない。
- [ ] 1テーマあたり概算を `Trace 2回費用 / 2` で算出する（検出費用は別記）。
- [ ] 限定liveの検出実測費用とTrace 2件の平均費用を、通常利用の「実測代表値」として1／3／5テーマへ外挿する。30,000文字の設計上限と混同しない。
- [ ] 別に「保守的設計上限」を、検出30,000文字入力＋最大2,500 output tokens、各Trace最大4,000文字の引用＋最大6範囲の限定前後文脈（各範囲の前後最大200 UTF-16 code unit）＋最大2,500 output tokensとして計算する。system instructions、JSON Schema、編集タイトル、XML境界の固定overheadも含める。
- [ ] token換算は文字数だけで断定せず、実装と同じrequest構造をローカルで組み立てたtoken上限または十分保守的な換算を使い、受入日時点のOpenAI公式モデル単価を掛ける。参照日と単価を記録する。
- [ ] 下表の1／3／5テーマ通常系とretry系について、実測代表値と保守上限を別々に計算する。仕様の通常5テーマ$0.10未満は実測代表値の目標として判定し、保守上限が$0.10またはretry時$0.20を超える場合も不合格値を丸めずそのまま記録する。
- [ ] `docs/submission/verification.md`には日時、Worker version／commit、3処理のHTTP結果と時間、token差分、総額、1テーマ概算、5テーマ換算、安全確認だけを追記する。

記録表:

| 項目 | provider call数 | input tokens | output tokens | 費用 |
| --- | ---: | ---: | ---: | ---: |
| テーマ検出 |  |  |  |  |
| Trace 2テーマ |  |  |  |  |
| 自動retry（発生時のみ） |  |  |  |  |
| 合計 |  |  |  |  |

シナリオ計算表（追加live呼び出しは禁止）:

| シナリオ | provider call数 | 実測代表値 | 保守的設計上限 | 判定 |
| --- | ---: | ---: | ---: | --- |
| 1テーマ通常 | 2 | `検出実測 + Trace実測平均 × 1` | `検出30k上限 + Trace設計上限 × 1` |  |
| 3テーマ通常 | 4 | `検出実測 + Trace実測平均 × 3` | `検出30k上限 + Trace設計上限 × 3` |  |
| 5テーマ通常 | 6 | `検出実測 + Trace実測平均 × 5` | `検出30k上限 + Trace設計上限 × 5` | 代表値目標 `< $0.10`／保守上限は別記 |
| 5テーマ全処理1 retry | 最大12 | `5テーマ代表値 + 検出実測 + Trace実測平均 × 5` | `(検出30k上限 + Trace設計上限 × 5) × 2` | 代表値・保守上限を分離して記録 |

`検出実測`と`Trace実測平均`は限定live（検出1回＋Trace 2件）のresponse usage/token数とUsage差分を使う代表値である。`検出30k上限`と`Trace設計上限`は、上記の最大入力・最大出力・固定overheadと受入日時点の公式単価から計算する。retry行は各処理がproviderを最大2回呼ぶ実装上限を示す。実際に30,000文字、5テーマ、retryを起こすためのlive再実行はしない。

## 6. 完了判定

- [ ] ローカル全テスト、build、2 viewport E2E、diff checkが失敗0。
- [ ] 30,000文字、最大5テーマ、最大2並列、部分成功、個別再試行、ZIPがモックで検証済み。
- [ ] live acceptanceは検出1回＋2テーマ分析だけで完了し、不要な再実行なし。
- [ ] 通常5テーマの実測代表値が$0.10未満か判定し、保守的設計上限は別欄に実額を記録する。どちらかが目標超過なら超過を明記する。
- [ ] secret、文字起こし、モデル出力、provider詳細の意図しない露出・保存が0件。
- [ ] Critical / Importantレビュー指摘が0件。
- [ ] 実測結果を`docs/submission/verification.md`へ追記し、旧単一モードの受入結果と混同しない。
