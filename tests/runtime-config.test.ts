import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("production model configuration", () => {
  it("defaults local and Worker environments to the Build Week GPT-5.6 model", () => {
    const wrangler = JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as {
      vars: { OPENAI_MODEL: string };
    };
    const envExample = readFileSync(".env.example", "utf8");

    expect(wrangler.vars.OPENAI_MODEL).toBe("gpt-5.6-luna");
    expect(envExample).toContain("OPENAI_MODEL=gpt-5.6-luna");
  });
});
