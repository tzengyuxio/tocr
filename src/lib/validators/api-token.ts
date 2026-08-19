import { z } from "zod";

/**
 * A token's name sits in a table cell next to its prefix and dates, so it is
 * kept short for the same reason a display name is.
 */
export const MAX_TOKEN_NAME_LENGTH = 40;

export const apiTokenNameSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, "請給這個 token 一個名稱")
    .refine(
      (value) => value.length <= MAX_TOKEN_NAME_LENGTH,
      `名稱不能超過 ${MAX_TOKEN_NAME_LENGTH} 個字`
    ),
});
