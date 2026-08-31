import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { externalLinkLabel, type ExternalSite } from "@/lib/external-site";

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
  className,
}: {
  links: PublicLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-1.5 text-xs text-muted-foreground">站外資訊</p>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="nofollow noopener"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
              {externalLinkLabel(link)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
