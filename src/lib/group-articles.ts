export interface ArticleData {
  id: string;
  title: string;
  category: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  issue: {
    id: string;
    issueNumber: string;
    publishDate: string;
    magazine: { id: string; name: string };
  };
}

export interface GroupedData {
  magazine: { id: string; name: string };
  issues: {
    issue: { id: string; issueNumber: string; publishDate: string };
    articles: ArticleData[];
  }[];
}

/**
 * Group articles by magazine and issue, sorting magazines alphabetically
 * and issues by publishDate descending within each magazine.
 */
export function groupArticles(articles: ArticleData[]): GroupedData[] {
  const magazineMap = new Map<string, GroupedData>();

  for (const article of articles) {
    const mag = article.issue.magazine;
    if (!magazineMap.has(mag.id)) {
      magazineMap.set(mag.id, { magazine: mag, issues: [] });
    }
    const group = magazineMap.get(mag.id)!;

    let issueGroup = group.issues.find(
      (ig) => ig.issue.id === article.issue.id
    );
    if (!issueGroup) {
      issueGroup = {
        issue: {
          id: article.issue.id,
          issueNumber: article.issue.issueNumber,
          publishDate: article.issue.publishDate,
        },
        articles: [],
      };
      group.issues.push(issueGroup);
    }
    issueGroup.articles.push(article);
  }

  // Sort issues by publishDate descending within each magazine
  for (const group of magazineMap.values()) {
    group.issues.sort(
      (a, b) =>
        new Date(b.issue.publishDate).getTime() -
        new Date(a.issue.publishDate).getTime()
    );
  }

  return Array.from(magazineMap.values()).sort((a, b) =>
    a.magazine.name.localeCompare(b.magazine.name)
  );
}
