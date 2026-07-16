import { chromium } from "@playwright/test";

const outputPath = "docs/submission/demo-video-ja.webm";
const trace = {
  language: "ja",
  situation: { decision: "2地域に絞って3か月の実証を行う", context: [{ text: "移動ログは駅周辺と温泉地区に集中", evidence: "移動ログが312件", inference: false }] },
  assumptions: [{ text: "既存予算内で実証できる", evidence: null, inference: true }],
  criteria: [{ text: "安全性と再現可能な証拠を優先", evidence: "判断基準は、安全性", inference: false }],
  options: [
    { name: "全域整備", benefits: ["公平感"], costs: ["広い調整範囲"], risks: ["効果測定が難しい"], reversible: false },
    { name: "2地域実証", benefits: ["測定しやすい"], costs: ["選定理由の説明"], risks: ["対象外地区の反発"], reversible: true },
  ],
  recommendation: { option: "2地域で3か月実証", reasoning: [{ text: "小さく検証し、条件を公開する", evidence: "2エリアで3か月実証", inference: false }], confidence: "high", changeConditions: ["事故や住民苦情が一定数を超えた場合"] },
  nextActions: [{ order: 1, action: "選定理由と全域展開の条件を公開する" }, { order: 2, action: "滞在時間と店舗利用を測定する" }],
  links: [],
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, recordVideo: { dir: "/tmp/livenode-demo", size: { width: 1200, height: 800 } } });
const page = await context.newPage();
page.setDefaultTimeout(10_000);
await page.route("**/api/analyze", async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 1400));
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace, highImpact: false }) });
});
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "町の自転車施策で実証地域を絞る" }).waitFor();

await page.waitForTimeout(8_000);
await page.getByRole("button", { name: "町の自転車施策で実証地域を絞る" }).click();
await page.waitForTimeout(5_000);
await page.getByRole("button", { name: "Decision Traceを生成" }).click();
await page.getByTestId("trace-section").first().waitFor();
await page.waitForTimeout(5_000);

for (const card of await page.getByTestId("trace-section").all()) {
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(3_400);
}

const copyKx = page.getByRole("button", { name: "KX Noteをコピー" });
await copyKx.scrollIntoViewIfNeeded();
await page.waitForTimeout(3_000);
await copyKx.click();
await page.waitForTimeout(8_000);
await page.getByRole("heading", { name: "Decision Traceの結果" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(7_000);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await page.waitForTimeout(8_000);

const video = page.video();
await context.close();
await video.saveAs(outputPath);
await browser.close();
