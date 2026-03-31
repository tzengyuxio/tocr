export const revalidate = 60;

import type { Metadata } from "next";
import { getContributorLeaderboard } from "@/lib/contributor-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "貢獻者",
};

export default async function ContributorsPage() {
  const { contributors } = await getContributorLeaderboard({ take: 50 });
  const totalEdits = contributors.reduce((sum, c) => sum + c.totalEdits, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">貢獻者</h1>
        <p className="text-muted-foreground">
          感謝所有為期刊目錄索引貢獻資料的夥伴
        </p>
      </section>

      {/* Summary */}
      <div className="mb-8 flex justify-center gap-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span className="text-2xl font-bold text-foreground">{contributors.length}</span>
          <span>位貢獻者</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Award className="h-5 w-5" />
          <span className="text-2xl font-bold text-foreground">{totalEdits}</span>
          <span>次編輯</span>
        </div>
      </div>

      {/* Contributor Grid */}
      {contributors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            尚無貢獻紀錄
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contributors.map((c) => (
            <Card key={c.user?.id ?? c.rank} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-bold">
                    {c.rank <= 3 ? ["🥇", "🥈", "🥉"][c.rank - 1] : `#${c.rank}`}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">
                      {c.user?.name || "Anonymous"}
                    </CardTitle>
                    <CardDescription>
                      {c.totalEdits} 次貢獻
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {c.breakdown.CREATE && (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      +{c.breakdown.CREATE} 新增
                    </Badge>
                  )}
                  {c.breakdown.UPDATE && (
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      {c.breakdown.UPDATE} 更新
                    </Badge>
                  )}
                  {c.breakdown.DELETE && (
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      {c.breakdown.DELETE} 刪除
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
