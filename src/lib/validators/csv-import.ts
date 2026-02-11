import { z } from "zod";

export const csvRowSchema = z.object({
  magazine_name: z.string().min(1, "期刊名稱為必填"),
  magazine_name_en: z.string().optional(),
  publisher: z.string().optional(),
  issn: z.string().optional(),
  description: z.string().optional(),
  founded_date: z.string().optional(),
  is_active: z.string().optional(),
  issue_number: z.string().min(1, "期號為必填"),
  volume_number: z.string().optional(),
  issue_title: z.string().optional(),
  publish_date: z.string().min(1, "出版日期為必填"),
  page_count: z.string().optional(),
  price: z.string().optional(),
  notes: z.string().optional(),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export interface ParsedIssue {
  issueNumber: string;
  volumeNumber?: string;
  title?: string;
  publishDate: string;
  pageCount?: number;
  price?: number;
  notes?: string;
}

export interface ParsedMagazine {
  name: string;
  nameEn?: string;
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
      nameEn: z.string().optional(),
      publisher: z.string().optional(),
      issn: z.string().optional(),
      description: z.string().optional(),
      foundedDate: z.string().optional(),
      isActive: z.boolean().optional(),
      issues: z.array(
        z.object({
          issueNumber: z.string().min(1),
          volumeNumber: z.string().optional(),
          title: z.string().optional(),
          publishDate: z.string().min(1),
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
