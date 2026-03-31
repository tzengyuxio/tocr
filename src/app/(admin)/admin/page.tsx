export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Tags, Gamepad2, Calendar, ScanText, Upload, ArrowRight, Plus, FileEdit, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatGrid } from "@/components/StatGrid";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export default async function AdminDashboardPage() {
  const [magazineCount, issueCount, articleCount, tagCount, gameCount, recentLogs] =
    await Promise.all([
      prisma.magazine.count(),
      prisma.issue.count(),
      prisma.article.count(),
      prisma.tag.count(),
      prisma.game.count(),
      prisma.editLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

  const entityLabel = (type: string) => {
    switch (type) {
      case "Magazine": return "期刊";
      case "Issue": return "單期";
      case "Article": return "文章";
      case "Tag": return "標籤";
      case "Game": return "遊戲";
      case "User": return "使用者";
      default: return type;
    }
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case "CREATE": return <Plus className="h-3 w-3 text-green-600" />;
      case "UPDATE": return <FileEdit className="h-3 w-3 text-blue-600" />;
      case "DELETE": return <Trash2 className="h-3 w-3 text-red-600" />;
      default: return null;
    }
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case "CREATE": return "新增";
      case "UPDATE": return "更新";
      case "DELETE": return "刪除";
      default: return action;
    }
  };

  const hasData = magazineCount > 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">儀表板</h2>
        <p className="text-muted-foreground">
          期刊目錄索引系統後台管理
        </p>
      </div>

      <StatGrid
        items={[
          { label: "期刊", value: magazineCount, icon: BookOpen, href: "/admin/magazines" },
          { label: "單期", value: issueCount, icon: Calendar, href: "/admin/magazines" },
          { label: "文章", value: articleCount, icon: FileText, href: "/admin/articles" },
          { label: "遊戲", value: gameCount, icon: Gamepad2, href: "/admin/games" },
          { label: "標籤", value: tagCount, icon: Tags, href: "/admin/tags" },
        ]}
      />

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Button variant="outline" className="h-auto py-3 justify-start" asChild>
          <Link href="/admin/magazines/new">
            <Plus className="mr-2 h-4 w-4 text-green-600" />
            <div className="text-left">
              <div className="font-medium">新增期刊</div>
              <div className="text-xs text-muted-foreground">建立新的雜誌書目</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 justify-start" asChild>
          <Link href="/admin/ocr">
            <ScanText className="mr-2 h-4 w-4 text-primary" />
            <div className="text-left">
              <div className="font-medium">AI 辨識</div>
              <div className="text-xs text-muted-foreground">上傳目錄頁自動建檔</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 justify-start" asChild>
          <Link href="/admin/magazines/import">
            <Upload className="mr-2 h-4 w-4 text-amber-600" />
            <div className="text-left">
              <div className="font-medium">批次匯入</div>
              <div className="text-xs text-muted-foreground">CSV 檔案批次建立</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-3 justify-start" asChild>
          <Link href="/admin/contributors">
            <FileEdit className="mr-2 h-4 w-4 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">貢獻紀錄</div>
              <div className="text-xs text-muted-foreground">查看編輯活動</div>
            </div>
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Getting Started / Workflow Guide */}
        <Card>
          <CardHeader>
            <CardTitle>
              {hasData ? "建檔流程" : "開始使用"}
            </CardTitle>
            <CardDescription>
              {hasData ? "建立目錄資料的標準流程" : "按照以下步驟開始建立您的期刊目錄"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {[
                { step: "建立期刊", desc: "設定雜誌名稱、出版社等基本資料", href: "/admin/magazines/new", done: magazineCount > 0 },
                { step: "新增單期", desc: "為期刊加入各期的出版日期與封面", href: "/admin/magazines", done: issueCount > 0 },
                { step: "AI 辨識目錄", desc: "上傳目錄頁掃描圖，AI 自動擷取文章", href: "/admin/ocr", done: articleCount > 0 },
                { step: "校對與補充", desc: "確認辨識結果，補充標籤與遊戲關聯", href: "/admin/articles", done: tagCount > 0 || gameCount > 0 },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.done ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                  }`}>
                    {item.done ? "✓" : i + 1}
                  </div>
                  <div className="flex-1">
                    <Link href={item.href} className="font-medium hover:text-primary transition-colors">
                      {item.step}
                      <ArrowRight className="inline ml-1 h-3 w-3" />
                    </Link>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>最近編輯</CardTitle>
                <CardDescription>最新的資料變更紀錄</CardDescription>
              </div>
              {recentLogs.length > 0 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/contributors">
                    查看全部
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <FileEdit className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  尚無編輯紀錄，開始建立資料後這裡會顯示活動
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-2.5 rounded border px-3 py-2 text-sm"
                  >
                    <div className="shrink-0">{actionIcon(log.action)}</div>
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-medium">
                        {log.user.name || log.user.email}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}{actionLabel(log.action)}了{entityLabel(log.entityType)}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "MM/dd HH:mm", { locale: zhTW })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
