import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TocCompare } from "@/components/issue/TocCompare";

const list = <ul><li>p.12 電玩快打</li></ul>;

describe("TocCompare", () => {
  it("renders nothing without scans", () => {
    const { container } = render(
      <TocCompare images={[]} magazineName="軟體世界" issueNumber="12">
        {list}
      </TocCompare>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens the scan beside the index it describes", async () => {
    const user = userEvent.setup();
    render(
      <TocCompare images={["/a.jpg", "/b.jpg"]} magazineName="軟體世界" issueNumber="12">
        {list}
      </TocCompare>
    );

    await user.click(screen.getByRole("button", { name: "對照目錄頁 1" }));

    const dialog = screen.getByRole("dialog");
    // 目錄跟圖在同一個畫面上，這就是這個視窗存在的理由。
    expect(within(dialog).getByText("p.12 電玩快打")).toBeInTheDocument();
    expect(within(dialog).getByAltText("目錄頁 1")).toHaveAttribute("src", "/a.jpg");
  });

  it("pages through the scans without closing", async () => {
    const user = userEvent.setup();
    render(
      <TocCompare images={["/a.jpg", "/b.jpg"]} magazineName="軟體世界" issueNumber="12">
        {list}
      </TocCompare>
    );

    await user.click(screen.getByRole("button", { name: "對照目錄頁 2" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("2 / 2")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "上一頁" }));

    expect(within(dialog).getByAltText("目錄頁 1")).toHaveAttribute("src", "/a.jpg");
    expect(within(dialog).getByText("1 / 2")).toBeInTheDocument();
  });

  it("names a lone scan without a page number", () => {
    render(
      <TocCompare images={["/a.jpg"]} magazineName="軟體世界" issueNumber="12">
        {list}
      </TocCompare>
    );

    expect(screen.getByRole("button", { name: "對照目錄頁" })).toBeInTheDocument();
  });

  it("lays two scans side by side, and pages by two", async () => {
    const user = userEvent.setup();
    render(
      <TocCompare images={["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"]} magazineName="軟體世界" issueNumber="12">
        {list}
      </TocCompare>
    );

    await user.click(screen.getByRole("button", { name: "對照目錄頁 1" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "改為雙頁並列" }));

    expect(within(dialog).getByText("1–2 / 4")).toBeInTheDocument();
    expect(within(dialog).getByAltText("目錄頁 2")).toHaveAttribute("src", "/b.jpg");

    await user.click(within(dialog).getByRole("button", { name: "下一頁" }));
    expect(within(dialog).getByText("3–4 / 4")).toBeInTheDocument();
  });

  it("backs up a page rather than opening a spread with nothing on the right", async () => {
    const user = userEvent.setup();
    render(
      <TocCompare images={["/a.jpg", "/b.jpg"]} magazineName="軟體世界" issueNumber="12">
        {list}
      </TocCompare>
    );

    await user.click(screen.getByRole("button", { name: "對照目錄頁 2" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "改為雙頁並列" }));

    expect(within(dialog).getByText("1–2 / 2")).toBeInTheDocument();
  });

});
