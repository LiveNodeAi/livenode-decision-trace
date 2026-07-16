import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DecisionTraceApp } from "@/components/decision-trace-app";
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

  it("fills the memo with the public-policy sample", async () => {
    render(<DecisionTraceApp />);

    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));

    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue(publicPolicySample.memo);
  });

  it("shows localized guidance for short input without calling fetch", async () => {
    render(<DecisionTraceApp />);
    await userEvent.type(screen.getByRole("textbox", { name: "判断メモ" }), "短いメモ");

    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    expect(screen.getByRole("alert")).toHaveTextContent("80文字以上");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables generation and announces progress while submitting", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<DecisionTraceApp />);
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));

    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    expect(screen.getByRole("button", { name: "生成中…" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("判断の構造を整理しています");
    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue(publicPolicySample.memo);
  });

  it("renders exactly six named sections, confidence, and grounding labels", async () => {
    fetchMock.mockResolvedValue(response(200, { trace }));
    render(<DecisionTraceApp />);
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
  });

  it.each([
    [429, "利用回数の上限"],
    [504, "時間がかかりすぎました"],
  ])("retains the memo and offers retry guidance after %i", async (status, message) => {
    fetchMock.mockResolvedValue(response(status, { error: status === 429 ? "RATE_LIMITED" : "ANALYSIS_TIMEOUT" }));
    render(<DecisionTraceApp />);
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue(publicPolicySample.memo);
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });

  it("copies both formatter outputs", async () => {
    fetchMock.mockResolvedValue(response(200, { trace }));
    render(<DecisionTraceApp />);
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));

    await userEvent.click(await screen.findByRole("button", { name: "Decision Traceをコピー" }));
    await userEvent.click(screen.getByRole("button", { name: "KX Noteをコピー" }));

    await waitFor(() => expect(writeText).toHaveBeenNthCalledWith(1, toDecisionTraceMarkdown(trace)));
    expect(writeText).toHaveBeenNthCalledWith(2, toKxNoteMarkdown(trace));
  });

  it("starts over with an empty input", async () => {
    fetchMock.mockResolvedValue(response(200, { trace }));
    render(<DecisionTraceApp />);
    await userEvent.click(screen.getByRole("button", { name: publicPolicySample.title }));
    await userEvent.click(screen.getByRole("button", { name: "Decision Traceを生成" }));
    await userEvent.click(await screen.findByRole("button", { name: "最初からやり直す" }));

    expect(screen.getByRole("textbox", { name: "判断メモ" })).toHaveValue("");
  });
});
