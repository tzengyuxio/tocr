import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageJump } from "@/components/admin/PageJump";

function renderJump(page = 1, totalPages = 32) {
  const onJump = jest.fn();
  const view = render(
    <PageJump page={page} totalPages={totalPages} onJump={onJump} />
  );
  return { onJump, view, input: screen.getByLabelText("跳至") };
}

describe("PageJump", () => {
  // The box is the page indicator as well as the way to leave it, so what it
  // holds when nobody has touched it is where you are.
  it("shows the current page, and the length of the run beside it", () => {
    renderJump(7, 32);

    expect(screen.getByLabelText("跳至")).toHaveValue(7);
    expect(screen.getByText("/ 32 頁")).toBeInTheDocument();
  });

  it("jumps to the page that was typed", async () => {
    const { onJump, input } = renderJump();

    await userEvent.clear(input);
    await userEvent.type(input, "20{Enter}");

    expect(onJump).toHaveBeenCalledWith(20);
  });

  // Someone typing 999 wants the last page, not an error message.
  it("clamps a number past the end to the last page", async () => {
    const { onJump, input } = renderJump(1, 32);

    await userEvent.clear(input);
    await userEvent.type(input, "999{Enter}");

    expect(onJump).toHaveBeenCalledWith(32);
  });

  it("clamps zero and negatives to the first page", async () => {
    const { onJump, input } = renderJump(5);

    await userEvent.clear(input);
    await userEvent.type(input, "0{Enter}");

    expect(onJump).toHaveBeenCalledWith(1);
  });

  it("does nothing with an empty box", async () => {
    const { onJump, input } = renderJump(5);

    await userEvent.clear(input);
    await userEvent.type(input, "{Enter}");

    expect(onJump).not.toHaveBeenCalled();
  });

  // A number left in the box unsent reads as the page you are on, which is a
  // lie about where the list is.
  it("goes back to the current page when abandoned", async () => {
    const { input } = renderJump(5);

    await userEvent.clear(input);
    await userEvent.type(input, "12");
    await userEvent.tab();

    expect(input).toHaveValue(5);
  });

  // Numbers, 上一頁 and 下一頁 all move the list too, and the box is what says
  // where the list now is.
  it("follows a page change it did not cause", () => {
    const { view } = renderJump(3, 32);

    view.rerender(<PageJump page={4} totalPages={32} onJump={jest.fn()} />);

    expect(screen.getByLabelText("跳至")).toHaveValue(4);
  });
});
