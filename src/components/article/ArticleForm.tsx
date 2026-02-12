"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  articleUpdateSchema,
  type ArticleUpdateInput,
} from "@/lib/validators/article";
import { Loader2, X, Plus, Gamepad2, Tags, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getTagTypeColor, getTagTypeLabel } from "@/lib/tag-colors";

interface Game {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  type: string;
}

interface ArticleFormProps {
  articleId: string;
  issueId: string;
  magazineId: string;
  issueName: string;
  magazineName: string;
  initialData: {
    title: string;
    subtitle?: string | null;
    authors: string[];
    category?: string | null;
    pageStart?: number | null;
    pageEnd?: number | null;
    summary?: string | null;
    content?: string | null;
    sortOrder: number;
    articleGames?: Array<{
      game: { id: string; name: string };
      isPrimary: boolean;
    }>;
    articleTags?: Array<{
      tag: { id: string; name: string; type: string };
    }>;
  };
}

export function ArticleForm({
  articleId,
  issueId,
  magazineId,
  issueName,
  magazineName,
  initialData,
}: ArticleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authors, setAuthors] = useState<string[]>(initialData.authors || []);
  const [newAuthor, setNewAuthor] = useState("");

  // 遊戲與標籤狀態
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedGames, setSelectedGames] = useState<Game[]>(
    initialData.articleGames?.map((ag) => ag.game) || []
  );
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    initialData.articleTags?.map((at) => at.tag) || []
  );
  const [gameOpen, setGameOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [gameSearch, setGameSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ArticleUpdateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(articleUpdateSchema) as any,
    defaultValues: {
      title: initialData.title,
      subtitle: initialData.subtitle || "",
      category: initialData.category || "",
      pageStart: initialData.pageStart,
      pageEnd: initialData.pageEnd,
      summary: initialData.summary || "",
      content: initialData.content || "",
      sortOrder: initialData.sortOrder,
    },
  });

  // 載入遊戲和標籤列表
  const fetchGamesAndTags = useCallback(async () => {
    try {
      const [gamesRes, tagsRes] = await Promise.all([
        fetch("/api/games?limit=500"),
        fetch("/api/tags?limit=500"),
      ]);

      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setAllGames(gamesData.data || []);
      }
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setAllTags(tagsData.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch games/tags:", error);
    }
  }, []);

  useEffect(() => {
    fetchGamesAndTags();
  }, [fetchGamesAndTags]);

  const addAuthor = () => {
    const trimmed = newAuthor.trim();
    if (trimmed && !authors.includes(trimmed)) {
      setAuthors([...authors, trimmed]);
      setNewAuthor("");
    }
  };

  const removeAuthor = (author: string) => {
    setAuthors(authors.filter((a) => a !== author));
  };

  const toggleGame = (game: Game) => {
    setSelectedGames((prev) =>
      prev.some((g) => g.id === game.id)
        ? prev.filter((g) => g.id !== game.id)
        : [...prev, game]
    );
  };

  const toggleTag = (tag: Tag) => {
    setSelectedTags((prev) =>
      prev.some((t) => t.id === tag.id)
        ? prev.filter((t) => t.id !== tag.id)
        : [...prev, tag]
    );
  };

  const handleCreateTag = async (name: string) => {
    if (!name.trim() || isCreatingTag) return;
    setIsCreatingTag(true);
    try {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
        .replace(/^-|-$/g, "");
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: `${slug}-${Date.now()}`, type: "GENERAL" }),
      });
      if (res.ok) {
        const newTag = await res.json();
        setAllTags((prev) => [...prev, newTag]);
        setSelectedTags((prev) => [...prev, newTag]);
        setTagSearch("");
        toast.success(`標籤「${name}」已建立`);
      } else {
        const data = await res.json();
        toast.error(data.error || "建立標籤失敗");
      }
    } catch {
      toast.error("建立標籤失敗");
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleCreateGame = async (name: string) => {
    if (!name.trim() || isCreatingGame) return;
    setIsCreatingGame(true);
    try {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
        .replace(/^-|-$/g, "");
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: `${slug}-${Date.now()}` }),
      });
      if (res.ok) {
        const newGame = await res.json();
        setAllGames((prev) => [...prev, newGame]);
        setSelectedGames((prev) => [...prev, newGame]);
        setGameSearch("");
        toast.success(`遊戲「${name}」已建立`);
      } else {
        const data = await res.json();
        toast.error(data.error || "建立遊戲失敗");
      }
    } catch {
      toast.error("建立遊戲失敗");
    } finally {
      setIsCreatingGame(false);
    }
  };

  const onSubmit = async (data: ArticleUpdateInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          authors,
          gameIds: selectedGames.map((g) => g.id),
          tagIds: selectedTags.map((t) => t.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "更新失敗");
      }

      toast.success("文章已更新");
      router.push(`/admin/magazines/${magazineId}/issues/${issueId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("確定要刪除這篇文章嗎？此操作無法復原。")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("刪除失敗");
      }

      toast.success("文章已刪除");
      router.push(`/admin/magazines/${magazineId}/issues/${issueId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 過濾遊戲和標籤
  const filteredGames = allGames.filter((g) =>
    g.name.toLowerCase().includes(gameSearch.toLowerCase())
  );
  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Breadcrumb info */}
      <div className="text-sm text-muted-foreground">
        {magazineName} / {issueName}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>編輯文章</CardTitle>
          <CardDescription>修改文章的詳細資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 標題 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">
                標題 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="文章標題"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* 副標題 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="subtitle">副標題</Label>
              <Input
                id="subtitle"
                placeholder="副標題或說明文字"
                {...register("subtitle")}
              />
            </div>

            {/* 分類 */}
            <div className="space-y-2">
              <Label htmlFor="category">分類</Label>
              <Input
                id="category"
                placeholder="例如：評測、攻略、新聞"
                {...register("category")}
              />
            </div>

            {/* 排序 */}
            <div className="space-y-2">
              <Label htmlFor="sortOrder">排序</Label>
              <Input
                id="sortOrder"
                type="number"
                {...register("sortOrder")}
              />
            </div>

            {/* 起始頁碼 */}
            <div className="space-y-2">
              <Label htmlFor="pageStart">起始頁碼</Label>
              <Input
                id="pageStart"
                type="number"
                placeholder="例如：10"
                {...register("pageStart")}
              />
            </div>

            {/* 結束頁碼 */}
            <div className="space-y-2">
              <Label htmlFor="pageEnd">結束頁碼</Label>
              <Input
                id="pageEnd"
                type="number"
                placeholder="例如：15"
                {...register("pageEnd")}
              />
            </div>

            {/* 作者 */}
            <div className="space-y-2 md:col-span-2">
              <Label>作者</Label>
              <div className="mb-2 flex flex-wrap gap-2">
                {authors.map((author) => (
                  <Badge key={author} variant="secondary" className="gap-1">
                    {author}
                    <button
                      type="button"
                      onClick={() => removeAuthor(author)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="輸入作者名稱"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAuthor();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addAuthor}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 摘要 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="summary">摘要</Label>
              <Textarea
                id="summary"
                placeholder="文章摘要或簡介"
                rows={3}
                {...register("summary")}
              />
            </div>

            {/* 內容 */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="content">內容</Label>
              <Textarea
                id="content"
                placeholder="完整文章內容（選填）"
                rows={6}
                {...register("content")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 關聯遊戲 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gamepad2 className="h-4 w-4" />
            關聯遊戲
          </CardTitle>
          <CardDescription>選擇與此文章相關的遊戲</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedGames.map((game, index) => (
              <Badge
                key={game.id}
                variant={index === 0 ? "default" : "secondary"}
                className="gap-1"
              >
                {game.name}
                {index === 0 && " (主要)"}
                <button
                  type="button"
                  onClick={() => toggleGame(game)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Popover open={gameOpen} onOpenChange={setGameOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={gameOpen}
                className="w-full justify-between"
              >
                選擇遊戲...
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="搜尋遊戲..."
                  value={gameSearch}
                  onValueChange={setGameSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {gameSearch.trim() ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer"
                        onClick={() => handleCreateGame(gameSearch.trim())}
                        disabled={isCreatingGame}
                      >
                        {isCreatingGame ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        建立「{gameSearch.trim()}」
                      </button>
                    ) : (
                      "找不到遊戲"
                    )}
                  </CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {filteredGames.slice(0, 50).map((game) => (
                      <CommandItem
                        key={game.id}
                        value={game.name}
                        onSelect={() => toggleGame(game)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedGames.some((g) => g.id === game.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {game.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* 關聯標籤 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="h-4 w-4" />
            關聯標籤
          </CardTitle>
          <CardDescription>選擇與此文章相關的標籤</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge key={tag.id} className={cn("gap-1", getTagTypeColor(tag.type))}>
                {tag.name}
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Popover open={tagOpen} onOpenChange={setTagOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={tagOpen}
                className="w-full justify-between"
              >
                選擇標籤...
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="搜尋標籤..."
                  value={tagSearch}
                  onValueChange={setTagSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {tagSearch.trim() ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded cursor-pointer"
                        onClick={() => handleCreateTag(tagSearch.trim())}
                        disabled={isCreatingTag}
                      >
                        {isCreatingTag ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        建立「{tagSearch.trim()}」
                      </button>
                    ) : (
                      "找不到標籤"
                    )}
                  </CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {filteredTags.slice(0, 50).map((tag) => (
                      <CommandItem
                        key={tag.id}
                        value={tag.name}
                        onSelect={() => toggleTag(tag)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedTags.some((t) => t.id === tag.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {tag.name}
                        <Badge className={cn("ml-2 text-xs", getTagTypeColor(tag.type))}>
                          {getTagTypeLabel(tag.type)}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* 操作按鈕 */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          刪除文章
        </Button>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存變更
          </Button>
        </div>
      </div>
    </form>
  );
}
