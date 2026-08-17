import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableArticleRow } from "@/components/article/EditableArticleRow";

const article = {
  id: "art-1",
  title: "功夫",
  subtitle: null,
  authors: ["王大明"],
  category: null,
  pageStart: 68,
  pageEnd: null,
  summary: "一篇攻略",
  articleGames: [{ game: { id: "g1", name: "功夫小子" } }],
  articleTags: [{ tag: { id: "t1", name: "攻略", type: "GENERAL" } }],
};

function renderRow(onSaveEdit = jest.fn().mockResolvedValue(undefined)) {
  render(
    <EditableArticleRow
      article={article}
      isEditing
      onStartEdit={jest.fn()}
      onSaveEdit={onSaveEdit}
      onCancelEdit={jest.fn()}
      onDelete={jest.fn()}
      onInsert={jest.fn()}
    />
  );
  return onSaveEdit;
}

describe("EditableArticleRow", () => {
  it("sends games and tags by name when saving", async () => {
    const user = userEvent.setup();
    const onSaveEdit = renderRow();

    await user.click(screen.getByRole("button", { name: /儲存/ }));

    expect(onSaveEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: "一篇攻略",
        games: ["功夫小子"],
        tags: [{ name: "攻略", type: "GENERAL" }],
      })
    );
  });

  it("keeps a typed comma in the games field", async () => {
    const user = userEvent.setup();
    renderRow();

    const games = screen.getByDisplayValue("功夫小子");
    await user.type(games, ", 功夫小子2");

    expect(games).toHaveValue("功夫小子, 功夫小子2");
  });

  it("carries an edited summary into the payload", async () => {
    const user = userEvent.setup();
    const onSaveEdit = renderRow();

    const summary = screen.getByLabelText("摘要");
    await user.clear(summary);
    await user.type(summary, "改過的摘要");
    await user.click(screen.getByRole("button", { name: /儲存/ }));

    expect(onSaveEdit).toHaveBeenCalledWith(
      expect.objectContaining({ summary: "改過的摘要" })
    );
  });
});
