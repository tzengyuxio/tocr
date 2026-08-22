import { Plus, FileEdit, Trash2 } from "lucide-react";

export type EditAction = "CREATE" | "UPDATE" | "DELETE";
export type EntityType = "Magazine" | "Issue" | "Article" | "Tag" | "Game" | "User";

export function actionIcon(action: string) {
  switch (action) {
    case "CREATE": return <Plus className="h-3 w-3 text-green-600" />;
    case "UPDATE": return <FileEdit className="h-3 w-3 text-blue-600" />;
    case "DELETE": return <Trash2 className="h-3 w-3 text-red-600" />;
    default: return null;
  }
}

export function actionLabel(action: string) {
  switch (action) {
    case "CREATE": return "新增";
    case "UPDATE": return "更新";
    case "DELETE": return "刪除";
    default: return action;
  }
}

/**
 * How many records a log row stands for: the batch it leads, or just itself.
 *
 * `changes.count` is how batches were recorded before each record got its own
 * row. Those logs are still readable, so keep understanding them.
 */
export function editedCount(batchSize: number | null | undefined, changes: unknown): number {
  if (typeof batchSize === "number" && batchSize > 1) return batchSize;
  if (changes && typeof changes === "object" && "count" in changes) {
    const count = (changes as { count: unknown }).count;
    if (typeof count === "number" && count > 1) return count;
  }
  return 1;
}

/**
 * Marking an issue as reviewed is a side effect of saving the recognised
 * contents, not something anyone edited by hand. Saying "更新了單期" invites
 * the reader to look for an edit that never happened.
 */
export function isTocReviewMark(entityType: string, changes: unknown): boolean {
  if (entityType !== "Issue" || !changes || typeof changes !== "object") return false;
  const keys = Object.keys(changes);
  return keys.length === 1 && keys[0] === "tocReviewedAt";
}

export function entityLabel(type: string) {
  switch (type) {
    case "Magazine": return "雜誌";
    case "Issue": return "單期";
    case "Article": return "文章";
    case "Tag": return "標籤";
    case "Game": return "遊戲";
    case "User": return "使用者";
    default: return type;
  }
}
