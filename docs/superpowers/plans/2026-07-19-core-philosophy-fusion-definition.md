# Core philosophy FUSION定義追記 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Devpost応募文のCore philosophyに、LiveNodeを人間とAIのFUSIONを仲介する中間層として定義する英語・日本語の対訳を追加する。

**Architecture:** アプリ機能やデータ構造は変更しない。応募文書の対応する英語段落と日本語訳段落だけを同時に更新し、意味の一致と実装範囲との整合を静的に確認する。

**Tech Stack:** Markdown、Git

## Global Constraints

- AIが人間本人へ直接アクセスできるとは主張しない。
- 参照対象は、本人が確認して保存を選んだ判断軸・判断経緯とする。
- `FUSION` は大文字表記を維持する。
- 現在のWebデモだけで長期人格再現が完成しているとは主張しない。

---

### Task 1: Core philosophyへFUSION定義を追加

**Files:**
- Modify: `docs/submission/devpost-story.md`

**Interfaces:**
- Consumes: `Core philosophy`の既存英文と、その直後の日本語訳
- Produces: 同じ意味を持つ英語・日本語のFUSION定義

- [ ] **Step 1: 英文末尾へ定義を追加**

`Core philosophy`の英文末尾へ、次の段落を追加する。

```markdown
LiveNode transforms not only a person's knowledge but also the path of their judgment into a form AI can reference, serving as an intermediate layer that mediates FUSION between human and AI. Rather than giving AI access to the person themselves, it provides a structure through which AI can access the judgment framework that person has reviewed and chosen to preserve.
```

- [ ] **Step 2: 日本語訳末尾へ対応文を追加**

`日本語訳（上記英文の正本対応）`の末尾へ、次の段落を追加する。

```markdown
LiveNodeは、人間の知識だけでなく判断の経緯をAIが参照できる形へ変換し、人間とAIの融合（FUSION）を仲介する中間層です。AIが人間そのものへアクセスするのではなく、その人が確認して残すことを選んだ判断軸へアクセスするための構造を提供します。
```

- [ ] **Step 3: 対訳と表現境界を確認**

Run:

```bash
sed -n '7,24p' docs/submission/devpost-story.md
rg -n 'direct access|directly access|人間そのものへアクセス|FUSION' docs/submission/devpost-story.md
git diff --check
```

Expected: 英文と日本語訳にFUSION定義が1回ずつあり、「AIが人間本人へ直接アクセスできる」という主張がなく、`git diff --check`が終了コード0になる。

- [ ] **Step 4: コミットしてmainへ反映**

```bash
git add docs/submission/devpost-story.md
git commit -m "docs: clarify LiveNode FUSION philosophy"
git push origin HEAD:main
```
