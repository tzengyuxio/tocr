"use client";

import type { ImportResult } from "@/lib/validators/csv-import";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, SkipForward } from "lucide-react";

interface ImportResultDialogProps {
  result: ImportResult | null;
  open: boolean;
  onClose: () => void;
}

export function ImportResultDialog({ result, open, onClose }: ImportResultDialogProps) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>匯入完成</DialogTitle>
          <DialogDescription>以下為匯入結果摘要</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 統計摘要 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{result.createdMagazines}</div>
              <div className="text-sm text-muted-foreground">新增期刊</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{result.skippedMagazines}</div>
              <div className="text-sm text-muted-foreground">跳過期刊</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{result.createdIssues}</div>
              <div className="text-sm text-muted-foreground">新增期數</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{result.skippedIssues}</div>
              <div className="text-sm text-muted-foreground">跳過期數</div>
            </div>
          </div>

          {/* 明細 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">明細</h4>
            {result.details.map((detail, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {detail.status === "created" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <SkipForward className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{detail.magazineName}</span>
                  <Badge variant={detail.status === "created" ? "default" : "secondary"}>
                    {detail.status === "created" ? "新增" : "已存在"}
                  </Badge>
                </div>
                {detail.issues.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {detail.issues.map((iss, j) => (
                      <Badge
                        key={j}
                        variant={iss.status === "created" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {iss.issueNumber}
                        {iss.status === "skipped" && " (跳過)"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>確定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
