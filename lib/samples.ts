export type DecisionTraceSample = {
  id: "product" | "public-policy" | "operations" | "product-en" | "public-policy-en" | "operations-en";
  language: "ja" | "en";
  title: string;
  memo: string;
};

export const samples: DecisionTraceSample[] = [
  {
    id: "product",
    language: "ja",
    title: "音声入力アプリの次期機能を選ぶ",
    memo: `音声入力アプリの次期開発で、端末間の辞書同期を先に作るか、入力後の文章を用途別に整える機能を先に作るか決めたい。現在の利用者ヒアリングでは、固有名詞の補正が端末ごとに必要なのが面倒という声が4件、長い発話をメールや議事録向けに整えたいという声が9件あった。ただしヒアリング対象は継続利用者に偏っており、新規利用者の離脱理由は十分に取れていない。辞書同期はバックエンドと暗号化の設計が必要で、実装後も障害対応が増える見込み。一方、文章整形は既存APIを使えば2週間程度で小さく試せるが、推論コストが月額原価に乗る。今期の開発余力は1人月で、App Storeの次回更新は6週間後を想定している。判断基準は、利用頻度を上げる効果、短期間で検証できること、運用負荷を増やしすぎないこと、将来の差別化につながること。まず文章整形を3種類に限定して出し、利用率と継続率を4週間測る案が現実的だと思う。ただし、辞書同期がないことを理由に有料解約した人が全体の15%を超えていると確認できた場合は、優先順位を逆転したい。`,
  },
  {
    id: "public-policy",
    language: "ja",
    title: "町の自転車施策で実証地域を絞る",
    memo: `町の自転車活用施策について、全域で一斉に観光ルートを整備するか、駅周辺と温泉地区の2エリアに絞って実証するかを判断したい。昨年度のイベントでは参加者の移動ログが312件あり、立ち寄りは駅から半径3キロと温泉地区に集中していた。商店への聞き取りでは、来訪者は増やしたいが、案内対応や駐輪場所の管理を新たに担う余裕は少ないという意見が多い。全域整備は公平感があり議会説明もしやすい反面、標識、マップ、協力店舗調整の費用が広く薄くなり、効果測定も難しい。2エリア実証なら既存予算内で導線と滞在時間を測定できるが、対象外地区から不公平との反発が出る可能性がある。判断基準は、安全性、地域消費への寄与、翌年度に再現できる証拠、担当職員の運用負荷、地区間の納得感。まず2エリアで3か月実証し、選定理由と全域展開の条件を最初から公開する案を推したい。事故や住民苦情が一定数を超えた場合は中止し、滞在時間と店舗利用が目標に届けば翌年度に対象地区を追加する。`,
  },
  {
    id: "operations",
    language: "ja",
    title: "イベント受付を紙から段階移行する",
    memo: `年間6回開催するサイクリングイベントの受付を、次回から完全オンライン化するか、紙受付を残したまま事前登録だけオンライン化するか決めたい。直近3回は各回120〜180人が参加し、当日朝の受付待ちは最大25分だった。スタッフは6人で、名簿照合、参加費確認、誓約書回収を同時に行っている。完全オンライン化なら受付時間を大きく短縮できる可能性があるが、通信障害、スマートフォンを持たない参加者、操作に不慣れな高齢者への対応が必要になる。昨年は会場の携帯回線が混雑し、決済画面が開きにくい時間帯があった。併用案では事前登録者をQR確認にし、未登録者とトラブル時だけ紙で受け付ける。二重手順の教育は必要だが、失敗してもイベント全体が止まりにくい。判断基準は、待ち時間、安全な本人確認、スタッフが迷わないこと、障害時に戻せること、次回以降へ展開できること。次回は併用案で試し、受付列を分け、開始前に通信テストを行う。事前登録率80%以上、平均待ち時間10分未満、重大な照合ミスゼロを達成できたら、その次から完全オンライン化を検討したい。`,
  },
  {
    id: "product-en",
    language: "en",
    title: "Choose the next feature for a voice app",
    memo: `We need to decide whether the next release of our voice-input app should prioritize cross-device dictionary sync or a feature that rewrites dictated text for different uses. In user interviews, four people complained about correcting proper nouns on every device, while nine asked for long dictation to be reshaped into email or meeting-note formats. The interviews overrepresent active users, so we still lack evidence about why new users leave. Dictionary sync requires backend and encryption work and will increase operational burden. Text rewriting can be tested in about two weeks with an existing API, but inference cost will affect monthly margin. We have one engineer-month available and expect the next App Store release in six weeks. Our criteria are increased usage, speed of validation, manageable operations, and long-term differentiation. I currently favor launching three limited rewriting formats and measuring usage and retention for four weeks. I would reverse the priority if confirmed paid cancellations caused by missing dictionary sync exceed 15 percent of all cancellations.`,
  },
  {
    id: "public-policy-en",
    language: "en",
    title: "Choose a pilot area for a cycling program",
    memo: `We need to decide whether to improve tourism cycling routes across the whole town or run a pilot in two areas around the station and hot-spring district. Last year's event produced 312 movement records, with most stops concentrated within three kilometers of the station and in the hot-spring district. Local shops want more visitors but say they have little capacity to manage new guidance or bicycle parking. A town-wide rollout appears fair and is easier to explain politically, but signage, maps, and merchant coordination would spread the budget thinly and make impact difficult to measure. A two-area pilot fits the current budget and lets us measure routes and dwell time, but excluded districts may object. Our criteria are safety, local spending, evidence that can be repeated next year, staff workload, and public acceptance. I favor a three-month pilot in two areas with the selection reasons and expansion conditions published in advance. We would stop if accidents or resident complaints cross an agreed threshold, and expand next year if dwell time and shop usage meet their targets.`,
  },
  {
    id: "operations-en",
    language: "en",
    title: "Move event check-in online in stages",
    memo: `We run six cycling events each year and need to decide whether the next event should use fully online check-in or keep paper as a fallback while moving preregistration online. The last three events had 120 to 180 riders and maximum morning waits of 25 minutes. Six staff simultaneously verify names, payments, and waivers. Fully online check-in could reduce waiting, but we must handle network outages, riders without smartphones, and people who need assistance. Last year the venue network became congested and payment pages were briefly unavailable. A hybrid process would use QR confirmation for preregistered riders and paper only for walk-ins or exceptions. Staff need to learn two paths, but the event can continue when one fails. Our criteria are waiting time, safe identity verification, clear staff procedures, reversibility during outages, and reuse at later events. I recommend the hybrid process next time, with separate lines and a pre-event network test. If preregistration exceeds 80 percent, average waiting stays below ten minutes, and there are zero serious matching errors, we can consider fully online check-in at the following event.`,
  },
];
