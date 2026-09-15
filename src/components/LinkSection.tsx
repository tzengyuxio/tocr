"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, ExternalLink as ExternalLinkIcon, Loader2, Trash2 } from "lucide-react";
import {
  EXTERNAL_SITE_VALUES,
  externalLinkLabel,
  type ExternalSite,
} from "@/lib/external-site";

export interface LinkRow {
  id: string;
  site: ExternalSite;
  url: string;
  label: string | null;
}

interface LinkSectionProps {
  /** 掛點，二擇一——與 ExternalLink 的資料模型一致。 */
  owner: { magazineId: string } | { issueId: string };
  links: LinkRow[];
  description: string;
}

/** 下拉選單上的字。與公開頁的顯示名稱同一份表，見 lib/external-site.ts。 */
const SITE_OPTION_LABEL: Record<ExternalSite, string> = {
  INTERNET_ARCHIVE: "Internet Archive",
  NOSTALIBRARY: "懷舊圖書館",
  NCL: "國家圖書館",
  WIKIPEDIA: "維基百科",
  OTHER: "其他（自己填名稱）",
};

/**
 * 站外資訊的編輯區：全本掃描、上游條目、書目紀錄。
 *
 * 與 PhotoSection 同一個手感——一條一列、改完即存、沒有「取消」。差別是這裡
 * 沒有上傳，新增靠下方那一行表單。
 */
export function LinkSection({ owner, links, description }: LinkSectionProps) {
  const router = useRouter();
  const [site, setSite] = useState<ExternalSite>("INTERNET_ARCHIVE");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...owner, site, url: url.trim(), label: label.trim() || null }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "新增失敗");
      }
      setUrl("");
      setLabel("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove(link: LinkRow) {
    if (!confirm(`確定刪除「${externalLinkLabel(link)}」這條連結？`)) return;
    setError(null);
    const response = await fetch(`/api/links/${link.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("刪除失敗");
      return;
    }
    router.refresh();
  }

  /** 上下移一格。一個掛點通常只有兩三條，拖曳的機械成本換不到什麼。 */
  async function move(index: number, by: -1 | 1) {
    const next = [...links];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setError(null);
    const response = await fetch("/api/links/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkIds: next.map((l) => l.id) }),
    });
    if (!response.ok) {
      setError("排序失敗");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>站外資訊</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {links.length > 0 && (
          <ul className="divide-y rounded-md border">
            {links.map((link, index) => (
              <li key={link.id} className="flex items-center gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {externalLinkLabel(link)}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="nofollow noopener"
                    className="block truncate text-xs text-muted-foreground hover:underline"
                  >
                    {link.url}
                  </a>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="上移"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="下移"
                  disabled={index === links.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="刪除"
                  onClick={() => remove(link)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label>站點</Label>
            <Select value={site} onValueChange={(value) => setSite(value as ExternalSite)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTERNAL_SITE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SITE_OPTION_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-url">網址</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://archive.org/details/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-label">顯示名稱</Label>
            <Input
              id="link-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                site === "OTHER"
                  ? "必填，例如：巴哈姆特收藏整理"
                  : "留空就用站點名稱"
              }
            />
          </div>
          <Button type="button" onClick={add} disabled={isSubmitting || !url.trim()}>
            {isSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            <ExternalLinkIcon className="mr-1 h-4 w-4" />
            新增連結
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
