"use client";

import { useState } from "react";

import { decisionTraceSchema, type DecisionTrace } from "@/lib/decision-trace-schema";
import { validateMemo } from "@/lib/validation";
import { InputPanel } from "./input-panel";
import { ResultPanel } from "./result-panel";

type AppState =
  | { status: "input"; memo: string; error: string | null }
  | { status: "generating"; memo: string }
  | { status: "result"; memo: string; trace: DecisionTrace; highImpact: boolean }
  | { status: "error"; memo: string; error: string };

const errors: Record<string, string> = {
  MEMO_TOO_SHORT: "判断の背景が分かるように、80文字以上で入力してください。",
  MEMO_TOO_LONG: "入力は12,000文字以内にしてください。",
  REQUEST_TOO_LARGE: "送信サイズが大きすぎます。入力を短くして、もう一度試してください。",
  RATE_LIMITED: "利用回数の上限に達しました。少し待ってから、もう一度試してください。",
  ANALYSIS_TIMEOUT: "分析に時間がかかりすぎました。入力内容は残っています。もう一度試してください。",
  ANALYSIS_COULD_NOT_GROUND: "根拠を入力内容に結び付けられませんでした。入力内容を確認して、もう一度試してください。 / We couldn't ground the analysis in your memo. Review it and try again.",
  ANALYSIS_REFUSED: "この内容は分析できませんでした。入力内容を見直してください。 / This content couldn't be analyzed. Please revise your memo.",
  ANALYSIS_UNAVAILABLE: "現在、分析を完了できませんでした。入力内容は残っています。もう一度試してください。",
  INVALID_REQUEST: "入力内容を確認して、もう一度試してください。",
  MALFORMED_RESPONSE: "分析結果を確認できませんでした。入力内容は残っています。もう一度試してください。",
};

export function DecisionTraceApp() {
  const [state, setState] = useState<AppState>({ status: "input", memo: "", error: null });

  const updateMemo = (memo: string) => setState({ status: "input", memo, error: null });

  async function submit() {
    const validation = validateMemo(state.memo);
    if (!validation.ok) {
      setState({ status: "input", memo: state.memo, error: errors[validation.code] });
      return;
    }

    const memo = validation.memo;
    setState({ status: "generating", memo });
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memo }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const code = typeof body === "object" && body !== null && "error" in body
          ? String(body.error)
          : "ANALYSIS_UNAVAILABLE";
        setState({ status: "error", memo, error: errors[code] ?? errors.ANALYSIS_UNAVAILABLE });
        return;
      }
      const trace = decisionTraceSchema.safeParse(
        typeof body === "object" && body !== null && "trace" in body ? body.trace : undefined,
      );
      if (!trace.success) {
        setState({ status: "error", memo, error: errors.MALFORMED_RESPONSE });
        return;
      }
      const highImpact = typeof body === "object" && body !== null && "highImpact" in body
        ? body.highImpact === true
        : false;
      setState({ status: "result", memo, trace: trace.data, highImpact });
    } catch {
      setState({ status: "error", memo, error: errors.ANALYSIS_UNAVAILABLE });
    }
  }

  return (
    <>
      {state.status === "result" ? (
        <ResultPanel trace={state.trace} highImpact={state.highImpact} onReset={() => setState({ status: "input", memo: "", error: null })} />
      ) : (
        <InputPanel
          memo={state.memo}
          error={state.status === "error" || state.status === "input" ? state.error : null}
          generating={state.status === "generating"}
          onMemoChange={updateMemo}
          onSubmit={submit}
        />
      )}
    </>
  );
}
