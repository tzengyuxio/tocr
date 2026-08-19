import { auth } from "@/lib/auth";
import { isDevBypass, DEV_USER } from "@/lib/dev-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DisplayNameForm } from "@/components/admin/DisplayNameForm";
import { ApiTokenManager } from "@/components/admin/ApiTokenManager";
import { isSyntheticUser } from "@/lib/validators/user";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage() {
  const user = isDevBypass ? DEV_USER : (await auth())?.user;

  // The layout already redirects a caller without a session; this narrows the
  // type and keeps the page honest if it is ever reached another way.
  if (!user) return null;

  const synthetic = isSyntheticUser(user.id);

  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">個人設定</h2>
        <p className="text-muted-foreground">你在這個站上的公開身分</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>顯示名稱</CardTitle>
          <CardDescription>
            這個名字會出現在貢獻者排行、活動流與每一筆編輯紀錄上。電子郵件不會公開。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {synthetic ? (
            <p className="text-sm text-muted-foreground">
              你目前是系統帳號（{user.name}），名稱由程式管理，不能在這裡修改。
            </p>
          ) : (
            <DisplayNameForm initialName={user.name ?? ""} />
          )}
        </CardContent>
      </Card>

      {/* Deliberately unexplained: most contributors have no use for this and
          would only be puzzled by instructions for it. Whoever needs one knows
          what it is, and what it costs them is on the card. */}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>API Token</CardTitle>
          <CardDescription>
            用於腳本寫入。權限與你的帳號相同，寫入的紀錄會署你的名。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiTokenManager
            tokens={tokens.map((token) => ({
              ...token,
              createdAt: token.createdAt.toISOString(),
              lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
              revokedAt: token.revokedAt?.toISOString() ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
