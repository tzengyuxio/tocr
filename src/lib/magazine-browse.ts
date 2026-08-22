import type { Prisma } from "@prisma/client";
import { formatEdtf } from "./edtf";
import {
  sortTitlePeriods,
  splitIssuesByPeriod,
  type TitlePeriod,
} from "./magazine-title";

/**
 * 期刊列表的分類篩選。
 *
 * 與 issue-browse.ts、game-browse.ts 同一個形狀：表放這裡，按鈕與查詢讀同一份，
 * 所以兩者不會對「TV Game 是什麼」有不同意見。
 *
 * 類別本身來自 nostalibrary 的分節，見 prisma/schema.prisma 的 MagazineCategory。
 */

/** enum 的值，給 validator 與後台表單用；順序即畫面上的順序。 */
export const MAGAZINE_CATEGORY_VALUES = ["PC_GAME", "TV_GAME", "ONLINE_GAME"] as const;

export type MagazineCategory = (typeof MAGAZINE_CATEGORY_VALUES)[number];

/**
 * 標籤沿用上游的英文分節名而不譯成中文：這幾個詞是這批雜誌既有的分類名稱，
 * 讀者在 nostalibrary 上看到的也是它們，兩站用同一組字比較好對照。
 */
export const MAGAZINE_CATEGORY_LABELS: Record<MagazineCategory, string> = {
  PC_GAME: "PC Game",
  TV_GAME: "TV Game",
  ONLINE_GAME: "Online Game",
};

/**
 * list 檢視的窄欄版分類 chip：全名太寬，縮寫加色相讓一整欄掃得出類別。
 * OLG 是台灣圈內的慣用縮寫（巴哈姆特 OLG 板），不是自創的。
 * 色相沿用 tag-colors.ts 的 -100/-800 tint 慣例。
 * 未來若加 MOBILE_GAME（目前 enum 還沒有），在這裡補一行即可——手遊沒有
 * 通行的英文縮寫，label 建議用全字 "Mobile"（或中文「手遊」），色相建議 rose。
 */
export const MAGAZINE_CATEGORY_CHIPS: Record<
  MagazineCategory,
  { label: string; className: string }
> = {
  PC_GAME: { label: "PC", className: "bg-blue-100 text-blue-800" },
  TV_GAME: { label: "TV", className: "bg-green-100 text-green-800" },
  ONLINE_GAME: { label: "OLG", className: "bg-violet-100 text-violet-800" },
};

export const MAGAZINE_FILTERS = [
  // category 給展開成時期卡之後的 JS 端篩選與計數用（chips 的數字要跟頁首
  // 「共 N 本」數同一種東西，也就是顯示單位，不能一邊數 Magazine 一邊數卡）。
  { value: "all", label: "全部", category: null, where: {} },
  ...MAGAZINE_CATEGORY_VALUES.map((category) => ({
    value: category.toLowerCase().replace("_game", ""),
    label: MAGAZINE_CATEGORY_LABELS[category],
    category,
    where: { categories: { has: category } },
  })),
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  category: MagazineCategory | null;
  where: Prisma.MagazineWhereInput;
}>;

/** 列表是索引，開在全部；分類是收窄用的，不是預設視角。 */
export const DEFAULT_MAGAZINE_FILTER = "all";

export type MagazineFilter = (typeof MAGAZINE_FILTERS)[number];

/** 手改網址帶進未知值時讀成預設，不是 404。 */
export function parseMagazineFilter(value: string | undefined): MagazineFilter {
  return (
    MAGAZINE_FILTERS.find((f) => f.value === value) ??
    MAGAZINE_FILTERS.find((f) => f.value === DEFAULT_MAGAZINE_FILTER)!
  );
}

/**
 * 兩種呈現方式。卡片是預設：這一頁是「有哪些雜誌」的索引，讀者多半在認標準字，
 * 而標準字要夠大才認得出來。
 *
 * 列表是給另一種讀法用的——把出版社、期數、發行期間排成欄，一眼掃得完 34 本，
 * 也比得出誰辦得久。後台的雜誌管理一直是這個形狀，前台只是把同一種讀法給讀者。
 *
 * 狀態放網址而不是 localStorage，與篩選、排序同一套：切換後的畫面分享得出去，
 * 而且整條列不需要 hydrate。
 */
export const MAGAZINE_VIEWS = ["grid", "list"] as const;

export type MagazineView = (typeof MAGAZINE_VIEWS)[number];

export const DEFAULT_MAGAZINE_VIEW: MagazineView = "grid";

/** 手改網址帶進未知值時讀成預設，與 parseMagazineFilter 同一個態度。 */
export function parseMagazineView(value: string | undefined): MagazineView {
  return MAGAZINE_VIEWS.find((v) => v === value) ?? DEFAULT_MAGAZINE_VIEW;
}

export const MAGAZINE_SORTS = [
  // 各自帶著自己讀起來順的方向：刊名清單從 A 讀到 Z，而一整排刊物是從最早的
  // 那本讀起——與 ISSUE_SORTS 的出版日期同一個道理。
  { value: "name", label: "名稱", defaultDirection: "asc" },
  { value: "founded", label: "創刊日", defaultDirection: "asc" },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  defaultDirection: "asc" | "desc";
}>;

/**
 * 後台多一種「建立日期」。它是這頁原本的預設順序，用途是「剛才建的那本在哪」
 * ——那是編輯才有的問題，讀者不關心一筆資料是什麼時候被輸入的，所以不放進
 * 前台那組。
 */
export const ADMIN_MAGAZINE_SORTS = [
  ...MAGAZINE_SORTS,
  { value: "created", label: "建立日期", defaultDirection: "desc" },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  defaultDirection: "asc" | "desc";
}>;

export const DEFAULT_MAGAZINE_SORT = "name";

export const MAGAZINE_DIRECTIONS = ["asc", "desc"] as const;

export type MagazineSort = (typeof ADMIN_MAGAZINE_SORTS)[number];
export type MagazineDirection = (typeof MAGAZINE_DIRECTIONS)[number];

/**
 * `sorts` 決定哪些值算數：前台傳預設那組，所以 `?sort=created` 在前台會退回
 * 名稱，而不是露出一個那頁沒有的按鈕。
 */
export function parseMagazineSort(
  value: string | undefined,
  sorts: ReadonlyArray<MagazineSort> = MAGAZINE_SORTS
): MagazineSort {
  return (
    sorts.find((s) => s.value === value) ??
    sorts.find((s) => s.value === DEFAULT_MAGAZINE_SORT)!
  );
}

/** 沒指定時用該排序自己讀起來順的方向，不是固定一個。 */
export function parseMagazineDirection(
  value: string | undefined,
  sort: MagazineSort
): MagazineDirection {
  return MAGAZINE_DIRECTIONS.find((d) => d === value) ?? sort.defaultDirection;
}

/**
 * 創刊日排的是 `foundedSort` 不是 `foundedDate`：後者是 EDTF 字串，「1999-05」
 * 與「1994」直接比字串會把年份較小的排在後面。衍生欄位存的是該值涵蓋區間的
 * 起點，本來就是為了排序而存在的。
 *
 * 沒有創刊日的排在最後（34 本裡有 2 本），否則一片空白會頂在最前面；名稱當
 * 第二鍵，讓同月創刊的刊物有穩定順序。
 */
export function magazineOrderBy(
  sort: MagazineSort,
  direction: MagazineDirection
): Prisma.MagazineOrderByWithRelationInput[] {
  if (sort.value === "founded") {
    return [{ foundedSort: { sort: direction, nulls: "last" } }, { name: "asc" }];
  }
  if (sort.value === "created") return [{ createdAt: direction }];
  return [{ name: direction }];
}

// ==================== 刊名時期的展開 ====================

/**
 * `/magazines` 的顯示單位。有刊名沿革的雜誌展開成一時期一卡——改了名又各自
 * 運行上百期的時期，對當年的讀者就是不同的雜誌，列表照那個認知呈現；資料層
 * 仍是同一個 Magazine，所以連結全部進同一個刊系頁（時期卡帶 #period-n 錨點）。
 * 沒有 titles 的雜誌維持一卡一本，欄位照舊。
 */
export interface MagazineDisplayUnit {
  key: string;
  href: string;
  name: string;
  nameOriginal: string | null;
  publisher: string | null;
  logoImage: string | null;
  categories: MagazineCategory[];
  /** 已格式化的發行期間，如「1999 年 8 月 – 2000 年 3 月」；不明則空字串。 */
  span: string;
  issueCount: number;
  /** 期數徽章的樣式用：非末段的時期一律視為已結束。 */
  isActive: boolean;
  /** 創刊日排序鍵；時期卡用該段第一期的 publishSort。null 排最後。 */
  sortDate: Date | null;
}

interface DisplayMagazine {
  id: string;
  slug: string;
  name: string;
  nameOriginal: string | null;
  publisher: string | null;
  logoImage: string | null;
  categories: MagazineCategory[];
  foundedDate: string | null;
  endedDate: string | null;
  foundedSort: Date | null;
  isActive: boolean;
  titles: (TitlePeriod & { id: string; logoImage: string | null })[];
  _count: { issues: number };
}

/** publishSort 是資料庫存的 UTC 午夜，取年月來顯示，精度跟 formatEdtf 的月級一致。 */
function yearMonth(date: Date | null): string {
  if (!date) return "";
  return `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月`;
}

/**
 * 沒有停刊資訊就只講起點：單卡雜誌沿用原本的「X創刊」；時期卡用「X起」——
 * 一個時期的開頭不是創刊。兩者缺起點都整格留白，理由見 MagazineList。
 */
function spanLabel(start: string, end: string, openSuffix: string): string {
  if (!start) return "";
  return end ? `${start} – ${end}` : `${start}${openSuffix}`;
}

export function magazineDisplayUnits(
  magazine: DisplayMagazine,
  issues: { order: number; publishSort: Date | null }[]
): MagazineDisplayUnit[] {
  const base = {
    nameOriginal: magazine.nameOriginal,
    publisher: magazine.publisher,
    categories: magazine.categories,
  };

  if (magazine.titles.length === 0) {
    return [
      {
        ...base,
        key: magazine.id,
        href: `/magazines/${magazine.slug}`,
        name: magazine.name,
        logoImage: magazine.logoImage,
        span: spanLabel(
          formatEdtf(magazine.foundedDate),
          formatEdtf(magazine.endedDate),
          "創刊"
        ),
        issueCount: magazine._count.issues,
        isActive: magazine.isActive,
        sortDate: magazine.foundedSort,
      },
    ];
  }

  const sorted = sortTitlePeriods(magazine.titles);
  const segments = splitIssuesByPeriod(sorted, issues);

  return segments.map((segment, index) => {
    const dates = segment.issues
      .map((issue) => issue.publishSort)
      .filter((date): date is Date => date !== null);
    const first = dates.length ? new Date(Math.min(...dates.map(Number))) : null;
    const last = dates.length ? new Date(Math.max(...dates.map(Number))) : null;

    const isFirst = index === 0;
    const isLast = index === segments.length - 1;
    // 首段的起點以雜誌的創刊日為準（EDTF 可能比 publishSort 更精確或更誠實），
    // 末段的終點同理用停刊日；中間的邊界只能從期資料推。
    const start = isFirst
      ? formatEdtf(magazine.foundedDate) || yearMonth(first)
      : yearMonth(first);
    const end = isLast
      ? formatEdtf(magazine.endedDate) || (magazine.isActive ? "" : yearMonth(last))
      : yearMonth(last);

    // 錨點編號跟著時期在沿革中的次序（1 起算），刊系頁的區段用同一套編號。
    // titles 沒建齊時的 null 首段沒有錨點，它就是頁面頂端。
    const anchorSeq = segment.period ? sorted.indexOf(segment.period) + 1 : 0;

    return {
      ...base,
      key: segment.period ? segment.period.id : magazine.id,
      href:
        anchorSeq > 1
          ? `/magazines/${magazine.slug}#period-${anchorSeq}`
          : `/magazines/${magazine.slug}`,
      name: segment.period?.title ?? magazine.name,
      logoImage: segment.period?.logoImage ?? magazine.logoImage,
      span: spanLabel(start, end, isFirst ? "創刊" : "起"),
      issueCount: segment.issues.length,
      isActive: magazine.isActive && isLast,
      sortDate: isFirst ? (magazine.foundedSort ?? first) : first,
    };
  });
}

/**
 * 展開之後排序只能在 JS 做：一本雜誌的三個時期名要各自落在字母序／年代序
 * 自己的位置上，資料庫層的 orderBy 排的是 Magazine。名稱用 zh-Hant collator
 * （筆畫序），與原本資料庫 collation 對 CJK 的 codepoint 序相比更接近讀者的
 * 預期；創刊日比照 magazineOrderBy——null 排最後、名稱當第二鍵。
 */
export function sortMagazineDisplayUnits(
  units: MagazineDisplayUnit[],
  sort: MagazineSort,
  direction: MagazineDirection
): MagazineDisplayUnit[] {
  const collator = new Intl.Collator("zh-Hant");
  const dir = direction === "asc" ? 1 : -1;
  return [...units].sort((a, b) => {
    if (sort.value === "founded") {
      if (a.sortDate === null && b.sortDate === null)
        return collator.compare(a.name, b.name);
      if (a.sortDate === null) return 1;
      if (b.sortDate === null) return -1;
      const byDate = a.sortDate.getTime() - b.sortDate.getTime();
      if (byDate !== 0) return byDate * dir;
      return collator.compare(a.name, b.name);
    }
    return collator.compare(a.name, b.name) * dir;
  });
}
