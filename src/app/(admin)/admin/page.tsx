export const dynamic = "force-dynamic";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, FileText, Tags, Gamepad2, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatGrid } from "@/components/StatGrid";

export default async function AdminDashboardPage() {
  const [magazineCount, issueCount, articleCount, tagCount, gameCount] =
    await Promise.all([
      prisma.magazine.count(),
      prisma.issue.count(),
      prisma.article.count(),
      prisma.tag.count(),
      prisma.game.count(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">儀表板</h2>
        <p className="text-muted-foreground">
          歡迎使用期刊目錄索引系統後台管理介面
        </p>
      </div>

      <StatGrid
        items={[
          { label: "期刊", value: magazineCount, icon: BookOpen, href: "/admin/magazines" },
          { label: "期數", value: issueCount, icon: Calendar, href: "/admin/magazines" },
          { label: "文章", value: articleCount, icon: FileText, href: "/admin/articles" },
          { label: "遊戲", value: gameCount, icon: Gamepad2, href: "/admin/games" },
          { label: "標籤", value: tagCount, icon: Tags, href: "/admin/tags" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>快速開始</CardTitle>
            <CardDescription>開始建立您的期刊目錄資料</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              1. 首先建立期刊（例如：電玩通、電擊王等）
            </p>
            <p className="text-sm text-muted-foreground">
              2. 為期刊新增期數（含出版日期、封面等）
            </p>
            <p className="text-sm text-muted-foreground">
              3. 使用 AI 辨識功能上傳目錄頁，自動產生文章資料
            </p>
            <p className="text-sm text-muted-foreground">
              4. 校對並補充文章的 Tag 與遊戲關聯
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近編輯紀錄</CardTitle>
            <CardDescription>系統將記錄所有編輯操作</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">尚無編輯紀錄</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
