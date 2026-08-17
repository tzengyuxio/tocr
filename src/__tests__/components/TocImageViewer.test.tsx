import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TocImageViewer } from "@/components/issue/TocImageViewer";

describe("TocImageViewer", () => {
  it("renders nothing without images", () => {
    const { container } = render(<TocImageViewer images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the first page and no pager for a single image", () => {
    render(<TocImageViewer images={["/a.jpg"]} />);

    expect(screen.getByAltText("目錄頁 1")).toHaveAttribute("src", "/a.jpg");
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });

  it("pages through multiple images", async () => {
    const user = userEvent.setup();
    render(<TocImageViewer images={["/a.jpg", "/b.jpg"]} />);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "下一頁" }));

    expect(screen.getByAltText("目錄頁 2")).toHaveAttribute("src", "/b.jpg");
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
});
