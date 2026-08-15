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
import { isSyntheticUser } from "@/lib/validators/user";

export default async function ProfilePage() {
  const user = isDevBypass ? DEV_USER : (await auth())?.user;

  // The layout already redirects a caller without a session; this narrows the
  // type and keeps the page honest if it is ever reached another way.
  if (!user) return null;

  const synthetic = isSyntheticUser(user.id);

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
    </div>
  );
}
