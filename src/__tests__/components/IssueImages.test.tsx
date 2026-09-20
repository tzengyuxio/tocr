import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IssueImages } from "@/components/issue/IssueImages";

const props = {
  coverImage: "/cover.jpg",
  tocImages: [],
  photos: [],
  magazineName: "軟體世界",
  issueNumber: "164",
  tocList: null,
};

describe("IssueImages", () => {
  it("opens the cover, and starts fitted to the window", async () => {
    const user = userEvent.setup();
    render(<IssueImages {...props} />);

    await user.click(screen.getByTitle("放大封面"));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByAltText("封面")).toHaveAttribute("src", "/cover.jpg");
    // 一開始是貼齊視窗，所以按鈕問的是「要不要原尺寸」。
    expect(within(dialog).getByRole("button", { name: "原尺寸" })).toBeInTheDocument();
  });

  it("switches to actual size, by the button or by clicking the image", async () => {
    const user = userEvent.setup();
    render(<IssueImages {...props} />);

    await user.click(screen.getByTitle("放大封面"));
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("button", { name: "原尺寸" }));
    expect(within(dialog).getByRole("button", { name: "貼齊視窗" })).toBeInTheDocument();

    await user.click(within(dialog).getByAltText("封面"));
    expect(within(dialog).getByRole("button", { name: "原尺寸" })).toBeInTheDocument();
  });

  it("goes back to fitted when paging to another image", async () => {
    const user = userEvent.setup();
    render(
      <IssueImages
        {...props}
        photos={[
          { url: "/p.jpg", caption: "書條", sourceName: null, sourceUrl: null },
        ]}
      />
    );

    await user.click(screen.getByTitle("放大封面"));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "原尺寸" }));

    // 上一張捲到哪裡，跟下一張沒有關係。
    await user.click(within(dialog).getAllByRole("button", { name: "下一張" })[0]);

    expect(within(dialog).getByAltText("書條")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "原尺寸" })).toBeInTheDocument();
  });
});
