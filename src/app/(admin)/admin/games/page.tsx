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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Loader2, Gamepad2, Search, Eye, ExternalLink, GitMerge } from "lucide-react";
import Link from "next/link";
import type { ArticleCategory } from "@/lib/article-categories";
import { CategoryChip } from "@/components/chips";
import { ListPager } from "@/components/admin/ListPager";
import { MergeGameDialog } from "@/components/admin/MergeGameDialog";
import { GAME_SORTS, type GameDirection } from "@/lib/game-browse";
import { formatIssueNumber } from "@/lib/issue-number";

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

// Hidden unless the deployment has a RAWG key: without one the button can only
// ever fail. next.config.ts derives this from RAWG_API_KEY.
const RAWG_ENABLED = process.env.NEXT_PUBLIC_RAWG_ENABLED === "true";

const COMMON_PLATFORMS = ["PC", "PS5", "PS4", "Switch", "Xbox Series", "Xbox One", "iOS", "Android"];
const COMMON_GENRES = ["RPG", "動作", "冒險", "射擊", "模擬", "策略", "格鬥", "運動", "賽車", "音樂"];

const PAGE_SIZE = 20;

/**
 * 排序選項攤平成一個下拉。
 *
 * 公開索引把「排序」與「方向」分成兩個控制項（點目前這個就反轉），後台這裡只有
 * 四種組合，攤平成單一下拉少一個控制項，也不必再寫一次「反轉之後會變怎樣」的提示。
 * 名目仍取自 `game-browse.ts`，措辭沿用那邊的「由前往後／多到少」。
 */
const SORT_OPTIONS = GAME_SORTS.flatMap((sort) =>
  (["asc", "desc"] as const).map((direction) => ({
    value: `${sort.value}:${direction}`,
    label:
      sort.value === "articles"
        ? `文章數（${direction === "desc" ? "多到少" : "少到多"}）`
        : `名稱（${direction === "asc" ? "由前往後" : "由後往前"}）`,
  }))
);

const DEFAULT_SORT = "name:asc";

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortOption, setSortOption] = useState(DEFAULT_SORT);
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
          publishDate: string | null;
          magazine: { id: string; name: string };
        };
      };
    }[];
    _count: { articleGames: number };
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  // 合併重複條目
  const [mergeSource, setMergeSource] = useState<Game | null>(null);

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
      if (platformFilter !== "all") {
        params.set("platform", platformFilter);
      }
      if (genreFilter !== "all") {
        params.set("genre", genreFilter);
      }
      const [sort, direction] = sortOption.split(":");
      params.set("sort", sort);
      params.set("direction", direction as GameDirection);
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
  }, [debouncedSearch, platformFilter, genreFilter, sortOption, page]);

  // 打字要等使用者停手，翻頁不必——debounce 掛在關鍵字上而不是整個查詢，
  // 按下一頁才會立刻有反應。
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isFiltered =
    debouncedSearch !== "" || platformFilter !== "all" || genreFilter !== "all";

  // 在第 5 頁換關鍵字，新的結果多半沒有第 5 頁，留在原頁只會看到空白。
  // 篩選與排序同理——換了排序，第 5 頁講的已經是別的東西。
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, platformFilter, genreFilter, sortOption]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>遊戲列表</CardTitle>
              <CardDescription>共 {total} 款遊戲</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* 選項沿用新增／編輯表單的那兩份清單：能挑的就是能篩的。
                  辨識寫入的遊戲可能帶著清單外的平台或類型，那種只能靠關鍵字找。 */}
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="全部平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部平台</SelectItem>
                  {COMMON_PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="全部類型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部類型</SelectItem>
                  {COMMON_GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {/* 篩掉之後的空白不是「還沒有資料」，是這組條件挑不到。
                  兩句話混用會讓人以為資料不見了。 */}
              {isFiltered ? (
                <>
                  <h3 className="mt-4 text-lg font-semibold">沒有符合條件的遊戲</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    換個關鍵字，或把平台與類型調回「全部」
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-4 text-lg font-semibold">尚無遊戲資料</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    點擊「新增遊戲」按鈕開始建立
                  </p>
                </>
              )}
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
                          onClick={() => setMergeSource(game)}
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
                                  {formatIssueNumber(ag.article.issue.issueNumber)}
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

      <MergeGameDialog
        source={mergeSource}
        onClose={() => setMergeSource(null)}
        onMerged={fetchGames}
      />
    </div>
  );
}
