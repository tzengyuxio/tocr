import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import {
  EXTERNAL_SITE_LABELS,
  externalLinkEntryName,
  type ExternalSite,
} from "@/lib/external-site";

export interface PublicLink {
  id: string;
  site: ExternalSite;
  url: string;
  label: string | null;
}

/**
 * 站外資訊：全本掃描、上游條目、書目紀錄，一起列。
 *
 * 不分「延伸」與「出處」——實際上兩種都有，而站點幾乎就決定了它是哪一種；
 * 分成兩區只是逼編輯每次多做一次判斷。
 *
 * 一律 nofollow：這些是參考連結，不是本站的背書。
 */
export function ExternalLinkList({
  links,
  subject,
  className,
}: {
  links: PublicLink[];
  /**
   * 這一頁在講的東西叫什麼（遊戲名、刊名）。用來擋掉重複：上游條目與站上多半
   * 同名——2026-09-20 回填 cdosgame 的 1,192 條時，約 83% 的條目名與站上該款
   * 遊戲的名稱一字不差。那種情況下把它印出來，就是在標題「神奇王國」底下再寫
   * 一次「中文 DOS 遊戲資料庫 · 神奇王國」，讀者得到的資訊是零。
   *
   * 擋的是顯示不是資料：`label` 照存，因為它記的是「那邊叫什麼」，哪天上游改名
   * 或站上改名，兩者就不再相同，這一行自己會冒出來。
   *
   * **比對要一字不差，不要把括號正規化掉。**上游標題裡的括號是消歧義用的
   * （`德軍總部（Castle Wolfenstein）`、`異形（Alien Syndrome）`），那正是同名
   * 遊戲之間唯一的區別；剝掉括號再比，就會把最該顯示的那幾條當成重複擋下來。
   */
  subject?: string | null;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-1.5 text-xs text-muted-foreground">站外資訊</p>
      <ul className="space-y-1">
        {links.map((link) => {
          const entry = entryNameToShow(link, subject);
          return (
            <li key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="nofollow noopener"
                className="inline-flex items-baseline gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 self-center" />
                {/* 站名在前、條目名在後：先說去哪個站，再說看到什麼。條目名取不到
                    （中文 DOS 遊戲資料庫的網址是流水號）或與本頁同名時就只剩站名。 */}
                <span>{EXTERNAL_SITE_LABELS[link.site]}</span>
                {entry && <span className="text-muted-foreground">{entry}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 條目名與本頁講的是同一個名字時不印——見 `subject` 的說明。 */
function entryNameToShow(link: PublicLink, subject?: string | null): string | null {
  const entry = externalLinkEntryName(link);
  if (!entry) return null;
  return entry === subject?.trim() ? null : entry;
}
