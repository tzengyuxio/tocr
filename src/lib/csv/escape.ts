// Leading characters that spreadsheet software reads as the start of a
// formula rather than as text. Article titles come straight out of OCR and the
// export exists to be opened in Excel, so a title beginning with one of these
// would otherwise be evaluated.
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escape one CSV field: neutralise formula injection, then quote if needed.
 *
 * The apostrophe is the conventional mitigation -- spreadsheets treat the rest
 * of the field as text and do not show the apostrophe itself.
 */
export function escapeCsvField(value: string | null | undefined): string {
  if (value == null || value === "") return "";

  let str = String(value);
  if (FORMULA_PREFIXES.includes(str[0])) {
    str = `'${str}`;
  }

  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
