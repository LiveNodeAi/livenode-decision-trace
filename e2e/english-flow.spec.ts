import { expect, test } from "@playwright/test";

const englishTrace = {
  language: "en",
  situation: { decision: "Pilot hybrid check-in", context: [{ text: "The venue network has failed before", evidence: "the mobile network became congested", inference: false }] },
  assumptions: [{ text: "Staff can support two check-in paths", evidence: null, inference: true }],
  criteria: [{ text: "Keep average waiting below ten minutes", evidence: "average waiting time stays below ten minutes", inference: false }],
  options: [
    { name: "Fully online", benefits: ["Fast"], costs: ["Training"], risks: ["Network failure"], reversible: false },
    { name: "Hybrid pilot", benefits: ["Resilient"], costs: ["Two workflows"], risks: [], reversible: true },
  ],
  recommendation: { option: "Hybrid pilot", reasoning: [{ text: "It preserves a fallback", evidence: "keeping paper forms for walk-ins and exceptions", inference: false }], confidence: "high", changeConditions: ["Stable network performance is demonstrated"] },
  nextActions: [{ order: 1, action: "Brief the six check-in staff" }],
  links: [],
};

test("English route completes the sample workflow without a live API call", async ({ page }) => {
  let source = "";
  let topic: { id: string; title: string; summary: string; ranges: { start: number; end: number; excerpt: string }[] };
  await page.route("**/api/topics/detect", async (route) => {
    source = (route.request().postDataJSON() as { transcript: string }).transcript;
    const excerpt = "a three-month pilot in those two areas";
    const start = source.indexOf(excerpt);
    topic = { id: "topic-1", title: "Choose the event check-in process", summary: "Decide between fully online and a hybrid pilot.", ranges: [{ start, end: start + excerpt.length, excerpt }] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ transcriptHash: "e".repeat(64), topics: [topic] }) });
  });
  await page.route("**/api/topics/analyze", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ topicId: topic.id, attemptId: "english-demo", sourceRanges: topic.ranges, trace: englishTrace, highImpact: false }) });
  });

  await page.goto("/?lang=en");
  await expect(page.getByRole("heading", { name: "Find decisions in a meeting transcript" })).toBeVisible();
  await page.getByRole("button", { name: "Use English sample transcript" }).click();
  await expect(page.getByRole("textbox", { name: "Transcript" })).toHaveValue(/bicycle-tourism program/);
  await page.getByRole("button", { name: "Detect topics" }).click();
  await expect(page.getByRole("heading", { name: "Review topics to generate" })).toBeVisible();
  await page.getByRole("button", { name: "Generate 1 selected topic" }).click();
  await expect(page.getByRole("heading", { name: "Decision Traces across topics" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download Markdown ZIP" })).toBeEnabled();
});
