import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListPager } from "@/components/admin/ListPager";

function renderPager(page: number, totalPages: number) {
  const onPage = jest.fn();
  render(<ListPager page={page} totalPages={totalPages} onPage={onPage} />);
  return { onPage };
}

/** The page numbers on the buttons, in the order they are shown. */
function shownPages(): number[] {
  return screen
    .getAllByRole("button")
    .map((button) => Number(button.textContent))
    .filter((value) => Number.isInteger(value) && value > 0);
}

describe("ListPager", () => {
  it("says how long the run is, not just where you are", () => {
    renderPager(3, 32);

    expect(screen.getByText("第 3 / 32 頁")).toBeInTheDocument();
  });

  it("renders nothing when everything fits on one page", () => {
    const { container } = render(
      <ListPager page={1} totalPages={1} onPage={jest.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // The window keeps its width at both ends: clamping the first number without
  // pulling it back would show two buttons on the last page.
  it.each([
    [1, 32, [1, 2, 3, 4, 5]],
    [3, 32, [1, 2, 3, 4, 5]],
    [7, 32, [5, 6, 7, 8, 9]],
    [32, 32, [28, 29, 30, 31, 32]],
    [2, 3, [1, 2, 3]],
  ])("shows the pages around %i of %i", (page, totalPages, expected) => {
    renderPager(page, totalPages);

    expect(shownPages()).toEqual(expected);
  });

  it("moves to the page whose number was clicked", async () => {
    const { onPage } = renderPager(7, 32);

    await userEvent.click(screen.getByRole("button", { name: "9" }));

    expect(onPage).toHaveBeenCalledWith(9);
  });

  it("stops at both ends", () => {
    renderPager(1, 32);
    expect(screen.getByRole("button", { name: "上一頁" })).toBeDisabled();

    renderPager(32, 32);
    expect(screen.getAllByRole("button", { name: "下一頁" })[1]).toBeDisabled();
  });

  // 33 pages of games is why this exists; 3 pages is why it is conditional.
  it("offers the jump box only when the numbers cannot reach every page", () => {
    renderPager(1, 32);
    expect(screen.getByLabelText("跳至")).toBeInTheDocument();
  });

  it("leaves the jump box out of a short run", () => {
    renderPager(1, 5);
    expect(screen.queryByLabelText("跳至")).not.toBeInTheDocument();
  });
});
