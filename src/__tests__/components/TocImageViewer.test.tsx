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

    expect(screen.getByAltText("目錄頁")).toHaveAttribute("src", "/a.jpg");
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

  it("lays two scans side by side", async () => {
    const user = userEvent.setup();
    render(<TocImageViewer images={["/a.jpg", "/b.jpg"]} />);

    await user.click(screen.getByRole("button", { name: "改為雙頁並列" }));

    expect(screen.getByText("1–2 / 2")).toBeInTheDocument();
    expect(screen.getByAltText("目錄頁 2")).toBeInTheDocument();
  });

  describe("全螢幕對照", () => {
    it("is offered only when the caller can lay out the whole screen", () => {
      render(<TocImageViewer images={["/a.jpg"]} />);

      expect(
        screen.queryByRole("button", { name: "全螢幕對照" })
      ).not.toBeInTheDocument();
    });

    it("asks its caller to switch, and says how to get back", async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();
      const { rerender } = render(
        <TocImageViewer images={["/a.jpg"]} onToggleFullscreen={onToggle} />
      );

      await user.click(screen.getByRole("button", { name: "全螢幕對照" }));
      expect(onToggle).toHaveBeenCalledTimes(1);

      rerender(
        <TocImageViewer images={["/a.jpg"]} fullscreen onToggleFullscreen={onToggle} />
      );
      expect(
        screen.getByRole("button", { name: "離開全螢幕對照" })
      ).toBeInTheDocument();
    });
  });
});
