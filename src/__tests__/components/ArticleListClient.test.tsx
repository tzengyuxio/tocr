import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArticleListClient } from "@/components/article/ArticleListClient";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

const articles = [
  {
    id: "art-1",
    title: "功夫",
    subtitle: null,
    authors: [],
    category: null,
    pageStart: 68,
    pageEnd: null,
    summary: null,
    articleGames: [],
    articleTags: [],
  },
];

function renderList(props: Partial<{ tocImages: string[]; tocReviewed: boolean }> = {}) {
  render(
    <ArticleListClient
      articles={articles}
      issueId="iss-1"
      magazineId="mag-1"
      tocImages={props.tocImages ?? []}
      tocReviewed={props.tocReviewed ?? false}
    />
  );
}

describe("ArticleListClient", () => {
  it("shows the scan beside the list when the issue has TOC images", () => {
    renderList({ tocImages: ["/toc.jpg"] });

    expect(screen.getByAltText("目錄頁 1")).toBeInTheDocument();
  });

  it("renders the list alone when there is no scan", () => {
    renderList();

    expect(screen.queryByAltText("目錄頁 1")).not.toBeInTheDocument();
  });

  it("offers to mark an unreviewed issue as reviewed", () => {
    renderList();

    expect(screen.getByText(/本期尚未複查/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "標記為已複查" })
    ).toBeInTheDocument();
  });

  it("says nothing once the issue has been reviewed", () => {
    renderList({ tocReviewed: true });

    expect(screen.queryByText(/本期尚未複查/)).not.toBeInTheDocument();
  });

  it("creates a blank article at the requested position", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "art-new" }),
    }) as unknown as typeof fetch;

    renderList({ tocReviewed: true });

    await user.click(screen.getByTitle("在此列上方新增文章"));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/articles",
      expect.objectContaining({ method: "POST" })
    );
  });
});
