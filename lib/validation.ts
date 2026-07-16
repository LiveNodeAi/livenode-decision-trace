export type MemoValidation =
  | { ok: true; memo: string }
  | { ok: false; code: "MEMO_TOO_SHORT" | "MEMO_TOO_LONG" };

export function validateMemo(memo: string): MemoValidation {
  const trimmed = memo.trim();

  if (trimmed.length < 80) return { ok: false, code: "MEMO_TOO_SHORT" };
  if (trimmed.length > 12_000) return { ok: false, code: "MEMO_TOO_LONG" };

  return { ok: true, memo: trimmed };
}
