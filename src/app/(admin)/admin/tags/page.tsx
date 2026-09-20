"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Loader2, Tags, Eye, ExternalLink } from "lucide-react";
import Link from "next/link";
import { TAG_TYPES } from "@/lib/tag-colors";
import type { ArticleCategory } from "@/lib/article-categories";
import { CategoryChip, TagTypeChip } from "@/components/chips";
import { ListPager } from "@/components/admin/ListPager";
import { TagForm } from "@/components/tag/TagForm";
import { formatIssueNumber } from "@/lib/issue-number";

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

const PAGE_SIZE = 50;

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [expandedTagId, setExpandedTagId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<{
    articleTags: {
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

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (activeType !== "all") {
        params.set("type", activeType);
      }
      const response = await fetch(`/api/tags?${params}`);
      const data = await response.json();
      setTags(data.data);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeType, page]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

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



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">標籤管理</h2>
          <p className="text-muted-foreground">管理文章標籤（人物、活動、系列等）</p>
        </div>
        <Button
          onClick={() => {
            setEditingTag(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          新增標籤
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>標籤列表</CardTitle>
          <CardDescription>共 {total} 個標籤</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 換類型等於換一份清單，第 4 頁的位置在新清單上多半是空的 */}
          <Tabs
            value={activeType}
            onValueChange={(value) => {
              setActiveType(value);
              setPage(1);
            }}
          >
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
                <>
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
                          <TagTypeChip type={tag.type} />
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
                              onClick={() => {
                                setEditingTag(tag);
                                setIsDialogOpen(true);
                              }}
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
                                      {formatIssueNumber(at.article.issue.issueNumber)}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground">›</span>
                                    <span className="flex-1 truncate font-medium">
                                      {at.article.title}
                                    </span>
                                    {at.article.category && (
                                      <CategoryChip
                                        category={at.article.category}
                                        className="shrink-0 text-xs"
                                      />
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

                <ListPager page={page} totalPages={totalPages} onPage={setPage} />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 新增/編輯對話框 */}
      {/* 新增／編輯對話框。表單是 <TagForm>，與 /admin/tags/[id] 同一個元件。
          key 讓每次換一筆就重新掛載——欄位值是 useState 初始化的。 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "編輯標籤" : "新增標籤"}</DialogTitle>
            <DialogDescription>
              {editingTag ? "修改標籤資訊" : "建立新的標籤"}
            </DialogDescription>
          </DialogHeader>
          <TagForm
            key={editingTag?.id ?? "new"}
            mode={editingTag ? "edit" : "create"}
            tagId={editingTag?.id}
            initialData={
              editingTag
                ? {
                    name: editingTag.name,
                    slug: editingTag.slug,
                    type: editingTag.type,
                    description: editingTag.description ?? "",
                  }
                : undefined
            }
            variant="dialog"
            onSaved={() => {
              setIsDialogOpen(false);
              fetchTags();
            }}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
