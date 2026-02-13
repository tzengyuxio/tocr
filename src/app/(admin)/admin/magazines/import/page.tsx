import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CsvImporter } from "@/components/import/CsvImporter";

export default function MagazineImportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/magazines">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">批次匯入期刊與單期</h2>
          <p className="text-muted-foreground">
            使用 CSV 檔案一次匯入多本期刊及其單期資料
          </p>
        </div>
      </div>

      <CsvImporter />
    </div>
  );
}
