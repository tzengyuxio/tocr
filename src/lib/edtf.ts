import edtf from "edtf";

/**
 * Publication dates are often known only to the month, the year, or the season.
 * EDTF (ISO 8601-2) records that imprecision instead of inventing a day:
 *
 *   1989-04-08   a known day
 *   1999-05      some day in May 1999
 *   1994         some time in 1994
 *   1994-22      summer 1994        (21 spring, 22 summer, 23 autumn, 24 winter)
 *   1999-05?     uncertain -- the source is doubtful
 *   1999-05~     approximate -- around that time
 */

export function isValidEdtf(value: string): boolean {
  try {
    edtf(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Start of the range the value covers, for ordering. EDTF strings cannot be
 * compared directly: "1994" and "1994-22" both belong inside 1994, and the
 * uncertainty markers sort after the digits they follow.
 */
export function edtfSortDate(value: string): Date | null {
  try {
    return new Date(edtf(value).min);
  } catch {
    return null;
  }
}

const SEASONS: Record<number, string> = {
  21: "春季",
  22: "夏季",
  23: "秋季",
  24: "冬季",
};

/** Render an EDTF value as Traditional Chinese, keeping its precision. */
export function formatEdtf(value: string): string {
  if (!isValidEdtf(value)) return value;

  // Strip the qualifiers before matching shape, then note them separately.
  const qualifier = value.match(/[?~%]+$/)?.[0] ?? "";
  const bare = qualifier ? value.slice(0, -qualifier.length) : value;

  let text: string;
  const season = bare.match(/^(\d{4})-(2[1-4])$/);
  const day = bare.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const month = bare.match(/^(\d{4})-(\d{2})$/);
  const year = bare.match(/^(\d{4})$/);

  if (season) {
    text = `${season[1]} 年${SEASONS[Number(season[2])]}`;
  } else if (day) {
    text = `${day[1]} 年 ${Number(day[2])} 月 ${Number(day[3])} 日`;
  } else if (month) {
    text = `${month[1]} 年 ${Number(month[2])} 月`;
  } else if (year) {
    text = `${year[1]} 年`;
  } else {
    // Intervals, sets and other Level 2 forms -- show them as written.
    return value;
  }

  if (qualifier.includes("?")) text += "（存疑）";
  else if (qualifier.includes("~")) text = `約 ${text}`;
  if (qualifier.includes("%")) text = `約 ${text}（存疑）`;

  return text;
}
