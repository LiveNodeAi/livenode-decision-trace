import { chromium } from "@playwright/test";

const trace = {
  language: "en",
  situation: { decision: "Pilot hybrid event check-in", context: [{ text: "The venue network has failed before", evidence: "the mobile network became congested", inference: false }] },
  assumptions: [{ text: "Six staff members can support two check-in paths", evidence: null, inference: true }],
  criteria: [{ text: "Keep average waiting below ten minutes", evidence: "average waiting time stays below ten minutes", inference: false }],
  options: [
    { name: "Fully online", benefits: ["Fast when the network works"], costs: ["Training and support"], risks: ["A network outage can stop check-in"], reversible: false },
    { name: "Hybrid pilot", benefits: ["Paper fallback remains available"], costs: ["Two staff workflows"], risks: ["More preparation"], reversible: true },
  ],
  recommendation: { option: "Run a hybrid pilot", reasoning: [{ text: "It improves speed without removing the fallback", evidence: "keeping paper forms for walk-ins and exceptions", inference: false }], confidence: "high", changeConditions: ["Stable network performance is demonstrated at the next event"] },
  nextActions: [{ order: 1, action: "Brief the six check-in staff" }, { order: 2, action: "Measure waiting time and matching errors" }],
  links: [],
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
await page.route("**/api/analyze", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ trace, highImpact: false }) }));
await page.goto("http://127.0.0.1:3100/?lang=en", { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "Idea memo" }).click();
await page.getByRole("button", { name: "Choose the next feature for a voice app" }).click();
await page.getByRole("button", { name: "Generate Decision Trace" }).click();
await page.getByTestId("trace-section").first().waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(250);
await page.screenshot({ path: "docs/submission/screenshots/result-six-part-en.png", fullPage: true });
await browser.close();
