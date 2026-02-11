import Papa from "papaparse";
import { csvRowSchema, type ParsedMagazine, type ParsedIssue } from "@/lib/validators/csv-import";

export interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface RowWarning {
  row: number;
  message: string;
}

export interface ParseResult {
  magazines: ParsedMagazine[];
  errors: RowError[];
  warnings: RowWarning[];
  totalRows: number;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const errors: RowError[] = [];
        const warnings: RowWarning[] = [];
        const magazineMap = new Map<string, ParsedMagazine>();
        // 追蹤 (magazineKey, issueNumber) 去重
        const issueDedupSet = new Set<string>();

        const rows = results.data as Record<string, string>[];

        for (let i = 0; i < rows.length; i++) {
          const rowNum = i + 2; // CSV 第 1 行為 header，資料從第 2 行開始
          const raw = rows[i];

          const parsed = csvRowSchema.safeParse(raw);
          if (!parsed.success) {
            for (const issue of parsed.error.issues) {
              errors.push({
                row: rowNum,
                field: issue.path.join("."),
                message: issue.message,
              });
            }
            continue;
          }

          const row = parsed.data;

          // 用 ISSN（若有）或 magazine_name 作為 key 歸納同一期刊
          const issn = emptyToUndefined(row.issn);
          const magazineKey = issn || row.magazine_name.trim();

          if (!magazineMap.has(magazineKey)) {
            const isActiveStr = emptyToUndefined(row.is_active);
            let isActive: boolean | undefined;
            if (isActiveStr !== undefined) {
              isActive = isActiveStr === "true" || isActiveStr === "1" || isActiveStr === "是";
            }

            magazineMap.set(magazineKey, {
              name: row.magazine_name.trim(),
              nameEn: emptyToUndefined(row.magazine_name_en),
              publisher: emptyToUndefined(row.publisher),
              issn,
              description: emptyToUndefined(row.description),
              foundedDate: emptyToUndefined(row.founded_date),
              isActive,
              issues: [],
            });
          }

          const magazine = magazineMap.get(magazineKey)!;
          const issueNumber = row.issue_number.trim();

          // CSV 內部同期刊同期號去重
          const dedupKey = `${magazineKey}::${issueNumber}`;
          if (issueDedupSet.has(dedupKey)) {
            warnings.push({
              row: rowNum,
              message: `期刊「${magazine.name}」的期號「${issueNumber}」重複，已跳過此行`,
            });
            continue;
          }
          issueDedupSet.add(dedupKey);

          const issue: ParsedIssue = {
            issueNumber,
            volumeNumber: emptyToUndefined(row.volume_number),
            title: emptyToUndefined(row.issue_title),
            publishDate: row.publish_date.trim(),
          };

          const pageCountStr = emptyToUndefined(row.page_count);
          if (pageCountStr) {
            const num = parseInt(pageCountStr, 10);
            if (!isNaN(num) && num > 0) {
              issue.pageCount = num;
            }
          }

          const priceStr = emptyToUndefined(row.price);
          if (priceStr) {
            const num = parseFloat(priceStr);
            if (!isNaN(num) && num > 0) {
              issue.price = num;
            }
          }

          issue.notes = emptyToUndefined(row.notes);

          magazine.issues.push(issue);
        }

        resolve({
          magazines: Array.from(magazineMap.values()),
          errors,
          warnings,
          totalRows: rows.length,
        });
      },
      error(err) {
        resolve({
          magazines: [],
          errors: [{ row: 0, field: "", message: `CSV 解析失敗：${err.message}` }],
          warnings: [],
          totalRows: 0,
        });
      },
    });
  });
}
