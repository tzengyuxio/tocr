import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">權限不足</CardTitle>
          <CardDescription>您沒有存取此頁面的權限。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            如需編輯權限，請聯繫管理員提升您的帳號權限。
          </p>
          <Button asChild>
            <Link href="/">返回首頁</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
