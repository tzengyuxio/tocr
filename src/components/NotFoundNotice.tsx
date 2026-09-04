import Link from "next/link";

/** 讀者實際踩到的那一頁，永遠是目錄的最後一條。 */
const PAGE_MISSING = "404";

export type NotFoundEntry = {
  /** 專欄名。是出口的標籤，也是這一頁的梗。 */
  label: string;
  /** 缺席代表這個專欄還沒有對應的頁面，渲染成「本期休刊」。 */
  href?: string;
  /** 假頁碼。純裝飾，遞增就好。 */
  page: string;
};

/**
 * 「找不到」的共用版面，做成一頁雜誌目錄。
 *
 * 出口不另外排按鈕，而是就用目錄條目本身——走到 404 的人要的是別條路，目錄正好
 * 是一整排別條路。最後那條「這一頁 …… 404」由這裡固定補上，三份呼叫端都一樣。
 *
 * 三個 `not-found.tsx` 共用這一份：站台根目錄（網址完全對不上時）、公開頁與後台各
 * 一份（`notFound()` 從那一層丟出來時，才會連著各自的外框一起渲染）。
 *
 * 文字要留在呼叫端：後台編輯知道自己在後台，前台讀者不必知道有後台這回事。
 */
export function NotFoundNotice({
  title,
  description,
  entries,
}: {
  title: string;
  description: string;
  entries: NotFoundEntry[];
}) {
  return (
    <div className="flex flex-col items-center px-4 py-20">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        {description}
      </p>

      <div className="mt-10 w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground">
          目錄
          <span className="ml-2 tracking-normal">CONTENTS</span>
        </p>
        <ul className="mt-4 space-y-1">
          {entries.map((entry) => (
            <li key={entry.label}>
              <ContentsRow entry={entry} />
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t pt-3">
          <ContentsRow entry={{ label: "這一頁", page: PAGE_MISSING }} />
        </div>
      </div>
    </div>
  );
}

/**
 * 一條目錄項：專欄名、點線、頁碼。
 *
 * 點線是中間那條 `flex-1` 的虛線底邊，不是填出來的點字元——寬度自己伸縮，換行、
 * 縮放、不同字級都不會對不齊。
 */
function ContentsRow({ entry }: { entry: NotFoundEntry }) {
  const rowClass = "flex items-baseline gap-2 py-1 text-sm";
  const leaderClass = "mb-1 min-w-4 flex-1 border-b border-dotted";

  if (!entry.href) {
    return (
      <div className={`${rowClass} text-muted-foreground/60`}>
        <span className="shrink-0">{entry.label}</span>
        <span aria-hidden className={`${leaderClass} border-muted-foreground/30`} />
        <span className="shrink-0 tabular-nums">
          {entry.page === PAGE_MISSING ? entry.page : "本期休刊"}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={entry.href}
      className={`${rowClass} transition-colors hover:text-primary`}
    >
      <span className="shrink-0">{entry.label}</span>
      <span aria-hidden className={`${leaderClass} border-muted-foreground/50`} />
      <span className="shrink-0 tabular-nums">{entry.page}</span>
    </Link>
  );
}
