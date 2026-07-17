import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DecisionTraceApp } from "@/components/decision-trace-app";
import { MultiTraceResults, type MultiTraceEntry } from "@/components/multi-trace-results";
import { toDecisionTraceMarkdown, toKxNoteMarkdown } from "@/lib/markdown";
import { samples } from "@/lib/samples";
import type { DecisionTrace } from "@/lib/decision-trace-schema";

const trace: DecisionTrace = {
  language: "ja",
  situation: {
    decision: "2地域で実証する",
    context: [{ text: "移動ログが集中している", evidence: "移動ログ312件", inference: false }],
  },
  assumptions: [{ text: "既存予算で実施できる", evidence: null, inference: true }],
  criteria: [{ text: "安全性を優先する", evidence: "判断基準は安全性", inference: false }],
  options: [
    { name: "全域整備", benefits: ["公平"], costs: ["費用"], risks: ["測定困難"], reversible: false },
    { name: "2地域実証", benefits: ["測定可能"], costs: ["説明"], risks: ["反発"], reversible: true },
  ],
  recommendation: {
    option: "2地域実証",
    reasoning: [{ text: "小さく検証できる", evidence: "3か月実証", inference: false }],
    confidence: "high",
    changeConditions: ["苦情が一定数を超える"],
  },
  nextActions: [{ order: 1, action: "選定理由を公開する" }],
  links: [],
};

const publicPolicySample = samples.find((sample) => sample.id === "public-policy")!;

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function renderIdeaMode() {
  const view = render(<DecisionTraceApp />);
  await userEvent.click(screen.getByRole("button", { name: "アイデアメモ" }));
  return view;
}

describe("DecisionTraceApp", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const writeText = vi.fn<(text: string) => Promise<void>>();

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("shows meeting transcript first and switches to the idea memo", async () => {
    render(<DecisionTraceApp />);
    const modeButtons = within(screen.getByRole("navigation", { name: "入力モード" })).getAllByRole("button");
    expect(modeButtons.map((button) => button.textContent)).toEqual(["会議・文字起こし", "アイデアメモ"]);
    expect(modeButtons[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "会議・文字起こしからテーマを見つける" })).toBeInTheDocument();
    expect(screen.getByText(/30,000文字/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "文字起こし" })).toHaveFocus();
    expect(screen.getByText("会議ログを最大5テーマへ分け、判断の経緯と次の行動をMarkdownにします。")).toBeInTheDocument();
    const steps = within(screen.getByRole("list", { name: "会議ログからMarkdownまでの流れ" })).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps.map((step) => step.textContent)).toEqual([
      "1貼り付け現在", "2テーマ確認", "3Trace生成", "4ZIP保存",
    ]);
    expect(steps[0]).toHaveAttribute("aria-current", "step");

    await userEvent.click(modeButtons[1]);
    expect(screen.getByRole("heading", { name: "アイデアメモを整理する" })).toBeInTheDocument();
    expect(screen.getByText(/12,000文字/)).toBeInTheDocument();
  });

  it("rejects a 30,001-character transcript without calling fetch", async () => {
    render(<DecisionTraceApp />);
    fireEvent.change(screen.getByRole("textbox", { name: "文字起こし" }), { target: { value: "あ".repeat(30_001) } });
    await userEvent.click(screen.getByRole("button", { name: "テーマを検出" }));
    expect(screen.getByRole("alert")).toHaveTextContent("30,000文字以内");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports keyboard mode switching and exposes named non-autofill transcript fields", async () => {
    render(<DecisionTraceApp />);
    const transcriptMode = screen.getByRole("button", { name: "会議・文字起こし" });
    transcriptMode.focus();
    await userEvent.keyboard("{Enter}");
    const transcriptInput = screen.getByRole("textbox", { name: "文字起こし" });
    expect(transcriptInput).toHaveAttribute("name", "transcript");
    expect(transcriptInput).toHaveAttribute("autocomplete", "off");
  });

  it("reviews topics, generates two at a time, retries only failures, preserves successes, and downloads ZIP", async () => {
    const transcript = `${"会議の背景です。".repeat(20)}議題Aを決めます。議題Bを決めます。議題Cを決めます。議題Dを決めます。`;
    const topics = ["議題A", "議題B", "議題C", "議題D"].map((title, index) => {
      const excerpt = `${title}を決めます。`;
      const start = transcript.indexOf(excerpt);
      return {
        id: `topic-${index + 1}`,
        title,
        summary: `${title}の判断`,
        ranges: [{ start, end: start + excerpt.length, excerpt }],
      };
    });
    let resolveFirst!: (value: Response) => void;
    const first = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    fetchMock.mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/api/topics/detect")) {
        return Promise.resolve(response(200, { transcriptHash: "a".repeat(64), topics }));
      }
      const analyzeCalls = fetchMock.mock.calls.filter(([candidate]) => String(candidate).endsWith("/api/topics/analyze")).length;
      if (analyzeCalls === 1) return first;
      if (analyzeCalls === 2) return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")));
      });
      if (analyzeCalls === 3) return Promise.resolve(response(200, {
        topicId: "topic-3", attemptId: "attempt-3", sourceRanges: topics[2].ranges, trace, highImpact: false,
      }));
      return Promise.resolve(response(200, {
        topicId: "topic-2", attemptId: "attempt-retry", sourceRanges: topics[1].ranges, trace, highImpact: false,
      }));
    });
    const createObjectURL = vi.fn(() => "blob:meeting-zip");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });

    render(<DecisionTraceApp />);
    await userEvent.type(screen.getByRole("textbox", { name: "文字起こし" }), transcript);
    await userEvent.click(screen.getByRole("button", { name: "テーマを検出" }));

    expect(await screen.findAllByTestId("topic-review-item")).toHaveLength(4);
    expect(screen.getByRole("listitem", { name: /2テーマ確認/ })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("listitem", { name: /1貼り付け完了/ })).toHaveClass("flow-step-complete");
    expect(screen.getByRole("heading", { name: "生成するテーマを確認" })).toHaveFocus();
    await userEvent.click(screen.getByRole("checkbox", { name: /議題Dを生成対象にする/ }));
    const titleB = screen.getByRole("textbox", { name: "議題Bのタイトル" });
    await userEvent.clear(titleB);
    await userEvent.type(titleB, "編集した議題B");
    await userEvent.click(screen.getByRole("button", { name: "選択した3件を生成" }));

    expect(await screen.findByRole("status")).toHaveTextContent("0/3生成中");
    expect(screen.getByRole("listitem", { name: /3Trace生成/ })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "アイデアメモ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "会議・文字起こし" })).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([candidate]) => String(candidate).endsWith("/api/topics/analyze"))).toHaveLength(2);
    resolveFirst(response(200, {
      topicId: "topic-1", attemptId: "attempt-1", sourceRanges: topics[0].ranges, trace, highImpact: false,
    }));
    await userEvent.click(screen.getByRole("button", { name: "編集した議題Bを中止" }));

    expect(await screen.findByText("編集した議題Bの生成に失敗しました")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /4ZIP保存/ })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("listitem", { name: /3Trace生成完了/ })).toHaveClass("flow-step-complete");
    expect(await screen.findAllByTestId("multi-trace-success")).toHaveLength(2);
    expect(screen.getAllByText("議題A").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "複数テーマのDecision Trace" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "編集した議題Bを再試行" }));
    expect(await screen.findAllByTestId("multi-trace-success")).toHaveLength(3);
    expect(fetchMock.mock.calls.filter(([candidate]) => String(candidate).endsWith("/api/topics/analyze"))).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Decision TraceからKXへ" })).toBeInTheDocument();
    expect(screen.getByText(/Markdown ZIPだけが.*実際に動く保存操作/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Web版.*取り込み層/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ローカルKX.*精錬層/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /配布Skill.*将来の提供層/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Obsidian|Notion|AI-Brain/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Markdown ZIPをダウンロード" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 3, name: /議題A|編集した議題B|議題C/ })).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 4, name: "Decision Traceの結果" })).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 5, name: "状況" })).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 6, name: "2地域実証" })).toHaveLength(3);
    const map = screen.getByRole("region", { name: "会議全体の判断マップ" });
    expect(within(map).getAllByText("2地域実証")).toHaveLength(3);
    expect(within(map).getAllByText("苦情が一定数を超える")).toHaveLength(3);
    expect(within(map).getAllByText("選定理由を公開する")).toHaveLength(3);
    expect(screen.getByText("3/3件完了")).toHaveAttribute("aria-live", "polite");
    const ids = Array.from(document.querySelectorAll("[id]"), (element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);

    let clickedAnchor: { connected: boolean; download: string; href: string } | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clickedAnchor = { connected: this.isConnected, download: this.download, href: this.href };
    });
    await userEvent.click(screen.getByRole("button", { name: "Markdown ZIPをダウンロード" }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce());
    expect(clickedAnchor).toEqual({ connected: true, download: "decision-trace-meeting.zip", href: "blob:meeting-zip" });
    expect(document.querySelector('a[download="decision-trace-meeting.zip"]')).not.toBeInTheDocument();
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledOnce());
  });

  it("keeps the flow at Trace generation when every topic fails and disables ZIP", async () => {
    const transcript = `${"会議背景。".repeat(20)}議題Aを決めます。議題Bを決めます。`;
    const topics = ["議題A", "議題B"].map((title, index) => {
      const excerpt = `${title}を決めます。`;
      const start = transcript.indexOf(excerpt);
      return {
        id: `topic-${index + 1}` as "topic-1" | "topic-2",
        title,
        summary: `${title}の判断`,
        ranges: [{ start, end: start + excerpt.length, excerpt }],
      };
    });
    fetchMock.mockImplementation((input) => String(input).endsWith("/api/topics/detect")
      ? Promise.resolve(response(200, { transcriptHash: "a".repeat(64), topics }))
      : Promise.resolve(response(422, { error: "TOPIC_NOT_GROUNDED", retryable: false })));

    render(<DecisionTraceApp />);
    await userEvent.type(screen.getByRole("textbox", { name: "文字起こし" }), transcript);
    await userEvent.click(screen.getByRole("button", { name: "テーマを検出" }));
    await userEvent.click(await screen.findByRole("button", { name: "選択した2件を生成" }));

    expect(await screen.findByText("0/2件完了")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /3Trace生成/ })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("listitem", { name: /4ZIP保存/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Markdown ZIPをダウンロード" })).toBeDisabled();
  });

  it("rejects an analyzed topic response whose id or source ranges do not match the request", async () => {
    const transcript = `${"会議背景。".repeat(20)}議題Aを決めます。`;
    const excerpt = "議題Aを決めます。";
    const start = transcript.indexOf(excerpt);
    const topic = { id: "topic-1", title: "議題A", summary: "判断", ranges: [{ start, end: start + excerpt.length, excerpt }] };
    fetchMock
      .mockResolvedValueOnce(response(200, { transcriptHash: "a".repeat(64), topics: [topic] }))
      .mockResolvedValueOnce(response(200, {
        topicId: "topic-2", attemptId: "wrong", sourceRanges: [{ ...topic.ranges[0], end: topic.ranges[0].end - 1 }], trace, highImpact: false,
      }));
    render(<DecisionTraceApp />);
    await userEvent.type(screen.getByRole("textbox", { name: "文字起こし" }), transcript);
    await userEvent.click(screen.getByRole("button", { name: "テーマを検出" }));
    await userEvent.click(await screen.findByRole("button", { name: "選択した1件を生成" }));
    expect((await screen.findAllByText("MALFORMED_RESPONSE")).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("multi-trace-success")).not.toBeInTheDocument();
  });

  it("does not steal focus when multi-result retry state updates", () => {
    const topic = { id: "topic-1" as const, title: "議題A", summary: "判断", ranges: [{ start: 0, end: 3, excerpt: "議題A" }] };
    const entry: MultiTraceEntry = {
      topic,
      editedTitle: "議題A",
      errorCode: "PROVIDER_TIMEOUT",
      retryable: true,
    };
    const { rerender } = render(<MultiTraceResults entries={[entry]} onRetry={() => undefined} onReset={() => undefined} />);
    const reset = screen.getByRole("button", { name: "最初からやり直す" });
    reset.focus();
    rerender(<MultiTraceResults entries={[{ ...entry, retrying: true }]} onRetry={() => undefined} onReset={() => undefined} />);
    expect(reset).toHaveFocus();
  });

  it("fills the memo with the public-policy sample", async () => {
    await renderIdeaMode();

    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));

    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue(publicPolicySample.memo);
  });

  it("shows localized guidance for short input without calling fetch", async () => {
    await renderIdeaMode();
    await userEvent.type(screen.getByRole("textbox", { name: "判断メモ" }), "短いメモ");

    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    expect(screen.getByRole("alert")).toHaveTextContent("80文字以上");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables generation and announces progress while submitting", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));

    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    expect(screen.getByRole("button", { name: "生成中…" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("判断の構造を整理しています");
    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue(publicPolicySample.memo);
  });

  it("renders exactly six named sections, confidence, and grounding labels", async () => {
    fetchMock.mockResolvedValue(response(200, { trace, highImpact: false }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    const sections = await screen.findAllByTestId("trace-section");
    expect(sections).toHaveLength(6);
    expect(sections.map((section) => within(section).getByRole("heading", { level: 2 }).textContent)).toEqual([
      "状況", "前提", "判断基準", "選択肢", "推奨", "次のアクション",
    ]);
    expect(screen.getByText("確信度: 高")).toBeInTheDocument();
    expect(screen.getAllByText("入力からの根拠").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AIによる推論").length).toBeGreaterThan(0);
    expect(screen.getByText("AIによる要約")).toBeInTheDocument();
    expect(screen.getByText("AIによる選択肢整理")).toBeInTheDocument();
    expect(screen.getByText("AIによる推奨")).toBeInTheDocument();
    expect(screen.getByText("AIによるアクション案")).toBeInTheDocument();
  });

  it("shows and exports a qualified-review notice for high-impact decisions", async () => {
    fetchMock.mockResolvedValue(response(200, { trace, highImpact: true }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    expect(await screen.findByRole("note")).toHaveTextContent("専門家の確認");
    expect(screen.getByRole("note")).toHaveTextContent("専門的助言ではありません");
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceをコピー" }));
    await userEvent.click(screen.getByRole("button", { name: "KX Noteをコピー" }));
    expect(writeText.mock.calls[0][0]).toContain("専門家の確認");
    expect(writeText.mock.calls[1][0]).toContain("専門家の確認");
  });

  it.each([
    [429, "利用回数の上限"],
    [504, "時間がかかりすぎました"],
    [413, "送信サイズが大きすぎます"],
  ])("retains the memo and offers retry guidance after %i", async (status, message) => {
    const error = status === 429 ? "RATE_LIMITED" : status === 413 ? "REQUEST_TOO_LARGE" : "ANALYSIS_TIMEOUT";
    fetchMock.mockResolvedValue(response(status, { error }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue(publicPolicySample.memo);
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });

  it.each([
    ["ANALYSIS_COULD_NOT_GROUND", "根拠を入力内容に結び付けられませんでした", "couldn't ground the analysis in your memo"],
    ["ANALYSIS_REFUSED", "この内容は分析できませんでした", "This content couldn't be analyzed"],
    ["ANALYSIS_BUSY", "分析が混み合っています", "Analysis is busy"],
    ["ANALYSIS_REQUEST_REJECTED", "分析リクエストを受け付けられませんでした", "The analysis request was rejected"],
  ])("shows safe bilingual guidance for %s", async (error, japanese, english) => {
    fetchMock.mockResolvedValue(response(error === "ANALYSIS_BUSY" ? 503 : 422, { error }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(japanese);
    expect(alert).toHaveTextContent(english);
    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue(publicPolicySample.memo);
  });

  it("rejects a malformed successful response and preserves the memo for retry", async () => {
    fetchMock.mockResolvedValue(response(200, { trace: { language: "ja" } }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("分析結果を確認できませんでした");
    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue(publicPolicySample.memo);
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });

  it("copies both formatter outputs", async () => {
    fetchMock.mockResolvedValue(response(200, { trace }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    await userEvent.click(await screen.findByRole("button", { name: "Decision Traceをコピー" }));
    await userEvent.click(screen.getByRole("button", { name: "KX Noteをコピー" }));

    await waitFor(() => expect(writeText).toHaveBeenNthCalledWith(1, toDecisionTraceMarkdown(trace)));
    expect(writeText).toHaveBeenNthCalledWith(2, toKxNoteMarkdown(trace));
    expect(screen.getByRole("status")).toHaveTextContent("KX Noteをコピーしました");
  });

  it("announces a localized clipboard rejection as an accessible error", async () => {
    writeText.mockRejectedValue(new Error("permission denied"));
    fetchMock.mockResolvedValue(response(200, { trace }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    await userEvent.click(await screen.findByRole("button", { name: "Decision Traceをコピー" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("コピーできませんでした");
  });

  it("announces unavailable clipboard support in English", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    fetchMock.mockResolvedValue(response(200, { trace: { ...trace, language: "en" } }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    await userEvent.click(await screen.findByRole("button", { name: "Copy KX Note" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not copy");
  });

  it("starts over with an empty input", async () => {
    fetchMock.mockResolvedValue(response(200, { trace }));
    await renderIdeaMode();
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));
    await userEvent.click(await screen.findByRole("button", { name: "最初からやり直す" }));

    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue("");
  });
});
