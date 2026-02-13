"use client";

import { useState } from "react";
import { Download, BookOpen, FileText, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

interface ExportPageClientProps {
  magazineCount: number;
  issueCount: number;
  articleCount: number;
  magazines: { id: string; name: string }[];
}

export function ExportPageClient({
  magazineCount,
  issueCount,
  articleCount,
  magazines,
}: ExportPageClientProps) {
  const [selectedMagazineId, setSelectedMagazineId] = useState("");
  const [downloading, setDownloading] = useState(false);

  const magazineOptions = magazines.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const handleDownload = () => {
    setDownloading(true);
    const url = selectedMagazineId
      ? `/api/export?magazineId=${encodeURIComponent(selectedMagazineId)}`
      : "/api/export";

    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Reset after a short delay to allow download to start
    setTimeout(() => setDownloading(false), 2000);
  };

  const stats = [
    { label: "期刊", value: magazineCount, icon: BookOpen },
    { label: "單期", value: issueCount, icon: Newspaper },
    { label: "文章", value: articleCount, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">資料匯出</h1>
        <p className="text-muted-foreground">
          將期刊、單期、文章資料匯出為 CSV 檔案
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>匯出設定</CardTitle>
          <CardDescription>
            選擇匯出範圍，CSV 檔案使用 UTF-8 (BOM) 編碼，可直接用 Excel 開啟
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>篩選期刊（可選）</Label>
            <Combobox
              options={magazineOptions}
              value={selectedMagazineId}
              onValueChange={setSelectedMagazineId}
              placeholder="全部期刊"
              searchPlaceholder="搜尋期刊..."
              emptyMessage="找不到期刊"
            />
            <p className="text-xs text-muted-foreground">
              不選擇則匯出所有期刊的資料
            </p>
          </div>

          <Button onClick={handleDownload} disabled={downloading}>
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "準備下載中..." : "下載 CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
