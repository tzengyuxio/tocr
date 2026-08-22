import { z } from "zod";
import { isValidEdtf } from "../edtf";

export const csvRowSchema = z.object({
  magazine_name: z.string().min(1, "雜誌名稱為必填"),
  magazine_name_parallel: z.string().optional(),
  // Two superseded names for the same column, kept for files people already
  // made. magazine_name_en shipped in the downloadable template but the parser
  // never read it -- an optional field that is simply absent, so the value
  // vanished without an error; magazine_name_original replaced it, and this
  // rename is the second one.
  magazine_name_original: z.string().optional(),
  magazine_name_en: z.string().optional(),
  publisher: z.string().optional(),
  issn: z.string().optional(),
  description: z.string().optional(),
  founded_date: z.string().optional(),
  is_active: z.string().optional(),
  issue_number: z.string().min(1, "期號為必填"),
  // 分號分隔，與 authors／tags／games 同一套寫法。
  alt_numbers: z.string().optional(),
  // 後台表單已經不顯示卷號，範本也不再提供這一欄，但既有的檔案還帶著它，收下
  // 比丟掉好——欄位本身還在 schema 裡。見 docs/data-conventions.md。
  volume_number: z.string().optional(),
  issue_title: z.string().optional(),
  // 可留空：有些期數查不到出版日，位置由 order 決定（見 data-conventions.md）。
  publish_date: z.string(),
  page_count: z.string().optional(),
  price: z.string().optional(),
  notes: z.string().optional(),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export interface ParsedIssue {
  issueNumber: string;
  altNumbers?: string[];
  volumeNumber?: string;
  title?: string;
  publishDate?: string;
  pageCount?: number;
  price?: number;
  notes?: string;
}

export interface ParsedMagazine {
  name: string;
  nameParallel?: string;
  publisher?: string;
  issn?: string;
  description?: string;
  foundedDate?: string;
  isActive?: boolean;
  issues: ParsedIssue[];
}

export const importRequestSchema = z.object({
  magazines: z.array(
    z.object({
      name: z.string().min(1),
      nameParallel: z.string().optional(),
      publisher: z.string().optional(),
      issn: z.string().optional(),
      description: z.string().optional(),
      foundedDate: z.string().optional(),
      isActive: z.boolean().optional(),
      issues: z.array(
        z.object({
          issueNumber: z.string().min(1),
          altNumbers: z.array(z.string()).optional(),
          volumeNumber: z.string().optional(),
          title: z.string().optional(),
          publishDate: z
            .string()
            .refine(isValidEdtf, "publish_date 需為 EDTF（例如 1999、1999-05、1999-05-20、1994-22）")
            .optional(),
          pageCount: z.coerce.number().int().positive().optional(),
          price: z.coerce.number().positive().optional(),
          notes: z.string().optional(),
        })
      ),
    })
  ),
});

export type ImportRequest = z.infer<typeof importRequestSchema>;

export interface ImportResult {
  createdMagazines: number;
  skippedMagazines: number;
  createdIssues: number;
  skippedIssues: number;
  details: {
    magazineName: string;
    status: "created" | "existed";
    issues: { issueNumber: string; status: "created" | "skipped" }[];
  }[];
}
