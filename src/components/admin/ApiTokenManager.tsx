"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { formatTaipei } from "@/lib/datetime";
import { MAX_TOKEN_NAME_LENGTH } from "@/lib/validators/api-token";

export interface ApiTokenRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export function ApiTokenManager({ tokens }: { tokens: ApiTokenRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    setCreated(null);

    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.token) {
        setError(data?.error ?? `產生失敗（HTTP ${response.status}）`);
        return;
      }

      setCreated(data.token);
      setName("");
      router.refresh();
    } catch {
      setError("產生失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/tokens/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? `撤銷失敗（HTTP ${response.status}）`);
        return;
      }
      router.refresh();
    } catch {
      setError("撤銷失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {tokens.length > 0 && (
        <ul className="divide-y rounded-md border">
          {tokens.map((token) => (
            <li
              key={token.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{token.name}</span>
                  {token.revokedAt && (
                    <span className="text-xs text-muted-foreground">已撤銷</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <code>{token.prefix}…</code>
                  {" · 建立於 "}
                  {formatTaipei(token.createdAt, "yyyy/MM/dd")}
                  {" · "}
                  {token.lastUsedAt
                    ? `最後使用 ${formatTaipei(token.lastUsedAt, "yyyy/MM/dd HH:mm")}`
                    : "尚未使用"}
                </div>
              </div>
              {!token.revokedAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleRevoke(token.id)}
                >
                  撤銷
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* The only moment the plaintext exists. It stays until the page is left,
          rather than behind a timer -- copying it is the reader's job, not a
          race against the interface. */}
      {created && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-sm">複製起來，這串只會出現這一次。</p>
          <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
            {created}
          </code>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="token-name">名稱</Label>
          <Input
            id="token-name"
            value={name}
            maxLength={MAX_TOKEN_NAME_LENGTH}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="例如：筆電"
          />
        </div>
        <Button onClick={handleCreate} disabled={busy || !name.trim()}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          產生
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
