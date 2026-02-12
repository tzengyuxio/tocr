"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Gamepad2,
  BookOpen,
  FileText,
} from "lucide-react";
import { groupArticles, type ArticleData, type GroupedData } from "@/lib/group-articles";

export default function GameDetailPage() {
  const params = useParams<{ id: string }>();
  const [game, setGame] = useState<{
    id: string;
    name: string;
    nameOriginal: string | null;
    nameEn: string | null;
    slug: string;
    platforms: string[];
    developer: string | null;
    publisher: string | null;
    genres: string[];
    _count: { articleGames: number };
  } | null>(null);
  const [grouped, setGrouped] = useState<GroupedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/games/${params.id}?all=true`);
        const data = await res.json();
        setGame({
          id: data.id,
          name: data.name,
          nameOriginal: data.nameOriginal,
          nameEn: data.nameEn,
          slug: data.slug,
          platforms: data.platforms,
          developer: data.developer,
          publisher: data.publisher,
          genres: data.genres,
          _count: data._count,
        });
        const articles = data.articleGames.map(
          (ag: { article: ArticleData }) => ag.article
        );
        setGrouped(groupArticles(articles));
      } catch (err) {
        console.error("Failed to load game:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!game) {
    return <p className="py-12 text-center text-muted-foreground">找不到遊戲</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" title="返回遊戲列表">
            <Link href="/admin/games">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Gamepad2 className="h-6 w-6" />
              {game.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {(game.nameOriginal || game.nameEn) && (
                <span>{game.nameOriginal || game.nameEn}</span>
              )}
              {game.developer && <span>· {game.developer}</span>}
              <span>· {game._count.articleGames} 篇相關文章</span>
            </div>
            {(game.platforms.length > 0 || game.genres.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {game.platforms.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
                {game.genres.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>相關文章</CardTitle>
          <CardDescription>
            出現在 {grouped.length} 本期刊、
            {grouped.reduce((sum, g) => sum + g.issues.length, 0)} 期中
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無相關文章</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <Collapsible key={group.magazine.id} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg bg-muted px-4 py-3 text-left font-medium hover:bg-muted/80 transition-colors [&[data-state=open]>svg]:rotate-90">
                    <ChevronRight className="h-4 w-4 shrink-0 transition-transform" />
                    <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{group.magazine.name}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {group.issues.length} 期・
                      {group.issues.reduce((s, ig) => s + ig.articles.length, 0)} 篇
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-6 border-l pl-4 pt-2 space-y-3">
                      {group.issues.map((issueGroup) => (
                        <Collapsible key={issueGroup.issue.id} defaultOpen>
                          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-90">
                            <ChevronRight className="h-3 w-3 shrink-0 transition-transform" />
                            <span className="font-medium">
                              {issueGroup.issue.issueNumber}
                            </span>
                            <span className="text-muted-foreground">
                              ({new Date(issueGroup.issue.publishDate).toLocaleDateString("zh-TW")})
                            </span>
                            <span className="text-muted-foreground">
                              — {issueGroup.articles.length} 篇
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-5 space-y-1 pt-1">
                              {issueGroup.articles.map((article) => (
                                <Link
                                  key={article.id}
                                  href={`/admin/magazines/${article.issue.magazine.id}/issues/${article.issue.id}`}
                                  className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-muted transition-colors"
                                >
                                  <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
                                    {article.pageStart
                                      ? `p.${article.pageStart}${article.pageEnd && article.pageEnd !== article.pageStart ? `-${article.pageEnd}` : ""}`
                                      : ""}
                                  </span>
                                  <span className="flex-1 truncate">
                                    {article.title}
                                  </span>
                                  {article.category && (
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {article.category}
                                    </Badge>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
