import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(`docs/submission/${name}`, "utf8");

describe("Build Week demo assets", () => {
  it("contracts a safe two-theme transcript, timed synthetic-English narration, and burned-in captions", () => {
    const transcript = read("demo-transcript-ja.txt");
    const english = read("demo-narration-en.txt");
    const japanese = read("demo-narration-ja.txt");
    const scenes = JSON.parse(read("demo-scenes.json")) as Array<{
      id: string;
      durationMs: number;
      narrationMaxMs: number;
      operationMs: number;
      caption: string;
      narration: string;
    }>;
    const outputContract = JSON.parse(read("demo-output-contract.json")) as {
      voice: { language: string; type: string; maxWordsPerMinute: number };
      captions: { language: string; delivery: string };
    };

    expect(transcript.length).toBeGreaterThanOrEqual(1500);
    expect(transcript.length).toBeLessThanOrEqual(2000);
    expect(transcript).toContain("実証地域");
    expect(transcript).toContain("LINE");
    expect(transcript.match(/\[テーマ[12]\]/g)).toHaveLength(2);
    expect(
      [...transcript.matchAll(/^([^：\n]+)：/gm)].map(([, speaker]) => speaker),
    ).toEqual(expect.arrayContaining(["進行役", "企画担当", "現場担当", "広報担当"]));
    expect(new Set([...transcript.matchAll(/^([^：\n]+)：/gm)].map(([, speaker]) => speaker))).toEqual(
      new Set(["進行役", "企画担当", "現場担当", "広報担当"]),
    );
    [
      /https?:\/\//i,
      /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/,
      /(?:\+81|0\d{1,4})[-\s]?\d{1,4}[-\s]?\d{4}/,
      /(?:株式会社|有限会社|合同会社|一般社団法人|学校法人)/,
      /(?:東京都|北海道|大阪府|京都府|東京(?:市|区)?|大阪(?:市|区)?|京都(?:市|区)?|札幌市|名古屋市|福岡市|横浜市)/,
      /(?:太郎|花子|次郎|一郎|美咲|健太)/,
    ].forEach((forbiddenPattern) => expect(transcript).not.toMatch(forbiddenPattern));
    expect(english).toMatch(/Codex/i);
    expect(english).toMatch(/GPT-5\.6/i);
    expect(english).toMatch(/two decision topics/i);
    expect(japanese).toMatch(/Codex/);
    expect(scenes.reduce((sum, scene) => sum + scene.durationMs, 0)).toBeGreaterThanOrEqual(75_000);
    expect(scenes.reduce((sum, scene) => sum + scene.durationMs, 0)).toBeLessThanOrEqual(100_000);
    expect(new Set(scenes.map(({ id }) => id)).size).toBe(scenes.length);
    expect(scenes.every(({ caption, narration }) => caption.length > 0 && narration.length > 0)).toBe(true);
    expect(scenes.every(({ durationMs, narrationMaxMs, operationMs }) => narrationMaxMs + operationMs === durationMs)).toBe(true);
    expect(
      scenes.every(({ narration, narrationMaxMs }) => narration.trim().split(/\s+/).length * 400 <= narrationMaxMs),
    ).toBe(true);
    expect(outputContract).toEqual({
      voice: { language: "en", type: "synthetic", maxWordsPerMinute: 150 },
      captions: { language: "en", delivery: "burned-in" },
    });
  });
});
