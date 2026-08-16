import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OcrResultEditor } from "@/components/ocr/OcrResultEditor";
import type { OcrResult } from "@/services/ai/ocr.interface";

const result: OcrResult = {
  articles: [
    {
      title: "功夫",
      pageStart: 68,
      confidence: 1,
      authors: ["王大明"],
      suggestedGames: ["功夫小子"],
      suggestedTags: [{ name: "攻略", type: "GENERAL" }],
    },
  ],
} as OcrResult;

function renderEditor() {
  return render(
    <OcrResultEditor
      result={result}
      tocImages={[]}
      onSave={jest.fn()}
      onCancel={jest.fn()}
    />
  );
}

/**
 * The comma is the separator, so a field that re-derives its text from the
 * parsed list erases the comma in the same render it was typed in -- which
 * leaves no way to add a second entry.
 */
describe("OcrResultEditor comma-separated fields", () => {
  it("keeps a typed comma in the games field", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByText("功夫"));
    const games = screen.getByDisplayValue("功夫小子");
    await user.type(games, ", 功夫小子2");

    expect(games).toHaveValue("功夫小子, 功夫小子2");
  });

  it("keeps a typed comma in the tags field", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByText("功夫"));
    const tags = screen.getByDisplayValue("攻略");
    await user.type(tags, ", 秘技");

    expect(tags).toHaveValue("攻略, 秘技");
  });

  it("keeps a typed comma in the authors field", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByText("功夫"));
    const authors = screen.getByDisplayValue("王大明");
    await user.type(authors, ", 李小華");

    expect(authors).toHaveValue("王大明, 李小華");
  });
});
