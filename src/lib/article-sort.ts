interface Paginated {
  pageStart: number | null;
  pageEnd: number | null;
}

/**
 * Page order for an issue's table of contents.
 *
 * OCR returns the articles in whatever order it read them off the scan, which
 * for a multi-column page is often not the printed order. Articles with no page
 * number stay together at the end rather than sorting as page 0.
 */
export function byPageNumber(a: Paginated, b: Paginated): number {
  if (a.pageStart === b.pageStart) return (a.pageEnd ?? 0) - (b.pageEnd ?? 0);
  if (a.pageStart === null) return 1;
  if (b.pageStart === null) return -1;
  return a.pageStart - b.pageStart;
}
