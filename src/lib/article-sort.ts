interface Paginated {
  pageSection?: string | null;
  pageStart: number | null;
  pageEnd: number | null;
}

/**
 * Page order for an issue's table of contents.
 *
 * OCR returns the articles in whatever order it read them off the scan, which
 * for a multi-column page is often not the printed order. Articles with no page
 * number stay together at the end rather than sorting as page 0.
 *
 * A supplement bound into the issue (P-mate's 別冊 C-mate) numbers its own
 * pages from 1, so page numbers only compare within one section: the main
 * magazine (no section) comes first, then each section in turn.
 */
export function byPageNumber(a: Paginated, b: Paginated): number {
  const sectionA = a.pageSection ?? "";
  const sectionB = b.pageSection ?? "";
  if (sectionA !== sectionB) {
    if (!sectionA) return -1;
    if (!sectionB) return 1;
    return sectionA.localeCompare(sectionB);
  }
  if (a.pageStart === b.pageStart) return (a.pageEnd ?? 0) - (b.pageEnd ?? 0);
  if (a.pageStart === null) return 1;
  if (b.pageStart === null) return -1;
  return a.pageStart - b.pageStart;
}
