import { chromium } from "@playwright/test";

const trace = {
  language: "ja",
  situation: {
    decision: "2地域に絞って3か月の実証を行う",
    context: [{ text: "移動ログは駅周辺と温泉地区に集中", evidence: "移動ログが312件", inference: false }],
  },
  assumptions: [{ text: "既存予算内で実証できる", evidence: null, inference: true }],
  criteria: [{ text: "安全性と再現可能な証拠を優先", evidence: "判断基準は、安全性", inference: false }],
  options: [
    { name: "全域整備", benefits: ["公平感"], costs: ["広い調整範囲"], risks: ["効果測定が難しい"], reversible: false },
    { name: "2地域実証", benefits: ["測定しやすい"], costs: ["選定理由の説明"], risks: ["対象外地区の反発"], reversible: true },
  ],
  recommendation: {
    option: "2地域で3か月実証",
    reasoning: [{ text: "小さく検証し、条件を公開する", evidence: "2エリアで3か月実証", inference: false }],
    confidence: "high",
    changeConditions: ["事故や住民苦情が一定数を超えた場合"],
  },
  nextActions: [
    { order: 1, action: "選定理由と全域展開の条件を公開する" },
    { order: 2, action: "滞在時間と店舗利用を測定する" },
  ],
  links: [],
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(10_000);
await page.route("**/api/analyze", (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ trace, highImpact: false }),
}));
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "町の自転車施策で実証地域を絞る" }).waitFor();
await page.getByRole("button", { name: "町の自転車施策で実証地域を絞る" }).click();
await page.getByRole("button", { name: "Decision Traceを生成" }).click();
await page.getByTestId("trace-section").first().waitFor();
await page.evaluate(() => {
  document.documentElement.style.zoom = "0.65";
  window.scrollTo(0, 0);
});
await page.waitForTimeout(250);
await page.screenshot({ path: "docs/submission/screenshots/thumbnail-3x2.png" });
await browser.close();
