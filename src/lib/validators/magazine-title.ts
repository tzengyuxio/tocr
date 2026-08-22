import { z } from "zod";
import { optionalText } from "./fields";

// 刊名時期。起始期是選單選出來的既有 Issue，路由層另外驗它屬於這本雜誌——
// zod 管形狀，歸屬要查資料庫。
export const magazineTitleCreateSchema = z.object({
  title: z.string().min(1, "刊名為必填"),
  // 該時期的並列刊名。只在它跟著改名一起換時才有值，見 schema 的欄位註解
  titleParallel: optionalText,
  startIssueId: z.string().min(1, "起始期為必填"),
  logoImage: optionalText,
  note: optionalText,
});

export const magazineTitleUpdateSchema = magazineTitleCreateSchema.partial();

export type MagazineTitleCreateInput = z.infer<typeof magazineTitleCreateSchema>;
export type MagazineTitleUpdateInput = z.infer<typeof magazineTitleUpdateSchema>;
