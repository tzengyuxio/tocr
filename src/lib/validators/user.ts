import { z } from "zod";
import { API_USER } from "@/lib/api-token";
import { DEV_USER } from "@/lib/dev-auth";

/**
 * Upper bound on a display name. It sits in table cells and leaderboard rows
 * next to an edit count, so a long one pushes the numbers off the line.
 */
export const MAX_DISPLAY_NAME_LENGTH = 30;

/**
 * Names the site gives to accounts that never sign in. Taking one would make a
 * person indistinguishable from the import script in the activity feed.
 */
const RESERVED_NAMES = [API_USER.name, DEV_USER.name];

export const displayNameSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, "顯示名稱不能是空白")
    .refine(
      (value) => value.length <= MAX_DISPLAY_NAME_LENGTH,
      `顯示名稱不能超過 ${MAX_DISPLAY_NAME_LENGTH} 個字`
    )
    .refine(
      (value) =>
        !RESERVED_NAMES.some(
          (reserved) => reserved.toLowerCase() === value.toLowerCase()
        ),
      "這個名稱是系統保留的"
    ),
});

export type DisplayNameInput = z.infer<typeof displayNameSchema>;

/** Accounts whose name is set by code, so editing it would be undone. */
export function isSyntheticUser(userId: string): boolean {
  return userId === API_USER.id || userId === DEV_USER.id;
}
