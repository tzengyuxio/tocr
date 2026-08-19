import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageJump } from "@/components/admin/PageJump";

function renderJump(totalPages = 32) {
  const onJump = jest.fn();
  render(<PageJump totalPages={totalPages} onJump={onJump} />);
  return { onJump, input: screen.getByLabelText("跳至") };
}

describe("PageJump", () => {
  it("jumps to the page that was typed", async () => {
    const { onJump, input } = renderJump();

    await userEvent.type(input, "20");
    await userEvent.click(screen.getByRole("button", { name: "前往" }));

    expect(onJump).toHaveBeenCalledWith(20);
  });

  it("takes Enter as well as the button", async () => {
    const { onJump, input } = renderJump();

    await userEvent.type(input, "7{Enter}");

    expect(onJump).toHaveBeenCalledWith(7);
  });

  // Someone typing 999 wants the last page, not an error message.
  it("clamps a number past the end to the last page", async () => {
    const { onJump, input } = renderJump(32);

    await userEvent.type(input, "999{Enter}");

    expect(onJump).toHaveBeenCalledWith(32);
  });

  it("clamps zero and negatives to the first page", async () => {
    const { onJump, input } = renderJump();

    await userEvent.type(input, "0{Enter}");

    expect(onJump).toHaveBeenCalledWith(1);
  });

  it("stays put when nothing was typed", async () => {
    const { onJump } = renderJump();

    expect(screen.getByRole("button", { name: "前往" })).toBeDisabled();
    expect(onJump).not.toHaveBeenCalled();
  });

  // The box empties after a jump: the number left behind is where you were,
  // not where you are going next.
  it("clears the box after jumping", async () => {
    const { input } = renderJump();

    await userEvent.type(input, "12{Enter}");

    expect(input).toHaveValue(null);
  });
});
