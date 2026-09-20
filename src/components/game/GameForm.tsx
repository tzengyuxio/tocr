"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  CommaListInput,
  formatStringList,
  parseStringList,
} from "@/components/ui/comma-list-input";
import { Loader2 } from "lucide-react";
import { PLATFORM_FAMILIES } from "@/lib/game-platforms";
import { slugify } from "@/lib/slugify";
import type { CoverCandidate } from "@/app/api/games/search-cover/route";
import { cn } from "@/lib/utils";

// Hidden unless the deployment has a RAWG key: without one the button can only
// ever fail. next.config.ts derives this from RAWG_API_KEY.
const RAWG_ENABLED = process.env.NEXT_PUBLIC_RAWG_ENABLED === "true";

/**
 * 平台清單取自 `game-platforms.ts` 的正本代號表，照家族分組排：代號有四十個，
 * 一整片沒有分隔的籌碼要一顆一顆讀，分了組之後「先找廠商、再找機型」兩步就到。
 */
const PLATFORM_GROUPS = Object.entries(PLATFORM_FAMILIES);

const COMMON_GENRES = [
  "RPG", "動作", "冒險", "射擊", "模擬", "策略", "格鬥", "運動", "賽車", "音樂",
];

export interface GameFormValues {
  name: string;
  nameOriginal: string;
  nameEn: string;
  aliases: string[];
  slug: string;
  releaseDate: string;
  platforms: string[];
  developer: string;
  publisher: string;
  genres: string[];
  description: string;
  coverImage: string;
}

const EMPTY: GameFormValues = {
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
};

interface GameFormProps {
  mode: "create" | "edit";
  /** 編輯時必填：要打哪一筆的 PUT。 */
  gameId?: string;
  initialData?: Partial<GameFormValues>;
  /**
   * 對話框裡的欄位自己捲，按鈕留在捲動區外面——那是列表頁原本的版面，抽出來時
   * 不跟著改。頁面上則不必捲，按鈕接在欄位後面就好。
   */
  variant?: "page" | "dialog";
  /** 存好了。呼叫端決定是關對話框、重取清單，還是原地重新整理。 */
  onSaved?: () => void;
  onCancel?: () => void;
}

export function GameForm({
  mode,
  gameId,
  initialData,
  variant = "page",
  onSaved,
  onCancel,
}: GameFormProps) {
  const [values, setValues] = useState<GameFormValues>({ ...EMPTY, ...initialData });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverCandidates, setCoverCandidates] = useState<CoverCandidate[] | null>(null);
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const coverCandidatesRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof GameFormValues>(key: K, value: GameFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: "platforms" | "genres", item: string) =>
    setValues((prev) => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter((v) => v !== item)
        : [...prev[key], item],
    }));

  // 封面欄位在最下面，候選清單長在它下方——不捲過去的話，按完「從 RAWG 抓取」
  // 畫面上什麼都沒發生（截圖驗證時就是這樣看到的）。
  useEffect(() => {
    if (coverCandidates?.length) {
      coverCandidatesRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [coverCandidates]);

  const handleFetchCover = async () => {
    if (!values.name.trim()) return;
    setIsFetchingCover(true);
    try {
      const res = await fetch("/api/games/search-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 三個名字都送過去，讓 route 依英文優先的順序試——RAWG 是英文資料庫，
        // 只送中文譯名對這批遊戲幾乎必定落空。
        body: JSON.stringify({
          name: values.name,
          nameEn: values.nameEn,
          nameOriginal: values.nameOriginal,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // 沒有這個分支時，非 2xx 只會讓 spinner 停下、畫面毫無變化
        setError(data?.error ? `抓取封面失敗：${data.error}` : "抓取封面失敗");
        return;
      }
      // 不再替編輯選。RAWG 的模糊搜尋一定給得出東西——《A-6入侵者》問到的是
      // Avernum 6——而程式分不出對錯，看得出來的是人。
      setCoverCandidates(data?.candidates ?? []);
    } catch {
      setError("抓取封面失敗");
    } finally {
      setIsFetchingCover(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.name.trim() || !values.slug.trim()) {
      setError("遊戲名稱和 Slug 為必填");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(
        mode === "create" ? "/api/games" : `/api/games/${gameId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, releaseDate: values.releaseDate || null }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失敗");
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={cn(
          "space-y-4",
          variant === "dialog" && "max-h-[60vh] overflow-y-auto py-4"
        )}
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>遊戲名稱 *</Label>
            <Input
              value={values.name}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  name: e.target.value,
                  // 建立時才自動帶 slug：已經發布的網址不該因為改個錯字就換掉。
                  slug: mode === "edit" ? prev.slug : slugify(e.target.value),
                }))
              }
              placeholder="中文名稱"
            />
          </div>
          <div className="space-y-2">
            <Label>Slug *</Label>
            <Input
              value={values.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="url-slug"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>原文名稱</Label>
            <Input
              value={values.nameOriginal}
              onChange={(e) => set("nameOriginal", e.target.value)}
              placeholder="日文或其他原文名稱"
            />
          </div>
          <div className="space-y-2">
            <Label>英文名稱</Label>
            <Input
              value={values.nameEn}
              onChange={(e) => set("nameEn", e.target.value)}
              placeholder="English Name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>別名</Label>
          <CommaListInput
            value={values.aliases}
            format={formatStringList}
            parse={parseStringList}
            onChange={(aliases) => set("aliases", aliases)}
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
              value={values.releaseDate}
              onChange={(e) => set("releaseDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>開發商</Label>
            <Input
              value={values.developer}
              onChange={(e) => set("developer", e.target.value)}
              placeholder="Developer"
            />
          </div>
          <div className="space-y-2">
            <Label>發行商</Label>
            <Input
              value={values.publisher}
              onChange={(e) => set("publisher", e.target.value)}
              placeholder="Publisher"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>平台</Label>
          <div className="space-y-2">
            {/* 籌碼自己一個容器，換行的那幾顆才會停在縮排裡，而不是跑回
                家族名底下。任天堂有十一個代號，一定會換行。 */}
            {PLATFORM_GROUPS.map(([family, codes]) => (
              <div key={family} className="flex gap-2">
                <span className="w-16 shrink-0 pt-0.5 text-xs text-muted-foreground">
                  {family}
                </span>
                <div className="flex flex-wrap gap-2">
                  {codes.map((code) => (
                    <Badge
                      key={code}
                      variant={
                        values.platforms.includes(code) ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggle("platforms", code)}
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>類型</Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_GENRES.map((genre) => (
              <Badge
                key={genre}
                variant={values.genres.includes(genre) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggle("genres", genre)}
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>描述</Label>
          <Textarea
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="遊戲簡介（選填）"
            rows={3}
          />
        </div>

        {/* 與單期封面、期刊刊頭同一個元件。這裡原本是一個裸的網址欄位加
            預覽圖，少了另外兩處都有的東西：拖曳上傳，以及**清掉這張圖的
            辦法**——RAWG 抓錯時，唯一的退路是整個取消編輯。 */}
        <div className="space-y-2">
          <ImageUpload
            label="封面圖片"
            value={values.coverImage}
            onChange={(url) => set("coverImage", url)}
            folder="games"
            description={
              RAWG_ENABLED
                ? "可拖曳上傳、貼網址，或從 RAWG 抓取"
                : "可拖曳上傳或貼網址"
            }
          />
          {RAWG_ENABLED && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFetchCover}
              disabled={isFetchingCover || !values.name.trim()}
            >
              {isFetchingCover ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              從 RAWG 抓取
            </Button>
          )}

          {coverCandidates !== null &&
            (coverCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                RAWG 沒有回傳任何帶封面的結果
              </p>
            ) : (
              <div
                ref={coverCandidatesRef}
                className="space-y-2 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    RAWG 是模糊比對，第一筆常常不是同一款。請自己認一下：
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-mr-2 shrink-0"
                    onClick={() => setCoverCandidates(null)}
                  >
                    關閉
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {coverCandidates.map((candidate) => (
                    <button
                      key={candidate.coverImage}
                      type="button"
                      onClick={() => {
                        set("coverImage", candidate.coverImage);
                        setCoverCandidates(null);
                      }}
                      className="group space-y-1 text-left"
                      title={candidate.rawgName}
                    >
                      {/* RAWG 的圖不在 next/image 的 remotePatterns 允許清單裡 */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={candidate.coverImage}
                        alt={candidate.rawgName}
                        className="aspect-video w-full rounded border object-cover transition-opacity group-hover:opacity-80"
                      />
                      <p className="line-clamp-2 text-xs leading-tight">
                        {candidate.rawgName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.released ?? "年份不詳"}
                        {/* 名字同鍵只是提示。這批老遊戲同名不同作的情況多，
                            標記幫忙掃視，不代表它就是對的那一筆。 */}
                        {candidate.exact && (
                          <span className="ml-1 text-primary">名稱吻合</span>
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div
        className={cn(
          "flex gap-2 pt-4",
          variant === "dialog" ? "justify-end" : "justify-start"
        )}
      >
        {variant === "page" ? (
          <>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "建立遊戲" : "儲存變更"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "建立" : "儲存"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
