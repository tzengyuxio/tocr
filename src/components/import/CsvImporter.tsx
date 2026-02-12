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

const CSV_TEMPLATE_HEADERS = [
  "magazine_name",
  "magazine_name_en",
  "publisher",
  "issn",
  "description",
  "founded_date",
  "is_active",
  "issue_number",
  "volume_number",
  "issue_title",
  "publish_date",
  "page_count",
  "price",
  "notes",
];

const CSV_TEMPLATE_EXAMPLE = [
  "電玩通",
  "Game Express",
  "範例出版社",
  "",
  "",
  "",
  "true",
  "42",
  "Vol.5",
  "特別企劃",
  "2024-01-15",
  "128",
  "150",
  "",
];

function downloadTemplate() {
  // BOM + UTF-8 CSV
  const bom = "\uFEFF";
  const header = CSV_TEMPLATE_HEADERS.join(",");
  const example = CSV_TEMPLATE_EXAMPLE.join(",");
  const content = bom + header + "\n" + example + "\n";
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
                上傳 CSV 檔案，批次建立期刊與期數資料。已存在的期刊和期數將自動跳過。
              </CardDescription>
              <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">欄位說明</p>
                <ul className="list-inside list-disc space-y-0.5">
                  <li><span className="font-medium">issue_number（期號）</span>：每一期的流水編號，如「42」「No.3」「2024年8月號」</li>
                  <li><span className="font-medium">volume_number（卷號）</span>：將多期歸為一卷的編號，通常以年份或固定期數為單位，如「Vol.5」「第 3 卷」。選填</li>
                  <li>帶有 <span className="font-medium">*</span> 的欄位為必填：magazine_name、issue_number、publish_date</li>
                </ul>
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
                )} 個期數)`}
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
