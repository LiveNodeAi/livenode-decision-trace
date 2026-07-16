import { validateMemo } from "@/lib/validation";

it("rejects a memo shorter than 80 trimmed characters", () => {
  expect(validateMemo("short memo")).toEqual({ ok: false, code: "MEMO_TOO_SHORT" });
});

it("accepts a memo between 80 and 12000 characters", () => {
  expect(validateMemo("a".repeat(80))).toEqual({ ok: true, memo: "a".repeat(80) });
});
