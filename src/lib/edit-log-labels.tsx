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

export function entityLabel(type: string) {
  switch (type) {
    case "Magazine": return "期刊";
    case "Issue": return "單期";
    case "Article": return "文章";
    case "Tag": return "標籤";
    case "Game": return "遊戲";
    case "User": return "使用者";
    default: return type;
  }
}
