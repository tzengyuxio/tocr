/**
 * 刊名時期的對應與分段。
 *
 * 一本雜誌的 titles 頂多三五筆，所以全部拿進記憶體用純函式處理；排序的尺是
 * Issue.order（startIssueId 只是指標，見 prisma/schema.prisma 的 MagazineTitle）。
 *
 * 「首段之前」的期（比最早起點還前面，或整本雜誌沒建 titles）一律 fallback
 * Magazine.name——那是安全網，編輯慣例是把整段沿革建齊，第一筆從第一期起。
 */

/** 對應查法需要的最小形狀；頁面各自 select 更多欄位時直接相容。 */
export interface TitlePeriod {
  title: string;
  startIssue: { order: number };
}

/** 依起始期的 order 排序，回傳新陣列。 */
export function sortTitlePeriods<T extends TitlePeriod>(titles: T[]): T[] {
  return [...titles].sort((a, b) => a.startIssue.order - b.startIssue.order);
}

/**
 * 這一期（以 order 表示位置）當時屬於哪個時期。
 * 回傳 null 表示落在首段之前或沒有 titles，呼叫端 fallback magazine.name。
 */
export function titlePeriodFor<T extends TitlePeriod>(
  titles: T[],
  order: number
): T | null {
  let match: T | null = null;
  for (const period of sortTitlePeriods(titles)) {
    if (period.startIssue.order <= order) match = period;
    else break;
  }
  return match;
}

/** titlePeriodFor 的字串版：直接給顯示名。 */
export function titleForIssue(
  titles: TitlePeriod[],
  order: number,
  magazineName: string
): string {
  return titlePeriodFor(titles, order)?.title ?? magazineName;
}

export interface TitleSegment<T extends TitlePeriod, I extends { order: number }> {
  /** null＝首段之前的期（titles 沒建齊時才會出現），顯示用 magazine.name。 */
  period: T | null;
  issues: I[];
}

/**
 * 把「已依 order 升冪排好」的期列表切成時期區段，給刊系頁分段顯示。
 * 空區段不出現：只回傳實際有期的段。
 */
export function splitIssuesByPeriod<
  T extends TitlePeriod,
  I extends { order: number },
>(titles: T[], issues: I[]): TitleSegment<T, I>[] {
  const sorted = sortTitlePeriods(titles);
  const segments: TitleSegment<T, I>[] = [];
  for (const issue of issues) {
    const period = titlePeriodFor(sorted, issue.order);
    const last = segments[segments.length - 1];
    if (last && last.period === period) last.issues.push(issue);
    else segments.push({ period, issues: [issue] });
  }
  return segments;
}
