import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

it("renders the product name", () => {
  render(<Page />);
  expect(screen.getByRole("heading", { name: /LiveNode Decision Trace/i })).toBeInTheDocument();
});
