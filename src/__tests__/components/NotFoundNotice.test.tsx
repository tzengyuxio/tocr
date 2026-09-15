import { render, screen } from "@testing-library/react";
import { NotFoundNotice } from "@/components/NotFoundNotice";

const entries = [
  { label: "卷頭語", href: "/", page: "001" },
  { label: "讀者信箱", page: "072" },
];

describe("NotFoundNotice", () => {
  it("turns each contents entry with a target into a link", () => {
    render(<NotFoundNotice title="找不到這個頁面" description="說明" entries={entries} />);

    const link = screen.getByRole("link", { name: /卷頭語/ });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveTextContent("001");
  });

  it("marks an entry with no page yet as 本期休刊 instead of linking it", () => {
    render(<NotFoundNotice title="找不到這個頁面" description="說明" entries={entries} />);

    expect(screen.queryByRole("link", { name: /讀者信箱/ })).not.toBeInTheDocument();
    expect(screen.getByText("本期休刊")).toBeInTheDocument();
    expect(screen.queryByText("072")).not.toBeInTheDocument();
  });

  it("always closes the contents with the page the reader actually hit", () => {
    render(<NotFoundNotice title="找不到這個頁面" description="說明" entries={entries} />);

    expect(screen.getByText("這一頁")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /這一頁/ })).not.toBeInTheDocument();
  });
});
