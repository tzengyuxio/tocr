"use client";

import { useState } from "react";
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
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { QuickCreateIssueDialog } from "./QuickCreateIssueDialog";

interface MagazineItem {
  id: string;
  name: string;
  nameEn: string | null;
  publisher: string | null;
  coverImage: string | null;
  isActive: boolean;
  createdAt: string | Date;
  _count: { issues: number };
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
            <TableHead>期刊名稱</TableHead>
            <TableHead>出版社</TableHead>
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
                  {magazine.coverImage ? (
                    <img
                      src={magazine.coverImage}
                      alt={magazine.name}
                      className="h-10 w-8 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-8 items-center justify-center rounded bg-muted">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{magazine.name}</div>
                    {magazine.nameEn && (
                      <div className="text-sm text-muted-foreground">
                        {magazine.nameEn}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{magazine.publisher || "-"}</TableCell>
              <TableCell>{magazine._count.issues} 期</TableCell>
              <TableCell>
                <Badge
                  variant={magazine.isActive ? "default" : "secondary"}
                >
                  {magazine.isActive ? "發行中" : "已停刊"}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(magazine.createdAt), "yyyy/MM/dd", {
                  locale: zhTW,
                })}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="icon" title="編輯期刊">
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
