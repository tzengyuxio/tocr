import { render, screen, within } from "@testing-library/react";
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

  describe("the enlarged view", () => {
    const openLightbox = async (user: ReturnType<typeof userEvent.setup>) => {
      render(<TocImageViewer images={["/a.jpg", "/b.jpg"]} />);
      await user.click(screen.getByRole("button", { name: "全螢幕檢視" }));
      return screen.getByRole("dialog");
    };

    it("pages with the arrows flanking the image", async () => {
      const user = userEvent.setup();
      const dialog = await openLightbox(user);

      // 兩側的大箭頭與底部膠囊各一組，所以名字相同的按鈕會有兩個。
      const [sideNext] = within(dialog).getAllByRole("button", {
        name: "下一頁",
      });
      await user.click(sideNext);

      expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
      // 切換不等於關閉：點圖片以外的地方會收掉 lightbox，箭頭不該跟著收。
      expect(dialog).toBeInTheDocument();
    });

    it("pages with the left and right keys", async () => {
      const user = userEvent.setup();
      const dialog = await openLightbox(user);

      await user.keyboard("{ArrowRight}");
      expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();

      await user.keyboard("{ArrowLeft}");
      expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();
    });

    it("stops at both ends", async () => {
      const user = userEvent.setup();
      const dialog = await openLightbox(user);

      await user.keyboard("{ArrowLeft}");
      expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();

      await user.keyboard("{ArrowRight}{ArrowRight}");
      expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();
    });
  });
});
