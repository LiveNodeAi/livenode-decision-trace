const REGION_EXCERPT = "実証地域で最初に試す企画は、短い固定コースを基本とし、途中に二択の小さな寄り道を置く形にします。";
const GUIDANCE_EXCERPT = "LINEは任意の案内入口として使い、必須情報は案内ページにも同時に置きます。";

function topicFromExcerpt(transcript, excerpt) {
  const start = transcript.indexOf(excerpt);
  if (start === -1) throw new Error(`Demo grounding sentence is missing: ${excerpt}`);
  const end = start + excerpt.length;
  const topic = excerpt === REGION_EXCERPT
    ? { id: "topic-1", title: "実証地域の初回企画", summary: "初回の実証企画を小さく始める判断" }
    : { id: "topic-2", title: "参加案内の主導線", summary: "LINEと案内ページを組み合わせる判断" };
  return { ...topic, ranges: [{ start, end, excerpt: transcript.slice(start, end) }] };
}

const regionTrace = {
  language: "ja",
  situation: {
    decision: "実証地域の初回企画を、固定コースと小さな寄り道で始める",
    context: [{ text: "初回は大規模にせず少人数で試す", evidence: "初回から大規模な企画にせず、週末に少人数で試せる内容にしたい", inference: false }],
  },
  assumptions: [{ text: "参加者の反応を次回の改善に使える", evidence: "次回に使える記録が残ること", inference: false }],
  criteria: [{ text: "準備負担と当日の混乱を抑える", evidence: "現場の準備負担、参加者が迷わないこと、失敗しても戻せること", inference: false }],
  options: [
    { name: "短い固定コース", benefits: ["説明が簡単", "当日の変更を伝えやすい"], costs: ["自由度が低い"], risks: ["参加理由が弱く見える"], reversible: true },
    { name: "複数の場所から選ぶ方式", benefits: ["自分で選べる楽しさ"], costs: ["案内と集計の手間"], risks: ["案内漏れや待ち時間"], reversible: true },
  ],
  recommendation: {
    option: "短い固定コースに二択の寄り道を置く",
    reasoning: [{ text: "固定コースを土台に小さな選択肢を加える", evidence: REGION_EXCERPT, inference: false }],
    confidence: "high",
    changeConditions: ["参加者が寄り道を選びにくい場合", "現場の案内負担が増えた場合"],
  },
  nextActions: [{ order: 1, action: "企画の流れを一枚にまとめる" }, { order: 2, action: "案内の言葉と記録したい反応を確認する" }],
  links: [],
};

const guidanceTrace = {
  language: "ja",
  situation: {
    decision: "参加案内でLINEを使う範囲と戻り道を決める",
    context: [{ text: "LINEは日常的な画面で短い案内を届けられる", evidence: "LINEなら、参加者は普段使っている画面で確認できます", inference: false }],
  },
  assumptions: [{ text: "参加者全員がLINEを使うとは限らない", evidence: "全員が同じ使い方に慣れているとは限りません", inference: false }],
  criteria: [{ text: "見落としにくく、個人情報を増やさない", evidence: "見落とされにくさ、運用の簡単さ、個人情報を増やさないこと", inference: false }],
  options: [
    { name: "LINEだけで案内する", benefits: ["更新をすぐに届けられる"], costs: ["未登録者への対応"], risks: ["連絡を受け取れない人が出る"], reversible: true },
    { name: "LINEと案内ページを併用する", benefits: ["案内への入口が増える", "必要情報へ戻れる"], costs: ["二つの場所を更新する"], risks: ["内容の不一致"], reversible: true },
  ],
  recommendation: {
    option: "LINEを任意の入口にし、必須情報は案内ページにも置く",
    reasoning: [{ text: "LINEを使わない参加者にも戻り道を残す", evidence: GUIDANCE_EXCERPT, inference: false }],
    confidence: "high",
    changeConditions: ["案内ページの更新が間に合わない場合", "LINEで個別相談が増えた場合"],
  },
  nextActions: [{ order: 1, action: "三回分の短い案内文を作る" }, { order: 2, action: "案内ページの項目と変更時の連絡順を確認する" }],
  links: [],
};

export function buildDemoTopics(transcript) {
  return [
    topicFromExcerpt(transcript, REGION_EXCERPT),
    topicFromExcerpt(transcript, GUIDANCE_EXCERPT),
  ];
}

export function buildDemoTrace(topic) {
  return topic.id === "topic-1" ? regionTrace : guidanceTrace;
}
