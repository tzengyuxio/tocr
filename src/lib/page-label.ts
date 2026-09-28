/**
 * 一篇文章的頁碼標示：「p.6-8」，有頁碼分段時是「別冊 p.6-8」。
 *
 * 分段是 `Article.pageSection`（見 prisma/schema.prisma）：附冊有自己一套頁碼，
 * 不帶段名的「p.6」會讀成本刊第 6 頁。沒有頁碼但有分段時只寫段名，至少講得出
 * 它不在本刊裡。
 */
export function formatPages(article: {
  pageSection?: string | null;
  pageStart: number | null;
  pageEnd: number | null;
}): string | null {
  const range = article.pageStart
    ? article.pageEnd && article.pageEnd !== article.pageStart
      ? `p.${article.pageStart}-${article.pageEnd}`
      : `p.${article.pageStart}`
    : null;
  if (!article.pageSection) return range;
  return range ? `${article.pageSection} ${range}` : article.pageSection;
}
