import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IssueForm } from "@/components/magazine/IssueForm";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

const BASE = {
  id: "iss-1",
  magazineId: "mag-1",
  issueNumber: "第 34 期",
  publishDate: "1992-01",
  tocImages: [],
  altNumbers: [],
};

function renderForm(tocReviewed: boolean) {
  return render(
    <IssueForm
      magazineId="mag-1"
      magazineName="軟體世界雜誌"
      initialData={{ ...BASE, tocReviewed }}
      mode="edit"
    />
  );
}

function lastBody() {
  const fetchMock = global.fetch as jest.Mock;
  const [, init] = fetchMock.mock.calls.at(-1)!;
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: "iss-1" }),
  }) as unknown as typeof fetch;
});

describe("IssueForm review flag", () => {
  it("leaves the flag out when nobody touched the checkbox", async () => {
    const user = userEvent.setup();
    renderForm(false);

    await user.click(screen.getByRole("button", { name: /儲存/ }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(lastBody()).not.toHaveProperty("tocReviewed");
  });

  it("sends the flag when the editor ticks it", async () => {
    const user = userEvent.setup();
    renderForm(false);

    await user.click(screen.getByRole("checkbox", { name: /目錄已人工複查/ }));
    await user.click(screen.getByRole("button", { name: /儲存/ }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(lastBody().tocReviewed).toBe(true);
  });

  // The banner in the article list marks the review while this form is on
  // screen, and the refresh that follows only updates the props. A save that
  // came after used to send tocReviewed: false and undo the review -- it
  // happened to 15 issues on production before anyone noticed.
  it("does not undo a review that landed while the form was open", async () => {
    const user = userEvent.setup();
    const { rerender } = renderForm(false);

    rerender(
      <IssueForm
        magazineId="mag-1"
        magazineName="軟體世界雜誌"
        initialData={{ ...BASE, tocReviewed: true }}
        mode="edit"
      />
    );

    await user.click(screen.getByRole("button", { name: /儲存/ }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(lastBody()).not.toHaveProperty("tocReviewed");
  });
});
