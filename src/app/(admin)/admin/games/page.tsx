"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CommaListInput,
  formatStringList,
  parseStringList,
} from "@/components/ui/comma-list-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2, Gamepad2, Search, Eye, ExternalLink, GitMerge, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { ArticleCategory } from "@/lib/article-categories";
import { CategoryChip } from "@/components/chips";
import { ListPager } from "@/components/admin/ListPager";
import { suggestKeeper } from "@/lib/merge-game";

interface Game {
  id: string;
  name: string;
  nameOriginal: string | null;
  nameEn: string | null;
  aliases: string[];
  slug: string;
  releaseDate: string | null;
  platforms: string[];
  developer: string | null;
  publisher: string | null;
  genres: string[];
  coverImage: string | null;
  createdAt: string;
  _count: {
    articleGames: number;
  };
}

/** What POST /api/games/[id]/merge reports, applied or as a dry run. */
interface MergePlan {
  keeperId: string;
  loserId: string;
  keeperName: string;
  loserName: string;
  movedArticleLinks: number;
  discardedLinkCount: number;
  promotedPrimaryLinks: number;
  mergedAliases: string[];
}

// Hidden unless the deployment has a RAWG key: without one the button can only
// ever fail. next.config.ts derives this from RAWG_API_KEY.
const RAWG_ENABLED = process.env.NEXT_PUBLIC_RAWG_ENABLED === "true";

const COMMON_PLATFORMS = ["PC", "PS5", "PS4", "Switch", "Xbox Series", "Xbox One", "iOS", "Android"];
const COMMON_GENRES = ["RPG", "動作", "冒險", "射擊", "模擬", "策略", "格鬥", "運動", "賽車", "音樂"];

const PAGE_SIZE = 20;

/**
 * 開啟合併時預填的關鍵字。
 *
 * 兩筆重複的名字必然相近，但差的那個字往往在後半（1990世界杯／1990世界盃），
 * 所以拿整個名稱去搜只會撈到自己。取前半——兩邊共有的那段——才問得出對方。
 */
function mergeSeed(name: string): string {
  return name.slice(0, Math.max(2, Math.ceil(name.length / 2)));
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameOriginal: "",
    nameEn: "",
    aliases: [] as string[],
    slug: "",
    releaseDate: "",
    platforms: [] as string[],
    developer: "",
    publisher: "",
    genres: [] as string[],
    description: "",
    coverImage: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<{
    articleGames: {
      article: {
        id: string;
        title: string;
        category: ArticleCategory | null;
        pageStart: number | null;
        pageEnd: number | null;
        issue: {
          id: string;
          issueNumber: string;
          publishDate: string;
          magazine: { id: string; name: string };
        };
      };
    }[];
    _count: { articleGames: number };
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  // 合併重複條目
  const [mergeSource, setMergeSource] = useState<Game | null>(null);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeResults, setMergeResults] = useState<Game[]>([]);
  const [isSearchingPartner, setIsSearchingPartner] = useState(false);
  const [mergePartner, setMergePartner] = useState<Game | null>(null);
  const [keeperId, setKeeperId] = useState<string | null>(null);
  const [mergePlan, setMergePlan] = useState<MergePlan | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const handleToggleExpand = async (gameId: string) => {
    if (expandedGameId === gameId) {
      setExpandedGameId(null);
      setExpandedData(null);
      return;
    }
    setExpandedGameId(gameId);
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/games/${gameId}`);
      const data = await res.json();
      setExpandedData(data);
    } catch {
      setExpandedData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      const response = await fetch(`/api/games?${params}`);
      const data = await response.json();
      setGames(data.data);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to fetch games:", err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page]);

  // 打字要等使用者停手，翻頁不必——debounce 掛在關鍵字上而不是整個查詢，
  // 按下一頁才會立刻有反應。
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 在第 5 頁換關鍵字，新的結果多半沒有第 5 頁，留在原頁只會看到空白。
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const requestMerge = useCallback(
    async (keeper: string, loser: string, dryRun: boolean) => {
      const response = await fetch(`/api/games/${keeper}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loserId: loser, dryRun }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "合併失敗");
      }
      return data as MergePlan;
    },
    []
  );

  // 候選清單。合併對象可能在別的分頁上，所以這裡查的是整個資料庫，不是目前這頁。
  useEffect(() => {
    if (!mergeSource) return;
    const keyword = mergeSearch.trim();
    if (!keyword) {
      setMergeResults([]);
      return;
    }
    let cancelled = false;
    setIsSearchingPartner(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: keyword, limit: "10" });
        const response = await fetch(`/api/games?${params}`);
        const data = await response.json();
        if (cancelled) return;
        setMergeResults(
          (data.data as Game[]).filter((candidate) => candidate.id !== mergeSource.id)
        );
      } catch {
        if (!cancelled) setMergeResults([]);
      } finally {
        if (!cancelled) setIsSearchingPartner(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mergeSearch, mergeSource]);

  // 刪掉的那筆救不回來，所以確認之前先讓伺服器算一遍會發生什麼事。
  useEffect(() => {
    if (!mergeSource || !mergePartner || !keeperId) {
      setMergePlan(null);
      return;
    }
    const loserId = keeperId === mergeSource.id ? mergePartner.id : mergeSource.id;
    let cancelled = false;
    requestMerge(keeperId, loserId, true)
      .then((plan) => {
        if (!cancelled) setMergePlan(plan);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setMergePlan(null);
          setMergeError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mergeSource, mergePartner, keeperId, requestMerge]);

  const handleOpenCreate = () => {
    setEditingGame(null);
    setFormData({
      name: "",
      nameOriginal: "",
      nameEn: "",
      aliases: [],
      slug: "",
      releaseDate: "",
      platforms: [],
      developer: "",
      publisher: "",
      genres: [],
      description: "",
      coverImage: "",
    });
    setError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      name: game.name,
      nameOriginal: game.nameOriginal || "",
      nameEn: game.nameEn || "",
      aliases: game.aliases,
      slug: game.slug,
      releaseDate: game.releaseDate ? game.releaseDate.split("T")[0] : "",
      platforms: game.platforms,
      developer: game.developer || "",
      publisher: game.publisher || "",
      genres: game.genres,
      description: "",
      coverImage: game.coverImage || "",
    });
    setError(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      setError("遊戲名稱和 Slug 為必填");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = editingGame ? `/api/games/${editingGame.id}` : "/api/games";
      const method = editingGame ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          releaseDate: formData.releaseDate || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "操作失敗");
      }

      setIsDialogOpen(false);
      fetchGames();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此遊戲嗎？")) return;

    try {
      const response = await fetch(`/api/games/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("刪除失敗");
      }

      fetchGames();
    } catch (err) {
      alert(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const handleOpenMerge = (game: Game) => {
    setMergeSource(game);
    setMergeSearch(mergeSeed(game.name));
    setMergeResults([]);
    setMergePartner(null);
    setKeeperId(null);
    setMergePlan(null);
    setMergeError(null);
  };

  const handlePickPartner = (partner: Game) => {
    setMergePartner(partner);
    setMergeError(null);
    setKeeperId(
      suggestKeeper(
        { id: mergeSource!.id, createdAt: new Date(mergeSource!.createdAt), articleCount: mergeSource!._count.articleGames },
        { id: partner.id, createdAt: new Date(partner.createdAt), articleCount: partner._count.articleGames }
      ).id
    );
  };

  const handleConfirmMerge = async () => {
    if (!mergeSource || !mergePartner || !keeperId) return;
    const loserId = keeperId === mergeSource.id ? mergePartner.id : mergeSource.id;

    setIsMerging(true);
    setMergeError(null);
    try {
      await requestMerge(keeperId, loserId, false);
      setMergeSource(null);
      fetchGames();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "合併失敗");
    } finally {
      setIsMerging(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const toggleGenre = (genre: string) => {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const handleFetchCover = async () => {
    if (!formData.name.trim()) return;
    setIsFetchingCover(true);
    try {
      const res = await fetch("/api/games/search-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // 沒有這個分支時，非 2xx 只會讓 spinner 停下、畫面毫無變化
        setError(data?.error ? `抓取封面失敗：${data.error}` : "抓取封面失敗");
        return;
      }
      if (data?.coverImage) {
        setFormData((prev) => ({ ...prev, coverImage: data.coverImage }));
      } else {
        setError("RAWG 找不到此遊戲的封面");
      }
    } catch {
      setError("抓取封面失敗");
    } finally {
      setIsFetchingCover(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">遊戲管理</h2>
          <p className="text-muted-foreground">管理遊戲資料庫</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新增遊戲
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>遊戲列表</CardTitle>
              <CardDescription>共 {total} 款遊戲</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜尋遊戲..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gamepad2 className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">尚無遊戲資料</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                點擊「新增遊戲」按鈕開始建立
              </p>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>遊戲名稱</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>類型</TableHead>
                  <TableHead>開發商</TableHead>
                  <TableHead>文章數</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <Fragment key={game.id}>
                  <TableRow>
                    <TableCell>
                      <div>
                        <div className="font-medium">{game.name}</div>
                        {(game.nameOriginal || game.nameEn) && (
                          <div className="text-sm text-muted-foreground">
                            {game.nameOriginal || game.nameEn}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {game.platforms.slice(0, 3).map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                        {game.platforms.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{game.platforms.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {game.genres.slice(0, 2).map((g) => (
                          <Badge key={g} variant="secondary" className="text-xs">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{game.developer || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-normal hover:underline"
                        onClick={() => handleToggleExpand(game.id)}
                        title="展開預覽"
                      >
                        {game._count.articleGames} 篇
                        <Eye className="ml-1 h-3 w-3" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="編輯遊戲"
                          onClick={() => handleOpenEdit(game)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="合併重複條目"
                          onClick={() => handleOpenMerge(game)}
                        >
                          <GitMerge className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="刪除遊戲"
                          onClick={() => handleDelete(game.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedGameId === game.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-4">
                        {isLoadingPreview ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : expandedData ? (
                          <div className="space-y-2">
                            {expandedData.articleGames.slice(0, 5).map((ag) => (
                              <div
                                key={ag.article.id}
                                className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-muted"
                              >
                                <span className="shrink-0 text-muted-foreground">
                                  {ag.article.issue.magazine.name}
                                </span>
                                <span className="shrink-0 text-muted-foreground">›</span>
                                <span className="shrink-0 text-muted-foreground">
                                  {ag.article.issue.issueNumber}
                                </span>
                                <span className="shrink-0 text-muted-foreground">›</span>
                                <span className="flex-1 truncate font-medium">
                                  {ag.article.title}
                                </span>
                                {ag.article.category && (
                                  <CategoryChip
                                    category={ag.article.category}
                                    className="shrink-0 text-xs"
                                  />
                                )}
                              </div>
                            ))}
                            <div className="pt-2">
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/admin/games/${game.id}`}>
                                  {expandedData._count.articleGames > 5
                                    ? `查看全部 ${expandedData._count.articleGames} 篇`
                                    : "查看完整頁面"}
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">載入失敗</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>

            <ListPager page={page} totalPages={totalPages} onPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* 新增/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGame ? "編輯遊戲" : "新增遊戲"}</DialogTitle>
            <DialogDescription>
              {editingGame ? "修改遊戲資訊" : "建立新的遊戲資料"}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>遊戲名稱 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: editingGame
                        ? formData.slug
                        : generateSlug(e.target.value),
                    });
                  }}
                  placeholder="中文名稱"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="url-slug"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>原文名稱</Label>
                <Input
                  value={formData.nameOriginal}
                  onChange={(e) =>
                    setFormData({ ...formData, nameOriginal: e.target.value })
                  }
                  placeholder="日文或其他原文名稱"
                />
              </div>
              <div className="space-y-2">
                <Label>英文名稱</Label>
                <Input
                  value={formData.nameEn}
                  onChange={(e) =>
                    setFormData({ ...formData, nameEn: e.target.value })
                  }
                  placeholder="English Name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>別名</Label>
              <CommaListInput
                value={formData.aliases}
                format={formatStringList}
                parse={parseStringList}
                onChange={(aliases) => setFormData({ ...formData, aliases })}
                placeholder="以逗號分隔（例如：竹籬笆外的春天）"
              />
              <p className="text-xs text-muted-foreground">
                同一款的其他中文譯名，以及加了消歧義後綴之後空出來的裸名。搜尋會一併比對
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>發售日期</Label>
                <Input
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, releaseDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>開發商</Label>
                <Input
                  value={formData.developer}
                  onChange={(e) =>
                    setFormData({ ...formData, developer: e.target.value })
                  }
                  placeholder="Developer"
                />
              </div>
              <div className="space-y-2">
                <Label>發行商</Label>
                <Input
                  value={formData.publisher}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                  placeholder="Publisher"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>平台</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_PLATFORMS.map((platform) => (
                  <Badge
                    key={platform}
                    variant={
                      formData.platforms.includes(platform)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>類型</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_GENRES.map((genre) => (
                  <Badge
                    key={genre}
                    variant={
                      formData.genres.includes(genre) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="遊戲簡介（選填）"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>封面圖片</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.coverImage}
                  onChange={(e) =>
                    setFormData({ ...formData, coverImage: e.target.value })
                  }
                  placeholder="封面圖片 URL"
                  className="flex-1"
                />
                {RAWG_ENABLED && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchCover}
                    disabled={isFetchingCover || !formData.name.trim()}
                  >
                    {isFetchingCover ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    從 RAWG 抓取
                  </Button>
                )}
              </div>
              {formData.coverImage && (
                // The cover URL can point at RAWG, which is not in the
                // remotePatterns allowlist next/image enforces.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={formData.coverImage}
                  alt="Cover preview"
                  className="mt-2 aspect-video w-full rounded-lg object-cover"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingGame ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 合併重複條目 */}
      <Dialog
        open={mergeSource !== null}
        onOpenChange={(open) => {
          if (!open) setMergeSource(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>合併重複條目</DialogTitle>
            <DialogDescription>
              目前這筆：{mergeSource?.name}（{mergeSource?._count.articleGames} 篇）
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label>找出重複的那一筆</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="輸入遊戲名稱"
                  value={mergeSearch}
                  onChange={(e) => {
                    setMergeSearch(e.target.value);
                    setMergePartner(null);
                    setKeeperId(null);
                  }}
                />
              </div>
              {isSearchingPartner ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : mergeResults.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  {mergeSearch.trim() ? "沒有其他符合的條目" : "輸入關鍵字開始搜尋"}
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {mergeResults.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handlePickPartner(candidate)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${
                        mergePartner?.id === candidate.id ? "bg-muted" : ""
                      }`}
                    >
                      <span className="flex-1 truncate font-medium">{candidate.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {candidate._count.articleGames} 篇
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {mergeSource && mergePartner && (
              <div className="space-y-2">
                <Label>保留哪一筆？</Label>
                <div className="space-y-1">
                  {[mergeSource, mergePartner].map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="radio"
                        name="merge-keeper"
                        checked={keeperId === option.id}
                        onChange={() => setKeeperId(option.id)}
                      />
                      <span className="font-medium">{option.name}</span>
                      <span className="text-muted-foreground">
                        （{option._count.articleGames} 篇）
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {mergePlan && (
              <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
                <p>
                  搬移 {mergePlan.movedArticleLinks} 筆文章關聯
                  {mergePlan.discardedLinkCount > 0 &&
                    `，${mergePlan.discardedLinkCount} 筆重複丟棄`}
                </p>
                {mergePlan.promotedPrimaryLinks > 0 && (
                  <p>
                    {mergePlan.promotedPrimaryLinks} 篇文章的主要遊戲改記在保留方
                  </p>
                )}
                <p className="text-muted-foreground">
                  合併後別名：{mergePlan.mergedAliases.join("、") || "（無）"}
                </p>
                <p className="flex items-start gap-1.5 pt-1 text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>「{mergePlan.loserName}」將被刪除，無法復原</span>
                </p>
              </div>
            )}

            {mergeError && <p className="text-sm text-destructive">{mergeError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMergeSource(null)}
              disabled={isMerging}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmMerge}
              disabled={isMerging || !mergePlan}
            >
              {isMerging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              確認合併
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
