"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Loader2, Tags, Eye, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Tag {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  _count: {
    articleTags: number;
  };
}

const TAG_TYPES = [
  { value: "GENERAL", label: "一般" },
  { value: "PERSON", label: "人物" },
  { value: "EVENT", label: "活動" },
  { value: "SERIES", label: "系列" },
  { value: "COMPANY", label: "公司" },
  { value: "PLATFORM", label: "平台" },
];

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    type: "GENERAL",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTagId, setExpandedTagId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<{
    articleTags: {
      article: {
        id: string;
        title: string;
        category: string | null;
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
    _count: { articleTags: number };
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleToggleExpand = async (tagId: string) => {
    if (expandedTagId === tagId) {
      setExpandedTagId(null);
      setExpandedData(null);
      return;
    }
    setExpandedTagId(tagId);
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/tags/${tagId}`);
      const data = await res.json();
      setExpandedData(data);
    } catch {
      setExpandedData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (activeType !== "all") {
        params.set("type", activeType);
      }
      const response = await fetch(`/api/tags?${params}`);
      const data = await response.json();
      setTags(data.data);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [activeType]);

  const handleOpenCreate = () => {
    setEditingTag(null);
    setFormData({ name: "", slug: "", type: "GENERAL", description: "" });
    setError(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      type: tag.type,
      description: tag.description || "",
    });
    setError(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      setError("名稱和 Slug 為必填");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = editingTag ? `/api/tags/${editingTag.id}` : "/api/tags";
      const method = editingTag ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "操作失敗");
      }

      setIsDialogOpen(false);
      fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此標籤嗎？")) return;

    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("刪除失敗");
      }

      fetchTags();
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

  const getTypeLabel = (type: string) => {
    return TAG_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      GENERAL: "bg-gray-100 text-gray-800",
      PERSON: "bg-blue-100 text-blue-800",
      EVENT: "bg-purple-100 text-purple-800",
      SERIES: "bg-green-100 text-green-800",
      COMPANY: "bg-orange-100 text-orange-800",
      PLATFORM: "bg-cyan-100 text-cyan-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">標籤管理</h2>
          <p className="text-muted-foreground">管理文章標籤（人物、活動、系列等）</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          新增標籤
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>標籤列表</CardTitle>
          <CardDescription>共 {tags.length} 個標籤</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeType} onValueChange={setActiveType}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              {TAG_TYPES.map((type) => (
                <TabsTrigger key={type.value} value={type.value}>
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeType} className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Tags className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">尚無標籤資料</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    點擊「新增標籤」按鈕開始建立
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名稱</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>類型</TableHead>
                      <TableHead>文章數</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tag) => (
                      <React.Fragment key={tag.id}>
                      <TableRow>
                        <TableCell className="font-medium">{tag.name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {tag.slug}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(tag.type)}>
                            {getTypeLabel(tag.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-normal hover:underline"
                            onClick={() => handleToggleExpand(tag.id)}
                            title="展開預覽"
                          >
                            {tag._count.articleTags} 篇
                            <Eye className="ml-1 h-3 w-3" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="編輯標籤"
                              onClick={() => handleOpenEdit(tag)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="刪除標籤"
                              onClick={() => handleDelete(tag.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedTagId === tag.id && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-4">
                            {isLoadingPreview ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              </div>
                            ) : expandedData ? (
                              <div className="space-y-2">
                                {expandedData.articleTags.slice(0, 5).map((at) => (
                                  <div
                                    key={at.article.id}
                                    className="flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-muted"
                                  >
                                    <span className="shrink-0 text-muted-foreground">
                                      {at.article.issue.magazine.name}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground">›</span>
                                    <span className="shrink-0 text-muted-foreground">
                                      {at.article.issue.issueNumber}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground">›</span>
                                    <span className="flex-1 truncate font-medium">
                                      {at.article.title}
                                    </span>
                                    {at.article.category && (
                                      <Badge variant="outline" className="text-xs shrink-0">
                                        {at.article.category}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                                <div className="pt-2">
                                  <Button asChild variant="outline" size="sm">
                                    <Link href={`/admin/tags/${tag.id}`}>
                                      {expandedData._count.articleTags > 5
                                        ? `查看全部 ${expandedData._count.articleTags} 篇`
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
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 新增/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "編輯標籤" : "新增標籤"}</DialogTitle>
            <DialogDescription>
              {editingTag ? "修改標籤資訊" : "建立新的標籤"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: editingTag ? formData.slug : generateSlug(e.target.value),
                  });
                }}
                placeholder="標籤名稱"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="url-friendly-slug"
              />
              <p className="text-xs text-muted-foreground">
                用於 URL，只能包含小寫字母、數字、中文和連字號
              </p>
            </div>

            <div className="space-y-2">
              <Label>類型</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="標籤描述（選填）"
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
              {editingTag ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
