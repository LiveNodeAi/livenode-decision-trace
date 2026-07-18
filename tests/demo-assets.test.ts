import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`docs/submission/${name}`, "utf8");

describe("Build Week demo assets", () => {
  it("uses a safe two-theme transcript and a 75-100 second English story", () => {
    const transcript = read("demo-transcript-ja.txt");
    const english = read("demo-narration-en.txt");
    const japanese = read("demo-narration-ja.txt");
    const scenes = JSON.parse(read("demo-scenes.json")) as Array<{
      id: string;
      durationMs: number;
      caption: string;
      narration: string;
    }>;

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
