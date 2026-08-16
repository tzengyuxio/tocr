"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { MAX_DISPLAY_NAME_LENGTH } from "@/lib/validators/user";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const unchanged = name.trim() === initialName.trim();

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(null);

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? `儲存失敗（HTTP ${response.status}）`);
        return;
      }

      // The rename is committed at this point, so a body that will not parse
      // must not turn into a failure message.
      setSaved(data?.name ?? name.trim());
      // The header and every past edit show this name, so refresh the server
      // components rather than leaving a stale one on screen.
      router.refresh();
    } catch {
      setError("儲存失敗，請稍後再試");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display-name">顯示名稱</Label>
        <Input
          id="display-name"
          value={name}
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(null);
            setError(null);
          }}
          placeholder="要顯示在貢獻者頁與編輯紀錄上的名字"
        />
        <p className="text-sm text-muted-foreground">
          最多 {MAX_DISPLAY_NAME_LENGTH} 個字。改名會一併改寫你過去所有編輯紀錄上的署名。
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <p className="text-sm text-muted-foreground">已儲存為「{saved}」。</p>
      )}

      <Button onClick={handleSave} disabled={isSaving || unchanged || !name.trim()}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        儲存
      </Button>
    </div>
  );
}
