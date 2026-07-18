# Core philosophyへのFUSION定義追記 仕様

## 目的

Devpost応募文の「Core philosophy」に、LiveNodeが何であるかを一文で補足する。知識や判断過程を保存する機能説明だけで終わらせず、人間とAIの融合（FUSION）を仲介する中間層という位置づけを明示する。

## 採用表現

### 英語（応募文の正本）

LiveNode transforms not only a person's knowledge but also the path of their judgment into a form AI can reference, serving as an intermediate layer that mediates FUSION between human and AI. Rather than giving AI access to the person themselves, it provides a structure through which AI can access the judgment framework that person has reviewed and chosen to preserve.

### 日本語訳

LiveNodeは、人間の知識だけでなく判断の経緯をAIが参照できる形へ変換し、人間とAIの融合（FUSION）を仲介する中間層です。AIが人間そのものへアクセスするのではなく、その人が確認して残すことを選んだ判断軸へアクセスするための構造を提供します。

## 挿入位置

`docs/submission/devpost-story.md` の `Core philosophy` 英文末尾と、対応する `日本語訳` の末尾へ、それぞれ追加する。

## 表現上の境界

- AIが人間本人へ直接アクセスできるとは主張しない。
- 参照対象は、本人が確認し保存を選んだ判断軸・判断経緯とする。
- `FUSION` はLiveNode固有の概念として大文字表記を維持する。
- 現在のWebデモだけで長期人格再現が完成しているとは主張しない。

## 確認基準

- 英文と日本語訳の意味が一致している。
- 既存の「中間レイヤー」「未来の自分のための記憶」という説明と矛盾しない。
- LiveNodeの思想説明であり、未実装機能の説明になっていない。
