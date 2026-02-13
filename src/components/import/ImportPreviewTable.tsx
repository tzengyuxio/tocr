"use client";

import type { ParseResult } from "@/lib/csv/parse-magazines-issues";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface ImportPreviewTableProps {
  result: ParseResult;
}

export function ImportPreviewTable({ result }: ImportPreviewTableProps) {
  const { magazines, errors, warnings, totalRows } = result;

  return (
    <div className="space-y-4">
      {/* 摘要 */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="secondary">共 {totalRows} 行</Badge>
        <Badge variant="secondary">
          {magazines.length} 本期刊
        </Badge>
        <Badge variant="secondary">
          {magazines.reduce((sum, m) => sum + m.issues.length, 0)} 個單期
        </Badge>
        {errors.length > 0 && (
          <Badge variant="destructive">{errors.length} 個錯誤</Badge>
        )}
        {warnings.length > 0 && (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            {warnings.length} 個警告
          </Badge>
        )}
      </div>

      {/* 錯誤清單 */}
      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertCircle className="h-4 w-4" />
              驗證錯誤（以下行不會匯入）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {errors.map((err, i) => (
                <li key={i} className="text-destructive">
                  第 {err.row} 行{err.field ? `（${err.field}）` : ""}：{err.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 警告清單 */}
      {warnings.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              警告
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {warnings.map((warn, i) => (
                <li key={i} className="text-yellow-600">
                  第 {warn.row} 行：{warn.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 按期刊分組的預覽表格 */}
      {magazines.map((magazine, mIdx) => (
        <Card key={mIdx}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{magazine.name}</CardTitle>
            <CardDescription>
              {[
                magazine.nameEn,
                magazine.publisher && `出版社：${magazine.publisher}`,
                magazine.issn && `ISSN：${magazine.issn}`,
              ]
                .filter(Boolean)
                .join(" / ") || "無額外資訊"}
              {" · "}
              {magazine.issues.length} 個單期
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>期號</TableHead>
                  <TableHead>卷號</TableHead>
                  <TableHead>標題</TableHead>
                  <TableHead>出版日期</TableHead>
                  <TableHead>頁數</TableHead>
                  <TableHead>價格</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {magazine.issues.map((issue, iIdx) => (
                  <TableRow key={iIdx}>
                    <TableCell className="font-medium">{issue.issueNumber}</TableCell>
                    <TableCell>{issue.volumeNumber || "-"}</TableCell>
                    <TableCell>{issue.title || "-"}</TableCell>
                    <TableCell>{issue.publishDate}</TableCell>
                    <TableCell>{issue.pageCount ?? "-"}</TableCell>
                    <TableCell>{issue.price ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
