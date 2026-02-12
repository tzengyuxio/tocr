import { groupArticles, type ArticleData } from "@/lib/group-articles";

function makeArticle(overrides: Partial<ArticleData> & { issue: ArticleData["issue"] }): ArticleData {
  return {
    id: "art-1",
    title: "Test Article",
    category: null,
    pageStart: null,
    pageEnd: null,
    ...overrides,
  };
}

describe("groupArticles", () => {
  it("should return empty array for empty input", () => {
    expect(groupArticles([])).toEqual([]);
  });

  it("should group a single article into 1 magazine with 1 issue", () => {
    const articles: ArticleData[] = [
      makeArticle({
        id: "art-1",
        title: "Article 1",
        issue: {
          id: "iss-1",
          issueNumber: "第1期",
          publishDate: "2023-01-15",
          magazine: { id: "mag-1", name: "Magazine A" },
        },
      }),
    ];

    const result = groupArticles(articles);
    expect(result).toHaveLength(1);
    expect(result[0].magazine.name).toBe("Magazine A");
    expect(result[0].issues).toHaveLength(1);
    expect(result[0].issues[0].articles).toHaveLength(1);
    expect(result[0].issues[0].articles[0].title).toBe("Article 1");
  });

  it("should group multiple articles in the same issue together", () => {
    const issue = {
      id: "iss-1",
      issueNumber: "第1期",
      publishDate: "2023-01-15",
      magazine: { id: "mag-1", name: "Magazine A" },
    };
    const articles: ArticleData[] = [
      makeArticle({ id: "art-1", title: "Article 1", issue }),
      makeArticle({ id: "art-2", title: "Article 2", issue }),
      makeArticle({ id: "art-3", title: "Article 3", issue }),
    ];

    const result = groupArticles(articles);
    expect(result).toHaveLength(1);
    expect(result[0].issues).toHaveLength(1);
    expect(result[0].issues[0].articles).toHaveLength(3);
  });

  it("should sort issues by publishDate descending within the same magazine", () => {
    const mag = { id: "mag-1", name: "Magazine A" };
    const articles: ArticleData[] = [
      makeArticle({
        id: "art-1",
        title: "Old",
        issue: { id: "iss-1", issueNumber: "第1期", publishDate: "2023-01-01", magazine: mag },
      }),
      makeArticle({
        id: "art-2",
        title: "New",
        issue: { id: "iss-2", issueNumber: "第2期", publishDate: "2023-06-01", magazine: mag },
      }),
    ];

    const result = groupArticles(articles);
    expect(result).toHaveLength(1);
    expect(result[0].issues).toHaveLength(2);
    // Newer issue first
    expect(result[0].issues[0].issue.issueNumber).toBe("第2期");
    expect(result[0].issues[1].issue.issueNumber).toBe("第1期");
  });

  it("should sort magazines alphabetically by name", () => {
    const articles: ArticleData[] = [
      makeArticle({
        id: "art-1",
        title: "Article B",
        issue: {
          id: "iss-1",
          issueNumber: "第1期",
          publishDate: "2023-01-01",
          magazine: { id: "mag-b", name: "Zebra Magazine" },
        },
      }),
      makeArticle({
        id: "art-2",
        title: "Article A",
        issue: {
          id: "iss-2",
          issueNumber: "第1期",
          publishDate: "2023-01-01",
          magazine: { id: "mag-a", name: "Alpha Magazine" },
        },
      }),
    ];

    const result = groupArticles(articles);
    expect(result).toHaveLength(2);
    expect(result[0].magazine.name).toBe("Alpha Magazine");
    expect(result[1].magazine.name).toBe("Zebra Magazine");
  });

  it("should handle mixed scenario with multiple magazines, issues, and articles", () => {
    const magA = { id: "mag-a", name: "Alpha" };
    const magB = { id: "mag-b", name: "Beta" };
    const articles: ArticleData[] = [
      makeArticle({
        id: "art-1",
        title: "A1",
        issue: { id: "iss-a1", issueNumber: "第1期", publishDate: "2023-01-01", magazine: magA },
      }),
      makeArticle({
        id: "art-2",
        title: "A2",
        issue: { id: "iss-a1", issueNumber: "第1期", publishDate: "2023-01-01", magazine: magA },
      }),
      makeArticle({
        id: "art-3",
        title: "A3",
        issue: { id: "iss-a2", issueNumber: "第2期", publishDate: "2023-06-01", magazine: magA },
      }),
      makeArticle({
        id: "art-4",
        title: "B1",
        issue: { id: "iss-b1", issueNumber: "第10期", publishDate: "2023-03-01", magazine: magB },
      }),
    ];

    const result = groupArticles(articles);

    // 2 magazines, sorted alphabetically
    expect(result).toHaveLength(2);
    expect(result[0].magazine.name).toBe("Alpha");
    expect(result[1].magazine.name).toBe("Beta");

    // Alpha: 2 issues, newer first
    expect(result[0].issues).toHaveLength(2);
    expect(result[0].issues[0].issue.issueNumber).toBe("第2期");
    expect(result[0].issues[0].articles).toHaveLength(1);
    expect(result[0].issues[1].issue.issueNumber).toBe("第1期");
    expect(result[0].issues[1].articles).toHaveLength(2);

    // Beta: 1 issue, 1 article
    expect(result[1].issues).toHaveLength(1);
    expect(result[1].issues[0].articles).toHaveLength(1);
  });
});
