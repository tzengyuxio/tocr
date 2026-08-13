import type { ArticleCategory } from "@/lib/article-categories";
export interface ArticleData {
  id: string;
  title: string;
  category: ArticleCategory | null;
  pageStart: number | null;
  pageEnd: number | null;
  issue: {
    id: string;
    issueNumber: string;
    publishDate: string;
    publishSort: string | Date;
    magazine: { id: string; name: string };
  };
}

export interface GroupedData {
  magazine: { id: string; name: string };
  issues: {
    issue: {
      id: string;
      issueNumber: string;
      publishDate: string;
      publishSort: string | Date;
    };
    articles: ArticleData[];
  }[];
}

/**
 * Group articles by magazine and issue, sorting magazines alphabetically
 * and issues by publication date descending within each magazine.
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
          publishSort: article.issue.publishSort,
        },
        articles: [],
      };
      group.issues.push(issueGroup);
    }
    issueGroup.articles.push(article);
  }

  // Sort on publishSort, not publishDate: the latter is EDTF, where "1994"
  // and "1994-22" cannot be compared as strings or parsed as dates.
  for (const group of magazineMap.values()) {
    group.issues.sort(
      (a, b) =>
        new Date(b.issue.publishSort).getTime() -
        new Date(a.issue.publishSort).getTime()
    );
  }

  return Array.from(magazineMap.values()).sort((a, b) =>
    a.magazine.name.localeCompare(b.magazine.name)
  );
}
