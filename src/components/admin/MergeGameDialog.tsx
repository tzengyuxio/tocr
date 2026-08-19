"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { suggestKeeper } from "@/lib/merge-game";

/**
 * 合併重複的遊戲條目。
 *
 * 判準與後端邏輯在 src/lib/merge-game.ts，這裡只負責問完三件事再送出：
 * 對方是誰、保留哪一筆、以及確認前先看一遍會搬走什麼。
 */

/** 合併只認得這幾欄；遊戲列表那份完整的 Game 結構上也吻合。 */
export interface MergeCandidate {
  id: string;
  name: string;
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

/**
 * 開啟合併時預填的關鍵字。
 *
 * 兩筆重複的名字必然相近，但差的那個字往往在後半（1990世界杯／1990世界盃），
 * 所以拿整個名稱去搜只會撈到自己。取前半——兩邊共有的那段——才問得出對方。
 */
function mergeSeed(name: string): string {
  return name.slice(0, Math.max(2, Math.ceil(name.length / 2)));
}

export function MergeGameDialog({
  source,
  onClose,
  onMerged,
}: {
  /** 從哪一筆開始合併；null 代表對話框關著。 */
  source: MergeCandidate | null;
  onClose: () => void;
  /** 合併成功後通知呼叫端重讀清單——那邊少了一筆。 */
  onMerged: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<MergeCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [partner, setPartner] = useState<MergeCandidate | null>(null);
  const [keeperId, setKeeperId] = useState<string | null>(null);
  const [plan, setPlan] = useState<MergePlan | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 換一筆來源等於重問一次，上一輪的候選與預覽都不再作數。
  useEffect(() => {
    if (!source) return;
    setSearch(mergeSeed(source.name));
    setResults([]);
    setPartner(null);
    setKeeperId(null);
    setPlan(null);
    setError(null);
  }, [source]);

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
    if (!source) return;
    const keyword = search.trim();
    if (!keyword) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: keyword, limit: "10" });
        const response = await fetch(`/api/games?${params}`);
        const data = await response.json();
        if (cancelled) return;
        setResults(
          (data.data as MergeCandidate[]).filter(
            (candidate) => candidate.id !== source.id
          )
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, source]);

  // 刪掉的那筆救不回來，所以確認之前先讓伺服器算一遍會發生什麼事。
  useEffect(() => {
    if (!source || !partner || !keeperId) {
      setPlan(null);
      return;
    }
    const loserId = keeperId === source.id ? partner.id : source.id;
    let cancelled = false;
    requestMerge(keeperId, loserId, true)
      .then((dryRun) => {
        if (!cancelled) setPlan(dryRun);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setPlan(null);
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source, partner, keeperId, requestMerge]);

  const handlePickPartner = (candidate: MergeCandidate) => {
    if (!source) return;
    setPartner(candidate);
    setError(null);
    setKeeperId(
      suggestKeeper(
        {
          id: source.id,
          createdAt: new Date(source.createdAt),
          articleCount: source._count.articleGames,
        },
        {
          id: candidate.id,
          createdAt: new Date(candidate.createdAt),
          articleCount: candidate._count.articleGames,
        }
      ).id
    );
  };

  const handleConfirm = async () => {
    if (!source || !partner || !keeperId) return;
    const loserId = keeperId === source.id ? partner.id : source.id;

    setIsMerging(true);
    setError(null);
    try {
      await requestMerge(keeperId, loserId, false);
      onClose();
      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "合併失敗");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Dialog
      open={source !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>合併重複條目</DialogTitle>
          <DialogDescription>
            目前這筆：{source?.name}（{source?._count.articleGames} 篇）
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
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPartner(null);
                  setKeeperId(null);
                }}
              />
            </div>
            {isSearching ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                {search.trim() ? "沒有其他符合的條目" : "輸入關鍵字開始搜尋"}
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {results.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => handlePickPartner(candidate)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${
                      partner?.id === candidate.id ? "bg-muted" : ""
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

          {source && partner && (
            <div className="space-y-2">
              <Label>保留哪一筆？</Label>
              <div className="space-y-1">
                {[source, partner].map((option) => (
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

          {plan && (
            <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
              <p>
                搬移 {plan.movedArticleLinks} 筆文章關聯
                {plan.discardedLinkCount > 0 &&
                  `，${plan.discardedLinkCount} 筆重複丟棄`}
              </p>
              {plan.promotedPrimaryLinks > 0 && (
                <p>
                  {plan.promotedPrimaryLinks} 篇文章的主要遊戲改記在保留方
                </p>
              )}
              <p className="text-muted-foreground">
                合併後別名：{plan.mergedAliases.join("、") || "（無）"}
              </p>
              <p className="flex items-start gap-1.5 pt-1 text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>「{plan.loserName}」將被刪除，無法復原</span>
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMerging}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isMerging || !plan}>
            {isMerging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認合併
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
