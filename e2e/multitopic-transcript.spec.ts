import { expect, test, type Page, type Route } from "@playwright/test";
import JSZip from "jszip";

const trace = {
  language: "ja",
  situation: { decision: "段階導入する", context: [{ text: "小さく始める", evidence: "小さく始める", inference: false }] },
  assumptions: [{ text: "担当者を確保できる", evidence: null, inference: true }],
  criteria: [{ text: "戻せること", evidence: "後から戻せる", inference: false }],
  options: [
    { name: "一括導入", benefits: ["速い"], costs: ["重い"], risks: ["手戻り"], reversible: false },
    { name: "段階導入", benefits: ["学べる"], costs: ["時間"], risks: [], reversible: true },
  ],
  recommendation: {
    option: "段階導入",
    reasoning: [{ text: "小さく検証できる", evidence: "小さく始める", inference: false }],
    confidence: "high",
    changeConditions: ["利用率が基準を下回る"],
  },
  nextActions: [{ order: 1, action: "担当者を決める" }],
  links: [],
};

const transcript = `${"会議の背景と制約を共有します。".repeat(16)}${Array.from({ length: 5 }, (_, index) => `判断${index + 1}は小さく始めて後から戻せる段階導入にします。`).join("\r\n")}`;
const topics = Array.from({ length: 5 }, (_, index) => {
  const excerpt = `判断${index + 1}は小さく始めて後から戻せる段階導入にします。`;
  const start = transcript.indexOf(excerpt);
  return {
    id: `topic-${index + 1}`,
    title: `判断${index + 1}`,
    summary: `判断${index + 1}の進め方`,
    ranges: [{ start, end: start + excerpt.length, excerpt }],
  };
});

function topicResult(topic: (typeof topics)[number], attemptId: string) {
  return { topicId: topic.id, attemptId, sourceRanges: topic.ranges, trace, highImpact: false };
}

async function enterTranscriptMode(page: Page) {
  await page.goto("/");
  const modes = page.getByRole("navigation", { name: "入力モード" }).getByRole("button");
  await expect(modes).toHaveText(["会議・文字起こし", "アイデアメモ"]);
  await expect(modes.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("会議ログを最大5テーマへ分け、判断の経緯と次の行動をMarkdownにします。")).toBeVisible();
  const steps = page.getByRole("list", { name: "会議ログからMarkdownまでの流れ" }).getByRole("listitem");
  await expect(steps).toHaveCount(4);
  await expect(steps.first()).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("textbox", { name: "文字起こし" })).toBeFocused();
}

async function detectFive(page: Page) {
  await page.getByRole("textbox", { name: "文字起こし" }).fill(transcript);
  await page.getByRole("button", { name: "テーマを検出" }).click();
  await expect(page.getByTestId("topic-review-item")).toHaveCount(5);
  await expect(page.getByRole("listitem", { name: /2テーマ確認/ })).toHaveAttribute("aria-current", "step");
}

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function downloadZip(page: Page) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown ZIPをダウンロード" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return JSZip.loadAsync(Buffer.concat(chunks));
}

test("5テーマを最大2並列で処理し、部分失敗だけ再試行してZIPを保存する", async ({ page }) => {
  let active = 0;
  let maximum = 0;
  const attempts = new Map<string, number>();
  await page.route("**/api/topics/detect", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ transcriptHash: "a".repeat(64), topics }),
  }));
  await page.route("**/api/topics/analyze", async (route: Route) => {
    const request = route.request().postDataJSON() as { topic: { id: string } };
    const id = request.topic.id;
    const attempt = (attempts.get(id) ?? 0) + 1;
    attempts.set(id, attempt);
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, id === "topic-1" ? 90 : 35));
    active -= 1;
    if (id === "topic-2" && attempt === 1) {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "PROVIDER_BUSY", retryable: true }) });
      return;
    }
    const topic = topics.find((candidate) => candidate.id === id)!;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(topicResult(topic, `${id}-${attempt}`)) });
  });

  await enterTranscriptMode(page);
  await detectFive(page);
  await page.getByRole("checkbox", { name: "判断5を生成対象にする" }).uncheck();
  await page.getByRole("textbox", { name: "判断2のタイトル" }).fill("編集した判断2");
  await page.getByRole("button", { name: "選択した4件を生成" }).click();

  await expect(page.getByRole("heading", { name: "複数テーマのDecision Trace" })).toBeVisible();
  await expect(page.getByRole("listitem", { name: /4ZIP保存/ })).toHaveAttribute("aria-current", "step");
  await expect(page.getByText("3/4件完了")).toBeVisible();
  expect(maximum).toBe(2);
  expect(attempts.get("topic-5")).toBeUndefined();
  for (const id of ["topic-1", "topic-2", "topic-3", "topic-4"]) expect(attempts.get(id)).toBe(1);
  await expect(page.getByText("編集した判断2の生成に失敗しました")).toBeVisible();
  const partialZip = await downloadZip(page);
  const partialNames = Object.keys(partialZip.files);
  expect(partialNames.filter((name) => name.endsWith("Decision-Trace.md"))).toHaveLength(3);
  const partialSummaryName = partialNames.find((name) => name.endsWith("00-meeting-summary.md"))!;
  expect(await partialZip.file(partialSummaryName)!.async("string")).toContain("編集した判断2");

  await page.getByRole("button", { name: "編集した判断2を再試行" }).click();
  await expect(page.getByText("4/4件完了")).toBeVisible();
  expect(attempts.get("topic-2")).toBe(2);
  for (const count of attempts.values()) expect(count).toBeLessThanOrEqual(2);

  const zip = await downloadZip(page);
  const names = Object.keys(zip.files);
  expect(names.some((name) => name.endsWith("00-meeting-summary.md"))).toBe(true);
  expect(names.filter((name) => name.endsWith("Decision-Trace.md"))).toHaveLength(4);
  expect(names.filter((name) => name.endsWith("KX-Note.md"))).toHaveLength(4);
  expect(names.some((name) => name.endsWith("99-actions.md"))).toBe(true);
  expect(names.some((name) => name.endsWith("manifest.json"))).toBe(true);
  expect(names.some((name) => name.includes("判断5"))).toBe(false);
  await assertNoHorizontalOverflow(page);
});

test("中止後も先に完成したテーマを保持し、失敗テーマだけ再試行できる", async ({ page }) => {
  await page.route("**/api/topics/detect", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ transcriptHash: "b".repeat(64), topics: topics.slice(0, 3) }),
  }));
  await page.route("**/api/topics/analyze", async (route) => {
    const body = route.request().postDataJSON() as { topic: { id: string } };
    const topic = topics.find((candidate) => candidate.id === body.topic.id)!;
    if (topic.id === "topic-1") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(topicResult(topic, "done-first")) });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "PROVIDER_BUSY", retryable: true }) });
  });

  await enterTranscriptMode(page);
  await page.getByRole("textbox", { name: "文字起こし" }).fill(transcript);
  await page.getByRole("button", { name: "テーマを検出" }).click();
  await page.getByRole("button", { name: "選択した3件を生成" }).click();
  await expect(page.getByRole("status")).toContainText(/1\/3生成中|0\/3生成中/);
  await page.getByRole("button", { name: "判断2を中止" }).click();
  await expect(page.getByText("判断1", { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId("multi-trace-success")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Markdown ZIPをダウンロード" })).toBeEnabled();
  await assertNoHorizontalOverflow(page);
});

test("単一モードを維持し、keyboard操作とviewport内配置を満たす", async ({ page }) => {
  await page.route("**/api/analyze", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ trace, highImpact: false }),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "アイデアメモ" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "町の自転車施策で実証地域を絞る" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Decision Traceを生成" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("trace-section")).toHaveCount(6);
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await assertNoHorizontalOverflow(page);
});
