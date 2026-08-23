"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, BookOpen, Plus } from "lucide-react";
import { formatTaipei } from "@/lib/datetime";
import { QuickCreateIssueDialog } from "./QuickCreateIssueDialog";
import { magazineSubtitle } from "@/lib/magazine-browse";

interface MagazineItem {
  id: string;
  name: string;
  nameParallel: string | null;
  sourceTitle: string | null;
  publisher: string | null;
  issn: string | null;
  logoImage: string | null;
  isActive: boolean;
  createdAt: string | Date;
  _count: { issues: number };
  /** 歷任刊名（通行名以外），讓管理清單搜得到、捲得到舊名。 */
  otherTitles: string[];
}

interface MagazineListClientProps {
  magazines: MagazineItem[];
}

export function MagazineListClient({ magazines }: MagazineListClientProps) {
  const [dialogTarget, setDialogTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>雜誌名稱</TableHead>
            <TableHead>出版社</TableHead>
            <TableHead>ISSN</TableHead>
            <TableHead>單期</TableHead>
            <TableHead>狀態</TableHead>
            <TableHead>建立日期</TableHead>
            <TableHead className="w-[120px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {magazines.map((magazine) => (
            <TableRow key={magazine.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {/* A masthead is wide -- 812x281 for 華泰任天堂秘笈, 880x212
                      for 新世紀 HYPER PlayStation -- so a portrait box with
                      object-cover showed a sliver from the middle of the
                      wordmark and cropped off the name. Landscape and
                      object-contain instead: the frame is fixed so the column
                      does not resize per row, and the odd portrait logo
                      (Official Xbox Magazine) letterboxes rather than crops. */}
                  {magazine.logoImage ? (
                    <Image
                      src={magazine.logoImage}
                      alt={magazine.name}
                      width={224}
                      height={80}
                      unoptimized
                      className="h-10 w-28 shrink-0 rounded object-contain"
                    />
                  ) : (
                    <div className="flex h-10 w-28 shrink-0 items-center justify-center rounded bg-muted">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <Link
                      href={`/admin/magazines/${magazine.id}`}
                      className="font-medium hover:underline"
                    >
                      {magazine.name}
                    </Link>
                    {magazineSubtitle(magazine.nameParallel, magazine.sourceTitle) && (
                      <div className="text-sm text-muted-foreground">
                        {magazineSubtitle(magazine.nameParallel, magazine.sourceTitle)}
                      </div>
                    )}
                    {magazine.otherTitles.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {magazine.otherTitles.join(" / ")}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{magazine.publisher || "-"}</TableCell>
              {/* tabular-nums so the digit groups line up down the column --
                  an ISSN is read by comparing it to its neighbours. */}
              <TableCell className="tabular-nums text-muted-foreground">
                {magazine.issn || "-"}
              </TableCell>
              <TableCell>{magazine._count.issues} 期</TableCell>
              <TableCell>
                <Badge
                  variant={magazine.isActive ? "default" : "secondary"}
                >
                  {magazine.isActive ? "發行中" : "已停刊"}
                </Badge>
              </TableCell>
              <TableCell>
                {formatTaipei(magazine.createdAt, "yyyy/MM/dd")}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="icon" title="編輯雜誌">
                    <Link href={`/admin/magazines/${magazine.id}`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="新增單期"
                    onClick={() =>
                      setDialogTarget({
                        id: magazine.id,
                        name: magazine.name,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {dialogTarget && (
        <QuickCreateIssueDialog
          magazineId={dialogTarget.id}
          magazineName={dialogTarget.name}
          open={!!dialogTarget}
          onOpenChange={(open) => !open && setDialogTarget(null)}
        />
      )}
    </>
  );
}
