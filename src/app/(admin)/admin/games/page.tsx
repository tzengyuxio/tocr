"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Edit, Trash2, Loader2, Gamepad2, Search } from "lucide-react";

interface Game {
  id: string;
  name: string;
  nameOriginal: string | null;
  nameEn: string | null;
  slug: string;
  releaseDate: string | null;
  platforms: string[];
  developer: string | null;
  publisher: string | null;
  genres: string[];
  coverImage: string | null;
  _count: {
    articleGames: number;
  };
}

const COMMON_PLATFORMS = ["PC", "PS5", "PS4", "Switch", "Xbox Series", "Xbox One", "iOS", "Android"];
const COMMON_GENRES = ["RPG", "動作", "冒險", "射擊", "模擬", "策略", "格鬥", "運動", "賽車", "音樂"];

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameOriginal: "",
    nameEn: "",
    slug: "",
    releaseDate: "",
    platforms: [] as string[],
    developer: "",
    publisher: "",
    genres: [] as string[],
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      const response = await fetch(`/api/games?${params}`);
      const data = await response.json();
      setGames(data.data);
    } catch (err) {
      console.error("Failed to fetch games:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchGames, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenCreate = () => {
    setEditingGame(null);
    setFormData({
      name: "",
      nameOriginal: "",
      nameEn: "",
      slug: "",
      releaseDate: "",
      platforms: [],
      developer: "",
      publisher: "",
      genres: [],
      description: "",
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
      slug: game.slug,
      releaseDate: game.releaseDate ? game.releaseDate.split("T")[0] : "",
      platforms: game.platforms,
      developer: game.developer || "",
      publisher: game.publisher || "",
      genres: game.genres,
      description: "",
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
              <CardDescription>共 {games.length} 款遊戲</CardDescription>
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
                  <TableRow key={game.id}>
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
                    <TableCell>{game._count.articleGames}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(game)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(game.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
    </div>
  );
}
