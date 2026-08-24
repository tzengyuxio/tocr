"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Combobox } from "@/components/ui/combobox";
import { ImageUpload } from "@/components/ui/image-upload";
import { formatIssueNumber } from "@/lib/issue-number";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";

interface TitleRow {
  id: string;
  title: string;
  titleParallel: string | null;
  titleSource: string | null;
  startIssueId: string;
  logoImage: string | null;
  note: string | null;
}

interface IssueOption {
  id: string;
  issueNumber: string;
  order: number;
}

interface MagazineTitleSectionProps {
  magazineId: string;
  magazineName: string;
  titles: TitleRow[];
  /** 該雜誌全部的期，已依 order 升冪。 */
  issues: IssueOption[];
}

interface FormState {
  /** null = 新增。 */
  id: string | null;
  title: string;
  titleParallel: string;
  titleSource: string;
  startIssueId: string;
  logoImage: string;
  note: string;
}

/**
 * 刊名沿革的編輯區。沒改過名的雜誌就是一個空列表加一顆按鈕，編輯永遠不會碰它。
 *
 * 起訖期間是推導值：一段的終點就是下一段起點的前一期，所以這裡只選起始期，
 * 涵蓋範圍即時算給編輯看當確認回饋，不給填。
 */
export function MagazineTitleSection({
  magazineId,
  magazineName,
  titles,
  issues,
}: MagazineTitleSectionProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderOf = new Map(issues.map((issue) => [issue.id, issue.order]));
  const sorted = [...titles].sort(
    (a, b) => (orderOf.get(a.startIssueId) ?? 0) - (orderOf.get(b.startIssueId) ?? 0)
  );

  /** 這個起點到下一個起點前一期，涵蓋哪些期。draftId 排除正在編輯的那筆自己。 */
  function coverage(startIssueId: string, draftId: string | null) {
    const start = orderOf.get(startIssueId);
    if (start === undefined) return null;
    const nextStarts = sorted
      .filter((t) => t.id !== draftId)
      .map((t) => orderOf.get(t.startIssueId) ?? 0)
      .filter((order) => order > start);
    const end = nextStarts.length ? Math.min(...nextStarts) : Infinity;
    const covered = issues.filter((i) => i.order >= start && i.order < end);
    if (covered.length === 0) return null;
    const first = formatIssueNumber(covered[0].issueNumber);
    const last = formatIssueNumber(covered[covered.length - 1].issueNumber);
    return {
      label: first === last ? first : `${first} － ${last}`,
      count: covered.length,
    };
  }

  function startAdd() {
    setError(null);
    setForm({
      id: null,
      // 第一筆預帶「通行名＋第一期」，引導把第一段建齊——通行名不一定等於
      // 首段名（電視遊樂報導的首段叫電視遊樂情報），帶進來讓編輯改。
      title: titles.length === 0 ? magazineName : "",
      titleParallel: "",
      titleSource: "",
      startIssueId: titles.length === 0 && issues.length > 0 ? issues[0].id : "",
      logoImage: "",
      note: "",
    });
  }

  function startEdit(row: TitleRow) {
    setError(null);
    setForm({
      id: row.id,
      title: row.title,
      titleParallel: row.titleParallel ?? "",
      titleSource: row.titleSource ?? "",
      startIssueId: row.startIssueId,
      logoImage: row.logoImage ?? "",
      note: row.note ?? "",
    });
  }

  async function submit() {
    if (!form) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const url = form.id
        ? `/api/magazines/${magazineId}/titles/${form.id}`
        : `/api/magazines/${magazineId}/titles`;
      const response = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          titleParallel: form.titleParallel || null,
          titleSource: form.titleSource || null,
          startIssueId: form.startIssueId,
          logoImage: form.logoImage || null,
          note: form.note || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "儲存失敗");
      }
      setForm(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove(row: TitleRow) {
    if (!confirm(`確定刪除刊名時期「${row.title}」？`)) return;
    setError(null);
    const response = await fetch(
      `/api/magazines/${magazineId}/titles/${row.id}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error || "刪除失敗");
      return;
    }
    router.refresh();
  }

  const draftCoverage =
    form?.startIssueId ? coverage(form.startIssueId, form.id) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>刊名沿革</CardTitle>
        <CardDescription>
          改過名的雜誌才需要：每個刊名時期一筆，只記從哪一期起用這個名字，
          期間與期數自動推導。判準見 docs/data-conventions.md。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {sorted.length > 0 && (
          <ul className="divide-y rounded-md border">
            {sorted.map((row) => {
              const range = coverage(row.startIssueId, null);
              return (
                <li key={row.id} className="flex items-center gap-3 p-3">
                  {row.logoImage && (
                    <Image
                      src={row.logoImage}
                      alt={row.title}
                      width={112}
                      height={40}
                      unoptimized
                      className="h-8 w-20 shrink-0 rounded object-contain"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {range
                        ? `${range.label}（${range.count} 期）`
                        : "起始期已不存在"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(row)}
                    title="編輯"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(row)}
                    title="刪除"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {form ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="space-y-1.5">
              <Label htmlFor="period-title">刊名 *</Label>
              <Input
                id="period-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="這個時期封面上的刊名"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-title-parallel">並列刊名</Label>
              <Input
                id="period-title-parallel"
                value={form.titleParallel}
                onChange={(e) =>
                  setForm({ ...form, titleParallel: e.target.value })
                }
                placeholder="這個時期的另一語言刊名，如 GAME fans"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-title-source">原刊刊名</Label>
              <Input
                id="period-title-source"
                value={form.titleSource}
                onChange={(e) =>
                  setForm({ ...form, titleSource: e.target.value })
                }
                placeholder="這個時期對應的外刊，如 ファミ通PS+"
              />
            </div>
            <div className="space-y-1.5">
              <Label>起始期 *</Label>
              {/* Combobox 而不是 Select：一本雜誌動輒兩百期，原生下拉會長成
                  跨整個螢幕的列表；這個是固定高度內捲動，上方還有過濾框。 */}
              <Combobox
                options={issues.map((issue) => ({
                  value: issue.id,
                  label: formatIssueNumber(issue.issueNumber),
                }))}
                value={form.startIssueId}
                onValueChange={(value) =>
                  setForm({ ...form, startIssueId: value })
                }
                placeholder="從哪一期起用這個刊名"
                searchPlaceholder="輸入期號過濾…"
                emptyMessage="沒有符合的期"
              />
              {draftCoverage && (
                <p className="text-xs text-muted-foreground">
                  此時期涵蓋 {draftCoverage.label}（{draftCoverage.count} 期）
                </p>
              )}
            </div>
            <ImageUpload
              value={form.logoImage}
              onChange={(url) => setForm({ ...form, logoImage: url })}
              folder="magazines"
              label="這個時期的刊頭"
              description="留空時沿用雜誌的刊頭"
            />
            <div className="space-y-1.5">
              <Label htmlFor="period-note">備註</Label>
              <Textarea
                id="period-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="判定依據與封面照錄，如「封面標示『革新一號（124期）』」"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={submit}
                disabled={isSubmitting || !form.title || !form.startIssueId}
              >
                {isSubmitting && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                {form.id ? "儲存" : "新增"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(null)}
                disabled={isSubmitting}
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={startAdd}
            disabled={issues.length === 0}
          >
            新增時期
          </Button>
        )}
        {issues.length === 0 && !form && (
          <p className="text-xs text-muted-foreground">
            要先有單期資料才能建立刊名時期（起點是選既有的期）。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
