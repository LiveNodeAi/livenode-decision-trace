import { expect, test } from "@playwright/test";

const trace = {
  language: "ja",
  situation: { decision: "2地域で実証する", context: [{ text: "移動ログが集中", evidence: "移動ログ312件", inference: false }] },
  assumptions: [{ text: "既存予算で実施可能", evidence: null, inference: true }],
  criteria: [{ text: "安全性を優先", evidence: "判断基準は安全性", inference: false }],
  options: [
    { name: "全域整備", benefits: ["公平"], costs: ["費用"], risks: ["測定困難"], reversible: false },
    { name: "2地域実証", benefits: ["測定可能"], costs: ["説明"], risks: ["反発"], reversible: true },
  ],
  recommendation: {
    option: "2地域実証", reasoning: [{ text: "小さく検証できる", evidence: "3か月実証", inference: false }],
    confidence: "high", changeConditions: ["苦情が一定数を超える"],
  },
  nextActions: [{ order: 1, action: "選定理由を公開する" }],
  links: [],
};

test("sampleから生成し、6要素をコピーしてリセットできる", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { __clipboardWrites: string[] };
    state.__clipboardWrites = [];
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (value: string) => { state.__clipboardWrites.push(value); } },
      configurable: true,
    });
  });
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace, highImpact: false }) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "アイデアメモ" }).click();

  const sample = page.getByRole("button", { name: "町の自転車施策で実証地域を絞る" });
  await expect(sample).toBeVisible();
  await sample.click();
  await expect(page.getByRole("textbox", { name: "判断メモ" })).toHaveValue(/町の自転車活用施策/);
  await page.getByRole("button", { name: "Decision Traceを生成" }).click();

  const cards = page.getByTestId("trace-section");
  await expect(cards).toHaveCount(6);
  for (let index = 0; index < 6; index += 1) await expect(cards.nth(index)).toBeVisible();
  const copyTrace = page.getByRole("button", { name: "Decision Traceをコピー" });
  const copyKx = page.getByRole("button", { name: "KX Noteをコピー" });
  const reset = page.getByRole("button", { name: "最初からやり直す" });
  await expect(copyTrace).toBeVisible();
  await expect(copyKx).toBeVisible();
  await expect(reset).toBeVisible();
  await copyTrace.click();
  await expect(page.getByRole("status")).toContainText("コピーしました");
  await copyKx.click();
  await expect(page.getByRole("status")).toContainText("KX Note");
  const payloads = await page.evaluate(() => (window as typeof window & { __clipboardWrites: string[] }).__clipboardWrites);
  expect(payloads).toHaveLength(2);
  expect(payloads[0]).toContain("## 状況");
  expect(payloads[0]).toContain("## 次のアクション");
  for (const heading of ["主張", "根拠", "データ", "制約", "リンク"]) {
    expect(payloads[1]).toContain(`## ${heading}`);
  }
  expect(payloads[0].length).toBeGreaterThan(0);
  expect(payloads[1].length).toBeGreaterThan(0);
  expect(payloads[0]).not.toBe(payloads[1]);

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  for (const element of [copyTrace, copyKx, reset, ...Array.from({ length: 6 }, (_, index) => cards.nth(index))]) {
    const box = await element.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  }
  await reset.click();
  await expect(page.getByRole("textbox", { name: "判断メモ" })).toHaveValue("");
});
