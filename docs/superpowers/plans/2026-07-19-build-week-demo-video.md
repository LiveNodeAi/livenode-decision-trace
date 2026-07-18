# OpenAI Build Week Demo Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a 75–100 second submission-ready MP4 that records the live multi-topic workflow, explains Codex and GPT-5.6 in English audio and burned-in English captions, and requires no recording work from the user.

**Architecture:** A checked-in fictional Japanese transcript and bilingual narration define the content. A Playwright script supports a free mocked rehearsal and a single production capture, records the browser, and updates an in-page English caption overlay at scene boundaries. A rendering script creates English speech with macOS `say`, aligns scene audio to the captured timeline, and muxes the audio with the captured WebM into H.264/AAC MP4 using `ffmpeg`.

**Tech Stack:** Node.js 26, Playwright, macOS `say`, FFmpeg 8, Vitest, Cloudflare-hosted production app.

## Global Constraints

- Video duration must be 75–100 seconds and remain below the official three-minute limit.
- Use the public production application for the final capture.
- Final video must contain English synthetic narration and burned-in English captions.
- Keep Japanese translations of all narration in the repository.
- Do not use music, real meeting data, personal information, browser account UI, or third-party media.
- Production capture performs one topic-detection request and two topic-analysis requests unless a verified failure requires one retry.
- Do not claim direct Obsidian or Notion saving as an implemented web feature.
- Final deliverables are MP4, raw WebM, English narration, Japanese translation, scene timing JSON, and ZIP download evidence.

---

## File Structure

- `docs/submission/demo-transcript-ja.txt` — fictional two-decision meeting transcript used in the demo.
- `docs/submission/demo-narration-en.txt` — canonical English voiceover.
- `docs/submission/demo-narration-ja.txt` — Japanese translation for user review.
- `docs/submission/demo-scenes.json` — ordered scene IDs, durations, English captions, and narration segments.
- `scripts/demo-fixtures.mjs` — deterministic mock topic and trace responses for zero-cost rehearsal.
- `scripts/capture-demo.mjs` — mock/production browser capture, caption overlay, interaction timing, and ZIP evidence.
- `scripts/render-demo.mjs` — speech generation, aligned audio assembly, WebM-to-MP4 mux, and media validation.
- `tests/demo-assets.test.ts` — validates transcript safety/length, bilingual content, required judging language, and scene duration.
- `docs/submission/demo-video-en.webm` — raw production browser capture.
- `docs/submission/demo-video-en.mp4` — final YouTube-ready video.
- `docs/submission/demo-download.zip` — ZIP downloaded during the production capture for evidence only; never contains real data.

---

### Task 1: Create safe demo content and timing contract

**Files:**
- Create: `docs/submission/demo-transcript-ja.txt`
- Create: `docs/submission/demo-narration-en.txt`
- Modify: `docs/submission/demo-narration-ja.txt`
- Create: `docs/submission/demo-scenes.json`
- Create: `tests/demo-assets.test.ts`

**Interfaces:**
- Produces: `demo-scenes.json` as `Array<{ id: string; durationMs: number; caption: string; narration: string }>`.
- Produces: a 1,500–2,000 character fictional transcript containing exactly two clear decision themes.
- Consumes: no runtime application data.

- [ ] **Step 1: Write the failing asset-contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`docs/submission/${name}`, "utf8");

describe("Build Week demo assets", () => {
  it("uses a safe two-theme transcript and a 75-100 second English story", () => {
    const transcript = read("demo-transcript-ja.txt");
    const english = read("demo-narration-en.txt");
    const japanese = read("demo-narration-ja.txt");
    const scenes = JSON.parse(read("demo-scenes.json")) as Array<{ id: string; durationMs: number; caption: string; narration: string }>;
    expect(transcript.length).toBeGreaterThanOrEqual(1500);
    expect(transcript.length).toBeLessThanOrEqual(2000);
    expect(transcript).toContain("実証地域");
    expect(transcript).toContain("LINE");
    expect(english).toMatch(/Codex/i);
    expect(english).toMatch(/GPT-5\.6/i);
    expect(english).toMatch(/two decision topics/i);
    expect(japanese).toMatch(/Codex/);
    expect(scenes.reduce((sum, scene) => sum + scene.durationMs, 0)).toBeGreaterThanOrEqual(75_000);
    expect(scenes.reduce((sum, scene) => sum + scene.durationMs, 0)).toBeLessThanOrEqual(100_000);
    expect(new Set(scenes.map(({ id }) => id)).size).toBe(scenes.length);
    expect(scenes.every(({ caption, narration }) => caption.length > 0 && narration.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify the missing assets fail**

Run: `npm test -- tests/demo-assets.test.ts`

Expected: FAIL with `ENOENT` for `demo-transcript-ja.txt`.

- [ ] **Step 3: Create the transcript, bilingual narration, and scene JSON**

Use eight scenes totaling 88,000 ms:

```json
[
  { "id": "opening", "durationMs": 9000, "caption": "AI gives answers. Decision Trace preserves why.", "narration": "AI can give us an answer in seconds. LiveNode Decision Trace preserves why a decision was made." },
  { "id": "paste", "durationMs": 11000, "caption": "Paste one meeting transcript — up to 30,000 characters", "narration": "I paste one fictional meeting transcript. The public demo accepts up to thirty thousand characters." },
  { "id": "detect", "durationMs": 13000, "caption": "GPT-5.6 detects grounded decision topics", "narration": "GPT-5.6 detects two decision topics and grounds each topic in exact transcript segments." },
  { "id": "review", "durationMs": 10000, "caption": "Human review comes before generation", "narration": "Before generation, the user can review, rename, select, or exclude each topic." },
  { "id": "generate", "durationMs": 17000, "caption": "Generate traceable reasoning, not only a summary", "narration": "Each selected topic becomes a Decision Trace: situation, assumptions, criteria, trade-offs, recommendation, and next actions." },
  { "id": "evidence", "durationMs": 10000, "caption": "Input evidence and AI inference stay visibly separate", "narration": "Grounded evidence stays separate from AI inference, so a polished answer cannot silently become a supplied fact." },
  { "id": "zip", "durationMs": 10000, "caption": "Download a portable Markdown ZIP", "narration": "The browser creates a Markdown ZIP with a meeting summary, actions, Decision Traces, and reusable KX Notes." },
  { "id": "build", "durationMs": 8000, "caption": "Built with Codex and GPT-5.6", "narration": "Codex accelerated design, implementation, testing, and deployment. GPT-5.6 powers topic detection and structured analysis." }
]
```

The Japanese transcript must use fictional roles only (`進行役`, `企画担当`, `現場担当`, `広報担当`) and contain no real place, company, person, email, phone, or account name.

- [ ] **Step 4: Run the asset test**

Run: `npm test -- tests/demo-assets.test.ts`

Expected: 1 test file PASS.

- [ ] **Step 5: Commit the content contract**

```bash
git add docs/submission/demo-transcript-ja.txt docs/submission/demo-narration-en.txt docs/submission/demo-narration-ja.txt docs/submission/demo-scenes.json tests/demo-assets.test.ts
git commit -m "docs: add Build Week demo content"
```

---

### Task 2: Build deterministic rehearsal and production capture

**Files:**
- Create: `scripts/demo-fixtures.mjs`
- Modify: `scripts/capture-demo.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `demo-scenes.json`, `demo-transcript-ja.txt`, `DEMO_TARGET=mock|production`.
- Produces: `docs/submission/demo-video-en.webm` and `docs/submission/demo-download.zip`.
- Produces: process exit 0 only after two detected topics, two successful traces, and a ZIP download.

- [ ] **Step 1: Extract deterministic two-topic fixtures**

Export these functions from `scripts/demo-fixtures.mjs`:

```js
export function buildDemoTopics(transcript) {
  return [
    topicFromExcerpt(transcript, "実証地域は駅周辺から始める"),
    topicFromExcerpt(transcript, "参加案内はLINEを主導線にする"),
  ];
}

export function buildDemoTrace(topic) {
  return topic.id === "topic-1" ? regionTrace : guidanceTrace;
}
```

`topicFromExcerpt` must calculate exact `start`, `end`, and `excerpt` values from the checked-in transcript and throw if the grounding sentence is absent.

- [ ] **Step 2: Replace the single-memo capture with a dual-mode scene runner**

The script must:

```js
const target = process.env.DEMO_TARGET ?? "mock";
const baseURL = target === "production"
  ? "https://livenode-decision-trace.takahiro-nochi.workers.dev/"
  : "http://127.0.0.1:3100/";
if (!new Set(["mock", "production"]).has(target)) throw new Error("DEMO_TARGET must be mock or production");
```

For `mock`, route both API endpoints to deterministic fixtures. For `production`, install no API routes. Inject a fixed caption overlay with `page.addStyleTag()` and `page.evaluate()`; do not modify application source. Run scenes in order, using accessible selectors:

```js
await page.getByRole("textbox", { name: "文字起こし" }).fill(transcript);
await page.getByRole("button", { name: "テーマを検出" }).click();
await page.getByTestId("topic-review-item").first().waitFor();
await page.getByRole("button", { name: /選択した2件を生成/ }).click();
await page.getByText("2/2件完了").waitFor({ timeout: 90_000 });
const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Markdown ZIPをダウンロード" }).click();
await (await download).saveAs("docs/submission/demo-download.zip");
```

Record at 1440×900 and save the raw file only after closing the context.

- [ ] **Step 3: Add separate rehearsal and production commands**

```json
{
  "scripts": {
    "capture:demo:rehearsal": "DEMO_TARGET=mock node scripts/capture-demo.mjs",
    "capture:demo:production": "DEMO_TARGET=production node scripts/capture-demo.mjs"
  }
}
```

- [ ] **Step 4: Run the zero-cost rehearsal**

Run the app and capture script:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3100
npm run capture:demo:rehearsal
```

Expected: exit 0, two topic cards, `2/2件完了`, WebM created, ZIP created, and no external OpenAI request.

- [ ] **Step 5: Inspect rehearsal media**

Run:

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 docs/submission/demo-video-en.webm
unzip -l docs/submission/demo-download.zip
```

Expected: duration 75–100 seconds and ZIP includes `00-meeting-summary.md`, `99-actions.md`, `manifest.json`, two `Decision-Trace.md`, and two `KX-Note.md` files.

- [ ] **Step 6: Commit the capture workflow before using production API**

```bash
git add scripts/demo-fixtures.mjs scripts/capture-demo.mjs package.json package-lock.json
git commit -m "feat: automate multi-topic demo capture"
```

---

### Task 3: Generate narration and final MP4

**Files:**
- Create: `scripts/render-demo.mjs`
- Modify: `package.json`
- Create: `docs/submission/demo-video-en.mp4`

**Interfaces:**
- Consumes: `demo-scenes.json` and `demo-video-en.webm`.
- Produces: scene-aligned AIFF segments under ignored `/tmp/livenode-demo-audio`, combined AAC audio, and final H.264/AAC MP4.
- Produces: exit 0 only if final media is 75–100 seconds, 1200×800 or larger, and contains one video and one audio stream.

- [ ] **Step 1: Implement scene speech generation**

Use `spawnSync` with argument arrays, never interpolated shell strings:

```js
spawnSync("say", ["-v", "Samantha", "-r", "175", "-o", aiffPath, scene.narration], { stdio: "inherit" });
spawnSync("ffmpeg", ["-y", "-i", aiffPath, "-af", `apad=pad_dur=${scene.durationMs / 1000}`, "-t", String(scene.durationMs / 1000), wavPath], { stdio: "inherit" });
```

Concatenate scene WAV files with FFmpeg's concat demuxer, then mux audio with the raw WebM:

```js
spawnSync("ffmpeg", ["-y", "-i", rawVideo, "-i", combinedAudio, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", finalMp4], { stdio: "inherit" });
```

- [ ] **Step 2: Add render command**

```json
{
  "scripts": {
    "render:demo": "node scripts/render-demo.mjs"
  }
}
```

- [ ] **Step 3: Render the rehearsal MP4**

Run: `npm run render:demo`

Expected: `docs/submission/demo-video-en.mp4` exists and the render script exits 0.

- [ ] **Step 4: Inspect the rehearsal video visually and technically**

Run:

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height -of json docs/submission/demo-video-en.mp4
```

Expected: H.264 video, AAC audio, width at least 1200, height at least 800, and duration 75–100 seconds. Visually confirm caption text stays within the viewport and no browser account UI or secrets appear.

- [ ] **Step 5: Commit the renderer**

```bash
git add scripts/render-demo.mjs package.json package-lock.json
git commit -m "feat: render narrated Build Week demo"
```

---

### Task 4: Capture production once and verify submission media

**Files:**
- Replace: `docs/submission/demo-video-en.webm`
- Replace: `docs/submission/demo-video-en.mp4`
- Replace: `docs/submission/demo-download.zip`
- Modify: `docs/submission/verification.md`

**Interfaces:**
- Consumes: the deployed public Worker and the already-verified capture workflow.
- Produces: final media and a truthful acceptance record.

- [ ] **Step 1: Confirm production page without invoking OpenAI**

Run:

```bash
curl -fsS https://livenode-decision-trace.takahiro-nochi.workers.dev/ | rg 'Decision|30,000'
```

Expected: HTTP success and matching page content.

- [ ] **Step 2: Run one production capture**

Run: `npm run capture:demo:production`

Expected: one detection request, two analysis requests, `2/2件完了`, WebM saved, and ZIP saved. Do not automatically rerun on failure.

- [ ] **Step 3: Render the final MP4 without additional API use**

Run: `npm run render:demo`

Expected: exit 0 and final MP4 replaces the rehearsal render.

- [ ] **Step 4: Run complete repository verification**

Run:

```bash
npm test
npx playwright test
npm run build
git diff --check
```

Expected: 18 test files and 164 tests pass after Task 1, all 8 Playwright tests pass, production build exits 0, and diff check exits 0.

- [ ] **Step 5: Verify final media and ZIP**

Run:

```bash
ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,width,height -of json docs/submission/demo-video-en.mp4
unzip -l docs/submission/demo-download.zip
```

Expected: 75–100 seconds, H.264/AAC, 1200×800 or larger, and exactly two Decision Trace files plus two KX Note files with summary/actions/manifest.

- [ ] **Step 6: Update verification truth**

Record the capture date, final duration, resolution, codecs, successful two-topic production flow, ZIP inventory, and the fact that voice and captions are synthetic English. Do not estimate API cost without Usage evidence.

- [ ] **Step 7: Commit final media and evidence**

```bash
git add docs/submission/demo-video-en.webm docs/submission/demo-video-en.mp4 docs/submission/demo-download.zip docs/submission/verification.md
git commit -m "docs: add narrated multi-topic demo"
```

---

## Final Manual Gate

Before YouTube upload, the user reviews only the finished MP4. Upload and public publication remain confirm-first external actions.
