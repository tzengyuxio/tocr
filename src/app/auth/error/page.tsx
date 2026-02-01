import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-red-600">登入錯誤</CardTitle>
          <CardDescription>登入過程中發生錯誤，請稍後再試。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            如果問題持續發生，請聯繫管理員。
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">返回首頁</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/auth/signin">重新登入</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
