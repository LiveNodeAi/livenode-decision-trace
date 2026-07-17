import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StorageAdapters } from "@/components/storage-adapters";

describe("StorageAdapters", () => {
  it("describes future Skill storage adapters without presenting fake actions", () => {
    render(<StorageAdapters />);

    expect(screen.getByRole("heading", { name: "将来の保存先アダプター" })).toBeInTheDocument();
    expect(screen.getByText("Obsidian")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("AI-Brain")).toBeInTheDocument();
    expect(screen.getByText(/Skill版で提供予定/)).toBeInTheDocument();
    expect(screen.getByText(/現在は.*直接保存.*未実装/)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
