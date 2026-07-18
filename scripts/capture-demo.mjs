import { mkdirSync, readFileSync } from "node:fs";

import { chromium } from "@playwright/test";

import { buildDemoTopics, buildDemoTrace } from "./demo-fixtures.mjs";

const target = process.env.DEMO_TARGET ?? "mock";
const baseURL = target === "production"
  ? "https://livenode-decision-trace.takahiro-nochi.workers.dev/"
  : "http://127.0.0.1:3100/";
if (!new Set(["mock", "production"]).has(target)) throw new Error("DEMO_TARGET must be mock or production");

const transcript = readFileSync("docs/submission/demo-transcript-ja.txt", "utf8");
const scenes = JSON.parse(readFileSync("docs/submission/demo-scenes.json", "utf8"));
const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
const topics = buildDemoTopics(transcript);
const outputPath = "docs/submission/demo-video-en.webm";
const zipPath = "docs/submission/demo-download.zip";

function scene(id) {
  const entry = sceneById.get(id);
  if (!entry) throw new Error(`Missing demo scene: ${id}`);
  return entry;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: "/tmp/livenode-demo", size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
page.setDefaultTimeout(15_000);

if (target === "mock") {
  await page.route("**/api/topics/detect", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ transcriptHash: "d".repeat(64), topics }),
    });
  });
  await page.route("**/api/topics/analyze", async (route) => {
    const request = route.request().postDataJSON();
    const topic = topics.find((candidate) => candidate.id === request?.topic?.id);
    if (!topic) return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "INVALID_REQUEST" }) });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        topicId: topic.id,
        attemptId: `demo-${topic.id}`,
        sourceRanges: topic.ranges,
        trace: buildDemoTrace(topic),
        highImpact: false,
      }),
    });
  });
}

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.addStyleTag({ content: `
  #demo-caption { position: fixed; z-index: 2147483647; left: 50%; bottom: 32px; transform: translateX(-50%); max-width: 980px; padding: 14px 20px; border: 1px solid rgba(99,230,226,.8); border-radius: 12px; background: rgba(5,9,19,.92); color: #f5fbff; box-shadow: 0 12px 40px rgba(0,0,0,.45); font: 600 24px/1.35 system-ui, sans-serif; text-align: center; }` });
await page.evaluate(() => {
  const caption = document.createElement("p");
  caption.id = "demo-caption";
  document.body.append(caption);
});

async function play(id, action = async () => {}) {
  const entry = scene(id);
  await page.evaluate((caption) => { document.querySelector("#demo-caption").textContent = caption; }, entry.caption);
  await action();
  await page.waitForTimeout(entry.durationMs);
}

await play("opening");
await play("paste", async () => {
  await page.getByRole("textbox", { name: "文字起こし" }).fill(transcript);
});
await play("detect", async () => {
  await page.getByRole("button", { name: "テーマを検出" }).click();
  await page.getByTestId("topic-review-item").first().waitFor();
});
await play("review", async () => {
  await page.getByTestId("topic-review-item").first().scrollIntoViewIfNeeded();
});
await play("generate", async () => {
  await page.getByRole("button", { name: /選択した2件を生成/ }).click();
  await page.getByText("2/2件完了").waitFor({ timeout: 90_000 });
});
await play("evidence", async () => {
  await page.getByTestId("multi-trace-success").first().scrollIntoViewIfNeeded();
});
await play("zip", async () => {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Markdown ZIPをダウンロード" }).click();
  await (await download).saveAs(zipPath);
});
await play("build", async () => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
});

const video = page.video();
if (!video) throw new Error("Playwright did not create a video");
mkdirSync("docs/submission", { recursive: true });
await context.close();
await video.saveAs(outputPath);
await browser.close();
