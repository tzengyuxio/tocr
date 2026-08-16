import { ExternalLink } from "lucide-react";
import {
  actionIcon,
  actionLabel,
  editedCount,
  entityLabel,
  isTocReviewMark,
} from "@/lib/edit-log-labels";
import type { EditLogTarget } from "@/lib/edit-log-targets";
import { formatTaipei } from "@/lib/datetime";

/**
 * The edited record, linked when it still exists. Opens in a new tab so
 * reviewing a change never loses the log you were reading.
 */
export function EditLogTargetLink({ target }: { target: EditLogTarget }) {
  if (!target.href) {
    return <span className="text-muted-foreground">{target.label}</span>;
  }
  return (
    <a
      href={target.href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium hover:underline"
    >
      {target.label}
      <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px]" />
    </a>
  );
}

export interface EditLogEntryLog {
  action: string;
  entityType: string;
  createdAt: Date;
  changes?: unknown;
  batchSize?: number | null;
  user: { name: string | null; email: string };
}

/** One line of edit history: who did what, to which record. */
export function EditLogEntry({
  log,
  target,
}: {
  log: EditLogEntryLog;
  target: EditLogTarget;
}) {
  const count = editedCount(log.batchSize, log.changes);
  const reviewMark = isTocReviewMark(log.entityType, log.changes);

  return (
    <div className="flex items-center gap-2.5 rounded border px-3 py-2 text-sm">
      <div className="shrink-0">{actionIcon(log.action)}</div>
      <div className="min-w-0 flex-1 truncate">
        <span className="font-medium">{log.user.name || log.user.email}</span>
        {reviewMark ? (
          <>
            <span className="text-muted-foreground"> 複查了 </span>
            <EditLogTargetLink target={target} />
            <span className="text-muted-foreground"> 的目錄</span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">
              {" "}
              {actionLabel(log.action)}了{entityLabel(log.entityType)}{" "}
            </span>
            <EditLogTargetLink target={target} />
            {count > 1 && (
              <span className="text-muted-foreground">
                {" "}
                等 {count} {log.entityType === "Article" ? "篇" : "筆"}
                {/* Only the review save writes a batch of articles, and
                    "新增了 50 篇文章" otherwise reads as 50 typed by hand. */}
                {log.entityType === "Article" && "（目錄複查）"}
              </span>
            )}
          </>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatTaipei(log.createdAt, "MM/dd HH:mm")}
      </span>
    </div>
  );
}
