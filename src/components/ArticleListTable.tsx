import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryChip } from "@/components/chips";
import { IssueCoverHover } from "@/components/IssueCoverHover";
import { formatEdtf } from "@/lib/edtf";
import { formatIssueNumber } from "@/lib/issue-number";
import type { ArticleCategory } from "@/lib/article-categories";
import {
  ARTICLE_SORTS,
  nextDirection,
  type ArticleDirection,
  type ArticleSort,
} from "@/lib/article-listing";

export interface ArticleListRow {
  id: string;
  article: {
    title: string;
    subtitle: string | null;
    category: ArticleCategory | null;
    pageStart: number | null;
    issue: {
      slug: string;
      issueNumber: string;
      publishDate: string | null;
      coverImage: string | null;
      magazine: { slug: string; name: string };
    };
  };
}

/**
 * 「這個遊戲／標籤出現在哪些文章」的表格，`/games/<game>` 與 `/tags/<tag>` 共用。
 *
 * 兩頁本來各寫各的，於是一邊把刊期併成一欄、一邊拆成「雜誌」「單期」兩欄，頁碼
 * 也只有 games 那邊有。同一種東西該長同一個樣子，所以整個表格搬到這裡——不是把
 * 兩份程式碼各修一次，那只會再漂開一次。
 *
 * 刊期併成一欄沿用 games 原本的理由：這一欄要回答的是「哪一本的哪一期」，本來
 * 就是一件事；拆開時左邊那個連到期刊首頁的連結，對正在找某一期的人幫不上忙。
 */
export function ArticleListTable({
  rows,
  sort,
  direction,
  basePath,
}: {
  rows: ArticleListRow[];
  sort: ArticleSort;
  direction: ArticleDirection;
  /** 排序連結指回來的路徑，例如 `/games/三國志2`。 */
  basePath: string;
}) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead column={columnFor("issue")} sort={sort} direction={direction} basePath={basePath} />
              <SortHead column={columnFor("date")} sort={sort} direction={direction} basePath={basePath} />
              <TableHead>文章標題</TableHead>
              <TableHead>分類</TableHead>
              {/* 頁碼留在最後：資訊量最小的欄位不該卡在兩個長欄位中間。 */}
              <TableHead>頁碼</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <IssueLink issue={row.article.issue} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatEdtf(row.article.issue.publishDate)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{row.article.title}</div>
                  {row.article.subtitle && (
                    <div className="text-sm text-muted-foreground">
                      {row.article.subtitle}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {row.article.category ? (
                    <CategoryChip category={row.article.category} />
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {row.article.pageStart || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="py-3">
            <div className="font-medium">{row.article.title}</div>
            {row.article.subtitle && (
              <div className="text-sm text-muted-foreground">
                {row.article.subtitle}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <Link
                href={issueHref(row.article.issue)}
                className="hover:underline"
              >
                {row.article.issue.magazine.name}{" "}
                {formatIssueNumber(row.article.issue.issueNumber)}
              </Link>
              <span>·</span>
              <span>{formatEdtf(row.article.issue.publishDate)}</span>
              {row.article.pageStart && <span>· p.{row.article.pageStart}</span>}
            </div>
            {row.article.category && (
              <CategoryChip category={row.article.category} className="mt-1 text-xs" />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function columnFor(value: string): ArticleSort {
  return ARTICLE_SORTS.find((s) => s.value === value)!;
}

/** 可點的欄位標題。點目前這一欄換方向，點另一欄換排序。 */
function SortHead({
  column,
  sort,
  direction,
  basePath,
}: {
  column: ArticleSort;
  sort: ArticleSort;
  direction: ArticleDirection;
  basePath: string;
}) {
  const active = column.value === sort.value;
  const Arrow = direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={`${basePath}?sort=${column.value}&dir=${nextDirection(column, sort, direction)}`}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {column.label}
        {/* 只有作用中的欄位畫箭頭。每一欄都掛一個灰箭頭當提示，等於在每個標題
            旁邊加一個永遠不變的圖示，反而看不出現在是照哪一欄排的。 */}
        {active && <Arrow className="h-3.5 w-3.5" />}
      </Link>
    </TableHead>
  );
}

function issueHref(issue: ArticleListRow["article"]["issue"]) {
  return `/magazines/${issue.magazine.slug}/issues/${encodeURIComponent(issue.slug)}`;
}

/** 刊期一欄：哪一本的哪一期，滑過去看得到封面。 */
function IssueLink({ issue }: { issue: ArticleListRow["article"]["issue"] }) {
  const label = `${issue.magazine.name} ${formatIssueNumber(issue.issueNumber)}`;
  return (
    <IssueCoverHover href={issueHref(issue)} coverImage={issue.coverImage} alt={label}>
      {issue.magazine.name}{" "}
      <span className="font-semibold">{formatIssueNumber(issue.issueNumber)}</span>
    </IssueCoverHover>
  );
}
