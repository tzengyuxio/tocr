import Link from "next/link";
import { SquarePen } from "lucide-react";
import { CategoryChip, GameChip, TagChip } from "@/components/chips";
import type { ArticleCategory } from "@/lib/article-categories";

/** 一期目錄裡的一列。只收畫得出來的欄位，不吃整個 Prisma 型別。 */
export interface TocListArticle {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  category: ArticleCategory | null;
  pageStart: number | null;
  pageEnd: number | null;
  articleGames: { game: { id: string; name: string; slug: string } }[];
  articleTags: { tag: { id: string; name: string; type: string; slug: string } }[];
}

/**
 * 這一期的目錄。單期頁與掃描對照視窗共用同一份——兩邊看到的條目必須是同一批，
 * 不然對照到一半會開始懷疑是自己看錯。
 *
 * One responsive list rather than a table and a card list. Every column but the
 * page number and the title was empty on most rows -- some issues have no
 * author at all on any of their articles -- and the empty cells were what made
 * the list so tall. Chips drop to a second line only when there are any.
 */
export function IssueTocList({
  articles,
  canEdit,
}: {
  articles: TocListArticle[];
  canEdit: boolean;
}) {
  if (articles.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">尚無文章資料</div>
    );
  }

  return (
    <ul className="divide-y">
      {articles.map((article) => {
        const chips = [
          ...article.articleGames.map((ag) => ({
            key: `g-${ag.game.id}`,
            href: `/games/${ag.game.slug}`,
            chip: <GameChip name={ag.game.name} />,
          })),
          ...article.articleTags.map((at) => ({
            key: `t-${at.tag.id}`,
            href: `/tags/${at.tag.slug}`,
            chip: <TagChip tag={at.tag} />,
          })),
        ];
        const page = article.pageStart
          ? article.pageEnd && article.pageEnd !== article.pageStart
            ? `${article.pageStart}-${article.pageEnd}`
            : `${article.pageStart}`
          : null;

        return (
          <li key={article.id} className="py-2">
            <div className="flex items-baseline gap-3">
              <span className="w-14 shrink-0 text-right font-mono text-sm text-muted-foreground">
                {page ? `p.${page}` : ""}
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-medium">{article.title}</span>
                {article.subtitle && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {article.subtitle}
                  </span>
                )}
                {article.authors.length > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ／{article.authors.join("、")}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {article.category && (
                  <CategoryChip category={article.category} className="text-xs" />
                )}
                {canEdit && (
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="編輯文章"
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
            {chips.length > 0 && (
              <div className="ml-[4.25rem] mt-1 flex flex-wrap gap-1">
                {chips.map(({ key, href, chip }) => (
                  <Link
                    key={key}
                    href={href}
                    className="transition-opacity hover:opacity-80"
                  >
                    {chip}
                  </Link>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
