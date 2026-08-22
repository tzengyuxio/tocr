"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { CsvUploadZone } from "./CsvUploadZone";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { ImportResultDialog } from "./ImportResultDialog";
import { parseCsvFile, type ParseResult } from "@/lib/csv/parse-magazines-issues";
import type { ImportResult } from "@/lib/validators/csv-import";

type Stage = "upload" | "preview" | "importing";

/**
 * The columns the downloadable template ships with. Exported so a test can
 * hold it against csvRowSchema: this list once offered magazine_name_en, which
 * the parser did not read, and an optional field that is merely absent raises
 * nothing -- the value just never arrived.
 */
export const CSV_TEMPLATE_HEADERS = [
  "magazine_name",
  "magazine_name_original",
  "publisher",
  "issn",
  "description",
  "founded_date",
  "is_active",
  "issue_number",
  "alt_numbers",
  "issue_title",
  "publish_date",
  "page_count",
  "price",
  "notes",
];

const CSV_TEMPLATE_ROWS = [
  // Magazine A - first issue: fill all magazine fields
  ["電玩通", "ファミ通", "範例出版社", "1234-5678", "台灣老牌電玩雜誌", "1995-06", "true", "42", "HK VOL 308;1月30日號", "年度大作特輯", "2024-01-15", "128", "150", ""],
  // Magazine A - second issue: magazine fields can be empty since it already exists
  ["電玩通", "", "", "", "", "", "", "43", "", "", "2024-02-15", "120", "150", ""],
  // Magazine A - third issue
  ["電玩通", "", "", "", "", "", "", "44", "", "E3 特別報導", "2024-03-15", "144", "150", "附贈海報"],
  // Magazine B - first issue: fill all magazine fields for the new magazine
  ["遊戲世界", "", "另一出版社", "8765-4321", "綜合遊戲情報誌", "2000-03", "true", "創刊號", "", "百期紀念號", "2024-01-20", "160", "200", "限量封面"],
  // Magazine B - second issue
  ["遊戲世界", "", "", "", "", "", "", "101", "", "", "2024-02-20", "140", "200", ""],
];

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadTemplate() {
  // BOM + UTF-8 CSV
  const bom = "\uFEFF";
  const header = CSV_TEMPLATE_HEADERS.join(",");
  const rows = CSV_TEMPLATE_ROWS.map((row) =>
    row.map(escapeCsvField).join(",")
  ).join("\n");
  const content = bom + header + "\n" + rows + "\n";
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "magazines-issues-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvImporter() {
  const [stage, setStage] = useState<Stage>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileAccepted(file: File) {
    setError(null);
    const result = await parseCsvFile(file);

    if (result.magazines.length === 0 && result.errors.length === 0) {
      setError("CSV 檔案沒有有效的資料行");
      return;
    }

    setParseResult(result);
    setStage("preview");
  }

  function handleReset() {
    setStage("upload");
    setParseResult(null);
    setImportResult(null);
    setError(null);
  }

  async function handleImport() {
    if (!parseResult) return;

    setStage("importing");
    setError(null);

    try {
      const response = await fetch("/api/import/magazines-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magazines: parseResult.magazines }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "匯入失敗");
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setShowResultDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯入失敗");
      setStage("preview");
    }
  }

  function handleResultClose() {
    setShowResultDialog(false);
    handleReset();
  }

  const hasErrors = parseResult && parseResult.errors.length > 0;
  const hasData = parseResult && parseResult.magazines.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CSV 批次匯入</CardTitle>
              <CardDescription>
                上傳 CSV 檔案，批次建立期刊與單期資料。已存在的期刊和單期將自動跳過。
              </CardDescription>
              <div className="mt-3 space-y-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <div>
                  <p className="mb-1.5 font-medium text-foreground">期刊欄位</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    <li><span className="font-medium">magazine_name *</span>：期刊名稱，用來識別期刊，如「電玩通」</li>
                    <li><span className="font-medium">magazine_name_original</span>：期刊原文名稱，如「ファミ通」</li>
                    <li><span className="font-medium">publisher</span>：出版社名稱</li>
                    <li><span className="font-medium">issn</span>：國際標準期刊號</li>
                    <li><span className="font-medium">description</span>：期刊描述</li>
                    <li><span className="font-medium">founded_date</span>：創刊日期，知道多少寫多少：<code>1995</code>、<code>1995-06</code>、<code>1995-06-01</code></li>
                    <li><span className="font-medium">is_active</span>：是否仍在發行，true 或 false（預設 true）</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 font-medium text-foreground">單期欄位</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    <li><span className="font-medium">issue_number *</span>：期號，照封面登錄但數字就寫數字，如「42」「創刊號」「2024年8月號」</li>
                    <li><span className="font-medium">alt_numbers</span>：同一期封面／版權頁上並存的其他編號，以分號分隔，如「HK VOL 308;1月30日號」</li>
                    <li><span className="font-medium">issue_title</span>：本期標題或特輯名稱</li>
                    <li><span className="font-medium">publish_date</span>：出版日期，知道多少寫多少：<code>1999</code>、<code>1999-05</code>、<code>1999-05-20</code>；季別用 21 春、22 夏、23 秋、24 冬。查不到就留空</li>
                    <li><span className="font-medium">page_count</span>：頁數</li>
                    <li><span className="font-medium">price</span>：售價</li>
                    <li><span className="font-medium">notes</span>：備註</li>
                  </ul>
                </div>
                <div className="rounded border border-blue-200 bg-blue-50 p-2 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                  <p className="font-medium">💡 關於重複期刊</p>
                  <p className="mt-0.5">同一期刊第一次出現時，會使用該行的期刊欄位（原文名、出版社、ISSN 等）建立期刊資料。之後若期刊已存在，期刊欄位會被略過，因此同一期刊的後續行可以只填 magazine_name 和單期欄位，其餘期刊欄位留空即可。</p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              下載 CSV 範本
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stage === "upload" && (
            <CsvUploadZone onFileAccepted={handleFileAccepted} />
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {(stage === "preview" || stage === "importing") && parseResult && (
        <>
          <ImportPreviewTable result={parseResult} />

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={stage === "importing"}
            >
              重新上傳
            </Button>
            <Button
              onClick={handleImport}
              disabled={stage === "importing" || !hasData || (!!hasErrors && !hasData)}
            >
              {stage === "importing" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              確認匯入
              {hasData &&
                ` (${parseResult.magazines.length} 本期刊, ${parseResult.magazines.reduce(
                  (sum, m) => sum + m.issues.length,
                  0
                )} 個單期)`}
            </Button>
          </div>
        </>
      )}

      <ImportResultDialog
        result={importResult}
        open={showResultDialog}
        onClose={handleResultClose}
      />
    </div>
  );
}
