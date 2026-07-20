import { describe, expect, it } from "vitest";

import { uiStrings } from "@/lib/ui-strings";

describe("UI strings", () => {
  it("keeps Japanese and English keys in parity", () => {
    expect(Object.keys(uiStrings.en).sort()).toEqual(Object.keys(uiStrings.ja).sort());
  });
});
