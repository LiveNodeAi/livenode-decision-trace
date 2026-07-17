import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StorageAdapters } from "@/components/storage-adapters";

describe("StorageAdapters", () => {
  it("distinguishes the working Web and local KX layers from future Skill adapters", () => {
    render(<StorageAdapters />);

    expect(screen.getByRole("heading", { name: "Decision TraceからKXへ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Web版.*取り込み層/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ローカルKX.*精錬層/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /配布Skill.*将来の提供層/ })).toBeInTheDocument();
    expect(screen.getByText(/Markdown ZIPだけが.*実際に動く保存操作/)).toBeInTheDocument();
    expect(screen.getByText(/AI-Brain.*既に実運用/)).toBeInTheDocument();
    expect(screen.getByText(/Web版から.*直接接続しません/)).toBeInTheDocument();
    expect(screen.getByText(/Obsidian・Notion.*認証と権限/)).toBeInTheDocument();
    expect(screen.getByText(/保存アダプターは未実装/)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
